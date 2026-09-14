// Run in a local site's browser console:
// await import('/tests/source-tool.browser.js')
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
  const settle = async () => { for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 10)); if (!$('score').disabled) return; } throw new Error('Explore did not settle'); };
  const text = 'A study measured data and evidence. The result may help improve mathematics education, but bias and risk remain a concern.';
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
    for (const name of ['arxiv', 'youtube', 'website', 'text']) {
      $('tab-' + name).click();
      assert(doc.querySelectorAll('[role=tabpanel]:not([hidden])').length === 1, 'Exactly one visible panel');
      assert($('tab-' + name).getAttribute('aria-selected') === 'true', name + ' selected');
    }
    $('tab-text').dispatchEvent(new win.KeyboardEvent('keydown', {key:'Home', bubbles:true}));
    assert($('tab-arxiv').getAttribute('aria-selected') === 'true', 'Keyboard Home selects first tab');
    $('tab-text').click();
    const transfer = new win.DataTransfer(); transfer.items.add(new win.File([text], 'test.txt', {type:'text/plain'}));
    $('file').files = transfer.files; $('file').dispatchEvent(new win.Event('change'));
    await new Promise(r => setTimeout(r, 30));
    assert($('personal-text').value === text, 'Local file reading');
    input('personal-text', text); $('score').click(); await settle();
    assert(!$('result').hidden, 'Personal text scores');
    assert($('outlook').textContent === '45' && $('evidence').textContent === '63' && $('reliability').textContent === '55', 'Original cue scoring preserved');
    input('submitter', 'MathChat local test'); $('consent').click();
    assert(!$('result').hidden && !$('prepare').disabled, 'Consent keeps result and enables submission');
    $('prepare').click();
    assert($('submission-note').querySelector('a[href^="https://github.com/"]'), 'Prepared issue link');
    input('personal-text', text + ' Changed.'); assert($('result').hidden, 'Editing invalidates result');
    $('tab-youtube').click(); input('youtube-url', 'https://www.youtube.com/watch?v=test1234567'); input('youtube-text', text); $('score').click(); await settle();
    assert(!$('result').hidden && $('explanation').textContent.includes('transcript'), 'YouTube transcript scores');
    $('tab-youtube').click(); input('youtube-text', '');
    win.fetch = async url => new win.Response(String(url).includes('oembed') ? JSON.stringify({title:'Caption fixture',author_name:'Test channel'}) : '<transcript><text>' + text.repeat(4) + '</text></transcript>');
    $('score').click(); await settle(); assert(!$('result').hidden && $('explanation').textContent.includes('public YouTube'), 'Existing automatic YouTube captions');
    $('tab-website').click(); input('website-url', 'https://example.org/article');
    win.fetch = async () => new win.Response('<article>' + text + '</article>');
    $('score').click(); await settle(); assert(!$('result').hidden, 'Website fetch scores');
    input('website-url', 'https://example.org/other'); assert(!$('website-text').value, 'URL edit clears fetched text');
    win.fetch = async () => { throw new Error('CORS fixture'); }; $('score').click(); await settle();
    assert($('result').hidden && $('website-status').textContent.includes('Paste'), 'Blocked website offers fallback');
    input('website-text', text); $('score').click(); await settle(); assert(!$('result').hidden, 'Website pasted fallback scores');
    $('tab-arxiv').click(); input('arxiv-url', 'https://arxiv.org/abs/2401.12345');
    win.fetch = async url => new win.Response(String(url).includes('export.arxiv') ? '<feed><entry><title>Test paper</title><summary>Abstract only</summary><author><name>Test Author</name></author></entry></feed>' : '<main>' + text.repeat(15) + '</main>');
    $('score').click(); await settle(); assert(!$('result').hidden && $('explanation').textContent.includes('complete arXiv'), 'arXiv full paper scores');
    input('arxiv-url', 'https://arxiv.org/abs/2401.12346');
    win.fetch = async () => { throw new Error('Blocked fixture'); }; $('score').click(); await settle();
    assert($('result').hidden, 'Failed arXiv never scores stale text or abstract');
    console.log('MathChat PASS: tabs, original scoring, consent, submission preview, invalidation, YouTube transcript, website success/fallback, arXiv success/failure.');
  } finally {
    if (saved === null) win.localStorage.removeItem('mathchat-appendix-submissions'); else win.localStorage.setItem('mathchat-appendix-submissions', saved);
    frame.remove();
  }
})().catch(error => console.error('MathChat FAIL:', error));
