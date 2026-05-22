// mutation-watcher.js

function startMutationWatcher() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element nodes only
          // Run all Layer 1 checks on newly added elements
          if (typeof runAllDetectors === 'function') {
            runAllDetectors(node);
          }

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

function isModalOrOverlay(node) {
  const style = window.getComputedStyle(node);
  return (
    style.position === 'fixed' || 
    style.position === 'absolute' || 
    node.classList.contains('modal') || 
    node.classList.contains('overlay') ||
    parseInt(style.zIndex) > 1000
  );
}

function analyzeModalWithVision(node) {
    console.log("[DPD] Modal detected, potentially escalating to Vision AI", node);
    // Implementation in content.js
}
