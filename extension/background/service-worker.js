// background/service-worker.js

const BACKEND_URL = 'http://localhost:8000';

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VISION_ANALYSIS_REQUEST') {
    handleVisionAnalysis(request.payload, sender.tab.id, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'REPORT_PATTERN') {
    reportPattern(request.payload);
  }
});

async function handleVisionAnalysis(payload, tabId, sendResponse) {
  try {
    // Capture screenshot of the current tab
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Prepare data for backend
    const response = await fetch(`${BACKEND_URL}/api/analyze-vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: screenshotDataUrl,
        page_url: payload.page_url,
        element_bounds: payload.element_bounds,
        html_context: payload.surrounding_html
      })
    });

    const result = await response.json();
    sendResponse(result);
  } catch (error) {
    console.error('[DPD Background] Vision analysis failed:', error);
    sendResponse({ isDarkPattern: false, error: error.message });
  }
}

async function reportPattern(payload) {
  try {
    await fetch(`${BACKEND_URL}/api/report-pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[DPD Background] Reporting failed:', error);
  }
}

// Optional: Alarms for keep-alive or periodic cache cleaning
chrome.alarms.create('checkCache', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkCache') {
    // Perform cleanup logic
  }
});
