// content.js

let overlay = null;
let engine = null;

async function init() {
    console.log("[DPD] Dark Pattern Destroyer initialized on", window.location.href);
    
    // Load configurations from storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({
            layer1: true,
            layer2: true,
            layer3: true,
            autoNeutralize: true,
            hudEnabled: true,
            allowedDomains: ['example.com', 'localhost']
        }, (settings) => {
            const currentHost = window.location.hostname.toLowerCase();
            const isExempt = settings.allowedDomains.some(d => {
                const cleanedD = d.trim().toLowerCase();
                return currentHost === cleanedD || currentHost.endsWith('.' + cleanedD);
            });

            if (isExempt) {
                console.log(`[DPD] Host ${currentHost} is exempt. Aborting scan.`);
                return;
            }

            // Expose configurations globally for dom-analyzer.js & counter-action.js
            window.dpdAutoNeutralize = settings.autoNeutralize;
            window.dpdLayer1 = settings.layer1;
            window.dpdLayer2 = settings.layer2;
            window.dpdLayer3 = settings.layer3;

            // Instantiate engine first
            engine = new CounterActionEngine();

            // Instantiate HUD if enabled
            if (settings.hudEnabled) {
                overlay = new DarkPatternOverlay();
            }

            // Start Layer 1 heuristics if enabled
            if (settings.layer1) {
                runAllDetectors();
                startMutationWatcher();
            }
        });
    } else {
        // Fallback mockup/development setup
        console.log("[DPD] Chrome storage unavailable, running with all features enabled in mockup mode.");
        window.dpdAutoNeutralize = true;
        window.dpdLayer1 = true;
        window.dpdLayer2 = true;
        window.dpdLayer3 = true;
        
        engine = new CounterActionEngine();
        overlay = new DarkPatternOverlay();
        
        runAllDetectors();
        startMutationWatcher();
    }
}

async function analyzeElementWithVision(element) {
  const rect = element.getBoundingClientRect();
  const screenshotContext = {
    element_bounds: {
      x: rect.left, y: rect.top,
      width: rect.width, height: rect.height
    },
    page_url: window.location.href,
    surrounding_html: element.parentElement?.outerHTML?.slice(0, 2000)
  };

  // Send request to service worker → backend
  chrome.runtime.sendMessage({
    type: 'VISION_ANALYSIS_REQUEST',
    payload: screenshotContext
  }, (response) => {
    if (response && response.is_dark_pattern) {
      if (engine) engine.executeCounterAction(element, response.pattern_type, response.confidence);
      if (overlay) overlay.addAnnotation(element, response.pattern_type, 'HIGH', response.user_impact);
    }
  });
}

// Intercept the flagElement from dom-analyzer.js to add UI annotations
window.flagElement = (el, type, severity) => {
    if (overlay) {
        overlay.addAnnotation(el, type, severity, `Detected potential ${type.replace(/_/g, ' ')}. Severity: ${severity}.`);
    }
    
    // Auto-neutralize if settings allow
    if (window.dpdAutoNeutralize && engine) {
        engine.executeCounterAction(el, type, 1.0);
    }

    // Increment stats in local storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ scannedCount: 0, neutralizedCount: 0 }, (items) => {
            const updates = { scannedCount: items.scannedCount + 1 };
            if (window.dpdAutoNeutralize) {
                updates.neutralizedCount = items.neutralizedCount + 1;
            }
            chrome.storage.local.set(updates);
        });
    }
    
    // If it's highly critical or hidden, optionally run vision scan in background
    if (window.dpdLayer2 && (severity === 'CRITICAL' || type === 'HIDDEN_EXIT_PATH')) {
        // analyzeElementWithVision(el);
    }
};

