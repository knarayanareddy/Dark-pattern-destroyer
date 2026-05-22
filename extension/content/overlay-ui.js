// overlay-ui.js

class DarkPatternOverlay {
  constructor() {
    this.activeAnnotations = new Map();
    this.hud = null;
    this.initHUD();
  }

  initHUD() {
    // Inject persistent HUD (bottom-right corner)
    this.hud = document.createElement('div');
    this.hud.id = 'dpd-hud';
    this.hud.innerHTML = `
        <div class="dpd-hud-header"> 🛡️ Dark Pattern Destroyer </div> 
        <div class="dpd-hud-stats"> 
            <div class="dpd-stat-row"><span>Detected:</span> <span class="dpd-stat-value" id="dpd-pattern-count">0 patterns</span></div> 
            <div class="dpd-stat-row"><span>Blocked / Fixed:</span> <span class="dpd-stat-value" id="dpd-blocked-count">0 blocked</span></div> 
            <div class="dpd-stat-row"><span>Trust Index:</span> <span class="dpd-stat-value" id="dpd-trust-score" style="font-weight: 800;">Trust: Analyzing...</span></div> 
        </div> 
        <div class="dpd-hud-actions"> 
            <button id="dpd-show-report">Full Report</button> 
            <button id="dpd-fight-back">⚔️ Fight Back Mode</button> 
        </div>`;
    document.body.appendChild(this.hud);

    // Register button handlers
    this.hud.querySelector('#dpd-show-report').addEventListener('click', () => {
        const patterns = [];
        this.activeAnnotations.forEach((tooltip, el) => {
            const header = tooltip.querySelector('.dpd-tooltip-header')?.innerText || 'PATTERN';
            const body = tooltip.querySelector('.dpd-tooltip-body')?.innerText || 'Description';
            let severity = 'LOW';
            if (el.classList.contains('dpd-flagged-critical')) severity = 'CRITICAL';
            else if (el.classList.contains('dpd-flagged-high')) severity = 'HIGH';
            else if (el.classList.contains('dpd-flagged-medium')) severity = 'MEDIUM';
            
            patterns.push({
                id: Math.random().toString(),
                type: header.replace(/ /g, '_'),
                description: body,
                severity: severity,
                element: el
            });
        });
        this.showFullReport(patterns);
    });

    this.hud.querySelector('#dpd-fight-back').addEventListener('click', () => {
        if (typeof engine !== 'undefined') {
            engine.planCancelJourney(window.location.href);
        } else {
            console.error("[DPD] CounterActionEngine not initialized");
        }
    });
  }

  updateTrustScore(patterns) {
    const score = this.calculateTrustScore(patterns);
    const scoreEl = document.getElementById('dpd-trust-score');
    if (scoreEl) {
        scoreEl.textContent = `${score}/100`;
        scoreEl.style.color = score > 80 ? '#00ff88' : score > 50 ? '#ffaa00' : '#ff4444';
    }
  }

  calculateTrustScore(patterns) {
    const deductions = { 'CRITICAL': 25, 'HIGH': 15, 'MEDIUM': 8, 'LOW': 3 };
    let score = 100;
    patterns.forEach(p => { score -= (deductions[p.severity] || 5); });
    return Math.max(0, score);
  }

