/**
 * Asset Extractors - Design Audit, UX Copy & WCAG 2.2 Accessibility Engine
 */

(function () {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'RUN_DESIGN_AUDIT') {
      const results = runDesignAudit(msg.category || 'usability', msg.depth || 'deep');
      sendResponse({ success: true, results: results });
      return true;
    } else if (msg.action === 'HIGHLIGHT_AUDIT_ELEMENT') {
      highlightElementOnPage(msg.elementSelector);
      sendResponse({ success: true });
    }
  });

  if (window.__assetExtractorDesignAuditLoaded) return;
  window.__assetExtractorDesignAuditLoaded = true;

  function runDesignAudit(category, depth) {
    const issues = [];

    if (category === 'usability' || category === 'all') {
      issues.push(...auditUsability(depth));
    }
    if (category === 'copy' || category === 'all') {
      issues.push(...auditUXCopy(depth));
    }
    if (category === 'accessibility' || category === 'all') {
      issues.push(...auditAccessibility(depth));
    }

    const critical = issues.filter(i => i.severity === 'critical').length;
    const warning = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;

    return {
      category: category,
      depth: depth,
      totalCount: issues.length,
      criticalCount: critical,
      warningCount: warning,
      infoCount: info,
      score: Math.max(0, 100 - (critical * 12 + warning * 5 + info * 2)),
      issues: issues
    };
  }

  // 1. Usability & Layout Audit
  function auditUsability(depth) {
    const list = [];
    const elements = document.querySelectorAll('button, a, input, select, h1, h2, h3, h4, p, img');

    elements.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') return;

      // Check Touch Target Size (< 44px x 44px)
      if ((el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') && (rect.width < 44 || rect.height < 44)) {
        list.push({
          id: 'usa_target_' + index,
          category: 'Usability',
          type: 'Small Touch Target',
          severity: 'warning',
          title: `Touch target size is ${Math.round(rect.width)} × ${Math.round(rect.height)} px`,
          description: 'Interactive buttons and links should be at least 44×44 px for tap accuracy on touch screens.',
          element: getCleanSelector(el),
          snippet: el.outerHTML.substring(0, 120)
        });
      }

      // Check Tiny Font Size (< 12px)
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12 && el.textContent.trim().length > 0) {
        list.push({
          id: 'usa_font_' + index,
          category: 'Usability',
          type: 'Tiny Text Size',
          severity: 'warning',
          title: `Text size is too small (${fontSize}px)`,
          description: 'Font size below 12px impairs readability, especially on high-DPI mobile screens.',
          element: getCleanSelector(el),
          snippet: el.textContent.trim().substring(0, 60)
        });
      }

      // Check Low Line Height
      const lineHeight = parseFloat(style.lineHeight);
      if (!isNaN(lineHeight) && lineHeight < fontSize * 1.2 && el.textContent.trim().length > 60) {
        list.push({
          id: 'usa_line_' + index,
          category: 'Usability',
          type: 'Tight Line Height',
          severity: 'info',
          title: `Line height is tight (${Math.round(lineHeight)}px for ${fontSize}px font)`,
          description: 'Body paragraphs should have a line height of at least 1.4 - 1.6 for comfortable reading.',
          element: getCleanSelector(el),
          snippet: el.textContent.trim().substring(0, 60)
        });
      }
    });

    return list.slice(0, depth === 'deep' ? 30 : 10);
  }

  // 2. UX Copy & Content Audit
  function auditUXCopy(depth) {
    const list = [];
    const vagueCTAs = ['click here', 'read more', 'learn more', 'here', 'link', 'submit', 'button', 'more'];

    // Audit Links & Buttons text
    document.querySelectorAll('a, button, [role="button"]').forEach((el, index) => {
      const text = el.textContent.trim().toLowerCase();
      if (vagueCTAs.includes(text)) {
        list.push({
          id: 'copy_cta_' + index,
          category: 'Copy',
          type: 'Vague CTA Text',
          severity: 'warning',
          title: `Vague CTA label: "${el.textContent.trim()}"`,
          description: 'CTAs should describe the outcome (e.g. "View Pricing" or "Download Report") rather than generic words.',
          element: getCleanSelector(el),
          snippet: el.outerHTML.substring(0, 100)
        });
      }
    });

    // Audit Headings with Empty or Placeholder Text
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, index) => {
      const txt = el.textContent.trim();
      if (txt.length === 0) {
        list.push({
          id: 'copy_h_' + index,
          category: 'Copy',
          type: 'Empty Heading',
          severity: 'critical',
          title: `<${el.tagName.toLowerCase()}> tag is empty`,
          description: 'Empty headings disrupt page hierarchy for screen readers and search engines.',
          element: getCleanSelector(el),
          snippet: el.outerHTML
        });
      } else if (/lorem\s+ipsum|placeholder|test\s+heading|todo/i.test(txt)) {
        list.push({
          id: 'copy_place_' + index,
          category: 'Copy',
          type: 'Placeholder Content',
          severity: 'critical',
          title: `Placeholder text found: "${txt}"`,
          description: 'Remove placeholder copy before launching live to production.',
          element: getCleanSelector(el),
          snippet: txt
        });
      }
    });

    return list.slice(0, depth === 'deep' ? 30 : 10);
  }

  // 3. WCAG 2.2 AA Accessibility Audit
  function auditAccessibility(depth) {
    const list = [];

    // Check Images missing ALT attributes
    document.querySelectorAll('img').forEach((img, index) => {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');
      if (alt === null && role !== 'presentation' && role !== 'none') {
        list.push({
          id: 'a11y_alt_' + index,
          category: 'Accessibility',
          type: 'Missing Image ALT',
          severity: 'critical',
          title: `Image missing alt attribute (${img.src.split('/').pop().substring(0, 25)})`,
          description: 'WCAG 1.1.1 Non-text Content: All <img> tags must have descriptive alt attributes.',
          element: getCleanSelector(img),
          snippet: img.outerHTML.substring(0, 100)
        });
      }
    });

    // Check Form Inputs missing labels
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').forEach((input, index) => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      const parentLabel = input.closest('label');

      if (!hasLabel && !ariaLabel && !parentLabel) {
        list.push({
          id: 'a11y_lbl_' + index,
          category: 'Accessibility',
          type: 'Missing Form Label',
          severity: 'critical',
          title: `Form control missing accessible label (${input.name || input.type || 'input'})`,
          description: 'WCAG 3.3.2 Labels or Instructions: Form fields must have a matching <label> or aria-label.',
          element: getCleanSelector(input),
          snippet: input.outerHTML.substring(0, 100)
        });
      }
    });

    // Check Icon-only buttons missing aria-label
    document.querySelectorAll('button, [role="button"]').forEach((btn, index) => {
      const text = btn.textContent.trim();
      const ariaLabel = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby');
      if (text.length === 0 && !ariaLabel && btn.querySelector('svg, img, i')) {
        list.push({
          id: 'a11y_btn_' + index,
          category: 'Accessibility',
          type: 'Icon Button Missing Label',
          severity: 'warning',
          title: 'Icon-only button has no accessible text or aria-label',
          description: 'WCAG 4.1.2 Name, Role, Value: Buttons without visible text require aria-label for screen readers.',
          element: getCleanSelector(btn),
          snippet: btn.outerHTML.substring(0, 100)
        });
      }
    });

    // Check positive tabindex antipattern
    document.querySelectorAll('[tabindex]').forEach((el, index) => {
      const tabVal = parseInt(el.getAttribute('tabindex'), 10);
      if (tabVal > 0) {
        list.push({
          id: 'a11y_tab_' + index,
          category: 'Accessibility',
          type: 'Positive Tabindex',
          severity: 'info',
          title: `Element has positive tabindex="${tabVal}"`,
          description: 'WCAG 2.4.3 Focus Order: Avoid positive tabindex values as they break natural keyboard navigation.',
          element: getCleanSelector(el),
          snippet: el.outerHTML.substring(0, 80)
        });
      }
    });

    return list.slice(0, depth === 'deep' ? 30 : 10);
  }

  function getCleanSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const cls = el.className.trim().split(/\s+/)[0];
      if (cls) return `${el.tagName.toLowerCase()}.${cls}`;
    }
    return el.tagName.toLowerCase();
  }

  function highlightElementOnPage(selector) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldOutline = el.style.outline;
        el.style.outline = '4px solid #ea2b2b';
        setTimeout(() => {
          el.style.outline = oldOutline;
        }, 3000);
      }
    } catch (e) {}
  }
})();
