🛡️ IDEA 2: DARK PATTERN DESTROYER
"The Browser AI That Fights Back"
📌 THE PROBLEM — WHY THIS EXISTS
5
 Dark patterns are alarmingly prevalent — research shows over 70% of tested tasks successfully steer state-of-the-art GUI agents to undesired actions, and they appear in 40%+ of LLM-generated web components across major models. The irony is profound: AI is being used both to *create* dark patterns and to be *manipulated by* them. Your tool is the antidote. 
6
 Dark patterns pose a significant challenge to LLM-based web agents, necessitating the development of holistic defense mechanisms — ones that encompass preemptive detection, removal, or strategic accounting during the agent's planning phase. 
7
 While recent alignment techniques like RLHF and Constitutional AI have improved harmlessness against overt toxicity, they remain largely ineffective against subtle, psychologically manipulative behaviors — dark patterns — which exploit cognitive biases, emotional vulnerabilities, and power asymmetries without triggering conventional safety filters.
🏗️ COMPLETE SYSTEM ARCHITECTURE
text

┌──────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION (MV3)                        │
│                                                                    │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  manifest.json │  │  popup.html/js  │  │  options.html/js │  │
│  │  (Config &     │  │  (User Controls │  │  (Settings,      │  │
│  │   Permissions) │  │   & Status HUD) │  │   Allow Lists)   │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              SERVICE WORKER (background.js)                  │  │
│  │  - Orchestrates all detection pipelines                      │  │
│  │  - Manages API calls to Vision LLM backend                   │  │
│  │  - Maintains cross-tab pattern signature cache               │  │
│  │  - Runs Chrome Alarms API for keep-alive                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              CONTENT SCRIPT (content.js)                     │  │
│  │  - Injected into every page                                  │  │
│  │  - Runs DOM Analysis Layer (Layer 1)                         │  │
│  │  - Applies MutationObserver for dynamic content              │  │
│  │  - Renders overlay UI and annotations                        │  │
│  │  - Executes agentic counter-actions directly in DOM          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────▼──────────────┐
              │        FASTAPI BACKEND        │
              │  - Vision LLM orchestration   │
              │  - YOLO inference server      │
              │  - Pattern signature DB       │
              │  - Agentic bypass planner     │
              └───────────────────────────────┘
📁 COMPLETE FILE STRUCTURE
text

dark-pattern-destroyer/
│
├── extension/
│   ├── manifest.json               ← MV3 config
│   ├── background/
│   │   └── service-worker.js       ← Background orchestrator
│   ├── content/
│   │   ├── content.js              ← Page-level injector
│   │   ├── dom-analyzer.js         ← Layer 1: DOM parsing
│   │   ├── mutation-watcher.js     ← Dynamic DOM changes
│   │   ├── counter-action.js       ← Agentic bypasser
│   │   └── overlay-ui.js           ← Visual annotation layer
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   ├── options/
│   │   ├── options.html
│   │   └── options.js
│   └── styles/
│       └── overlay.css
│
└── backend/
    ├── main.py                     ← FastAPI entry point
    ├── vision_analyzer.py          ← Vision LLM integration
    ├── yolo_detector.py            ← YOLOv12x model server
    ├── pattern_classifier.py       ← Classification logic
    ├── bypass_planner.py           ← Agentic counter-action planner
    ├── pattern_db.py               ← SQLite pattern signature cache & SQLite DB
    └── models/
        └── yolo_dark_patterns.pt   ← Fine-tuned weights
⚙️ LAYER 1 — DOM STRUCTURAL ANALYSIS
Runs on every page load — < 50ms, zero API cost
This is your fastest, cheapest detection layer. It runs entirely in the browser using JavaScript pattern matching on the DOM tree.

DOM Signals to Detect:
🔴 Pre-Ticked Checkboxes
JavaScript