  addAnnotation(element, patternType, severity, message) {
    // Prevent duplicate annotations on the same element
    if (this.activeAnnotations.has(element)) {
        return;
    }

    element.classList.add(`dpd-flagged-${severity.toLowerCase()}`);

    const tooltip = document.createElement('div');
    tooltip.className = `dpd-tooltip dpd-severity-${severity.toLowerCase()}`;
    tooltip.innerHTML = `
      <div class="dpd-tooltip-header" style="font-weight: 800; font-size: 13px; margin-bottom: 6px; color: #ff4444;">
        ⚠️ ${patternType.replace(/_/g, ' ')}
      </div>
      <div class="dpd-tooltip-body" style="font-size: 11px; line-height: 1.4; color: #444; margin-bottom: 8px;">${message}</div>
      <div class="dpd-tooltip-actions" style="display: flex; gap: 6px;">
        <button class="dpd-btn-action" style="flex: 1; background: #e91e63; color: white; border: none; font-size: 10px; padding: 4px; border-radius: 4px; cursor: pointer; font-weight: bold;">🛡️ Fix This</button>
        <button class="dpd-btn-info" style="background: #e0e0e0; color: #333; border: none; font-size: 10px; padding: 4px; border-radius: 4px; cursor: pointer;">ℹ️ Details</button>
        <button class="dpd-btn-dismiss" style="background: transparent; color: #777; border: none; font-size: 10px; cursor: pointer;">✕ Dismiss</button>
      </div>
    `;

    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.zIndex = '2147483646';
    tooltip.style.background = 'white';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
    tooltip.style.border = '1px solid #ddd';
    tooltip.style.width = '220px';

    document.body.appendChild(tooltip);
    this.activeAnnotations.set(element, tooltip);

    // Wire up buttons!
    tooltip.querySelector('.dpd-btn-dismiss').addEventListener('click', () => {
        tooltip.remove();
        this.activeAnnotations.delete(element);
        element.classList.remove(`dpd-flagged-${severity.toLowerCase()}`);
        this.updateHUDStats();
    });

    tooltip.querySelector('.dpd-btn-action').addEventListener('click', () => {
        if (typeof engine !== 'undefined') {
            engine.executeCounterAction(element, patternType, 1.0);
        }
        tooltip.remove();
        this.activeAnnotations.delete(element);
        element.classList.remove(`dpd-flagged-${severity.toLowerCase()}`);
        this.updateHUDStats();
        
        // Update stats
        const blockedEl = document.getElementById('dpd-blocked-count');
        if (blockedEl) {
            const count = parseInt(blockedEl.textContent) || 0;
            blockedEl.textContent = `${count + 1} blocked`;
        }
    });

    tooltip.querySelector('.dpd-btn-info').addEventListener('click', () => {
        alert(`🛡️ Dark Pattern Detail — ${patternType.replace(/_/g, ' ')}\n\nDescription:\n${message}\n\nSeverity: ${severity}\n\nCounteraction:\nClick "Fix This" to automatically neutralize this psychological steering attempt.`);
    });

    this.updateHUDStats();
  }

  updateHUDStats() {
    const patterns = Array.from(this.activeAnnotations.keys()).map(el => {
        let severity = 'LOW';
        if (el.classList.contains('dpd-flagged-critical')) severity = 'CRITICAL';
        else if (el.classList.contains('dpd-flagged-high')) severity = 'HIGH';
        else if (el.classList.contains('dpd-flagged-medium')) severity = 'MEDIUM';
        return { severity };
    });

    const countEl = document.getElementById('dpd-pattern-count');
    if (countEl) countEl.textContent = `${patterns.length} patterns`;

    this.updateTrustScore(patterns);
  }

