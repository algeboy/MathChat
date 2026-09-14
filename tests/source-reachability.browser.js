// Run from the built site's console: import('/tests/source-reachability.browser.js')
//
// This suite deliberately does NOT stub fetch. It checks that the hosts the
// source tool depends on are actually readable from a browser on this origin,
// which is the failure the fixture-based suite cannot see. A failure here means
// a source type is broken for real users even while tests/pages.browser.js passes.
(async () => {
  const report = [];
  const probe = async (label, url, check) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      const problem = check(response, body);
      report.push({ label, ok: !problem, detail: problem || `HTTP ${response.status}, ${body.length.toLocaleString()} characters` });
    } catch (error) { report.push({ label, ok: false, detail: `blocked: ${error.message}` }); }
  };

  // arXiv rendered papers must stay readable cross-origin; the tool has no
  // other way to reach paper text.
  await probe('arXiv paper HTML', 'https://arxiv.org/html/2404.19756', (response, body) => {
    if (!response.ok) return `HTTP ${response.status}`;
    const doc = new DOMParser().parseFromString(body, 'text/html');
    if (!doc.querySelector('.ltx_title_document, h1.ltx_title')) return 'no title element in the paper HTML';
    if (!doc.querySelector('.ltx_personname')) return 'no author element in the paper HTML';
    const main = doc.querySelector('.ltx_document, main, article') || doc.body;
    if ((main.textContent || '').replace(/\s+/g, ' ').trim().length < 1000) return 'paper body text too short';
    return '';
  });

  // The reader service is the website tab's fallback for sites that refuse a
  // direct cross-origin read, which is nearly all of them.
  await probe('Reader service', 'https://r.jina.ai/https://terrytao.wordpress.com/2023/11/18/formalizing-the-proof-of-pfr-in-lean4-using-blueprint-a-short-tour/', (response, body) => {
    if (!response.ok) return `HTTP ${response.status}`;
    return body.length > 1000 ? '' : 'reader returned too little text';
  });

  // Used only for the video title and channel; the transcript is pasted.
  await probe('YouTube oEmbed', 'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DHeQX2HjkcNo&format=json', (response, body) => {
    if (!response.ok) return `HTTP ${response.status}`;
    try { return JSON.parse(body).title ? '' : 'no title in oEmbed record'; } catch { return 'oEmbed was not JSON'; }
  });

  report.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.label + ' — ' + r.detail));
  const failed = report.filter(r => !r.ok);
  if (failed.length) console.error('Source reachability FAIL: ' + failed.map(r => r.label).join(', '));
  else console.log('Source reachability PASS: arXiv paper HTML, reader service, and YouTube oEmbed are readable from this origin.');
})().catch(error => console.error('Source reachability FAIL:', error));
