// options.js — Configuration Manager Controller

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Tab Switching Logic
    const tabButtons = document.querySelectorAll('.nav-item');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            // Set active tab
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'analytics-tab') {
                syncDatabaseReports();
            }
        });
    });

    // 2. Storage Defaults & Loading Hooks
    const storageKeys = {
        ollamaUrl: 'http://localhost:11434',
        visionModel: 'llama3.2-vision:latest',
        plannerModel: 'qwen2.5:3b',
        backendUrl: 'http://localhost:8000',
        layer1: true,
        layer2: true,
        layer3: true,
        autoNeutralize: true,
        hudEnabled: true,
        allowedDomains: ['example.com', 'localhost'],
        scannedCount: 0,
        neutralizedCount: 0,
        cacheHits: 0
    };

    // Load configurations from storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(Object.keys(storageKeys), (items) => {
            // Setup default inputs
            document.getElementById('ollama-url').value = items.ollamaUrl || storageKeys.ollamaUrl;
            document.getElementById('vision-model').value = items.visionModel || storageKeys.visionModel;
            document.getElementById('planner-model').value = items.plannerModel || storageKeys.plannerModel;
            document.getElementById('backend-url').value = items.backendUrl || storageKeys.backendUrl;

            // Set toggles
            document.getElementById('toggle-layer1').checked = items.layer1 !== undefined ? items.layer1 : storageKeys.layer1;
            document.getElementById('toggle-layer2').checked = items.layer2 !== undefined ? items.layer2 : storageKeys.layer2;
            document.getElementById('toggle-layer3').checked = items.layer3 !== undefined ? items.layer3 : storageKeys.layer3;
            document.getElementById('toggle-auto-neutralize').checked = items.autoNeutralize !== undefined ? items.autoNeutralize : storageKeys.autoNeutralize;
            document.getElementById('toggle-hud').checked = items.hudEnabled !== undefined ? items.hudEnabled : storageKeys.hudEnabled;

            // Stats counters
            document.getElementById('stats-scanned').textContent = items.scannedCount || 0;
            document.getElementById('stats-neutralized').textContent = items.neutralizedCount || 0;
            document.getElementById('stats-cache-hits').textContent = items.cacheHits || 0;

            // Allowed domains list
            const currentExempts = items.allowedDomains || storageKeys.allowedDomains;
            renderAllowedDomains(currentExempts);
        });
    } else {
        // Offline / dev mockup environment
        renderAllowedDomains(storageKeys.allowedDomains);
    }

    // 3. Save Host Settings
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const payload = {
            ollamaUrl: document.getElementById('ollama-url').value.trim(),
            visionModel: document.getElementById('vision-model').value.trim(),
            plannerModel: document.getElementById('planner-model').value.trim(),
            backendUrl: document.getElementById('backend-url').value.trim()
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(payload, () => {
                showToast("Host endpoints saved & updated!");
            });
        } else {
            showToast("Mockup settings saved!");
        }
    });

    // 4. Save Detection Rules
    document.getElementById('btn-save-layers').addEventListener('click', () => {
        const payload = {
            layer1: document.getElementById('toggle-layer1').checked,
            layer2: document.getElementById('toggle-layer2').checked,
            layer3: document.getElementById('toggle-layer3').checked,
            autoNeutralize: document.getElementById('toggle-auto-neutralize').checked,
            hudEnabled: document.getElementById('toggle-hud').checked
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(payload, () => {
                showToast("Detection rules updated!");
            });
        } else {
            showToast("Mockup detection rules saved!");
        }
    });

    // 5. Allowed Exempt Domains Logic
    function renderAllowedDomains(domains) {
        const container = document.getElementById('allowed-domains-list');
        container.innerHTML = '';

        if (domains.length === 0) {
            container.innerHTML = '<div style="font-size: 13px; color: #555; text-align: center; padding: 10px;">No active domains allowed.</div>';
            return;
        }

        domains.forEach(domain => {
            const row = document.createElement('div');
            row.className = 'domain-item';
            row.innerHTML = `
                <span>${domain}</span>
                <button class="btn-remove-domain" data-domain="${domain}">Remove</button>
            `;
            container.appendChild(row);
        });

        // Add event listeners to delete buttons
        container.querySelectorAll('.btn-remove-domain').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domToRemove = e.target.getAttribute('data-domain');
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['allowedDomains'], (data) => {
                        const current = data.allowedDomains || [];
                        const updated = current.filter(d => d !== domToRemove);
                        chrome.storage.local.set({ allowedDomains: updated }, () => {
                            renderAllowedDomains(updated);
                            showToast(`Exempt removed: ${domToRemove}`);
                        });
                    });
                }
            });
        });
    }

    document.getElementById('btn-add-domain').addEventListener('click', () => {
        const input = document.getElementById('new-domain-input');
        const newDomain = input.value.trim().toLowerCase();
        if (!newDomain) return;

        // Clean domain format slightly (remove http/https prefix if pasted)
        let cleaned = newDomain.replace(/^(https?:\/\/)?(www\.)?/, '');
        cleaned = cleaned.split('/')[0];

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['allowedDomains'], (data) => {
                const current = data.allowedDomains || [];
                if (current.includes(cleaned)) {
                    showToast("Domain already exempt!", true);
                    return;
                }
                const updated = [...current, cleaned];
                chrome.storage.local.set({ allowedDomains: updated }, () => {
                    renderAllowedDomains(updated);
                    input.value = '';
                    showToast(`Exempt added: ${cleaned}`);
                });
            });
        } else {
            input.value = '';
            showToast(`Mockup exempt added: ${cleaned}`);
        }
    });

    // 6. Analytics Sync & Database Logs
    document.getElementById('btn-refresh-stats').addEventListener('click', () => {
        syncDatabaseReports();
        showToast("Synchronized data with database!");
    });

    document.getElementById('btn-clear-db').addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all local dashboard counters? (Active SQLite reported database will persist).")) {
            const stats = { scannedCount: 0, neutralizedCount: 0, cacheHits: 0 };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set(stats, () => {
                    document.getElementById('stats-scanned').textContent = 0;
                    document.getElementById('stats-neutralized').textContent = 0;
                    document.getElementById('stats-cache-hits').textContent = 0;
                    showToast("Stats cleared successfully!");
                });
            } else {
                showToast("Mock stats cleared!");
            }
        }
    });

    function syncDatabaseReports() {
        const consoleEl = document.getElementById('db-logs-output');
        const backendUrlInput = document.getElementById('backend-url').value.trim() || 'http://localhost:8000';
        
        consoleEl.textContent = "Connecting to SQLite backend and syncing active deceptions registry...";

        fetch(`${backendUrlInput}/api/reported-patterns`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!data || data.length === 0) {
                    consoleEl.innerHTML = '<span style="color: #777;">[Empty] No deceptions reported in database. Verify test pages!</span>';
                    return;
                }

                let outputHtml = '';
                data.forEach(item => {
                    const time = item.timestamp ? item.timestamp.split('T')[0] : 'Today';
                    outputHtml += `
<div style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
  <span style="color: #e91e63; font-weight: bold;">[${item.severity}]</span> 
  <span style="color: #00ff88; font-weight: bold;">${item.pattern_type}</span> on 
  <a href="${item.url}" target="_blank" style="color: #3b82f6; text-decoration: none;">${item.url.replace(/^(https?:\/\/)?(www\.)?/, '').slice(0, 30)}...</a>
  <br>
  <span style="color: #888;">Impact:</span> ${item.description || 'Deceptive visual target blocked'} 
  <span style="float: right; color: #555;">${time}</span>
</div>`;
                });
                consoleEl.innerHTML = outputHtml;
            })
            .catch(err => {
                console.warn("[DPD Options] Failed fetching database reports:", err);
                consoleEl.innerHTML = `
<span style="color: #f87171;">[SQLite Offline] Failed to sync registry from: ${backendUrlInput}</span><br>
<span style="color: #666; font-size: 10px;">Please ensure your Python backend is active by running 'python3 main.py' and verify the FastAPI server port matches!</span>
<br><br>
<div style="opacity: 0.5;">
  <strong>Mock Sample Report (Offline):</strong><br>
  [CRITICAL] ROACH_MOTEL on amazon.nl — Fake subscription checkout loop blocks skip exit path.
</div>`;
            });
    }

    // Toast triggers
    function showToast(message, isWarning = false) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-message');
        
        toastMsg.textContent = message;
        toast.style.borderColor = isWarning ? '#ef4444' : '#00ff88';
        toast.querySelector('.toast-icon').textContent = isWarning ? '✕' : '✓';
        toast.querySelector('.toast-icon').style.color = isWarning ? '#ef4444' : '#00ff88';
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
