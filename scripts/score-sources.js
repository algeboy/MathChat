/* Run the site's automatic scorer over every source in the ledger.

   Uses the SAME analyse() the published tool uses, read straight out of
   docs/source-tool.js, so the baseline can never drift from what visitors see.

     node scripts/score-sources.js [--cache DIR] [--out data/auto-scores.csv]

   Text is fetched the way the tool fetches it: arXiv papers from the rendered
   HTML, everything else through the reader service. Sources whose text cannot
   be retrieved are reported and left out rather than guessed at.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const CACHE = opt('--cache', path.join(ROOT, '.source-cache'));
const OUT = opt('--out', path.join(ROOT, 'data/auto-scores.csv'));

function loadAnalyse() {
  const src = fs.readFileSync(path.join(ROOT, 'docs/source-tool.js'), 'utf8');
  const start = src.indexOf('  const count = (text, words)');
  const end = src.indexOf('  async function scoreSource()');
  if (start < 0 || end < 0) throw new Error('could not locate the scoring block in docs/source-tool.js');
  return new Function(src.slice(start, end) + '\n return analyse;')();
}

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const arxivId = url => (url.match(/arxiv\.org\/(?:abs|pdf|html)\/([a-z-]+(?:\.[A-Z]{2})?\/\d{7}|\d{4}\.\d{4,5})/i) || [])[1];

function readerText(raw) {
  const body = raw.includes('Markdown Content:') ? raw.slice(raw.indexOf('Markdown Content:') + 17) : raw;
  return clean(body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/[#>`*_|]/g, ' '));
}

async function fetchText(source) {
  const id = arxivId(source.url);
  if (id) {
    const r = await fetch(`https://arxiv.org/html/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error(`arXiv HTML ${r.status}`);
    const html = await r.text();
    // Strip tags the way a browser's textContent would.
    const body = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
    const text = clean(body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
                           .replace(/&[a-z]+;|&#\d+;/gi, ' '));
    return { text, via: 'arxiv-html' };
  }
  const r = await fetch('https://r.jina.ai/' + source.url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`reader ${r.status}`);
  return { text: readerText(await r.text()), via: 'reader' };
}

(async () => {
  const analyse = loadAnalyse();
  const sources = parseCsv(fs.readFileSync(path.join(ROOT, 'data/source-ledger.csv'), 'utf8'));
  fs.mkdirSync(CACHE, { recursive: true });
  const out = [], failed = [];

  for (const source of sources) {
    const cached = path.join(CACHE, source.id + '.txt');
    let text = '', via = 'cache';
    if (fs.existsSync(cached)) {
      text = fs.readFileSync(cached, 'utf8');
    } else {
      try {
        const got = await fetchText(source);
        text = got.text; via = got.via;
        if (text.length >= 500) fs.writeFileSync(cached, text);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        failed.push(`${source.id}: ${e.message}`);
        continue;
      }
    }
    if (text.length < 500) { failed.push(`${source.id}: only ${text.length} characters of text`); continue; }
    const a = analyse(text);
    out.push({ id: source.id, words: a.words, outlook: a.outlook, evidence: a.evidence,
               reliability: a.reliability, text_source: via });
    console.log(`${source.id.padEnd(16)} ${String(a.words).padStart(7)}w  ${a.outlook}/${a.evidence}/${a.reliability}`);
  }

  const head = 'id,words,auto_outlook,auto_evidence,auto_reliability,text_source';
  const body = out.map(r => [r.id, r.words, r.outlook, r.evidence, r.reliability, r.text_source].join(','));
  fs.writeFileSync(OUT, [head, ...body].join('\n') + '\n');
  console.log(`\nwrote ${OUT} (${out.length} of ${sources.length} sources)`);
  if (failed.length) { console.log('could not score:'); failed.forEach(f => console.log('  - ' + f)); }
})();