// dom-analyzer.js
function detectPreTickedCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    if (cb.checked && !cb.hasAttribute('data-user-set')) {
      const label = cb.closest('label') || 
                    document.querySelector(`label[for="${cb.id}"]`);
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
🔴 Hidden Unsubscribe / Cancel Buttons
JavaScript

function detectHiddenExitPaths() {
  const allLinks = document.querySelectorAll('a, button');
  allLinks.forEach(el => {
    const styles = window.getComputedStyle(el);
    const text = el.innerText?.toLowerCase() || '';
    const exitKeywords = ['cancel', 'unsubscribe', 'no thanks', 
                          'skip', 'close account', 'delete'];
    
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
🔴 Fake Countdown Timers
JavaScript

function detectFakeUrgency() {
  // Detect timer elements
  const timerSelectors = [
    '[class*="timer"]', '[class*="countdown"]', 
    '[id*="timer"]', '[class*="urgency"]'
  ];
  
  timerSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Cross-reference: does the timer reset when you revisit?
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
🔴 Confirm-Shaming Buttons
JavaScript

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
🔴 Hidden Costs Injection Detection
JavaScript

function detectHiddenCosts() {
  // Watch for price changes between product page and cart
  const priceSelectors = [
    '[class*="price"]', '[class*="total"]', 
    '[class*="cost"]', '[class*="amount"]'
  ];
  
  let observedPrices = {};
  
  priceSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const price = parseFloat(el.innerText.replace(/[^0-9.]/g, ''));
      if (!isNaN(price)) {
        const key = `${selector}_${el.offsetTop}`;
        if (observedPrices[key] && observedPrices[key] !== price) {
          flagElement(el, 'PRICE_INJECTION', 'CRITICAL');
          annotateWithBadge(el, 
            `💰 Price changed from $${observedPrices[key]} to $${price}`
          );
        }
        observedPrices[key] = price;
      }
    });
  });
}
🔴 MutationObserver — Catching Dynamically Injected Patterns
JavaScript

// mutation-watcher.js
function startMutationWatcher() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element nodes only
          // Run all Layer 1 checks on newly added elements
          runAllDetectors(node);
          
          // Special: detect modal injection (common dark pattern delivery)
          if (isModalOrOverlay(node)) {
            analyzeModalWithVision(node); // Trigger Layer 2
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden']
  });
}
🧠 LAYER 2 — VISION LLM ANALYSIS
Triggered on ambiguous elements — the "wow" layer
2
 AutoBot, the state-of-the-art in this space, accurately identifies and localizes deceptive patterns from a screenshot of a website without relying on the underlying HTML code, employing a two-stage pipeline that leverages the capabilities of specialized vision models.
Your version goes further by adding agentic counter-action on top.

Screenshot Capture Pipeline:
JavaScript

// content.js — triggers when Layer 1 flags something ambiguous
async function analyzeElementWithVision(element) {
  // Step 1: Capture targeted screenshot of flagged element + context
  const rect = element.getBoundingClientRect();
  const screenshotContext = {
    element_bounds: {
      x: rect.left, y: rect.top,
      width: rect.width, height: rect.height
    },
    page_url: window.location.href,
    surrounding_html: element.parentElement?.outerHTML?.slice(0, 2000)
  };
  
  // Step 2: Send to service worker → backend
  chrome.runtime.sendMessage({
    type: 'VISION_ANALYSIS_REQUEST',
    payload: screenshotContext
  }, (response) => {
    if (response.isDarkPattern) {
      applyCounterAction(element, response.patternType, response.confidence);
    }
  });
}
Vision LLM Backend (FastAPI) — Local Ollama Multimodal Scanner:
Python

# vision_analyzer.py
import httpx
import re
import json
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from yolo_detector import DarkPatternYOLODetector

router = APIRouter()
yolo_detector = DarkPatternYOLODetector()

OLLAMA_URL = "http://localhost:11434/api/chat"
VISION_MODEL = "llama3.2-vision:latest"

class VisionAnalysisRequest(BaseModel):
    screenshot: str  # data:image/png;base64,...
    page_url: str
    element_bounds: Optional[dict] = None
    html_context: Optional[str] = None

