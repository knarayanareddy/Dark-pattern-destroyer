// popup.js

document.addEventListener('DOMContentLoaded', async () => {
    // Check if running in a valid Chrome extension context
    if (typeof chrome === 'undefined' || !chrome.tabs) {
        console.warn("[DPD] Not running in extension context. Clicks will demonstrate offline actions.");
        document.getElementById('current_site').textContent = window.location.hostname || "local-test-page";
        document.getElementById('trust_score').textContent = "92";
        
        // Mock event listeners so buttons don't throw errors
        document.getElementById('fix_all').addEventListener('click', () => {
            alert("⚔️ Fix All Patterns: This action requires the extension to be loaded in Chrome. Open test_site.html in Chrome with the extension active.");
        });
        document.getElementById('ai_scan').addEventListener('click', () => {
            alert("🔍 AI Visual Scan: This action requires the extension to be loaded in Chrome.");
        });
        document.getElementById('show_report').addEventListener('click', () => {
            alert("📊 Full Report: This action requires the extension to be loaded in Chrome.");
        });
        document.getElementById('help_cancel').addEventListener('click', () => {
            alert("🚀 Help Me Cancel: This action requires the extension to be loaded in Chrome.");
        });
        return;
    }

    let tab;
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs[0];
    } catch (err) {
        console.error("[DPD] Error querying active tab:", err);
    }

    if (!tab || !tab.url) {
        document.getElementById('current_site').textContent = "Restricted Browser Page";
        document.getElementById('trust_score').textContent = "--";
        document.getElementById('trust_level').textContent = "Unavailable";
        return;
    }

    // Update site info
    try {
        const url = new URL(tab.url);
        document.getElementById('current_site').textContent = url.hostname || url.pathname.split('/').pop();
    } catch (err) {
        document.getElementById('current_site').textContent = tab.url;
    }

    // Get active statistics from the content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn("[DPD] Content script is not active on this tab:", chrome.runtime.lastError.message);
            
            document.getElementById('current_site').innerHTML = `<span style="color: #ff4444; font-weight: bold;">⚠️ Extension Inactive</span>`;
            
            if (tab.url.startsWith('file://')) {
                document.getElementById('trust_level').innerHTML = `
                    <div style="font-size: 11px; line-height: 1.4; color: #666; margin-top: 8px; text-align: left; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px;">
                        <strong>To test on local files:</strong><br>
                        1. Go to <code style="background:#eee; padding:1px 3px;">chrome://extensions</code><br>
                        2. Click <strong>Details</strong> on this extension<br>
                        3. Toggle <strong>"Allow access to file URLs"</strong><br>
                        4. Reload the test page!
                    </div>`;
            } else {
                document.getElementById('trust_level').innerHTML = `
                    <span style="font-size: 12px; color: #888;">
                        Please reload the page to inject the analysis scripts.
                    </span>`;
            }
            return;
        }

        if (response) {
            document.getElementById('critical_count').textContent = response.critical || 0;
            document.getElementById('high_count').textContent = response.high || 0;
            document.getElementById('medium_count').textContent = response.medium || 0;
            
            const score = response.trustScore !== undefined ? response.trustScore : 100;
            document.getElementById('trust_score').textContent = score;
            updateTrustColor(score);
        }
    });

    function updateTrustColor(score) {
        const el = document.getElementById('trust_score');
        const level = document.getElementById('trust_level');
        if (score > 80) {
            el.style.color = '#00c851';
            level.textContent = 'Safe Site';
        } else if (score > 50) {
            el.style.color = '#ffbb33';
            level.textContent = 'Suspicious';
        } else {
            el.style.color = '#ff4444';
            level.textContent = 'Dangerous';
        }
    }

    document.getElementById('fix_all').addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_ALL_FIXES' }, () => {
            // Suppress connection errors if clicked in inactive tab
            if (chrome.runtime.lastError) {}
        });
    });

    document.getElementById('ai_scan').addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AI_SCAN' }, () => {
            if (chrome.runtime.lastError) {}
        });
    });

    document.getElementById('show_report').addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_REPORT' }, () => {
            if (chrome.runtime.lastError) {}
        });
    });

    document.getElementById('help_cancel').addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_CANCEL_FLOW' }, () => {
            if (chrome.runtime.lastError) {}
        });
    });
});
