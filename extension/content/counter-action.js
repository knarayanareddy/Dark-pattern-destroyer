// counter-action.js

class CounterActionEngine {
  constructor() {
    this.actionLog = [];
  }

  async executeCounterAction(element, patternType, confidence) {
    console.log(`[DPD Engine] Action requested for: ${patternType}`, element);
    switch (patternType) {
      case 'PRE_TICKED_CONSENT':
        this.uncheckConsentBox(element);
        break;
      case 'HIDDEN_EXIT_PATH':
        this.revealAndHighlightExitPath(element);
        break;
      case 'ROACH_MOTEL':
        await this.planCancelJourney(window.location.href);
        break;
      case 'CONFIRM_SHAME':
      case 'CONFIRM_SHAMING':
        this.neutralizeShameText(element);
        break;
      case 'URGENCY_SCARCITY':
      case 'FAKE_COUNTDOWN':
      case 'FAKE_URGENCY':
        this.exposeUrgencyFallacy(element);
        break;
      case 'HIDDEN_COST':
      case 'PRICE_INJECTION':
        this.flagAndHighlightCostDelta(element);
        break;
      case 'TRICK_QUESTION':
        this.rewriteToPlainLanguage(element);
        break;
      default:
        console.warn(`[DPD Engine] Unrecognized pattern type: ${patternType}`);
        this.addVisualBadge(element, `🛡️ Element neutralized (${patternType})`);
    }
    this.logAction(patternType, element);
  }

  // ===== SPECIFIC COUNTER-ACTIONS =====

  uncheckConsentBox(checkbox) {
    checkbox.checked = false;
    checkbox.setAttribute('data-user-set', 'dpd-unchecked');
    this.addVisualBadge(checkbox, '🛡️ Auto-unchecked: Pre-ticked marketing consent removed');
  }

  revealAndHighlightExitPath(element) {
    element.style.opacity = '1';
    element.style.visibility = 'visible';
    element.style.fontSize = '14px';
    element.style.color = '#ff4444';
    element.style.border = '2px dashed #ff4444';
    element.style.padding = '6px 12px';
    element.style.borderRadius = '6px';
    element.style.fontWeight = 'bold';
    element.style.display = 'inline-block';
    element.style.background = '#ffebee';
    this.addVisualBadge(element, '🛡️ Hidden cancel option revealed and restored');
  }

  neutralizeShameText(element) {
    const original = element.innerText;
    element.setAttribute('data-original-text', original);
    element.innerText = 'No thanks, continue to checkout';
    element.style.color = '#888';
    element.style.textDecoration = 'none';
    element.style.border = '1px solid #ccc';
    element.style.background = '#f9f9f9';
    this.addVisualBadge(element, `🛡️ Steer-prevention: Shaming text neutralized`);
  }

  exposeUrgencyFallacy(element) {
    element.style.textDecoration = 'line-through';
    element.style.opacity = '0.5';

    // Prevent duplicate warnings
    const existing = element.parentNode.querySelector('.dpd-urgency-warning');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.className = 'dpd-urgency-warning';
    badge.style.fontSize = '12px';
    badge.style.color = '#e65100';
    badge.style.background = '#fff3e0';
    badge.style.border = '1px solid #ffe0b2';
    badge.style.padding = '6px 10px';
    badge.style.borderRadius = '4px';
    badge.style.marginTop = '6px';
    badge.style.fontWeight = 'bold';
    badge.style.display = 'inline-block';
    badge.innerHTML = `⚠️ Manipulative urgency: Timer resets on refresh.`;
    
    element.parentNode.insertBefore(badge, element.nextSibling);
  }

  flagAndHighlightCostDelta(element) {
    element.style.color = '#ff4444';
    element.style.fontWeight = '800';
    element.style.border = '2px dashed #ff4444';
    element.style.padding = '4px';
    element.style.borderRadius = '4px';
    element.style.display = 'inline-block';
    this.addVisualBadge(element, '⚠️ Injected cost: Extra service fee sneaked in');
  }

  rewriteToPlainLanguage(element) {
    element.style.border = '2px dashed #ffbb33';
    this.addVisualBadge(element, '⚠️ Trick question: Complex syntax parsed');
  }

  addVisualBadge(element, message) {
    console.log(`[DPD Action] ${message}`);
    
    // Remove duplicate action badge if already added
    const targetKey = element.id || element.className || 'element';
    const existing = element.parentNode.querySelector(`.dpd-action-badge[data-target="${targetKey}"]`);
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.className = 'dpd-action-badge';
    badge.setAttribute('data-target', targetKey);
    badge.style.fontSize = '11px';
    badge.style.color = '#2e7d32';
    badge.style.background = '#e8f5e9';
    badge.style.border = '1px solid #c8e6c9';
    badge.style.padding = '4px 8px';
    badge.style.borderRadius = '4px';
    badge.style.marginTop = '6px';
    badge.style.display = 'inline-block';
    badge.style.fontWeight = 'bold';
    badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    badge.innerText = message;
    
    // Insert after element
    if (element.nextSibling) {
      element.parentNode.insertBefore(badge, element.nextSibling);
    } else {
      element.parentNode.appendChild(badge);
    }
  }

  logAction(type, element) {
      this.actionLog.push({ type, element, timestamp: new Date() });
  }

  // ===== THE CROWN JEWEL: CANCEL JOURNEY PLANNER =====
  async planCancelJourney(currentUrl) {
    // Send to backend for agentic planning
    const response = await fetch('http://localhost:8000/api/plan-cancel-journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentUrl,
        dom_snapshot: document.body.innerHTML.slice(0, 50000),
        goal: 'Find the account cancellation or unsubscription path'
      })
    });

    const plan = await response.json();
    this.displayCancelJourneyMap(plan);

    if (plan.auto_navigable && plan.confidence > 0.9) {
      this.showAutoNavigatePrompt(plan);
    }
  }

  displayCancelJourneyMap(plan) {
      console.log("[DPD] Cancel Journey Plan:", plan);
  }

  showAutoNavigatePrompt(plan) {
    const prompt = document.createElement('div');
    prompt.className = 'dpd-action-panel';
    prompt.innerHTML = `
        <div class="dpd-panel-header"> 🛡️ Dark Pattern Destroyer — Cancel Path Found </div> 
        <div class="dpd-panel-body"> 
            <p>Found cancel path in <strong>${plan.steps.length} steps</strong></p> 
            <p>We can auto-navigate for you, skipping all guilt-trip screens.</p> 
            <button id="dpd-auto-cancel">🚀 Auto-Cancel Now</button> 
            <button id="dpd-show-steps">📍 Show Me the Path</button> 
        </div>`;
    document.body.appendChild(prompt);

    document.getElementById('dpd-auto-cancel').onclick = () => {
      this.executeAutoCancel(plan.steps);
    };
  }

  async executeAutoCancel(steps) {
    for (const step of steps) {
      await this.delay(800); // Human-like pacing

      switch (step.action) {
        case 'CLICK':
          const el = document.querySelector(step.selector) || this.findByText(step.text);
          if (el) el.click();
          break;
        case 'NAVIGATE':
          window.location.href = step.url;
          break;
        case 'WAIT':
          await this.delay(step.duration);
          break;
      }
    }
  }

  delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  findByText(text) {
      return Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes(text));
  }
}
