// Run from the built site's console: import('/tests/source-directory.browser.js')
(async () => {
  const key = 'mathchat-appendix-submissions';
  const saved = localStorage.getItem(key);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-2000px;width:390px;height:800px';
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    localStorage.setItem(key, JSON.stringify([
      {title:'A personal statement',submitterName:'Test submitter',excerpt:'<script>not executable</script> A personal statement.',sourceType:'text',consent:true},
      {title:'A video',submitterName:'Video submitter',sourceType:'youtube',sourceUrl:'https://youtu.be/test1234567',submissionConfirmed:true},
      {title:'Unconfirmed draft',sourceType:'text'},
      {title:'Unsafe link',sourceType:'website',sourceUrl:'javascript:alert(1)',consent:true}
    ]));
    frame.src = '/MathChat/sources/'; document.body.append(frame);
    await new Promise(resolve => frame.onload = resolve);
    const doc = frame.contentDocument;
    const expected = Number(doc.querySelector('.mathchat-source-list').dataset.sourceCount);
    check(expected > 0, 'Directory states how many sources it lists');
    check(doc.querySelectorAll('.mathchat-source-list .mathchat-source-entry').length === expected, 'Every public source listed');
    const local = doc.getElementById('mathchat-local-sources');
    check(local.textContent.includes('Test submitter'), 'Personal statement attribution');
    check(local.textContent.includes('<script>not executable</script>'), 'Statement rendered as text');
    check(!local.querySelector('script'), 'No source HTML execution');
    check(!local.textContent.includes('Unconfirmed draft'), 'Unconfirmed draft excluded');
    check(local.querySelector('a[href="https://youtu.be/test1234567"]'), 'Saved YouTube URL');
    check(!local.querySelector('a[href^="javascript:"]'), 'Unsafe link excluded');
    check(getComputedStyle(doc.body).backgroundImage.includes('brick-wall.jpeg'), 'Existing site background');
    console.log('Source directory PASS: public entries, local statements, attribution, safe links, draft exclusion, existing theme.');
  } finally {
    if (saved === null) localStorage.removeItem(key); else localStorage.setItem(key, saved);
    frame.remove();
  }
})().catch(error => console.error('Source directory FAIL:', error));