// Listen to incoming messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STATS') {
        if (!overlay) {
            sendResponse({ critical: 0, high: 0, medium: 0, trustScore: 100 });
            return true;
        }
        const patterns = Array.from(overlay.activeAnnotations.keys()).map(el => {
            let severity = 'LOW';
            if (el.classList.contains('dpd-flagged-critical')) severity = 'CRITICAL';
            else if (el.classList.contains('dpd-flagged-high')) severity = 'HIGH';
            else if (el.classList.contains('dpd-flagged-medium')) severity = 'MEDIUM';
            return { severity };
        });

        const critical = patterns.filter(p => p.severity === 'CRITICAL').length;
        const high = patterns.filter(p => p.severity === 'HIGH').length;
        const medium = patterns.filter(p => p.severity === 'MEDIUM').length;
        const trustScore = overlay.calculateTrustScore(patterns);

        sendResponse({ critical, high, medium, trustScore });
        return true;
    }

    if (request.type === 'EXECUTE_ALL_FIXES') {
        if (overlay && engine) {
            overlay.activeAnnotations.forEach((tooltip, element) => {
                const header = tooltip.querySelector('.dpd-tooltip-header')?.innerText?.replace('⚠️ ', '') || '';
                const patternType = header.replace(/ /g, '_');
                
                engine.executeCounterAction(element, patternType, 1.0);
                tooltip.remove();
                element.classList.remove('dpd-flagged-critical', 'dpd-flagged-high', 'dpd-flagged-medium', 'dpd-flagged-low');
            });
            
            overlay.activeAnnotations.clear();
            overlay.updateHUDStats();

            const blockedEl = document.getElementById('dpd-blocked-count');
            if (blockedEl) {
                blockedEl.textContent = 'All blocked';
            }
        }
        sendResponse({ success: true });
        return true;
    }

    if (request.type === 'START_CANCEL_FLOW') {
        if (engine) {
            engine.planCancelJourney(window.location.href);
        }
        sendResponse({ success: true });
        return true;
    }

    if (request.type === 'SHOW_REPORT') {
        if (overlay) {
            const patterns = [];
            overlay.activeAnnotations.forEach((tooltip, el) => {
                const header = tooltip.querySelector('.dpd-tooltip-header')?.innerText || 'PATTERN';
                const body = tooltip.querySelector('.dpd-tooltip-body')?.innerText || 'Description';
                let severity = 'LOW';
                if (el.classList.contains('dpd-flagged-critical')) severity = 'CRITICAL';
                else if (el.classList.contains('dpd-flagged-high')) severity = 'HIGH';
                else if (el.classList.contains('dpd-flagged-medium')) severity = 'MEDIUM';
                
                patterns.push({
                    id: Math.random().toString(),
                    type: header.replace('⚠️ ', '').replace(/ /g, '_'),
                    description: body,
                    severity: severity,
                    element: el
                });
            });
            overlay.showFullReport(patterns);
        }
        sendResponse({ success: true });
        return true;
    }

    if (request.type === 'TRIGGER_AI_SCAN') {
        runAIVisionScan();
        sendResponse({ success: true });
        return true;
    }
});

