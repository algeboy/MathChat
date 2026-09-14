/* Shared source scoring tool. Mounts wherever #source-tool appears.

   Browser reachability, verified against the live site:
   - arxiv.org/html/<id>  sends CORS headers, so the full paper is readable here.
   - export.arxiv.org/api and arxiv.org/abs do not, so no metadata call is made;
     title, authors and abstract are read out of the paper HTML instead.
   - youtube.com/api/timedtext returns an empty body without signed parameters,
     so transcripts are pasted rather than fetched.
   - Ordinary article pages do not send CORS headers, so a direct read is tried
     first and a reader service is used only as a fallback.
   Every tab falls back to pasted text, so a blocked source is never a dead end. */
(() => {
  const root = document.getElementById('source-tool');
  if (!root) return;

  const READER = 'https://r.jina.ai/';

  const references = [
    ['Su',82,35,60],['Bessis',54,38,68],['Economist',28,86,72],['Yahoo',30,70,55],['Williamson',78,62,80],['Tao',61,78,88],['Weinreich',12,48,65],['Leiden',24,72,82],['AI Snake Oil',38,78,82],['Gowers',58,82,90],['Avigad',64,76,88],['Conrad Wolfram',72,68,78],['Stephen Wolfram',78,55,74],['Tsimerman',88,55,76],['LeCun',65,65,84],['Riehl',56,86,90],['Lanier',60,36,64],['Marcus',32,65,84],['Cepelewicz',64,76,82],['Strogatz',60,70,84],['Carroll',55,54,76],['Jaimungal',76,55,70],['Hossenfelder',58,45,64],['Keating',61,58,74]
  ];

  root.classList.add('source-tool');
  root.innerHTML = `
    <h2>Add your own</h2>
    <p class="note">Paste or link a source to compare it with the map using provisional language-cue scores. Scoring is a starting estimate, not a review.</p>
    <div class="tabs" role="tablist" aria-label="Source type">
      <button type="button" role="tab" id="source-tab-arxiv" aria-controls="source-panel-arxiv" aria-selected="true">arXiv</button>
      <button type="button" role="tab" id="source-tab-youtube" aria-controls="source-panel-youtube" aria-selected="false" tabindex="-1">YouTube</button>
      <button type="button" role="tab" id="source-tab-website" aria-controls="source-panel-website" aria-selected="false" tabindex="-1">Website</button>
      <button type="button" role="tab" id="source-tab-text" aria-controls="source-panel-text" aria-selected="false" tabindex="-1">Personal text</button>
    </div>
    <form class="source-form" novalidate>
      <section class="tab-panel" id="source-panel-arxiv" role="tabpanel" aria-labelledby="source-tab-arxiv">
        <div class="field"><label for="source-arxiv-url">arXiv link</label><input id="source-arxiv-url" type="url" inputmode="url" placeholder="https://arxiv.org/abs/2404.19756"><p class="note">Your browser reads the full public arXiv HTML paper. The abstract is kept only as a position summary. Papers with no HTML version, mostly older ones, must be pasted below.</p></div>
        <p class="note" id="source-arxiv-status" aria-live="polite"></p>
        <details id="source-arxiv-manual"><summary>Paste the paper text instead</summary><div class="field"><label for="source-arxiv-text">Paper text</label><textarea id="source-arxiv-text" placeholder="Paste the paper text here when no HTML version is available."></textarea></div></details>
      </section>
      <section class="tab-panel" id="source-panel-youtube" role="tabpanel" aria-labelledby="source-tab-youtube" hidden>
        <div class="field"><label for="source-youtube-url">YouTube URL</label><input id="source-youtube-url" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…"></div>
        <div class="field"><label for="source-youtube-text">Transcript</label><textarea id="source-youtube-text" placeholder="Paste the transcript here."></textarea>
        <p class="note">YouTube no longer serves captions to other sites, so the transcript is pasted. On the video, open <strong>More → Show transcript</strong>, select the text, and paste it here. The transcript is scored; the title and description are not.</p></div>
        <p class="note" id="source-youtube-status" aria-live="polite"></p>
      </section>
      <section class="tab-panel" id="source-panel-website" role="tabpanel" aria-labelledby="source-tab-website" hidden>
        <div class="field"><label for="source-website-url">Website URL</label><input id="source-website-url" type="url" inputmode="url" placeholder="https://example.org/article"><p class="note">Most sites refuse to be read directly by another site. When that happens the page is retrieved through the <a href="https://r.jina.ai" target="_blank" rel="noopener">r.jina.ai</a> reader service, which receives the address you enter. Paste the text below instead if you would rather it not.</p></div>
        <p class="note" id="source-website-status" aria-live="polite"></p>
        <details id="source-website-manual"><summary>Paste article text instead</summary><div class="field"><label for="source-website-text">Article text</label><textarea id="source-website-text" placeholder="Paste article text here when browser access is blocked."></textarea></div></details>
      </section>
      <section class="tab-panel" id="source-panel-text" role="tabpanel" aria-labelledby="source-tab-text" hidden>
        <div class="field"><label for="source-personal-text">Source text</label><textarea id="source-personal-text" placeholder="Paste source text here."></textarea><p class="note">Your text and any file you choose stay in this browser.</p></div>
        <details><summary>Read a local text file</summary><div class="field"><label for="source-file">Source file (plain text, Markdown, CSV, or HTML)</label><input id="source-file" type="file" accept=".txt,.md,.markdown,.csv,.html,.htm,text/plain,text/markdown,text/csv,text/html"><p class="note">For PDFs and Word documents, paste the text above instead.</p></div></details>
      </section>
      <button class="primary-action" id="source-score" type="submit">Score this source</button>
      <details><summary>Optional title and review details</summary>
        <div class="field"><label for="source-title">Title or source name</label><input id="source-title" type="text" placeholder="e.g., My classroom AI policy"></div>
      </details>
    </form>
    <section id="source-result" class="hidden" aria-live="polite" hidden>
      <h2>Provisional comparison</h2>
      <div class="scores"><div class="score"><b id="source-outlook">–</b>Outlook<br><small>anxious 0 → hopeful 100</small></div><div class="score"><b id="source-evidence">–</b>Evidence basis<br><small>speculative 0 → data-supported 100</small></div><div class="score"><b id="source-reliability">–</b>Source reliability<br><small>lower 0 → higher 100</small></div></div>
      <p id="source-comparison"></p><p class="note" id="source-explanation"></p>
      <div class="card"><h2>Submit this source for review</h2><p>The map is a reviewed dataset, so submissions are not added automatically. Preparing a submission saves a private copy in this browser and opens a filled-in GitHub issue. A maintainer reviews it before it joins the public map and source ledger.</p><p class="note">Only continue if you have the right to share the title, excerpt, and scores.</p><div class="field"><label for="source-submitter">Your name</label><input id="source-submitter" type="text" autocomplete="name" placeholder="Name for the review record"><p class="note">Your name is required for a review submission and will be included in the prepared GitHub issue.</p></div><label><input id="source-consent" type="checkbox"> I consent to submit this tidy, polite, and informative summary for public review and possible inclusion in the MathChat appendix. I understand harmful speech, ad hominem attacks, and overtly political declarations are not permitted, and the site owner may remove content for any reason.</label><button id="source-prepare" type="button" disabled>Prepare appendix submission</button><p id="source-submission-note" class="note"></p></div>
    </section>
    `;

  const $ = id => root.querySelector('#' + id);
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  let active = 'arxiv', scored = null, arxivSnapshot = null, arxivPaperText = '', youtubeSnapshot = null, arxivRequest = 0, youtubeRequest = 0, websiteRequest = 0;
  const invalidate = () => { scored = null; $('source-result').hidden = true; $('source-result').classList.add('hidden'); $('source-consent').checked = false; $('source-prepare').disabled = true; $('source-submission-note').replaceChildren(); };
  const setStatus = (id, message) => { $(id).textContent = message; };
  const validUrl = (value, hosts) => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && (!hosts || hosts.includes(url.hostname.toLowerCase())) ? url : null; } catch { return null; }
  };
  const arxivId = value => {
    const url = validUrl(value, ['arxiv.org', 'www.arxiv.org', 'export.arxiv.org']);
    if (!url) return '';
    const match = (url.hostname === 'export.arxiv.org' ? url.searchParams.get('id_list') || '' : url.pathname).match(/(?:^|\/)([a-z-]+(?:\.[A-Z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?(?:$|\/)/i);
    return match ? match[1] : '';
  };
  const clean = value => (value || '').replace(/\s+/g, ' ').trim();
  const activate = name => {
    active = name; ++arxivRequest; ++youtubeRequest; ++websiteRequest; invalidate();
    ['source-arxiv-status', 'source-youtube-status', 'source-website-status'].forEach(id => setStatus(id, ''));
    tabs.forEach(tab => { const selected = tab.id === 'source-tab-' + name; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    panels.forEach(panel => { panel.hidden = panel.id !== 'source-panel-' + name; });
  };
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => activate(tab.id.replace('source-tab-', ''))); tab.addEventListener('keydown', event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; tabs[next].focus(); activate(tabs[next].id.replace('source-tab-', '')); }); });

  /* arXiv serves the rendered paper with permissive CORS headers, so the paper
     itself supplies the record: title, authors, abstract and body text. */
  function readArxivHtml(html, id) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const authors = [...doc.querySelectorAll('.ltx_personname')].map(node => clean(node.textContent).replace(/\s*,\s*$/, '')).filter(Boolean);
    const body = doc.querySelector('.ltx_document, main, article, #content') || doc.body;
    const abstractNode = doc.querySelector('.ltx_abstract');
    const abstract = clean(abstractNode?.textContent).replace(/^Abstract\s*/i, '');
    return {
      id, url: `https://arxiv.org/abs/${id}`,
      title: clean(doc.querySelector('.ltx_title_document, h1.ltx_title')?.textContent) || clean(doc.title),
      summary: abstract,
      primaryCategory: '',
      authors: [...new Set(authors)].map(name => ({ name, affiliation: '', profileUrl: `https://arxiv.org/search/?query=${encodeURIComponent(name)}&searchtype=author` })),
      text: clean(body?.textContent)
    };
  }
  async function loadArxiv() {
    arxivSnapshot = null; arxivPaperText = '';
    const token = ++arxivRequest, value = $('source-arxiv-url').value.trim();
    if (!value) { setStatus('source-arxiv-status', 'Enter an arXiv link.'); return false; }
    const id = arxivId(value);
    if (!id) { setStatus('source-arxiv-status', 'Enter a valid HTTP or HTTPS arXiv abstract, PDF, HTML, or export link.'); return false; }
    setStatus('source-arxiv-status', 'Reading the public arXiv HTML paper…');
    try {
      const response = await fetch(`https://arxiv.org/html/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`arXiv returned ${response.status}`);
      const snapshot = readArxivHtml(await response.text(), id);
      if (snapshot.text.length < 1000) throw new Error('the HTML version did not contain enough paper text');
      if (token !== arxivRequest || active !== 'arxiv') return false;
      snapshot.paperTextLength = snapshot.text.length;
      arxivPaperText = snapshot.text; delete snapshot.text; arxivSnapshot = snapshot;
      if (!$('source-title').value.trim() && snapshot.title) $('source-title').value = snapshot.title;
      setStatus('source-arxiv-status', `Read ${arxivPaperText.length.toLocaleString()} characters from the full paper${snapshot.authors.length ? ` by ${snapshot.authors.map(a => a.name).join(', ')}` : ''}. The score uses this text, not the abstract.`);
      return true;
    } catch (error) {
      if (token === arxivRequest && active === 'arxiv') {
        $('source-arxiv-manual').open = true;
        setStatus('source-arxiv-status', `Could not read this paper automatically (${error.message}). arXiv has no HTML version for some papers, mostly older ones. Paste the paper text below to score it.`);
      }
      return false;
    }
  }
  $('source-arxiv-url').addEventListener('input', () => { ++arxivRequest; arxivSnapshot = null; arxivPaperText = ''; invalidate(); });

  const youtubeId = value => {
    const url = validUrl(value, ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
    if (!url) return '';
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') || url.pathname.split('/').pop());
    return /^[\w-]{11}$/.test(id) ? id : '';
  };
  /* Only the public oEmbed record is fetched, for the title and channel. */
  async function loadYouTubeRecord(id) {
    const token = ++youtubeRequest;
    youtubeSnapshot = { id, url: `https://www.youtube.com/watch?v=${id}`, title: `YouTube video ${id}`, channelName: '', channelUrl: '' };
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`oEmbed returned ${response.status}`);
      const metadata = await response.json();
      if (token !== youtubeRequest) return;
      youtubeSnapshot = { ...youtubeSnapshot, title: metadata.title || youtubeSnapshot.title, channelName: metadata.author_name || '', channelUrl: metadata.author_url || '' };
      if (!$('source-title').value.trim()) $('source-title').value = youtubeSnapshot.title;
      setStatus('source-youtube-status', `Video identified: ${youtubeSnapshot.title}${youtubeSnapshot.channelName ? ` (${youtubeSnapshot.channelName})` : ''}.`);
    } catch { setStatus('source-youtube-status', 'The video title could not be read, so the link is recorded on its own. The pasted transcript is still scored.'); }
  }
  $('source-youtube-url').addEventListener('input', () => { ++youtubeRequest; youtubeSnapshot = null; invalidate(); });

  function extractArticle(html) { const doc = new DOMParser().parseFromString(html, 'text/html'); doc.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg,canvas').forEach(node => node.remove()); return clean((doc.querySelector('article, main, [role="main"]') || doc.body)?.textContent); }
  /* The reader returns markdown. Reduce it to prose so that its link syntax does
     not inflate the citation count relative to a directly read page. */
  function readerText(raw) {
    const body = raw.includes('Markdown Content:') ? raw.slice(raw.indexOf('Markdown Content:') + 17) : raw;
    return clean(body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*[-*]\s+/gm, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[#>`*_|]/g, ' '));
  }
  async function loadWebsite() {
    const url = validUrl($('source-website-url').value.trim()), token = ++websiteRequest;
    if (!url) { setStatus('source-website-status', 'Enter a valid HTTP or HTTPS website URL.'); return ''; }
    setStatus('source-website-status', 'Reading article text…');
    let directError = '';
    try {
      const response = await fetch(url.href, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`site returned ${response.status}`);
      const text = extractArticle(await response.text());
      if (text.length < 80) throw new Error('the page did not expose enough article text');
      if (token !== websiteRequest || active !== 'website') return '';
      $('source-website-text').value = text;
      setStatus('source-website-status', `Read ${text.length.toLocaleString()} characters directly from the article.`);
      return text;
    } catch (error) { directError = error.message; }
    if (token !== websiteRequest || active !== 'website') return '';
    setStatus('source-website-status', 'The site refused a direct read. Retrieving it through the r.jina.ai reader service…');
    try {
      const response = await fetch(READER + url.href, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`reader returned ${response.status}`);
      const text = readerText(await response.text());
      if (text.length < 80) throw new Error('the reader did not return enough article text');
      if (token !== websiteRequest || active !== 'website') return '';
      $('source-website-text').value = text;
      setStatus('source-website-status', `Read ${text.length.toLocaleString()} characters through the r.jina.ai reader service.`);
      return text;
    } catch (error) {
      if (token === websiteRequest && active === 'website') {
        $('source-website-manual').open = true;
        setStatus('source-website-status', `This article could not be read automatically (direct read: ${directError}; reader service: ${error.message}). Paste its text below instead.`);
      }
      return '';
    }
  }
  $('source-website-url').addEventListener('input', () => { ++websiteRequest; $('source-website-text').value = ''; invalidate(); });
  $('source-website-text').addEventListener('input', () => { ++websiteRequest; });
  $('source-file').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; invalidate(); try { $('source-personal-text').value = await file.text(); if (!$('source-title').value.trim()) $('source-title').value = file.name.replace(/\.[^.]+$/, ''); } catch { alert('The selected file could not be read.'); } });
  root.querySelectorAll('input, textarea').forEach(el => { if (!['source-arxiv-url', 'source-website-url', 'source-file', 'source-consent', 'source-submitter'].includes(el.id)) el.addEventListener('input', invalidate); });

  const count = (text, words) => words.reduce((n, word) => n + (text.match(new RegExp('\\b' + word + '\\b', 'g')) || []).length, 0); const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
  async function scoreSource() {
    const button = $('source-score'); if (button.disabled) return; button.disabled = true; invalidate();
    let raw = '', snapshot = null, sourceLabel = '', sourceUrl = '';
    try {
    if (active === 'arxiv') {
      const manual = $('source-arxiv-text').value.trim();
      if (manual) { const url = validUrl($('source-arxiv-url').value, ['arxiv.org','www.arxiv.org','export.arxiv.org']); if (!url) return alert('Enter a valid HTTP or HTTPS arXiv URL alongside the pasted text.'); raw = manual; sourceLabel = ' from the pasted arXiv paper text'; sourceUrl = url.href; }
      else { if (!await loadArxiv()) return; raw = arxivPaperText; snapshot = structuredClone(arxivSnapshot); sourceLabel = ' from the complete arXiv HTML paper'; sourceUrl = snapshot.url; }
    }
    else if (active === 'youtube') {
      const id = youtubeId($('source-youtube-url').value);
      if (!id) return setStatus('source-youtube-status', 'Enter a valid HTTP or HTTPS YouTube video link.');
      raw = $('source-youtube-text').value.trim();
      if (!raw) return setStatus('source-youtube-status', 'Paste the video transcript to score it. On the video, open More → Show transcript, then copy the text.');
      await loadYouTubeRecord(id); snapshot = structuredClone(youtubeSnapshot); sourceLabel = ' from the pasted YouTube transcript'; sourceUrl = snapshot.url;
    }
    else if (active === 'website') { const url = validUrl($('source-website-url').value.trim()); if (!url) return setStatus('source-website-status', 'Enter a valid HTTP or HTTPS website URL.'); raw = $('source-website-text').value.trim() || await loadWebsite(); if (!raw) return; sourceLabel = ' from website text'; sourceUrl = url.href; }
    else raw = $('source-personal-text').value.trim();
    if (raw.length < 80) return alert('Please provide at least a short paragraph so there is enough text to compare.'); try { const possibleUrl = new URL(raw); if (possibleUrl.protocol === 'https:' || possibleUrl.protocol === 'http:') return alert('Please provide the source text, rather than a URL, to score.'); } catch { /* Source text is not itself a URL. */ } const text = raw.toLowerCase(), hopeful = count(text,['benefit','improve','opportunity','help','assist','promise','enable','advance','positive','potential']), anxious = count(text,['risk','harm','concern','danger','threat','limit','failure','bias','cheat','decline']), empirical = count(text,['study','data','experiment','survey','sample','result','evidence','trial','measured','method']), cautious = count(text,['might','could','may','future','perhaps','believe','predict','likely']), citations = (raw.match(/https?:\/\/|\[[^\]]+\]\([^)]*\)|\([A-Z][A-Za-z-]+,?\s*20\d\d\)/g) || []).length, outlook = clamp(50 + (hopeful - anxious) * 5), evidence = clamp(35 + empirical * 6 + citations * 3 - cautious * 2), reliability = clamp(45 + Math.min(20, raw.length / 350) + Math.min(18, citations * 3) + Math.min(15, empirical * 2));
    scored = { title: $('source-title').value.trim() || 'Untitled source', outlook, evidence, reliability, excerpt: raw.slice(0, 500), arxiv: active === 'arxiv' ? snapshot : null, youtube: active === 'youtube' ? snapshot : null, scoredTextLength: raw.length, sourceType: active, sourceUrl }; $('source-outlook').textContent = outlook; $('source-evidence').textContent = evidence; $('source-reliability').textContent = reliability;
    const nearest = references.map(([name,o,e,r]) => ({ name, d: Math.hypot(o-outlook,e-evidence,r-reliability) })).sort((a,b) => a.d-b.d).slice(0,3).map(x => x.name); $('source-comparison').textContent = `Closest current map entries: ${nearest.join(', ')}.`; $('source-explanation').textContent = `Scored ${raw.length.toLocaleString()} characters${sourceLabel}. Cue counts — hopeful: ${hopeful}; cautionary: ${anxious}; empirical: ${empirical}; citations/links: ${citations}. These are transparent starting estimates; revise them using the methodology before treating them as a review.`; $('source-result').hidden = false; $('source-result').classList.remove('hidden'); $('source-result').scrollIntoView({ behavior: 'smooth' });
    } finally { button.disabled = false; }
  }
  root.querySelector('.source-form').addEventListener('submit', event => { event.preventDefault(); scoreSource(); });
  $('source-consent').addEventListener('change', event => { $('source-prepare').disabled = !scored || !event.target.checked; });
  $('source-prepare').addEventListener('click', () => { if (!scored || !$('source-consent').checked) return; const submitterName = $('source-submitter').value.trim(); if (!submitterName) { $('source-submitter').focus(); return alert('Please enter your name before preparing a submission.'); } const entry = { ...scored, submitterName, submittedAt: new Date().toISOString(), consent: true, submissionConfirmed: true }; const entries = JSON.parse(localStorage.getItem('mathchat-appendix-submissions') || '[]'); entries.push(entry); localStorage.setItem('mathchat-appendix-submissions', JSON.stringify(entries)); const sourceDetails = entry.arxiv ? `\n\nSubmitter: ${entry.submitterName}\narXiv: ${entry.arxiv.url}\narXiv ID: ${entry.arxiv.id}\nAuthors: ${entry.arxiv.authors.map(a => a.name + (a.affiliation ? ` (${a.affiliation})` : '')).join('; ') || 'not listed'}\nScore input: complete arXiv HTML paper (${entry.scoredTextLength.toLocaleString()} characters; abstract was not scored)\nPosition summary (arXiv abstract):\n${entry.arxiv.summary || 'not available'}` : entry.youtube ? `\n\nSubmitter: ${entry.submitterName}\nYouTube: ${entry.youtube.url}\nChannel: ${entry.youtube.channelName || 'not listed'}\nScore input: pasted English transcript (${entry.scoredTextLength.toLocaleString()} characters; title and description were not scored)` : `\n\nSubmitter: ${entry.submitterName}${entry.sourceUrl ? `\nSource URL: ${entry.sourceUrl}` : ''}`; const issue = 'https://github.com/algeboy/MathChat/issues/new?title=' + encodeURIComponent('Appendix submission: ' + entry.title) + '&body=' + encodeURIComponent(`I consent to review and possible public inclusion. I confirm this submission is tidy, polite, and apolitical.\n\nTitle: ${entry.title}\nScores: outlook ${entry.outlook}, evidence ${entry.evidence}, reliability ${entry.reliability}${sourceDetails}\n\nExcerpt:\n${entry.excerpt}`); const note = $('source-submission-note'); note.replaceChildren('A private preview is now available in ', Object.assign(document.createElement('a'), { href: '/MathChat/appendix/', textContent: 'the appendix' }), '. To request public review, ', Object.assign(document.createElement('a'), { href: issue, target: '_blank', rel: 'noopener', textContent: 'open a prepared GitHub issue' }), '.'); });
})();
