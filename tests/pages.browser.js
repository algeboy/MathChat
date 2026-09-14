// Run in a local site's browser console:
// await import('/tests/pages.browser.js')
//
// Network fixtures below stand in for real hosts. Reachability of the real
// hosts is a separate concern, checked by tests/source-reachability.browser.js.
(async () => {
  const frame = document.createElement('iframe');
  frame.src = '/MathChat/score-your-source/';
  frame.style.cssText = 'position:fixed;left:-2000px;width:1000px;height:800px';
  document.body.append(frame);
  await new Promise(resolve => frame.onload = resolve);
  const win = frame.contentWindow, doc = frame.contentDocument;
  const $ = id => doc.getElementById('source-' + id);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const input = (id, value) => { $(id).value = value; $(id).dispatchEvent(new win.Event('input', {bubbles:true})); };
  const settle = async () => { for (let i = 0; i < 80; i++) { await new Promise(r => setTimeout(r, 10)); if (!$('score').disabled) return; } throw new Error('Scoring did not settle'); };
  const text = 'A study measured data and evidence. The result may help improve mathematics education, but bias and risk remain a concern.';
  const realFetch = win.fetch;
  if (document.getElementById('viewpoint-map')) {
    assert(document.querySelectorAll('#viewpoint-map circle').length === 24, '24 original plot markers');
    const filter = document.querySelector('#viewpoint-key [data-filter="research"]');
    filter.click(); assert(filter.getAttribute('aria-pressed') === 'false' && document.querySelector('#viewpoint-map g[data-category="research"]').style.display === 'none', 'Category filter hides markers');
    filter.click(); assert(filter.getAttribute('aria-pressed') === 'true', 'Category filter restores markers');
    assert(getComputedStyle(document.body).backgroundImage.includes('brick-wall.jpeg'), 'Existing brick wall');
    assert(getComputedStyle(document.querySelector('.chalkboard-frame')).backgroundImage.includes('blank.jpg'), 'Existing chalkboard image');
  }
  const saved = win.localStorage.getItem('mathchat-appendix-submissions');
  let alerts = []; win.alert = message => alerts.push(message);
  try {
    assert($('score').textContent.trim() === 'Score this source', 'Action button names the action');

    for (const name of ['arxiv', 'youtube', 'website', 'text']) {
      $('tab-' + name).click();
      assert(doc.querySelectorAll('[role=tabpanel]:not([hidden])').length === 1, 'Exactly one visible panel');
      assert($('tab-' + name).getAttribute('aria-selected') === 'true', name + ' selected');
    }
    $('tab-text').dispatchEvent(new win.KeyboardEvent('keydown', {key:'Home', bubbles:true}));
    assert($('tab-arxiv').getAttribute('aria-selected') === 'true', 'Keyboard Home selects first tab');

    // Personal text, local file, scoring, consent and submission.
    $('tab-text').click();
    const transfer = new win.DataTransfer(); transfer.items.add(new win.File([text], 'test.txt', {type:'text/plain'}));
    $('file').files = transfer.files; $('file').dispatchEvent(new win.Event('change'));
    await new Promise(r => setTimeout(r, 30));
    assert($('personal-text').value === text, 'Local file reading');
    input('personal-text', text); $('score').click(); await settle();
    assert(!$('result').hidden, 'Personal text scores');
    assert($('outlook').textContent === '40' && $('evidence').textContent === '62' && $('reliability').textContent === '64', 'Density-based cue scoring');
    input('submitter', 'MathChat local test'); $('consent').click();
    assert(!$('result').hidden && !$('prepare').disabled, 'Consent keeps result and enables submission');
    $('prepare').click();
    assert($('submission-note').querySelector('a[href^="https://github.com/"]'), 'Prepared issue link');
    input('personal-text', text + ' Changed.'); assert($('result').hidden, 'Editing invalidates result');

    // Length invariance: the same argument at 8x the length must score the same.
    // Checked above 400 words, the point past which the tool stops warning that
    // a source is too short for its cue rates to be stable.
    const read = () => [$('outlook').textContent, $('evidence').textContent, $('reliability').textContent].map(Number);
    const base = (text + ' ').repeat(40);
    input('personal-text', base); $('score').click(); await settle(); const short = read();
    input('personal-text', base.repeat(8)); $('score').click(); await settle(); const long = read();
    assert(short.every((v, i) => Math.abs(v - long[i]) <= 2), 'Scores are length invariant, got ' + short + ' vs ' + long);

    // YouTube: the transcript is pasted, and the video record is best effort.
    $('tab-youtube').click(); input('youtube-url', 'https://www.youtube.com/watch?v=test1234567'); input('youtube-text', text);
    win.fetch = async url => String(url).includes('oembed') ? new win.Response(JSON.stringify({title:'Caption fixture',author_name:'Test channel'})) : Promise.reject(new Error('unexpected host'));
    $('score').click(); await settle();
    assert(!$('result').hidden && $('explanation').textContent.includes('pasted YouTube transcript'), 'Pasted YouTube transcript scores');
    input('youtube-text', ''); $('score').click(); await settle();
    assert($('result').hidden && $('youtube-status').textContent.includes('Show transcript'), 'Missing transcript asks for a paste rather than failing');
    win.fetch = async () => { throw new Error('oEmbed blocked'); };
    input('youtube-text', text); $('score').click(); await settle();
    assert(!$('result').hidden, 'A blocked video title still scores the transcript');

    // Website: direct read, reader-service fallback, then pasting.
    $('tab-website').click(); input('title', ''); input('website-url', 'https://example.org/article');
    win.fetch = async () => new win.Response('<article>' + text + '</article>');
    $('score').click(); await settle();
    assert(!$('result').hidden && $('website-status').textContent.includes('directly'), 'Direct website read scores');
    input('website-url', 'https://example.org/other'); assert(!$('website-text').value, 'URL edit clears fetched text');
    win.fetch = async url => String(url).includes('r.jina.ai')
      ? new win.Response('Title: Fixture\n\nURL Source: https://example.org/other\n\nMarkdown Content:\n' + text + ' [a link](https://example.org/x) ![img](https://example.org/i.png)')
      : Promise.reject(new Error('CORS fixture'));
    $('score').click(); await settle();
    assert(!$('result').hidden && $('website-status').textContent.includes('r.jina.ai'), 'Reader service reads a site that blocks direct access');
    assert($('title').value === 'Fixture', 'Website title comes from the reader record');
    assert(!$('website-text').value.includes('https://'), 'Reader markdown is reduced to prose');
    input('website-url', 'https://example.org/third');
    win.fetch = async () => { throw new Error('CORS fixture'); }; $('score').click(); await settle();
    assert($('result').hidden && $('website-status').textContent.includes('Paste'), 'Blocked website offers fallback');
    input('website-text', text); $('score').click(); await settle(); assert(!$('result').hidden, 'Website pasted fallback scores');

    // arXiv: the paper HTML is the only request, and supplies the record.
    $('tab-arxiv').click(); input('title', ''); input('arxiv-url', 'https://arxiv.org/abs/2401.12345');
    let requested = [];
    win.fetch = async url => { requested.push(String(url)); return new win.Response('<html><body><div class="ltx_document"><h1 class="ltx_title_document">Test paper</h1><span class="ltx_personname">Test Author</span><div class="ltx_abstract">Abstract only</div>' + text.repeat(15) + '</div></body></html>'); };
    $('score').click(); await settle();
    assert(!$('result').hidden && $('explanation').textContent.includes('complete arXiv'), 'arXiv full paper scores');
    assert(requested.length === 1 && requested[0].includes('arxiv.org/html'), 'Only the CORS-readable arXiv HTML is requested');
    assert($('title').value === 'Test paper', 'Title comes from the paper HTML');
    assert($('arxiv-status').textContent.includes('Test Author'), 'Authors come from the paper HTML');
    input('arxiv-url', 'https://arxiv.org/abs/2401.12346');
    win.fetch = async () => { throw new Error('Blocked fixture'); }; $('score').click(); await settle();
    assert($('result').hidden, 'Failed arXiv never scores stale text or abstract');
    assert($('arxiv-status').textContent.includes('Paste'), 'Failed arXiv offers a paste fallback');
    input('arxiv-text', text.repeat(3)); $('score').click(); await settle();
    assert(!$('result').hidden && $('explanation').textContent.includes('pasted arXiv'), 'Pasted arXiv paper text scores');

    console.log('MathChat PASS: tabs, original scoring, consent, submission preview, invalidation, YouTube paste, website direct/reader/paste, arXiv HTML/paste.');
  } finally {
    win.fetch = realFetch;
    if (saved === null) win.localStorage.removeItem('mathchat-appendix-submissions'); else win.localStorage.setItem('mathchat-appendix-submissions', saved);
    frame.remove();
  }
})().catch(error => console.error('MathChat FAIL:', error));
