// dom-analyzer.js

function detectPreTickedCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    if (cb.checked && !cb.hasAttribute('data-user-set')) {
      const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
      const labelText = label?.innerText?.toLowerCase() || '';

      // Flag marketing/tracking opt-ins that are pre-checked
      const suspiciousKeywords = [
        'newsletter', 'marketing', 'offers', 'partners',
        'third party', 'promotional', 'updates', 'sms'
      ];

      if (suspiciousKeywords.some(kw => labelText.includes(kw))) {
        flagElement(cb, 'PRE_TICKED_CONSENT', 'HIGH');
      }
    }
  });
}

function detectHiddenExitPaths() {
  const allLinks = document.querySelectorAll('a, button');
  allLinks.forEach(el => {
    const styles = window.getComputedStyle(el);
    const text = el.innerText?.toLowerCase() || '';
    const exitKeywords = ['cancel', 'unsubscribe', 'no thanks', 'skip', 'close account', 'delete'];

    if (exitKeywords.some(kw => text.includes(kw))) {
      // Check if it's visually hidden
      if (
        styles.color === styles.backgroundColor ||
        styles.opacity < 0.3 ||
        parseInt(styles.fontSize) < 8 ||
        styles.visibility === 'hidden' ||
        parseFloat(styles.height) < 5
      ) {
        flagElement(el, 'HIDDEN_EXIT_PATH', 'CRITICAL');
        revealElement(el); // Auto-action: make it visible
      }
    }
  });
}

function detectFakeUrgency() {
  // Detect timer elements
  const timerSelectors = [
    '[class*="timer"]', '[class*="countdown"]',
    '[id*="timer"]', '[class*="urgency"]'
  ];

  timerSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const timerValue = el.innerText;
      chrome.storage.local.get(`timer_${window.location.href}`, (data) => {
        if (data[`timer_${window.location.href}`] === timerValue) {
          flagElement(el, 'FAKE_COUNTDOWN', 'HIGH');
          annotateWithBadge(el, '⚠️ This timer resets — fake urgency');
        } else {
          chrome.storage.local.set({
            [`timer_${window.location.href}`]: timerValue
          });
        }
      });
    });
  });
}

function detectConfirmShaming() {
  const buttons = document.querySelectorAll('button, a, input[type="button"]');
  const shamingPatterns = [
    /no.{0,10}(thanks|thank you).{0,20}(saving|deals|money|discount)/i,
    /i (don'?t|do not) (want|need|care).{0,30}(save|deal|discount|offer)/i,
    /i('?ll)? (pass|skip|miss out)/i,
    /no.{0,5}i('?m)? (fine|ok|good|happy).{0,20}(paying|spending)/i
  ];

  buttons.forEach(btn => {
    const text = btn.innerText?.trim() || '';
    if (shamingPatterns.some(p => p.test(text))) {
      flagElement(btn, 'CONFIRM_SHAMING', 'MEDIUM');
      rewriteButtonText(btn, text); // Rewrite to neutral language
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