async function runAIVisionScan() {
    console.log("[DPD] Triggering AI Visual Scan on active viewport...");
    
    const hud = document.getElementById('dpd-hud');
    const scoreEl = document.getElementById('dpd-trust-score');
    const originalScoreText = scoreEl ? scoreEl.textContent : 'Trust: Analyzing...';
    if (scoreEl) {
        scoreEl.innerHTML = `<span style="color: #e91e63; font-weight: 800; animation: dpdPulse 1.2s infinite;">🔍 Llama Vision...</span>`;
    }
    
    // Inject a beautiful overlay toast notification on the page
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '120px';
    toast.style.right = '24px';
    toast.style.background = 'rgba(18, 18, 18, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '14px 20px';
    toast.style.borderRadius = '12px';
    toast.style.border = '1.5px dashed #e91e63';
    toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    toast.style.fontSize = '12px';
    toast.style.zIndex = '2147483647';
    toast.style.boxShadow = '0 15px 35px rgba(0,0,0,0.6)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.innerHTML = `🛡️ <strong>AI Visual Scan Active</strong><br><span style="color: #aaa;">Scanning visible viewport components via local Ollama...</span>`;
    document.body.appendChild(toast);

    if (!document.getElementById('dpd-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'dpd-pulse-style';
        style.innerHTML = `
            @keyframes dpdPulse {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        // Collect candidate elements in the active viewport
        const selectors = [
            'button', 'a.button', '.btn', 'input[type="checkbox"]', 
            '[class*="timer"]', '[class*="countdown"]',
            '[class*="promo"]', '[id*="promo"]',
            '.modal', '[class*="modal"]', '[class*="popup"]',
            '[class*="subscribe"]', '[class*="pricing"]',
            '[class*="deal"]', '[class*="offer"]'
        ];
        
        const candidates = [];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 10 && rect.height > 10 &&
                                  rect.top >= -100 && rect.left >= -100 &&
                                  rect.bottom <= (window.innerHeight + 100) &&
                                  rect.right <= (window.innerWidth + 100);
                
                if (isVisible && !candidates.includes(el)) {
                    candidates.push(el);
                }
            });
        });

        // Prioritize and get top 3-4 candidates
        const prioritized = candidates.sort((a, b) => {
            const aIsModal = a.classList.contains('modal') || a.className.includes('popup') ? 1 : 0;
            const bIsModal = b.classList.contains('modal') || b.className.includes('popup') ? 1 : 0;
            if (aIsModal !== bIsModal) return bIsModal - aIsModal;

            const aIsCB = a.tagName === 'INPUT' && a.type === 'checkbox' ? 1 : 0;
            const bIsCB = b.tagName === 'INPUT' && b.type === 'checkbox' ? 1 : 0;
            if (aIsCB !== bIsCB) return bIsCB - aIsCB;

            const aArea = a.offsetWidth * a.offsetHeight;
            const bArea = b.offsetWidth * b.offsetHeight;
            return bArea - aArea;
        }).slice(0, 4);

        console.log(`[DPD] Active candidates selected for AI Vision Scan:`, prioritized);

        if (prioritized.length === 0) {
            toast.style.border = '1px solid #ffaa00';
            toast.innerHTML = `🛡️ <strong>AI Visual Scan</strong><br><span style="color: #ffaa00;">No clear candidate elements visible in current view.</span>`;
            setTimeout(() => toast.remove(), 3000);
            if (scoreEl) scoreEl.textContent = originalScoreText;
            return;
        }

        let scannedCount = 0;
        let flaggedCount = 0;

        for (const el of prioritized) {
            scannedCount++;
            toast.innerHTML = `🛡️ <strong>AI Visual Scan Active</strong><br><span style="color: #aaa;">Analyzing element ${scannedCount}/${prioritized.length} with local LLM...</span>`;
            
            try {
                const rect = el.getBoundingClientRect();
                const screenshotContext = {
                    element_bounds: {
                        x: Math.max(0, Math.floor(rect.left)),
                        y: Math.max(0, Math.floor(rect.top)),
                        width: Math.floor(rect.width),
                        height: Math.floor(rect.height)
                    },
                    page_url: window.location.href,
                    surrounding_html: el.outerHTML ? el.outerHTML.slice(0, 1500) : el.parentElement?.outerHTML?.slice(0, 1500)
                };

                const result = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'VISION_ANALYSIS_REQUEST',
                        payload: screenshotContext
                    }, (response) => {
                        resolve(response);
                    });
                });

                if (result && result.is_dark_pattern) {
                    flaggedCount++;
                    console.log("[DPD] Vision flagged dark pattern!", result, el);
                    
                    // Execute auto-action immediately to neutralize the steer!
                    if (engine) {
                        engine.executeCounterAction(el, result.pattern_type, result.confidence);
                    }
                    
                    // Add visual warning overlay
                    if (overlay) {
                        overlay.addAnnotation(
                            el, 
                            result.pattern_type || 'AI_FLAGGED_PATTERN', 
                            result.confidence > 0.8 ? 'HIGH' : 'MEDIUM', 
                            result.user_impact || 'Flagged by Local Llama 3.2 Vision Multi-Modal scan.'
                        );
                    }
                }
            } catch (err) {
                console.error("[DPD] Vision scanning step failed:", err);
            }
        }

        toast.style.border = flaggedCount > 0 ? '1.5px solid #ff4444' : '1.5px solid #00c851';
        toast.innerHTML = `🛡️ <strong>AI Visual Scan Complete</strong><br><span style="color: ${flaggedCount > 0 ? '#ff4444' : '#00c851'};">${flaggedCount} pattern(s) flagged & neutralized locally.</span>`;
        setTimeout(() => toast.remove(), 4000);

    } catch (error) {
        console.error("[DPD] AI Vision Scan failed:", error);
        toast.innerHTML = `🛡️ <strong>AI Visual Scan</strong><br><span style="color: #ff4444;">Analysis failed: ${error.message}</span>`;
        setTimeout(() => toast.remove(), 3000);
    } finally {
        if (overlay) overlay.updateHUDStats();
    }
}

// Run
init();