DARK_PATTERN_SYSTEM_PROMPT = """You are an expert dark pattern detection system. 
Analyze the provided UI screenshot and the surrounding HTML context, then classify any dark patterns present.

Classifications:
01. URGENCY_SCARCITY: Fake countdown timers, artificial scarcity claims.
02. HIDDEN_COST: Prices that change or inject fees late in the flow.
03. CONFIRM_SHAME: Guilt-tripping opt-out button text.
04. ROACH_MOTEL: Subscription setups that make it difficult to unsubscribe.
05. TRICK_QUESTION: Intentionally confusing or double-negative checkboxes.
06. FORCED_CONTINUITY: Hidden auto-renewals.

You MUST respond in strict raw JSON format containing these exact keys:
{
  "is_dark_pattern": boolean,
  "pattern_type": "CATEGORY_NAME_OR_NULL",
  "confidence": float (0.0 to 1.0),
  "affected_element_description": "string",
  "user_impact": "string",
  "bypass_strategy": "actionable tip on how to avoid it",
  "regulatory_violation": "GDPR/CCPA/EU_DSA or null"
}"""

@router.post("/analyze-vision")
async def analyze_vision(request: VisionAnalysisRequest):
    # Triggers YOLO/Fallback visual target check first. 
    # If not fully resolved, escalates to Ollama local vision model (llama3.2-vision:latest) asynchronously.
    # Results are cached in SQLite by DOM HTML snippet MD5 hash to prevent redundant scans.
🎯 LAYER 2b — YOLOv12x VISUAL DETECTION
Fast pre-screening before Vision LLM — saves API cost
4
 YOLOv12x achieves mAP@50 of 0.928 on dark pattern detection validation, with overall precision and recall of 0.933 and 0.881 respectively. 
4
 The dataset for training was constructed from 4,066 UI/UX screenshots across 194 websites and mobile apps from six industrial domains (e-commerce, travel/accommodation, finance, media/content, public administration, press) — with the collection procedure involving targeted exploration of critical service flows including registration, login, payment, and cancellation.
Python

# yolo_detector.py
from ultralytics import YOLO
import numpy as np
from PIL import Image
import io