  showFullReport(allPatterns) {
    // Remove existing report if present
    const existing = document.querySelector('.dpd-report-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'dpd-report-modal';
    
    // Add custom premium glassmorphism styling
    modal.style.position = 'fixed';
    modal.style.top = '10%';
    modal.style.left = '50%';
    modal.style.transform = 'translateX(-50%)';
    modal.style.width = '480px';
    modal.style.maxHeight = '70vh';
    modal.style.overflowY = 'auto';
    modal.style.background = 'rgba(20, 20, 20, 0.95)';
    modal.style.color = 'white';
    modal.style.borderRadius = '16px';
    modal.style.padding = '24px';
    modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
    modal.style.zIndex = '2147483647';
    modal.style.fontFamily = "system-ui, -apple-system, sans-serif";
    modal.style.border = '1px solid #333';
    modal.style.backdropFilter = 'blur(10px)';

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
        <h2 style="margin:0; font-size: 20px; font-weight:800; color:#e91e63;">🛡️ Dark Pattern Report</h2>
        <span style="font-size: 11px; background:#333; padding: 4px 8px; border-radius: 20px; color:#aaa;">${window.location.hostname}</span>
      </div>
      <p style="font-size: 13px; color:#aaa; margin-bottom: 20px;">
        Trust Score: <span style="font-weight:800; font-size:16px; color:${this.calculateTrustScore(allPatterns) > 70 ? '#00ff88' : '#ffaa00'};">${this.calculateTrustScore(allPatterns)}/100</span>
      </p>
      
      <div class="dpd-pattern-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px; max-height: 40vh; overflow-y:auto; padding-right:6px;">
        ${allPatterns.length === 0 ? '<div style="text-align:center; padding:20px; color:#777; font-size:13px;">No active patterns detected. Excellent!</div>' : 
        allPatterns.map(p => `
          <div class="dpd-pattern-item" style="background:#1e1e1e; padding:12px; border-radius:8px; border-left: 4px solid ${p.severity === 'CRITICAL' ? '#ff4444' : p.severity === 'HIGH' ? '#ffaa00' : '#4444ff'};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-weight:700; font-size:12px; text-transform:uppercase; color:#fff;">${p.type.replace(/_/g, ' ')}</span>
              <span style="font-size:9px; background:${p.severity === 'CRITICAL' ? '#ff4444' : p.severity === 'HIGH' ? '#ffaa00' : '#4444ff'}; color:white; padding:2px 6px; border-radius:4px; font-weight:700;">${p.severity}</span>
            </div>
            <div style="font-size:11px; color:#ccc; margin-bottom:8px;">${p.description}</div>
            <button class="dpd-fix-single-btn" data-id="${p.id}" style="background:#e91e63; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold;">🛡️ Neutralize Element</button>
          </div>
        `).join('')}
      </div>
      
      <div class="dpd-report-actions" style="display:flex; gap:10px; border-top:1px solid #333; padding-top:16px;">
        <button id="dpd-fix-all" style="flex:1; background:#00ff88; color:black; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">🚀 Neutralize All Patterns</button>
        <button id="dpd-close-report" style="background:#333; color:white; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; font-size:12px;">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Register modal handlers
    modal.querySelector('#dpd-close-report').addEventListener('click', () => {
        modal.remove();
    });

    // Fix All Handler
    modal.querySelector('#dpd-fix-all').addEventListener('click', () => {
        if (typeof engine !== 'undefined') {
            this.activeAnnotations.forEach((tooltip, element) => {
                // Find pattern type
                const header = tooltip.querySelector('.dpd-tooltip-header')?.innerText?.replace('⚠️ ', '') || '';
                engine.executeCounterAction(element, header.replace(/ /g, '_'), 1.0);
                tooltip.remove();
                element.classList.remove('dpd-flagged-critical', 'dpd-flagged-high', 'dpd-flagged-medium', 'dpd-flagged-low');
            });
            this.activeAnnotations.clear();
            this.updateHUDStats();
            
            // Increment blocked count on HUD
            const blockedEl = document.getElementById('dpd-blocked-count');
            if (blockedEl) {
                blockedEl.textContent = 'All blocked';
            }
        }
        modal.remove();
    });

    // Fix Single Handler
    modal.querySelectorAll('.dpd-fix-single-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            const p = allPatterns[idx];
            if (p && typeof engine !== 'undefined') {
                engine.executeCounterAction(p.element, p.type, 1.0);
                const tooltip = this.activeAnnotations.get(p.element);
                if (tooltip) tooltip.remove();
                this.activeAnnotations.delete(p.element);
                p.element.classList.remove('dpd-flagged-critical', 'dpd-flagged-high', 'dpd-flagged-medium', 'dpd-flagged-low');
                this.updateHUDStats();
            }
            btn.parentElement.remove();
            if (modal.querySelectorAll('.dpd-pattern-item').length === 0) {
                modal.querySelector('.dpd-pattern-list').innerHTML = '<div style="text-align:center; padding:20px; color:#777; font-size:13px;">No active patterns detected. Excellent!</div>';
            }
        });
    });
  }
}
