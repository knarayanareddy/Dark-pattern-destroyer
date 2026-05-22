// dom-analyzer.js

function detectPreTickedCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
  checkboxes.forEach(cb => {
    const isChecked = cb.tagName === 'INPUT' ? cb.checked : cb.getAttribute('aria-checked') === 'true';
    
    if (isChecked && !cb.hasAttribute('data-user-set')) {
      const label = cb.closest('label') || (cb.id ? document.querySelector(`label[for="${cb.id}"]`) : null);
      let labelText = '';
      if (label) {
        labelText = label.innerText;
      } else {
        labelText = cb.getAttribute('aria-label') || cb.getAttribute('name') || cb.parentElement?.innerText || '';
      }
      labelText = labelText.toLowerCase();

      // Flag marketing/tracking opt-ins that are pre-checked
      const suspiciousKeywords = [
        'newsletter', 'marketing', 'offers', 'partners',
        'third party', 'promotional', 'updates', 'sms',
        'subscribe to', 'receive promotions', 'accept tracking',
        'personalize ads', 'share data'
      ];

      if (suspiciousKeywords.some(kw => labelText.includes(kw))) {
        flagElement(cb, 'PRE_TICKED_CONSENT', 'HIGH');
      }
    }
  });
}

function detectHiddenExitPaths() {
  const exitElements = document.querySelectorAll('a, button, [role="button"], [role="link"], [class*="cancel"], [class*="unsubscribe"]');
  exitElements.forEach(el => {
    const styles = window.getComputedStyle(el);
    const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
    const exitKeywords = ['cancel', 'unsubscribe', 'no thanks', 'skip', 'close account', 'delete', 'opt-out'];

    if (exitKeywords.some(kw => text.includes(kw))) {
      // Check if it's visually hidden or obscured
      const color = styles.color.replace(/\s/g, '').toLowerCase();
      const bgColor = styles.backgroundColor.replace(/\s/g, '').toLowerCase();
      const opacity = parseFloat(styles.opacity);
      const fontSize = parseInt(styles.fontSize);
      const visibility = styles.visibility;
      const display = styles.display;
      const height = parseFloat(styles.height);
      const width = parseFloat(styles.width);

      const isHidden =
        color === bgColor ||
        opacity < 0.3 ||
        fontSize < 8 ||
        visibility === 'hidden' ||
        display === 'none' ||
        height < 5 ||
        width < 5;

      if (isHidden) {
        flagElement(el, 'HIDDEN_EXIT_PATH', 'CRITICAL');
        revealElement(el); // Auto-action: make it visible
      }
    }
  });
}

function detectFakeUrgency() {
  // Broaden timer selectors
  const timerSelectors = [
    '[class*="timer"]', '[class*="countdown"]',
    '[id*="timer"]', '[class*="urgency"]',
    'span', 'div', 'p'
  ];

  timerSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Avoid scanning extremely large elements
      if (el.children.length > 5) return;
      
      const text = el.innerText?.trim() || '';
      
      // Match timer regex: e.g. 00:59 or 12h 30m
      const timeRegex = /\b\d{1,2}:\d{2}(:\d{2})?\b/;
      const textRegex = /\b(ends in|hurry|only|expire|limited time|sale ends)\b/i;
      
      if (timeRegex.test(text) || (textRegex.test(text) && /\d+/.test(text))) {
        const timerValue = text;
        const storageKey = `timer_${window.location.hostname}_${el.className}_${el.id}`;
        
        chrome.storage.local.get(storageKey, (data) => {
          if (data[storageKey] === timerValue) {
            flagElement(el, 'FAKE_COUNTDOWN', 'HIGH');
            annotateWithBadge(el, '⚠️ Fake urgency detected: timer resets or is static');
          } else {
            const updates = {};
            updates[storageKey] = timerValue;
            chrome.storage.local.set(updates);
          }
        });
      }
    });
  });
}

function detectConfirmShaming() {
  const elements = document.querySelectorAll('button, a, [role="button"], [class*="btn"], [class*="button"]');
  const shamingPatterns = [
    /no.{0,10}(thanks|thank you).{0,20}(saving|deals|money|discount|saving)/i,
    /i (don'?t|do not) (want|need|care).{0,30}(save|deal|discount|offer)/i,
    /i('?ll)? (pass|skip|miss out)/i,
    /no.{0,5}i('?m)? (fine|ok|good|happy).{0,20}(paying|spending)/i,
    /i prefer paying full price/i,
    /wasting my.*money/i,
    /keep my high price/i,
    /no thanks, i'll pay more/i
  ];

  elements.forEach(el => {
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
    if (shamingPatterns.some(p => p.test(text))) {
      flagElement(el, 'CONFIRM_SHAMING', 'MEDIUM');
      rewriteButtonText(el, text); // Rewrite to neutral language
    }
  });
}

let observedPrices = {};

function detectHiddenCosts() {
  const priceSelectors = [
    '[class*="price"]', '[class*="total"]',
    '[class*="cost"]', '[class*="amount"]'
  ];

  priceSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const price = parseFloat(el.innerText.replace(/[^0-9.]/g, ''));
      if (!isNaN(price)) {
        const key = `${selector}_${el.offsetTop}`;
        if (observedPrices[key] && observedPrices[key] !== price) {
          flagElement(el, 'PRICE_INJECTION', 'CRITICAL');
          annotateWithBadge(el, `💰 Price changed from $${observedPrices[key]} to $${price}`);
        }
        observedPrices[key] = price;
      }
    });
  });
}

// Utility functions to be defined or moved to relevant files
function flagElement(el, type, severity) {
  const finalSeverity = severity || (typeof PatternClassifier !== 'undefined' ? PatternClassifier.getSeverity(type) : 'MEDIUM');
  console.log(`[DPD] Flagged ${type} (${finalSeverity})`, el);
  if (typeof window.flagElement === 'function' && window.flagElement !== flagElement) {
    window.flagElement(el, type, finalSeverity);
  }
}

function revealElement(el) {
  if (!window.dpdAutoNeutralize) return;
  el.style.opacity = '1';
  el.style.visibility = 'visible';
  el.style.display = 'block';
}

function annotateWithBadge(el, msg) {
  if (typeof engine !== 'undefined' && typeof engine.addVisualBadge === 'function') {
    engine.addVisualBadge(el, msg);
  }
}

function rewriteButtonText(btn, text) {
  if (!window.dpdAutoNeutralize) return;
  if (typeof engine !== 'undefined' && typeof engine.neutralizeShameText === 'function') {
    engine.neutralizeShameText(btn);
  }
}

function runAllDetectors(root = document) {
  detectPreTickedCheckboxes();
  detectHiddenExitPaths();
  detectFakeUrgency();
  detectConfirmShaming();
  detectHiddenCosts();
}

