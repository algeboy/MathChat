// Run on local preview: import('/tests/chart-pages.browser.js')
(async () => {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-2000px;width:390px;height:800px';
  document.body.append(frame);
  const routes = ['/MathChat/', '/MathChat/source-categories/', '/MathChat/calls-to-action/', '/MathChat/jobs-and-careers/', '/MathChat/source-timing/'];
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  try {
    for (let i = 0; i < routes.length; i++) {
      await new Promise(resolve => { frame.onload = resolve; frame.src = routes[i]; });
      const doc = frame.contentDocument;
      assert(doc.querySelectorAll('.mathchat-page svg').length === 1, 'One chart on ' + routes[i]);
      const nav = doc.querySelector('.mathchat-chart-nav');
      assert(nav && nav.textContent.includes((i + 1) + ' / 5'), 'Page indicator');
      if (i < 4) assert(nav.querySelector('[rel=next]').getAttribute('href') === routes[i + 1], 'Next arrow destination');
      if (i) assert(nav.querySelector('[rel=prev]').getAttribute('href') === routes[i - 1], 'Previous arrow destination');
      const svg = doc.querySelector('.mathchat-page svg');
      assert(Boolean(svg.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING), 'Arrows follow chart');
      if (i >= 2 && i < 4) {
        const expected = Number(doc.querySelector('[data-source-count]').dataset.sourceCount);
        assert(expected > 0, 'Chart states how many sources it covers');
        assert(doc.querySelectorAll('.topic-source').length === expected, 'All sources shown');
        assert(doc.querySelectorAll('.topic-source circle').length === expected, 'One status marker per source');
        assert(!doc.querySelector('[data-status="no"]'), 'Unknown is not absence');
      }
      if (i === 4) assert(doc.querySelectorAll('.timing-source').length === Number(doc.querySelector('[data-source-count]').dataset.sourceCount), 'All timing rows');
      assert(frame.contentWindow.getComputedStyle(doc.body).backgroundImage.includes('brick-wall.jpeg'), 'Original theme');
    }
    console.log('Chart pages PASS: five routes, one chart per page, ordered arrows, 24 source markers, original theme.');
  } finally { frame.remove(); }
})().catch(error => console.error('Chart pages FAIL:', error));
