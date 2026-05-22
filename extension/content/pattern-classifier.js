// pattern-classifier.js — Client-Side Dynamic Classification & Severity Weights
(function() {
  const PATTERN_METADATA = {
    'PRE_TICKED_CONSENT': {
      name: 'Pre-Ticked Consent Checkbox',
      severity: 'HIGH',
      deduction: 15,
      description: 'Opt-in checkbox checked by default to sneak advertising, tracking, or marketing consents without explicit user opt-in.',
      bypass: 'Avoid letting checkboxes remain pre-checked. Always double-check checkboxes before checking out or signing up.'
    },
    'HIDDEN_EXIT_PATH': {
      name: 'Hidden Exit/Cancel Path',
      severity: 'CRITICAL',
      deduction: 25,
      description: 'Exit, skip, or unsubscribe button rendered in small fonts, light gray text on light background, or matching opacity to make it practically invisible.',
      bypass: 'Scan the surrounding DOM area or look for revealed reddish exit indicators styled by Dark Pattern Destroyer.'
    },
    'FAKE_COUNTDOWN': {
      name: 'Fake Countdown / Urgency',
      severity: 'HIGH',
      deduction: 15,
      description: 'Dynamic countdown timer designed to pressure you into purchasing immediately. Frequently resets upon reload or clearing cookies.',
      bypass: 'Ignore the timer. The deal or stock level is typically artificial and will not expire.'
    },
    'CONFIRM_SHAMING': {
      name: 'Guilt-Tripping Confirm Shame',
      severity: 'MEDIUM',
      deduction: 8,
      description: 'Passive-aggressive, emotionally manipulative buttons designed to guilt you into buying or opting in (e.g. "No thanks, I hate saving money").',
      bypass: 'Ignore the psychological framing and proceed with the neutral cancellation/opt-out path.'
    },
    'PRICE_INJECTION': {
      name: 'Hidden Fee / Price Injection',
      severity: 'CRITICAL',
      deduction: 25,
      description: 'Extra, unauthorized fees or products injected into the shopping cart late in the checkout flow without clear notice.',
      bypass: 'Carefully review the itemized breakdown before submitting payment. Uncheck any sneakily added protection plans.'
    },
    'ROACH_MOTEL': {
      name: 'Subscription Roach Motel',
      severity: 'CRITICAL',
      deduction: 25,
      description: 'Flow that makes it extremely simple to subscribe or purchase, but deliberately tedious or impossible to cancel/delete accounts.',
      bypass: 'Click "🚀 Help Me Cancel" or "⚔️ Fight Back" in the extension menu to run our agentic sub-second bypass planner.'
    },
    'TRICK_QUESTION': {
      name: 'Trick Question / Double Negatives',
      severity: 'HIGH',
      deduction: 15,
      description: 'Confusingly constructed sentences or double-negatives designed to trick you into ticking or unticking the wrong opt-out check.',
      bypass: 'Read the prompt closely. If it says "Keep me unchecked to opt-out", make sure it matches your desired state.'
    },
    'FORCED_CONTINUITY': {
      name: 'Forced Auto-Renewal Continuity',
      severity: 'CRITICAL',
      deduction: 25,
      description: 'Silent opt-ins to recurring subscriptions or credit-card auto-debit loops post free trials without explicit confirmation prompts.',
      bypass: 'Cancel the subscription immediately after joining to prevent future billing cycles while maintaining trial access.'
    }
  };

  class PatternClassifier {
    static classify(patternType) {
      const type = (patternType || '').trim().toUpperCase();
      
      // Handle aliases or minor variations
      let matchedKey = 'UNKNOWN';
      if (PATTERN_METADATA[type]) {
        matchedKey = type;
      } else if (type === 'URGENCY_SCARCITY' || type === 'FAKE_URGENCY') {
        matchedKey = 'FAKE_COUNTDOWN';
      } else if (type === 'CONFIRM_SHAME') {
        matchedKey = 'CONFIRM_SHAMING';
      } else if (type === 'HIDDEN_COST') {
        matchedKey = 'PRICE_INJECTION';
      }

      if (matchedKey === 'UNKNOWN') {
        return {
          name: patternType || 'Deceptive Design Pattern',
          severity: 'LOW',
          deduction: 3,
          description: 'A design structure identified as potentially deceptive by our heuristics or multimodal visual AI scan.',
          bypass: 'Interact with this website component carefully and inspect text details.'
        };
      }

      return PATTERN_METADATA[matchedKey];
    }

    static getSeverity(patternType) {
      return this.classify(patternType).severity;
    }

    static getScoreDeduction(patternType) {
      return this.classify(patternType).deduction;
    }

    static getDescription(patternType) {
      return this.classify(patternType).description;
    }

    static getBypassStrategy(patternType) {
      return this.classify(patternType).bypass;
    }
  }

  // Export to global scope
  window.PatternClassifier = PatternClassifier;
})();