class DarkPatternYOLODetector:
    def __init__(self, model_path: str = "models/yolo_dark_patterns.pt"):
        self.model = YOLO(model_path)
        self.confidence_threshold = 0.65
        
        # Class labels matching your training dataset
        self.class_labels = {
            0: "URGENCY_TIMER",
            1: "HIDDEN_BUTTON",
            2: "PRE_TICKED_BOX",
            3: "MISLEADING_PRICE",
            4: "CONFIRM_SHAME_TEXT",
            5: "FAKE_REVIEW_BADGE",
            6: "DISGUISED_AD",
            7: "FORCED_SIGNUP",
            8: "SUBSCRIPTION_TRAP"
        }
    
    def detect(self, screenshot_bytes: bytes) -> list[dict]:
        image = Image.open(io.BytesIO(screenshot_bytes))
        results = self.model(image, conf=self.confidence_threshold)
        
        detections = []
        for result in results:
            for box in result.boxes:
                detection = {
                    "class": self.class_labels[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                    "requires_vision_confirmation": float(box.conf) < 0.85
                }
                detections.append(detection)
        
        return detections
    
    def should_escalate_to_vision(self, detections: list) -> bool:
        # Escalate to Vision LLM if YOLO is uncertain
        return any(d["requires_vision_confirmation"] for d in detections)
⚡ LAYER 3 — AGENTIC COUNTER-ACTION ENGINE
The game changer — AI that doesn't just detect, but ACTS
JavaScript

// counter-action.js

class CounterActionEngine {
  constructor() {
    this.actionLog = [];
  }
  
  async executeCounterAction(element, patternType, confidence) {
    switch(patternType) {
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
        this.neutralizeShameText(element);
        break;
      case 'URGENCY_SCARCITY':
        this.exposeUrgencyFallacy(element);
        break;
      case 'HIDDEN_COST':
        this.flagAndHighlightCostDelta(element);
        break;
      case 'TRICK_QUESTION':
        this.rewriteToPlainLanguage(element);
        break;
    }
    
    this.logAction(patternType, element);
  }
  
  // ===== SPECIFIC COUNTER-ACTIONS =====
  
  uncheckConsentBox(checkbox) {
    checkbox.checked = false;
    checkbox.setAttribute('data-user-set', 'dpd-unchecked');
    this.addVisualBadge(checkbox, 
      '🛡️ Auto-unchecked: Pre-ticked marketing consent removed'
    );
  }
  
  revealAndHighlightExitPath(element) {
    element.style.opacity = '1';
    element.style.visibility = 'visible';
    element.style.fontSize = '14px';
    element.style.color = '#ff4444';
    element.style.border = '2px solid #ff4444';
    element.style.padding = '4px 8px';
    element.style.borderRadius = '4px';
    this.addVisualBadge(element, 
      '🛡️ Hidden button revealed by Dark Pattern Destroyer'
    );
  }
  
  neutralizeShameText(element) {
    const original = element.innerText;
    element.setAttribute('data-original-text', original);
    element.innerText = 'No, continue without this offer';
    this.addVisualBadge(element, 
      `🛡️ Original shame text: "${original}"`
    );
  }
  
  exposeUrgencyFallacy(element) {
    element.style.textDecoration = 'line-through';
    element.style.opacity = '0.5';
    
    const badge = document.createElement('div');
    badge.className = 'dpd-badge dpd-warning';
    badge.innerHTML = `
      ⚠️ <strong>Fake urgency detected.</strong> 
      This timer likely resets when you refresh the page.
    `;
    element.parentNode.insertBefore(badge, element.nextSibling);
  }
  
  // ===== THE CROWN JEWEL: CANCEL JOURNEY PLANNER =====
  async planCancelJourney(currentUrl) {
    // Send to backend for agentic planning
    const response = await fetch('/api/plan-cancel-journey', {
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
  
  showAutoNavigatePrompt(plan) {
    const prompt = document.createElement('div');
    prompt.className = 'dpd-action-panel';
    prompt.innerHTML = `
      <div class="dpd-panel-header">
        🛡️ Dark Pattern Destroyer — Cancel Path Found
      </div>
      <div class="dpd-panel-body">
        <p>Found cancel path in <strong>${plan.steps.length} steps</strong></p>
        <p>We can auto-navigate for you, skipping all guilt-trip screens.</p>
        <button id="dpd-auto-cancel">🚀 Auto-Cancel Now</button>
        <button id="dpd-show-steps">📍 Show Me the Path</button>
      </div>
    `;
    document.body.appendChild(prompt);
    
    document.getElementById('dpd-auto-cancel').onclick = () => {
      this.executeAutoCancel(plan.steps);
    };
  }
  
  async executeAutoCancel(steps) {
    for (const step of steps) {
      await this.delay(800); // Human-like pacing
      
      switch(step.action) {
        case 'CLICK':
          const el = document.querySelector(step.selector) || 
                     this.findByText(step.text);
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
}
Backend: Cancel Journey Agentic Planner (Local Qwen 2.5 3B)
Python

# bypass_planner.py
import httpx
import json
from typing import List, TypedDict, Optional
from pydantic import BaseModel

OLLAMA_URL = "http://localhost:11434/api/chat"
PLANNER_MODEL = "qwen2.5:3b"

class Step(TypedDict):
    action: str        # 'CLICK', 'NAVIGATE', or 'WAIT'
    selector: str      # CSS Selector for targeted button/link
    text: Optional[str] # Visible text to locate
    description: str   # Informational tip for the user
    url: Optional[str]  # URL if action is NAVIGATE

class Plan(TypedDict):
    steps: List[Step]
    auto_navigable: bool
    confidence: float
    goal: str

class CancelJourneyPlanner:
    async def generate_plan(self, request: CancelRequest) -> Plan:
        # Analyzes DOM snapshots and plans browser sequences ('CLICK', 'NAVIGATE', 'WAIT')
        # to execute an automated subscription cancellation flow, using a local Qwen 2.5 3B model.
🖥️ FRONTEND OVERLAY UI SYSTEM
JavaScript

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
      <div class="dpd-hud-header">
        🛡️ Dark Pattern Destroyer
      </div>
      <div class="dpd-hud-stats">
        <span id="dpd-pattern-count">0 patterns detected</span>
        <span id="dpd-blocked-count">0 blocked</span>
        <span id="dpd-trust-score">Trust: Analyzing...</span>
      </div>
      <div class="dpd-hud-actions">
        <button id="dpd-show-report">Full Report</button>
        <button id="dpd-fight-back">⚔️ Fight Back Mode</button>
      </div>
    `;
    document.body.appendChild(this.hud);
  }
  
  updateTrustScore(patterns) {
    const score = this.calculateTrustScore(patterns);
    const scoreEl = document.getElementById('dpd-trust-score');
    scoreEl.textContent = `Trust Score: ${score}/100`;
    scoreEl.style.color = score > 70 ? '#00ff88' : 
                          score > 40 ? '#ffaa00' : '#ff4444';
  }
  
  calculateTrustScore(patterns) {
    // 100 points, deduct based on pattern severity
    const deductions = {
      'CRITICAL': 25, 'HIGH': 15, 'MEDIUM': 8, 'LOW': 3
    };
    let score = 100;
    patterns.forEach(p => { score -= (deductions[p.severity] || 5); });
    return Math.max(0, score);
  }
  
  addAnnotation(element, patternType, severity, message) {
    // Add pulsing red/yellow border to flagged element
    element.classList.add(`dpd-flagged-${severity.toLowerCase()}`);
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = `dpd-tooltip dpd-severity-${severity.toLowerCase()}`;
    tooltip.innerHTML = `
      <div class="dpd-tooltip-header">
        ${this.getSeverityIcon(severity)} ${patternType.replace(/_/g, ' ')}
      </div>
      <div class="dpd-tooltip-body">${message}</div>
      <div class="dpd-tooltip-actions">
        <button class="dpd-btn-action">🛡️ Fix This</button>
        <button class="dpd-btn-info">ℹ️ Learn More</button>
        <button class="dpd-btn-dismiss">✕</button>
      </div>
    `;
    
    // Position relative to element
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(tooltip);
    this.activeAnnotations.set(element, tooltip);
  }
  
  showFullReport(allPatterns) {
    const modal = document.createElement('div');
    modal.className = 'dpd-report-modal';
    modal.innerHTML = `
      <div class="dpd-report-header">
        <h2>🛡️ Dark Pattern Report</h2>
        <h3>${window.location.hostname}</h3>
        <div class="dpd-trust-badge trust-${this.getTrustLevel(allPatterns)}">
          Trust Score: ${this.calculateTrustScore(allPatterns)}/100
        </div>
      </div>
      
      <div class="dpd-pattern-list">
        ${allPatterns.map(p => `
          <div class="dpd-pattern-item severity-${p.severity}">
            <div class="dpd-pattern-type">${p.type.replace(/_/g, ' ')}</div>
            <div class="dpd-pattern-desc">${p.description}</div>
            <div class="dpd-pattern-impact">⚖️ Possible regulation: ${p.regulatory_violation || 'None identified'}</div>
            <button class="dpd-fix-btn" data-id="${p.id}">Fix This</button>
          </div>
        `).join('')}
      </div>
      
      <div class="dpd-report-actions">
        <button id="dpd-fix-all">🚀 Fix All Patterns</button>
        <button id="dpd-fight-back-mode">⚔️ Enter Fight Back Mode</button>
        <button id="dpd-export-report">📄 Export Report</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}
🔐 THE MANIFEST.JSON (MV3)
16
 In Manifest V3, the background context has been moved to service workers, which run only when needed. 
16
 Manifest V3 also removes the ability for an extension to use remotely hosted code, which presents security risks by allowing unreviewed code to be executed in extensions.
JSON

{
  "manifest_version": 3,
  "name": "Dark Pattern Destroyer",
  "version": "1.0.0",
  "description": "AI-powered protection against manipulative web design",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "notifications",
    "alarms",
    "tabs"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "content/dom-analyzer.js",
        "content/mutation-watcher.js",
        "content/counter-action.js",
        "content/overlay-ui.js",
        "content/content.js"
      ],
      "css": ["styles/overlay.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "web_accessible_resources": [
    {
      "resources": ["styles/*", "icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
Key MV3 note: 
20
In MV3, background.js has been replaced by a service worker that runs in an event-driven manner — service workers cannot directly interact with the DOM, so all DOM manipulation must go through content scripts injected into the web page.

📊 POPUP DASHBOARD
HTML

<!-- popup.html -->
<div class="dpd-popup">
  <header>
    <div class="dpd-logo">🛡️ Dark Pattern Destroyer</div>
    <div class="dpd-site">{{current_site}}</div>
  </header>
  
  <!-- Trust Score Ring -->
  <div class="trust-ring-container">
    <svg class="trust-ring" viewBox="0 0 100 100">
      <circle class="ring-bg" cx="50" cy="50" r="40"/>
      <circle class="ring-fill" cx="50" cy="50" r="40" 
              stroke-dasharray="{{trust_score * 2.51}} 251"/>
    </svg>
    <div class="trust-score-label">{{trust_score}}</div>
    <div class="trust-level-label">{{trust_level}}</div>
  </div>
  
  <!-- Pattern Summary -->
  <div class="pattern-summary">
    <div class="stat critical">
      <span class="stat-number">{{critical_count}}</span>
      <span class="stat-label">Critical</span>
    </div>
    <div class="stat high">
      <span class="stat-number">{{high_count}}</span>
      <span class="stat-label">High</span>
    </div>
    <div class="stat medium">
      <span class="stat-number">{{medium_count}}</span>
      <span class="stat-label">Medium</span>
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div class="quick-actions">
    <button class="action-btn primary" id="fix-all">
      ⚔️ Fix All ({total_count})
    </button>
    <button class="action-btn secondary" id="view-report">
      📊 Full Report
    </button>
    <button class="action-btn danger" id="cancel-assist">
      🚀 Help Me Cancel
    </button>
  </div>
  
  <!-- Toggle Controls -->
  <div class="settings-row">
    <label>Auto-fix consent boxes</label>
    <input type="checkbox" id="auto-fix-consent" checked>
  </div>
  <div class="settings-row">
    <label>Fight Back Mode</label>
    <input type="checkbox" id="fight-back-mode">
  </div>
  <div class="settings-row">
    <label>Show Trust Score on page</label>
    <input type="checkbox" id="show-hud" checked>
  </div>
</div>
🗄️ BACKEND FULL STACK (FastAPI & Local SQLite DB)
Python

# main.py — FastAPI Backend
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vision_analyzer import router as vision_router
from bypass_planner import CancelJourneyPlanner, CancelRequest
import pattern_db

app = FastAPI(title="Dark Pattern Destroyer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

planner = CancelJourneyPlanner()

# Initialize local SQLite database on startup
pattern_db.init_db()

# Include vision classification router (/api/analyze-vision)
app.include_router(vision_router, prefix="/api")

@app.post("/api/plan-cancel-journey")
async def plan_cancel(request: CancelRequest):
    try:
        plan = await planner.generate_plan(request)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/report-pattern")
async def report_pattern(payload: dict):
    # Records user feedback / reported patterns in local SQLite database
    try:
        pattern_db.add_reported_pattern(
            url=payload.get("url", "unknown"),
            pattern_type=payload.get("pattern_type", "UNKNOWN"),
            severity=payload.get("severity", "MEDIUM"),
            description=payload.get("description", ""),
            confidence=float(payload.get("confidence", 1.0)),
            html_context=payload.get("html_context", "")
        )
        return {"status": "success", "message": "Pattern recorded in SQLite database"}
    except Exception as e:
        return {"status": "partial_success", "error": str(e)}

@app.get("/api/reported-patterns")
async def get_reported_patterns():
    return pattern_db.get_reported_patterns()
🧪 DEMO SCRIPT (Hackathon)
Pre-load these scenarios before the demo:

Scenario	Site Type	What Happens
1	Streaming subscription cancel	AI skips 5 guilt screens, hits cancel in 8 seconds
2	E-commerce checkout	AI flags 3 pre-ticked boxes and auto-unchecks them
3	Newsletter signup	AI reveals hidden unsubscribe path
4	Travel booking	AI exposes fake "only 2 seats left" + price injection
5	Software trial	AI identifies forced continuity + shows cancel path
