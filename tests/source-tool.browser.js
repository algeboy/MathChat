// Run in a local site's browser console:
// await import('/tests/source-tool.browser.js')
(async () => {
  const frame = document.createElement('iframe');
  frame.src = '/docs/score-your-source.html';
  frame.style.cssText = 'position:fixed;left:-2000px;width:1000px;height:800px';
  document.body.append(frame);
  await new Promise(resolve => frame.onload = resolve);
  const win = frame.contentWindow, doc = frame.contentDocument;
  const $ = id => doc.getElementById('source-' + id);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const input = (id, value) => { $(id).value = value; $(id).dispatchEvent(new win.Event('input', {bubbles:true})); };
  const settle = async () => { for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 10)); if (!$('score').disabled) return; } throw new Error('Explore did not settle'); };
  const text = 'A study measured data and evidence. The result may help improve mathematics education, but bias and risk remain a concern.';
  if (document.getElementById('chart')) {
    assert(document.querySelectorAll('#chart circle').length === 24, '24 original plot markers');
    assert(document.querySelector('#chart circle title').textContent === 'Su: outlook 82; evidence 35; reliability 60', 'Plot tooltip intact');
    assert(document.querySelectorAll('.histogram-row').length === 3, 'Concern histogram intact');
    assert(document.documentElement.scrollWidth <= innerWidth, 'No page overflow');
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
    assert($('outlook').textContent === '40' && $('evidence').textContent === '62' && $('reliability').textContent === '64', 'Density-based cue scoring');
    input('submitter', 'MathChat local test'); $('consent').click();
    assert(!$('result').hidden && !$('prepare').disabled, 'Consent keeps result and enables submission');
    $('prepare').click();
    assert($('submission-note').querySelector('a[href^="https://github.com/"]'), 'Prepared issue link');
    input('personal-text', text + ' Changed.'); assert($('result').hidden, 'Editing invalidates result');
    $('tab-youtube').click(); input('youtube-url', 'https://www.youtube.com/watch?v=test1234567'); input('youtube-text', text);
    win.fetch = async () => { throw new Error('oEmbed blocked'); };
    $('score').click(); await settle();
    assert(!$('result').hidden && $('explanation').textContent.includes('transcript'), 'YouTube pasted transcript scores');
    $('tab-website').click(); input('website-url', 'https://example.org/article');
    win.fetch = async () => new win.Response('<article>' + text + '</article>');
    $('score').click(); await settle(); assert(!$('result').hidden, 'Website fetch scores');
    input('website-url', 'https://example.org/other'); assert(!$('website-text').value, 'URL edit clears fetched text');
    win.fetch = async () => { throw new Error('CORS fixture'); }; $('score').click(); await settle();
    assert($('result').hidden && $('website-status').textContent.includes('Paste'), 'Blocked website offers fallback');
    input('website-text', text); $('score').click(); await settle(); assert(!$('result').hidden, 'Website pasted fallback scores');
    $('tab-arxiv').click(); input('arxiv-url', 'https://arxiv.org/abs/2401.12345');
    win.fetch = async () => new win.Response('<html><body><div class="ltx_document"><h1 class="ltx_title_document">Test paper</h1><span class="ltx_personname">Test Author</span>' + text.repeat(15) + '</div></body></html>');
    $('score').click(); await settle(); assert(!$('result').hidden && $('explanation').textContent.includes('complete arXiv'), 'arXiv full paper scores');
    input('arxiv-url', 'https://arxiv.org/abs/2401.12346');
    win.fetch = async () => { throw new Error('Blocked fixture'); }; $('score').click(); await settle();
    assert($('result').hidden, 'Failed arXiv never scores stale text or abstract');
    console.log('Preview PASS: the shared source tool mounts on the docs preview and scores every tab.');
  } finally {
    if (saved === null) win.localStorage.removeItem('mathchat-appendix-submissions'); else win.localStorage.setItem('mathchat-appendix-submissions', saved);
    frame.remove();
  }
})().catch(error => console.error('MathChat FAIL:', error));
