/**
 * Asset Extractors - Link & Button Redirection Health Checker
 * Scans all links, buttons, and redirection targets on the active webpage
 */

(function () {
  if (window.__assetLinkCheckerLoaded) return;
  window.__assetLinkCheckerLoaded = true;

  window.scanAndCheckLinks = async function (options = {}) {
    const baseUri = window.location.href;
    const links = [];
    const seen = new Set();

    // 1. Scan <a> anchor links
    const anchorElements = document.querySelectorAll('a[href]');
    anchorElements.forEach((el, index) => {
      const rawHref = el.getAttribute('href');
      if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('#')) return;

      try {
        const fullUrl = new URL(rawHref, baseUri).href;
        const key = fullUrl + '::' + (el.innerText || '');
        if (seen.has(key)) return;
        seen.add(key);

        const text = el.innerText.trim() || el.getAttribute('title') || el.getAttribute('aria-label') || el.querySelector('img')?.getAttribute('alt') || '[Image/Icon Link]';
        const isExternal = new URL(fullUrl).origin !== window.location.origin;

        links.push({
          id: 'link_' + (index + 1),
          type: 'anchor',
          label: text.substring(0, 80),
          url: fullUrl,
          rawHref: rawHref,
          isExternal: isExternal,
          target: el.getAttribute('target') || '_self',
          status: 'pending', // 'checking', 'ok', 'redirect', 'broken'
          statusCode: 0,
          statusText: 'Pending check',
          redirectUrl: null,
          responseTimeMs: 0
        });
      } catch (e) {}
    });

    // 2. Scan <button> and role="button" elements
    const buttonElements = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
    buttonElements.forEach((el, index) => {
      let targetUrl = el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('onclick');
      let formAction = el.form ? el.form.getAttribute('action') : null;
      let url = targetUrl || formAction;

      if (url && typeof url === 'string' && !url.startsWith('javascript:')) {
        try {
          const fullUrl = new URL(url, baseUri).href;
          const key = fullUrl + '::btn::' + (el.innerText || '');
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              id: 'btn_' + (index + 1),
              type: 'button',
              label: (el.innerText || el.getAttribute('value') || el.getAttribute('aria-label') || 'Button Action').trim().substring(0, 80),
              url: fullUrl,
              rawHref: url,
              isExternal: new URL(fullUrl).origin !== window.location.origin,
              target: '_self',
              status: 'pending',
              statusCode: 0,
              statusText: 'Pending check',
              redirectUrl: null,
              responseTimeMs: 0
            });
          }
        } catch (e) {}
      }
    });

    return links;
  };

  /**
   * Check link status via fetch
   */
  window.checkSingleLinkStatus = async function (linkObj) {
    const startTime = performance.now();
    try {
      const response = await fetch(linkObj.url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        redirect: 'follow'
      });

      const elapsed = Math.round(performance.now() - startTime);
      linkObj.responseTimeMs = elapsed;

      // In no-cors mode, type is opaque and status is 0 (valid working cross-origin link)
      if (response.type === 'opaque' || response.status === 200 || (response.status >= 200 && response.status < 400)) {
        linkObj.status = 'ok';
        linkObj.statusCode = response.status || 200;
        linkObj.statusText = response.statusText || '200 OK (Active)';
        if (response.redirected && response.url !== linkObj.url) {
          linkObj.status = 'redirect';
          linkObj.redirectUrl = response.url;
          linkObj.statusText = `Redirected (${response.status || 301})`;
        }
      } else if (response.status >= 400) {
        linkObj.status = 'broken';
        linkObj.statusCode = response.status;
        linkObj.statusText = `${response.status} Error`;
      }
    } catch (err) {
      // If HEAD is blocked, retry with GET
      try {
        const getResp = await fetch(linkObj.url, { method: 'GET', mode: 'no-cors' });
        linkObj.responseTimeMs = Math.round(performance.now() - startTime);
        linkObj.status = 'ok';
        linkObj.statusCode = 200;
        linkObj.statusText = '200 OK (Unbroken)';
      } catch (getErr) {
        linkObj.responseTimeMs = Math.round(performance.now() - startTime);
        linkObj.status = 'broken';
        linkObj.statusCode = 404;
        linkObj.statusText = 'Unreachable / Broken';
      }
    }
    return linkObj;
  };
})();
