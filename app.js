// Global Database
// ─── GLOBAL CONSTANTS & CACHE ────────────────────────────────────────────────
const SEARCH_CACHE = new Map();
const GLOBAL_DB = {
    brokers: [
        "Zerodha (Kite)", "Groww", "Upstox", "ICICI Direct", "Angel One",
        "HDFC Sky", "Kotak Securities", "Motilal Oswal", "Sharekhan",
        "5paisa", "Fyers", "Paytm Money", "Alice Blue", "Dhan", "Geojit"
    ],
    etfBrokers: [
        "Zerodha (Kite)", "Groww", "Upstox", "ICICI Direct", "Angel One",
        "HDFC Sky", "Kotak Securities", "Motilal Oswal", "5paisa", "Dhan"
    ],
    npsFundManagers: [
        "SBI Pension Funds", "LIC Pension Fund", "HDFC Pension Fund",
        "ICICI Prudential Pension Fund", "Kotak Mahindra Pension Fund",
        "Aditya Birla Sun Life Pension", "DSP Pension Fund",
        "Max Life Pension Fund", "Tata Pension Fund", "Axis Pension Fund"
    ],
    amcs: [
        "SBI Mutual Fund", "ICICI Prudential MF", "HDFC Mutual Fund",
        "Nippon India MF", "Kotak Mahindra MF", "Aditya Birla Sun Life MF",
        "Axis Mutual Fund", "UTI Mutual Fund", "Mirae Asset MF", "DSP Mutual Fund",
        "Edelweiss Mutual Fund", "Tata Mutual Fund", "Invesco Mutual Fund",
        "Sundaram Mutual Fund", "Bandhan (IDFC) MF", "Mahindra Manulife MF",
        "Parag Parikh MF (PPFAS)", "Quant Mutual Fund", "Canara Robeco MF",
        "LIC Mutual Fund", "Baroda BNP Paribas MF", "HSBC Mutual Fund",
        "Franklin Templeton MF", "Motilal Oswal MF", "PGIM India MF",
        "Union Mutual Fund", "Bank of India MF", "JM Financial MF",
        "ITI Mutual Fund", "Navi Mutual Fund", "Trust Mutual Fund",
        "Samco Mutual Fund", "WhiteOak Capital MF", "Bajaj Finserv MF",
        "Helios Mutual Fund", "Zerodha Mutual Fund", "Groww Mutual Fund", "Old Bridge MF"
    ],
    banks: [
        "IDFC FIRST Bank - High-Yield (7.00%)",
        "AU Small Finance Bank (7.25%)",
        "Equitas Small Finance Bank (7.00%)",
        "Ujjivan Small Finance Bank (7.50%)",
        "Jana Small Finance Bank (7.50%)",
        "RBL Bank - Savings (6.50%)",
        "HDFC Bank - Regular Savings (3.00%)",
        "HDFC Bank - Salary Account (3.50%)",
        "SBI - Regular Savings Plus (2.70%)",
        "ICICI Bank - Regular Savings (3.50%)",
        "Axis Bank - Regular Savings (3.50%)",
        "Kotak Mahindra 811 (4.00%)",
        "Bank of Baroda - Regular (2.75%)",
        "Punjab National Bank (3.00%)",
        "Union Bank of India (2.90%)",
        "Canara Bank - Savings (3.20%)",
        "IndusInd Bank (6.00%)",
        "Bandhan Bank (6.00%)",
        "Federal Bank (3.45%)",
        "YES Bank (6.25%)",
        "HSBC India (3.00%)"
    ],
    ppf: [
        "State Bank of India (SBI) - PPF (7.1%)",
        "HDFC Bank - PPF (7.1%)",
        "ICICI Bank - PPF (7.1%)",
        "Axis Bank - PPF (7.1%)",
        "Post Office PPF (7.1%)",
        "Bank of Baroda - PPF (7.1%)",
        "Punjab National Bank - PPF (7.1%)",
        "Canara Bank - PPF (7.1%)",
        "Union Bank of India - PPF (7.1%)",
        "Kotak Mahindra Bank - PPF (7.1%)"
    ]
};

let GLOBAL_SCHEME_DB = {}; // Populated dynamically from AMFI
let PERFORMANCE_CHART = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth gate: must pass before any app initialisation ──
    AuthUI.init();

    localStorage.removeItem('mfSchemeDb'); // Always fetch fresh — no stale cache
    initNavigation();
    initAddDropdowns();
    await autoLoadAMFI(); // MUST complete before loadState so AMC dropdowns are populated
    loadState();
    syncAllMFCurrentValues(); // Re-compute units × current NAV for all MF cards (async, non-blocking)
    loadCustomEvents();
    renderCalendar();
    syncMarketInsights(); // Auto-fetch news, FD rates silently on every open
    initTVSearch();
});

// Navigation Logic
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.style.display = 'none');

            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'block';

            const titleEl = document.getElementById('page-title');
            const textContent = link.textContent.trim();
            if(textContent.includes('Overview'))     titleEl.textContent = 'Your Wealth Portfolio';
            if(textContent.includes('Mutual Funds')) titleEl.textContent = 'Mutual Funds & SIPs';
            if(textContent.includes('Backtester'))   titleEl.textContent = 'MF Backtester & Comparator';
            if(textContent.includes('Equities'))     titleEl.textContent = 'Direct Equity Holdings';
            if(textContent.includes('ETFs'))         titleEl.textContent = 'Exchange Traded Funds';
            if(textContent.includes('Fixed Income')) titleEl.textContent = 'Fixed Income & FDs';
            if(textContent.includes('Provident'))    titleEl.textContent = 'Provident & Pension Funds';
            if(textContent.includes('NPS'))          titleEl.textContent = 'National Pension System';
            if(textContent.includes('Calendar'))     titleEl.textContent = 'Tax Calendar & Market Events';
            if(textContent.includes('FIRE'))         titleEl.textContent = 'FIRE & Retirement Calculator';
            if(textContent.includes('Portals'))      titleEl.textContent = 'Gateways & Instructions';
        });
    });
}

function initAddDropdowns() {
    const populateDropdown = (id, list, defaultText) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="">${defaultText}</option>`;
        list.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            const selectedProvider = e.target.value;
            if (selectedProvider) {
                const type = id.split('-')[1]; 
                addAssetObj({ type, provider: selectedProvider }, true);
                e.target.value = ""; 
            }
        });
    };

    // MF handled by auto-loaded AMFI; populate AMC dropdown from cached DB
    populateAMCDropdowns();
    populateDropdown('add-fi-dropdown',  GLOBAL_DB.banks,          '+ Select Bank to Add FD');
    populateDropdown('add-pf-dropdown',  GLOBAL_DB.ppf,            '+ Select Provider to Add');
    populateDropdown('add-nps-dropdown', GLOBAL_DB.npsFundManagers,'+ Select NPS Fund Manager');
}

function loadState() {
    const savedData = localStorage.getItem('portfolioDataPro');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data.length > 0) {
                data.forEach(item => addAssetObj(item, false));
            }
        } catch (e) {
            console.error("Could not parse saved data", e);
        }
    }
    calculateWealth();
}

function handleSelectChange(select) {
    const val = select.value;
    const parent = select.closest('.asset-item');
    if (!parent) return;
    const rateEl = parent.querySelector('.field-rate');
    if (rateEl && val.includes('(')) {
        const match = val.match(/\(([^)]+)\)/);
        if (match && match[1].includes('%')) {
            rateEl.value = match[1].replace('%', '');
        }
    }
}

function saveState() {
    const items = document.querySelectorAll('.asset-item');
    const data = [];
    items.forEach(item => {
        const parentId = item.parentElement?.id || '';
        const type = parentId.replace('detail-grid-', '').replace('grid-', '');

        
        const getVal = (selector) => {
            const el = item.querySelector(selector);
            return el ? el.value : '';
        };

        const obj = {
            type,
            provider:     getVal('.provider-select'),
            ticker:       getVal('.field-ticker'),
            invested:     getVal('.field-invested'),
            current:      getVal('.field-current'),
            rate:         getVal('.field-rate'),
            sip:          getVal('.field-sip'),
            duration:     getVal('.field-duration'),
            qty:          getVal('.field-qty'),
            buyprice:     getVal('.field-buyprice'),
            cmp:          getVal('.field-cmp'),
            payout:       getVal('.field-payout'),
            maturity:     getVal('.field-maturity'),
            date:         getVal('.field-date'),
            tier:         getVal('.field-tier'),
            schemeClass:  getVal('.field-scheme-class'),
            // MF-specific computed values — persisted so we don't re-fetch every load
            mfUnits:      item.dataset.mfUnits      || '',
            mfPurchaseNav:item.dataset.mfPurchaseNav || ''
        };
        data.push(obj);
    });
    localStorage.setItem('portfolioDataPro', JSON.stringify(data));
}

function clearData() {
    if(confirm("Are you sure you want to reset all portfolio data? This cannot be undone.")) {
        localStorage.removeItem('portfolioDataPro');
        localStorage.removeItem('marketCache');
        location.reload();
    }
}

function addAssetObj(obj, shouldSave = true) {
    const type = obj.type;
    const template = document.getElementById(`template-${type}`);
    // Use detail grids for adding; hidden grids for calculation
    const grid = document.getElementById(`detail-grid-${type}`) || document.getElementById(`grid-${type}`);
    if (!template || !grid) return;

    const clone = template.content.cloneNode(true);
    const itemRoot = clone.querySelector('.asset-item');

    const select = clone.querySelector('.provider-select');
    if (select) {
        if (type === 'mf') {
            if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
                const saved = localStorage.getItem('mfSchemeDb');
                if (saved) GLOBAL_SCHEME_DB = JSON.parse(saved);
            }
            Object.keys(GLOBAL_SCHEME_DB).sort().forEach(amc => {
                const opt = document.createElement('option');
                opt.value = amc; opt.textContent = amc;
                select.appendChild(opt);
            });
        } else {
            let list = [];
            if (type === 'eq')  list = GLOBAL_DB.brokers;
            if (type === 'etf') list = GLOBAL_DB.etfBrokers;
            if (type === 'fi')  list = GLOBAL_DB.banks;
            if (type === 'pf')  list = GLOBAL_DB.ppf;
            if (type === 'nps') list = GLOBAL_DB.npsFundManagers;
            list.forEach(item => {
                const option = document.createElement('option');
                option.value = item; option.textContent = item;
                select.appendChild(option);
            });
        }
    }

    const setVal = (selector, key) => {
        const el = itemRoot.querySelector(selector);
        if (el && obj[key] !== undefined) el.value = obj[key];
    };

    // Default quantity to 1 for new Equities/ETFs if not provided
    if ((type === 'eq' || type === 'etf') && (obj.qty === undefined || obj.qty === '')) {
        obj.qty = 1;
    }

    setVal('.provider-select', 'provider');
    setVal('.field-invested', 'invested');
    setVal('.field-current', 'current');
    setVal('.field-rate', 'rate');
    setVal('.field-sip', 'sip');
    setVal('.field-duration', 'duration');
    setVal('.field-qty', 'qty');
    setVal('.field-buyprice', 'buyprice');
    setVal('.field-cmp', 'cmp');
    setVal('.field-payout',    'payout');
    setVal('.field-maturity',  'maturity');
    setVal('.field-date',      'date');
    setVal('.field-tier',        'tier');
    setVal('.field-scheme-class','schemeClass');

    // Default date to today if not set
    const dateEl = itemRoot.querySelector('.field-date');
    if (dateEl && !dateEl.value) {
        dateEl.value = new Date().toISOString().split('T')[0];
    }

    // Restore MF computed units / purchase NAV from saved state
    if (type === 'mf') {
        if (obj.mfUnits)       itemRoot.dataset.mfUnits       = obj.mfUnits;
        if (obj.mfPurchaseNav) itemRoot.dataset.mfPurchaseNav = obj.mfPurchaseNav;
        const currentEl = itemRoot.querySelector('.field-current');
        if (currentEl && obj.mfUnits) {
            currentEl.readOnly = true;
            currentEl.title = `${parseFloat(obj.mfUnits).toFixed(4)} units (auto-computed)`;
        }
    }

    // For MF: populate the scheme dropdown based on selected AMC, then restore saved ticker
    if (type === 'mf' && obj.provider && obj.ticker) {
        const schemeSelect = itemRoot.querySelector('.scheme-select');
        if (schemeSelect) {
            (GLOBAL_SCHEME_DB[obj.provider] || []).forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name; opt.textContent = s.name;
                schemeSelect.appendChild(opt);
            });
            schemeSelect.value = obj.ticker;
        }
    } else if (type === 'mf' && obj.ticker) {
        // Fallback: scheme known but AMC might not match; add as standalone option
        const schemeSelect = itemRoot.querySelector('.scheme-select');
        if (schemeSelect) {
            const opt = document.createElement('option');
            opt.value = obj.ticker; opt.textContent = obj.ticker;
            schemeSelect.appendChild(opt);
            schemeSelect.value = obj.ticker;
        }
    } else if (type !== 'mf') {
        // For non-MF, field-ticker is still a text input
        setVal('.field-ticker', 'ticker');
    }

    const inputs = itemRoot.querySelectorAll('.app-input, .app-select');
    inputs.forEach(input => {
        input.addEventListener('input', () => { calculateWealth(); saveState(); });
        input.addEventListener('change', () => {
            if (input.classList.contains('provider-select')) handleSelectChange(input);
            // Trigger sparkline + NAV sync when scheme changes on an MF card
            if (input.classList.contains('scheme-select')) {
                const dateInput = itemRoot.querySelector('.field-date');
                renderMFSparkline(itemRoot, input.value, dateInput?.value);
                syncMFCurrentValue(itemRoot);
            }
            // Trigger NAV sync when date changes on an MF card
            if (input.classList.contains('field-date') && itemRoot.dataset.type === 'mf') {
                syncMFCurrentValue(itemRoot);
            }
            // Trigger NAV sync when invested amount changes on an MF card
            if (input.classList.contains('field-invested') && itemRoot.dataset.type === 'mf') {
                syncMFCurrentValue(itemRoot);
            }
            calculateWealth(); saveState();
        });
    });

    grid.appendChild(itemRoot);
    if (select) handleSelectChange(select);

    // Render sparkline for MF cards loaded from saved state
    if (type === 'mf' && obj.ticker) {
        const schemeSelect = itemRoot.querySelector('.scheme-select');
        const dateInput    = itemRoot.querySelector('.field-date');
        if (schemeSelect?.value) {
            requestAnimationFrame(() => renderMFSparkline(itemRoot, schemeSelect.value, dateInput?.value));
        }
    }

    // Attach auto-price for EQ and ETF cards
    if (type === 'eq' || type === 'etf') {
        if (obj.ticker && !obj.cmp) {
            fetchAndFillPrice(itemRoot);
        }

        // 3-Way binding for Qty <-> Buy Price <-> Invested
        const qtyEl = itemRoot.querySelector('.field-qty');
        const buyEl = itemRoot.querySelector('.field-buyprice');
        const invEl = itemRoot.querySelector('.field-invested');
        
        if (qtyEl && buyEl && invEl) {
            const updateFields = (source) => {
                const q = parseFloat(qtyEl.value);
                const b = parseFloat(buyEl.value);
                const i = parseFloat(invEl.value);
                
                if (source === 'qty' && !isNaN(q)) {
                    if (!isNaN(b) && b !== 0) invEl.value = parseFloat((q * b).toFixed(2));
                    else if (!isNaN(i) && q !== 0) buyEl.value = parseFloat((i / q).toFixed(2));
                }
                else if (source === 'buy' && !isNaN(b) && b !== 0) {
                    if (!isNaN(q)) invEl.value = parseFloat((q * b).toFixed(2));
                    else if (!isNaN(i)) qtyEl.value = parseFloat((i / b).toFixed(4));
                }
                else if (source === 'inv' && !isNaN(i)) {
                    if (!isNaN(q) && q !== 0) buyEl.value = parseFloat((i / q).toFixed(2));
                    else if (!isNaN(b) && b !== 0) qtyEl.value = parseFloat((i / b).toFixed(4));
                }
            };

            qtyEl.addEventListener('input', () => updateFields('qty'));
            buyEl.addEventListener('input', () => updateFields('buy'));
            invEl.addEventListener('input', () => updateFields('inv'));
        }
    }

    if (shouldSave) { saveState(); calculateWealth(); }
}

// ─── TV SEARCH MODAL & AUTO BUY-PRICE (EQ / ETF) ─────────────────────────────

let currentTVAssetType = 'eq';

function openTVSearchModal(type) {
    currentTVAssetType = type;
    const modal = document.getElementById('tv-search-modal');
    const input = document.getElementById('tv-search-input');
    const results = document.getElementById('tv-search-results');
    
    if (modal) modal.style.display = 'flex';
    if (input) {
        input.value = '';
        input.focus();
    }
    if (results) results.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-3); font-size: 0.9rem;">Type to search stocks or ETFs...</div>';
}

function closeTVSearchModal() {
    const modal = document.getElementById('tv-search-modal');
    if (modal) modal.style.display = 'none';
}

function initTVSearch() {
    const input = document.getElementById('tv-search-input');
    const results = document.getElementById('tv-search-results');
    if (!input || !results) return;

    let searchTimer = null;
    let abortController = null;
    let selectedIndex = -1;

    const renderEmpty = (msg) => {
        results.innerHTML = `<div style="padding: 3rem 2rem; text-align: center; color: var(--text-3); font-size: 0.9rem;">${msg}</div>`;
    };

    input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = input.value.trim();
        selectedIndex = -1;

        if (q.length < 2) {
            renderEmpty('Type at least 2 characters to search...');
            return;
        }

        results.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-3); font-size: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <div class="loading-spinner" style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span>Searching for "${q}"...</span>
            </div>
        `;

        searchTimer = setTimeout(async () => {
            if (SEARCH_CACHE.has(q)) {
                renderResults(SEARCH_CACHE.get(q));
                return;
            }

            if (abortController) abortController.abort();
            abortController = new AbortController();

            try {
                const data = await fetchFreeStockAPI(`/search?q=${encodeURIComponent(q)}`, abortController.signal);
                if (!data) return; 

                const items = data.results || [];
                SEARCH_CACHE.set(q, items);
                renderResults(items);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("Search error:", e);
                    let errorMsg = "Connectivity issue.";
                    let subMsg = e.message;
                    if (e.message.includes("NetworkError") || e.message.includes("Failed to fetch")) {
                        errorMsg = "Request Blocked.";
                        subMsg = "Check your Ad-blocker or VPN.";
                    } else if (e.message.includes("429")) {
                        errorMsg = "Rate limited.";
                        subMsg = "Please wait a moment.";
                    }
                    renderEmpty(`<span style="color:#f43f5e">⚠️ ${errorMsg}</span><br><small style="color:var(--text-3); font-size:0.75rem; margin-top:0.5rem; display:block; line-height:1.4;">${subMsg}</small>`);
                }
            }
        }, 300);
    });

    function renderResults(items) {
        results.innerHTML = '';
        if (items.length === 0) {
            renderEmpty(`No results found.`);
            return;
        }

        items.slice(0, 15).forEach((r, idx) => {
            const div = document.createElement('div');
            div.className = 'tv-search-item';
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: all 0.2s;";
            div.dataset.index = idx;
            
            const name = r.company_name || r.name || r.symbol || 'Unknown';
            const symbol = r.symbol || r.ticker || 'N/A';
            const exchange = r.exchange || 'NSE';
            const initial = name.substring(0, 1).toUpperCase();

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: ${exchange === 'BSE' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${exchange === 'BSE' ? '#3b82f6' : '#10b981'}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.05);">${initial}</div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: 0.5px;">${symbol}</div>
                        <div style="font-size: 0.75rem; color: var(--text-2); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                     <span style="font-size: 0.65rem; color: var(--text-3); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid var(--border);">${exchange}</span>
                </div>
            `;

            div.onmouseover = () => {
                div.style.background = 'rgba(255,255,255,0.04)';
                div.style.paddingLeft = '1.5rem';
            };
            div.onmouseout = () => {
                div.style.background = 'transparent';
                div.style.paddingLeft = '1.2rem';
            };

            div.onclick = () => {
                const defaultBroker = localStorage.getItem('defaultBroker') || '';
                addAssetObj({
                    type: currentTVAssetType,
                    ticker: symbol,
                    provider: defaultBroker
                }, true);
                closeTVSearchModal();
            };

            results.appendChild(div);
        });
    }

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = results.querySelectorAll('.tv-search-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            items[selectedIndex].click();
        } else if (e.key === 'Enter' && items.length > 0) {
            // If nothing selected, select the first one
            e.preventDefault();
            items[0].click();
        }
    });

    function updateSelection(items) {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.style.background = 'rgba(255,255,255,0.08)';
                item.style.paddingLeft = '1.5rem';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'transparent';
                item.style.paddingLeft = '1.2rem';
            }
        });
    }
}

const fetchAndFillPrice = async (card) => {
    const tickerInput = card.querySelector('.field-ticker');
    if (!tickerInput) return;
    const sym = tickerInput.value.trim().toUpperCase().replace(/\.NS$/i, '').replace(/\.BO$/i, '');
    if (!sym) return;

    const buyEl = card.querySelector('.field-buyprice');
    const cmpEl = card.querySelector('.field-cmp');
    if (!buyEl && !cmpEl) return;

    if (buyEl) buyEl.placeholder = '⏳ fetching…';
    if (cmpEl) cmpEl.placeholder = '⏳ fetching…';

    try {
        const data = await fetchFreeStockAPI(`/stock?symbol=${encodeURIComponent(sym)}&res=num`);
        const price = data.data?.last_price;
        if (price != null) {
            const p = parseFloat(price).toFixed(2);
            if (buyEl && !buyEl.value) {
                buyEl.value = p;
                // Auto-calculate invested amount if qty is present
                const qtyEl = card.querySelector('.field-qty');
                const invEl = card.querySelector('.field-invested');
                if (qtyEl && invEl && qtyEl.value) {
                    invEl.value = (parseFloat(qtyEl.value) * parseFloat(p)).toFixed(2);
                }
            }
            if (cmpEl) cmpEl.value = p;

            const cacheRaw = localStorage.getItem('marketCache');
            const cache = cacheRaw ? JSON.parse(cacheRaw) : { eqPrices: {} };
            cache.eqPrices = cache.eqPrices || {};
            cache.eqPrices[sym] = p;
            localStorage.setItem('marketCache', JSON.stringify(cache));

            calculateWealth();
            saveState();
        }
    } catch (e) {
        console.warn(`Auto-price fetch failed for ${sym}:`, e.message);
    } finally {
        if (buyEl) buyEl.placeholder = '0';
        if (cmpEl) cmpEl.placeholder = '0';
    }
};

// ─── FREE NSE/BSE STOCK API (http://65.0.104.9/) ────────────────────────────
const FREE_STOCK_API = 'http://65.0.104.9';

async function fetchFreeStockAPI(path, signal = null) {
    const target = `${FREE_STOCK_API}${path}`;
    
    const attempts = [
        { url: `https://corsproxy.io/?url=${encodeURIComponent(target)}`, type: 'json' },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(target)}&_=${Date.now()}`, type: 'allorigins' },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`, type: 'json' },
        { url: `https://thingproxy.freeboard.io/fetch/${target}`, type: 'json' }
    ];

    // Try direct fetch if on localhost or HTTP (to avoid Mixed Content blocks)
    if (window.location.protocol === 'http:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        attempts.unshift({ url: target, type: 'json' });
    }

    let lastError = null;

    for (const attempt of attempts) {
        try {
            const res = await fetch(attempt.url, { 
                signal,
                headers: attempt.type === 'json' ? { 'Accept': 'application/json' } : {}
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            let data;
            if (attempt.type === 'allorigins') {
                const wrapper = await res.json();
                if (!wrapper.contents) throw new Error("Empty AllOrigins response");
                data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
            } else {
                data = await res.json();
            }

            if (data && data.status === 'error') throw new Error(data.message || 'API error');
            return data;
        } catch (e) {
            if (e.name === 'AbortError') return null;
            lastError = e;
            console.warn(`Attempt with ${attempt.url} failed:`, e.message);
            // Continue to next attempt
        }
    }

    throw lastError || new Error("Failed to reach stock API through any channel.");
}

// ─── WHOLE MARKET SYNC (EQUITIES + MF + FDs) ─────────────────────────────────
function getISTDate() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
}

function getCurrentMarketSlot() {
    const now = getISTDate();
    const time = now.getHours() + (now.getMinutes()/60);
    if (time < 9.25) return -1;
    if (time < 10.00) return 1;
    if (time < 10.75) return 2;
    if (time < 11.50) return 3;
    if (time < 12.50) return 4;
    if (time < 13.50) return 5;
    if (time < 14.50) return 6;
    if (time < 15.50) return 7;
    return 8;
}

function extractPrice(data) {
    let cmp = null;
    if (data.currentPrice && typeof data.currentPrice === 'number') cmp = data.currentPrice;
    else if (data.currentPrice && data.currentPrice.price) cmp = data.currentPrice.price;
    else if (data.priceInfo && data.priceInfo.lastPrice) cmp = data.priceInfo.lastPrice;
    else if (data.price) cmp = data.price;
    else if (data.lastPrice) cmp = data.lastPrice;
    else if (data.priceInfo && data.priceInfo.pPrice) cmp = data.priceInfo.pPrice;
    
    if (cmp === null) {
        for (let key in data) {
            if (data[key] && typeof data[key] === 'object') {
                if (data[key].currentPrice) { cmp = data[key].currentPrice; break; }
                if (data[key].lastPrice) { cmp = data[key].lastPrice; break; }
                if (data[key].price) { cmp = data[key].price; break; }
            }
        }
    }
    return cmp;
}

async function syncPortfolioPrices() {
    const now = getISTDate();
    const day = now.toISOString().split('T')[0];
    const slot = getCurrentMarketSlot();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    const cacheRaw = localStorage.getItem('marketCache');
    let cache = cacheRaw ? JSON.parse(cacheRaw) : { date: '', slot: -2, eqPrices: {}, mfPrices: {} };

    // Collect all equity + ETF tickers from portfolio cards
    const tickersToFetch = new Set();
    document.querySelectorAll('#grid-eq .asset-item, #grid-etf .asset-item').forEach(i => {
        const t = i.querySelector('.field-ticker')?.value.trim();
        if (t) tickersToFetch.add(t.toUpperCase());
    });

    if (!tickersToFetch.size) {
        alert('No equity/ETF tickers in your portfolio. Add stocks first.');
        return;
    }

    if (cache.date === day && cache.slot === slot && !isWeekend) {
        alert(`Already synced for this market slot. Using cached prices.`);
        applyPricesFromCache(cache);
        return;
    }

    const btn = document.getElementById('sync-all-btn');
    const originalText = btn?.textContent || 'Sync Prices';
    if (btn) btn.textContent = '⏳ Fetching prices...';

    const newEqPrices = { ...(cache.eqPrices || {}) };
    let successCount = 0;

    // ── 1. Batch-fetch all portfolio tickers in a single request ────────────────
    try {
        const symbolList = [...tickersToFetch].join(',');
        const data = await fetchFreeStockAPI(`/stock/list?symbols=${encodeURIComponent(symbolList)}&res=num`);
        if (data.stocks && Array.isArray(data.stocks)) {
            data.stocks.forEach(s => {
                if (s.symbol && s.last_price != null) {
                    newEqPrices[s.symbol.toUpperCase()] = parseFloat(s.last_price).toFixed(2);
                    successCount++;
                }
            });
        }
    } catch (e) {
        console.warn('Batch stock fetch failed:', e.message);
    }

    // ── 2. Per-ticker fallback for any that weren't in the batch response ───────
    for (const ticker of tickersToFetch) {
        // Normalise: strip .NS/.BO suffix for cache key lookup
        const key = ticker.replace(/\.(NS|BO)$/i, '');
        if (!newEqPrices[key] && !newEqPrices[ticker]) {
            try {
                const data = await fetchFreeStockAPI(`/stock?symbol=${encodeURIComponent(ticker)}&res=num`);
                if (data.data?.last_price != null) {
                    const normKey = (data.symbol || key).toUpperCase();
                    newEqPrices[normKey] = parseFloat(data.data.last_price).toFixed(2);
                    successCount++;
                }
            } catch (e) {
                console.warn(`Individual fetch failed for ${ticker}:`, e.message);
            }
        }
    }

    if (btn) btn.textContent = originalText;

    if (successCount > 0) {
        const updatedCache = { ...cache, date: day, slot: slot, eqPrices: newEqPrices };
        localStorage.setItem('marketCache', JSON.stringify(updatedCache));
        applyPricesFromCache(updatedCache);
        updateMarketMovers();
        alert(`✅ ${successCount} stock price(s) updated successfully!`);
        calculateWealth();
        saveState();
    } else {
        if (btn) btn.textContent = originalText;
        alert('Stock price sync failed. Check your connection and try again.');
    }
}

async function syncMarketInsights() {
    // Button is optional — function is also called automatically on startup
    const btn = document.getElementById('sync-insights-btn');
    if (btn) btn.textContent = '⏳ Fetching...';

    const cacheRaw = localStorage.getItem('marketCache');
    let cache = cacheRaw ? JSON.parse(cacheRaw) : { date: '', slot: -2, eqPrices: {}, mfPrices: {} };

    let success = false;

    // 1. MUTUAL FUND NAVs (AMFI - Free) — delegates to shared parser
    try {
        const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://portal.amfiindia.com/spages/NAVAll.txt'));
        if (res.ok) {
            const data = await res.json();
            if (data.contents) {
                parseAndStoreAMFI(data.contents);  // Updates GLOBAL_SCHEME_DB, cache, and AMC dropdowns
                success = true;
            }
        }
    } catch(e) { console.error('MF Sync Error:', e); }

    // 2. NEWS & FINANCIALS (Yahoo Finance - Free)
    const tickersToFetch = new Set();
    document.querySelectorAll('.asset-item').forEach(i => {
        const t = i.querySelector('.field-ticker, .scheme-select');
        if (t && t.value.trim()) tickersToFetch.add(t.value.trim());
    });
    await updateFinancials(tickersToFetch);

    // 3. FIXED INCOME SYNC (logic-based, no API)
    syncFDPrices();

    if (btn) btn.textContent = '🌐 Sync Insights';

    calculateWealth();
    saveState();
}

async function updateMarketMovers() {
    // Fetch user's custom watchlist or fallback to Nifty-50
    const defaultWatchlist = 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,BHARTIARTL,SBIN,ITC,LT,AXISBANK,HINDUNILVR,KOTAKBANK,BAJFINANCE,MARUTI,TITAN,ASIANPAINT,WIPRO,ADANIENT,ADANIPORTS,NTPC';
    const WATCHLIST = localStorage.getItem('userWatchlist') || defaultWatchlist;
    const list = document.getElementById('insights-movers-list');
    if (!list) return;
    try {
        const data = await fetchFreeStockAPI(`/stock/list?symbols=${WATCHLIST}&res=num`);
        if (!data.stocks?.length) return;

        let advances = 0;
        let declines = 0;
        const SECTOR_MAP = {
            'Financials': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE'],
            'Tech': ['TCS', 'INFY', 'WIPRO'],
            'Energy & Infra': ['RELIANCE', 'NTPC', 'ADANIENT', 'ADANIPORTS', 'LT'],
            'Consumer': ['ITC', 'HINDUNILVR', 'ASIANPAINT', 'TITAN', 'MARUTI']
        };
        const sectorPerf = {
            'Financials': { a: 0, d: 0 },
            'Tech': { a: 0, d: 0 },
            'Energy & Infra': { a: 0, d: 0 },
            'Consumer': { a: 0, d: 0 }
        };

        const validStocks = data.stocks.filter(s => s.percent_change != null);
        
        validStocks.forEach(s => {
            const sym = s.symbol.toUpperCase();
            const up = parseFloat(s.percent_change) >= 0;
            if (up) advances++; else declines++;
            
            for (const [sec, syms] of Object.entries(SECTOR_MAP)) {
                if (syms.includes(sym)) {
                    if (up) sectorPerf[sec].a++; else sectorPerf[sec].d++;
                }
            }
        });

        // Update Market Mood
        const total = advances + declines;
        if (total > 0) {
            const advPct = (advances / total) * 100;
            const isBullish = advances > declines;
            const moodText = document.getElementById('insights-mood-text');
            if (moodText) {
                moodText.innerHTML = `The market is <span style="color: ${isBullish ? '#00E5A0' : '#FF4D6D'}; font-weight: 700;">${isBullish ? 'Bullish' : 'Bearish'} Today ${isBullish ? '↗' : '↘'}</span>`;
            }
            const moodBar = document.getElementById('insights-mood-bar');
            if (moodBar) {
                moodBar.innerHTML = `<div style="background: #00E5A0; width: ${advPct}%;"></div><div style="background: #FF4D6D; width: ${100 - advPct}%;"></div>`;
            }
            const advEl = document.getElementById('insights-advances');
            const decEl = document.getElementById('insights-declines');
            if (advEl) advEl.textContent = `Advances: ${advances}`;
            if (decEl) decEl.textContent = `Declines: ${declines}`;
        }

        // Update Sector Performance
        const secList = document.getElementById('insights-sector-list');
        if (secList) {
            secList.innerHTML = '';
            for (const [sec, perf] of Object.entries(sectorPerf)) {
                const stot = perf.a + perf.d;
                const spct = stot > 0 ? (perf.a / stot) * 100 : 50;
                secList.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: #fff;">${sec} &gt;</span>
                        <div style="width: 100px;">
                            <div style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
                                <div style="background: #00E5A0; width: ${spct}%;"></div>
                                <div style="background: #FF4D6D; width: ${100 - spct}%;"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; font-weight: 700;">
                                <span style="color:#00E5A0">${perf.a}</span><span style="color:#FF4D6D">${perf.d}</span>
                            </div>
                        </div>
                    </div>`;
            }
        }

        // Sort by absolute percent change: gainers first, then losers
        const sorted = [...validStocks]
            .sort((a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change))
            .slice(0, 5);

        list.innerHTML = '';
        sorted.forEach(s => {
            const up = parseFloat(s.percent_change) >= 0;
            const item = document.createElement('div');
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);";
            
            const initial = (s.company_name || s.symbol).substring(0, 2).toUpperCase();
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; font-weight: 900; color: #000;">${initial}</div>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${s.company_name || s.symbol}</div>
                        <div style="font-size: 0.65rem; color: var(--text-2);">${s.exchange || 'NSE'} Sector</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">₹${parseFloat(s.last_price).toLocaleString('en-IN')}</div>
                    <div style="font-size: 0.7rem; color: ${up ? '#00E5A0' : '#FF4D6D'}; font-weight: 600;">${up ? '+' : ''}${parseFloat(s.change).toFixed(2)} (${up ? '+' : ''}${parseFloat(s.percent_change).toFixed(2)}%)</div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) { console.error('Market Movers Error:', e); }
}

async function updateFinancials(tickers) {
    const list = document.getElementById('financials-list');
    if (!list) return;
    list.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">Syncing portfolio news from Yahoo Finance...</p>';
    
    let newsItems = [];
    CORPORATE_EVENTS = []; 
    const tickersArr = Array.from(tickers).slice(0, 5); 
    
    for (let ticker of tickersArr) {
        let lookupTicker = ticker.toUpperCase();
        if (!lookupTicker.includes('.')) lookupTicker += '.NS';

        try {
            // Using Yahoo Finance Search API via AllOrigins Proxy
            const yfUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${lookupTicker}&quotesCount=0&newsCount=3`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yfUrl)}`;
            
            const res = await fetch(proxyUrl);
            const dataRaw = await res.json();
            const data = JSON.parse(dataRaw.contents);

            if (data && data.news && data.news.length > 0) {
                data.news.forEach(news => {
                    const eventDate = new Date(news.providerPublishTime * 1000);
                    const eventObj = { 
                        name: ticker, 
                        headline: news.title,
                        source: news.publisher,
                        link: news.link,
                        date: eventDate.toLocaleDateString('en-IN'),
                        day: eventDate.getDate(),
                        month: eventDate.getMonth(),
                        year: eventDate.getFullYear(),
                        title: `${ticker}: ${news.publisher}`
                    };
                    newsItems.push(eventObj);
                    CORPORATE_EVENTS.push(eventObj);
                });
            }
        } catch (e) {
            console.error(`Yahoo Finance News Error for ${ticker}:`, e);
        }
    }
    
    if (newsItems.length > 0) {
        list.innerHTML = '';
        // Sort news by date (newest first)
        newsItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        newsItems.slice(0, 10).forEach(n => {
            const div = document.createElement('div');
            div.className = 'financial-card';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'flex-start';
            div.style.gap = '0.25rem';
            div.style.padding = '1rem 0.75rem';
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%; font-size:0.7rem; color:var(--brand-green); font-weight:700;">
                    <span>${n.name} • ${n.source}</span>
                    <span>${n.date}</span>
                </div>
                <a href="${n.link}" target="_blank" style="text-decoration:none; color:var(--text-primary); font-size:0.85rem; font-weight:600; line-height:1.3; display:block;">
                    ${n.headline}
                </a>
            `;
            list.appendChild(div);
        });
        renderCalendar(); 
    } else {
        list.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">No recent news found for your portfolio.</p>';
    }
}

function applyPricesFromCache(cache) {
    // Apply EQ & ETF — normalise suffix so "RELIANCE.NS" matches cache key "RELIANCE"
    const normTicker = (t) => t.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const lookupPrice = (t) => cache.eqPrices[t.toUpperCase()] || cache.eqPrices[normTicker(t)];

    document.querySelectorAll('#grid-eq .asset-item, #grid-etf .asset-item').forEach(item => {
        const t = item.querySelector('.field-ticker')?.value.trim();
        if (!t) return;
        const price = lookupPrice(t);
        if (price) {
            const cmpInput = item.querySelector('.field-cmp');
            if (cmpInput) cmpInput.value = price;
        }
    });

    // Apply MF using fuzzy string match (because AMFI names are long)
    const mfItems = document.querySelectorAll('#grid-mf .asset-item');
    mfItems.forEach(item => {
        const t = item.querySelector('.field-ticker').value.trim().toUpperCase();
        if(t && cache.mfPrices) {
            let matchedNav = null;
            // Exact Match
            if(cache.mfPrices[t]) matchedNav = cache.mfPrices[t];
            else {
                // Includes Match (Find first scheme that contains user's substring)
                for (let scheme in cache.mfPrices) {
                    if (scheme.includes(t)) {
                        matchedNav = cache.mfPrices[scheme];
                        break;
                    }
                }
            }
            if (matchedNav) {
                const navInput = item.querySelector('.field-current'); // We put NAV in current value or calculate
                if (navInput && item.querySelector('.field-invested').value) {
                    // Just set XIRR/Rate as a visual indicator, or if they put Units in Invested, multiply it
                    // Actually, if they use 'Invested' as Principal, we just update the text or Rate
                    // Let's just set the Rate input to the NAV for visual reference, or create a note
                    let note = item.querySelector('.api-note');
                    if(!note) {
                        note = document.createElement('div');
                        note.className = 'api-note';
                        note.style.cssText = 'font-size: 0.75rem; color: #00d09c; margin-top: 0.25rem; font-weight: bold; width: 100%;';
                        item.querySelector('.field-ticker').parentElement.appendChild(note);
                    }
                    note.textContent = `Live Market NAV: ₹${matchedNav}`;
                }
            }
        }
    });
}

function syncFDPrices() {
    // Automatically extracts RBI simulated rates from the provider strings for FDs and PPFs
    // Bank list strings hold the interest rate like "Bank Name (7.1%)"
    const fiItems = document.querySelectorAll('#grid-fi .asset-item, #grid-pf .asset-item');
    fiItems.forEach(item => {
        const select = item.querySelector('.provider-select');
        if (select && select.value) {
            handleSelectChange(select);
        }
    });
}

function handleSelectChange(selectElement) {
    const val = selectElement.value;
    const match = val.match(/(\d+\.?\d*)%/);
    if (match && match[1]) {
        const assetItem = selectElement.closest('.asset-item');
        const rateInput = assetItem.querySelector('.field-rate');
        if (rateInput) rateInput.value = match[1];
    }
}

// Advanced Calculation Logic
function calculateWealth() {
    let globalInvested = 0;
    let globalCurrent = 0;
    let weightedRateSum = 0;
    let totalEquity = 0;
    let totalDebt = 0;
    let pfMfTotal = 0, pfEqTotal = 0, pfFiTotal = 0, pfPfTotal = 0;
    let pfMfCount = 0, pfEqCount = 0, pfFiCount = 0, pfPfCount = 0;

    const items = document.querySelectorAll('.asset-item');
    
    items.forEach(item => {
        const parentId = item.parentElement?.id || '';
        const type = parentId.replace('detail-grid-', '').replace('grid-', '');
        
        const getFloat = (selector) => {
            const el = item.querySelector(selector);
            return el ? (parseFloat(el.value) || 0) : 0;
        };

        let invested = 0;
        let current = 0;
        let rate = getFloat('.field-rate');

        if (type === 'mf') {
            invested = getFloat('.field-invested');
            current = getFloat('.field-current');
            if (current === 0 && invested > 0) current = invested; 
            totalEquity += current; // Treating MF as Equity
            
        } else if (type === 'eq') {
            const qty = getFloat('.field-qty');
            const buy = getFloat('.field-buyprice');
            const cmp = getFloat('.field-cmp');
            invested = qty * buy;
            current = qty * cmp;
            totalEquity += current;

        } else if (type === 'etf') {
            const qty = getFloat('.field-qty');
            const buy = getFloat('.field-buyprice');
            const cmp = getFloat('.field-cmp');
            invested = qty * buy;
            current = qty * cmp;
            totalEquity += current;

        } else if (type === 'nps') {
            invested = getFloat('.field-invested');
            const units = getFloat('.field-qty');
            const nav   = getFloat('.field-cmp');
            current = (units > 0 && nav > 0) ? units * nav : getFloat('.field-current');
            const currentEl = item.querySelector('.field-current');
            if (currentEl && units > 0 && nav > 0) currentEl.value = current.toFixed(0);
            totalDebt += current;

        } else if (type === 'fi') {
            invested = getFloat('.field-invested');
            const tenureMonths = getFloat('.field-duration');
            const payout = item.querySelector('.field-payout') ? item.querySelector('.field-payout').value : 'Cumulative';
            
            if (payout === 'Cumulative') {
                const t = tenureMonths / 12;
                current = invested * Math.pow(1 + (rate/100)/4, 4 * t);
            } else {
                current = invested; 
            }
            const currentEl = item.querySelector('.field-current');
            if (currentEl) currentEl.value = current.toFixed(0);
            totalDebt += current;
            
        } else if (type === 'pf') {
            current = getFloat('.field-current');
            invested = current;
            totalDebt += current;
        }

        globalInvested += invested;
        globalCurrent += current;
        weightedRateSum += (current * rate);

        // Track per-type
        if (type === 'mf')  { pfMfTotal += current; pfMfCount++; }
        else if (type === 'eq')  { pfEqTotal += current; pfEqCount++; }
        else if (type === 'etf') { pfEqTotal += current; pfEqCount++; } // ETF → Equity bucket
        else if (type === 'fi')  { pfFiTotal += current; pfFiCount++; }
        else if (type === 'pf')  { pfPfTotal += current; pfPfCount++; }
        else if (type === 'nps') { pfPfTotal += current; pfPfCount++; } // NPS → PF bucket

        updateCardSummary(item);
    });

    const totalReturns = globalCurrent - globalInvested;
    const avgRate = globalCurrent > 0 ? (weightedRateSum / globalCurrent) : 0;

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    document.getElementById('total-invested').textContent = formatter.format(globalInvested);
    document.getElementById('total-portfolio-value').textContent = formatter.format(globalCurrent);
    
    const returnEl = document.getElementById('total-returns');
    if (totalReturns >= 0) {
        returnEl.textContent = '+' + formatter.format(totalReturns);
        returnEl.className = 'detail-val value-up';
    } else {
        returnEl.textContent = formatter.format(totalReturns);
        returnEl.className = 'detail-val value-down';
    }

    document.getElementById('avg-rate').textContent = avgRate.toFixed(1) + '%';
    
    const fireCorpusInput = document.getElementById('fire-corpus');
    if (fireCorpusInput && document.activeElement !== fireCorpusInput) {
        fireCorpusInput.value = globalCurrent.toFixed(0);
        if (typeof calculateFIRE === 'function') calculateFIRE();
    } else if (typeof calculateFIRE === 'function') {
        calculateFIRE();
    }
    
    updateHealthScore(avgRate, globalCurrent, totalEquity, totalDebt);
    updateOverviewTiles(formatter, pfMfTotal, pfMfCount, pfEqTotal, pfEqCount, pfFiTotal, pfFiCount, pfPfTotal, pfPfCount);
}

function updateOverviewTiles(fmt, mfV, mfC, eqV, eqC, fiV, fiC, pfV, pfC) {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('ov-mf-value', fmt.format(mfV)); set('ov-mf-count', mfC + ' scheme' + (mfC!==1?'s':''));
    set('ov-eq-value', fmt.format(eqV)); set('ov-eq-count', eqC + ' holding' + (eqC!==1?'s':''));
    set('ov-fi-value', fmt.format(fiV)); set('ov-fi-count', fiC + ' deposit' + (fiC!==1?'s':''));
    set('ov-pf-value', fmt.format(pfV)); set('ov-pf-count', pfC + ' account' + (pfC!==1?'s':''));
}

function navTo(viewId) {
    const navLink = document.querySelector(`[data-target="${viewId}"]`);
    if (navLink) navLink.click();
}

async function fetchWithTimeout(url, ms = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch(e) {
        clearTimeout(timer);
        throw e;
    }
}

async function autoLoadAMFI() {
    const loader = document.getElementById('amfi-loading');
    const bar = document.getElementById('top-loading-bar');
    if (loader) { loader.style.display = 'block'; loader.textContent = '⏳ Loading MF schemes...'; }
    if (bar) { bar.style.width = '15%'; }

    const amfiUrl = 'https://portal.amfiindia.com/spages/NAVAll.txt';

    // Try multiple CORS proxies — codetabs first
    const proxies = [
        { url: `https://api.codetabs.com/v1/proxy?quest=${amfiUrl}`, json: false },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(amfiUrl)}`, json: true },
        { url: `https://corsproxy.io/?${encodeURIComponent(amfiUrl)}`, json: false },
    ];

    for (const proxy of proxies) {
        try {
            if (loader) loader.textContent = `⏳ Trying proxy... (${proxy.url.split('/')[2]})`;
            const res = await fetchWithTimeout(proxy.url);
            if (!res.ok) continue;
            let text;
            if (proxy.json) {
                const data = await res.json();
                text = data.contents;
            } else {
                text = await res.text();
            }
            if (text && text.length > 5000 && text.includes(';')) {
                parseAndStoreAMFI(text);
                if (loader) loader.style.display = 'none';
                if (bar) { bar.style.width = '100%'; setTimeout(() => { bar.style.transition = 'opacity 0.5s'; bar.style.opacity = '0'; setTimeout(() => { bar.style.width = '0'; bar.style.opacity = '1'; bar.style.transition = 'width 0.4s ease'; }, 500); }, 200); }
                return;
            }
        } catch(e) {
            console.warn('Proxy failed:', proxy.url.split('/')[2], e.message);
        }
    }

    // All AMFI proxies failed — fall back to mfapi.in (no AMC grouping but still useful)
    try {
        if (loader) loader.textContent = '⏳ Using fallback MF API...';
        const res = await fetchWithTimeout('https://api.mfapi.in/mf');
        if (res.ok) {
            const schemes = await res.json();
            parseMFAPIResponse(schemes);
            if (loader) loader.style.display = 'none';
            return;
        }
    } catch(e) {
        console.warn('mfapi.in also failed:', e.message);
    }

    if (loader) {
        loader.textContent = '⚠️ Could not load schemes. All sources failed — try reloading.';
    }
}

function parseMFAPIResponse(schemes) {
    // mfapi.in returns [{schemeCode, schemeName}] — parse AMC from scheme name prefix
    const db = {};
    const amcKeywords = [
        'Aditya Birla Sun Life', 'Axis', 'Bandhan', 'Bank of India', 'Baroda BNP Paribas',
        'Canara Robeco', 'DSP', 'Edelweiss', 'Franklin Templeton', 'Groww', 'HDFC', 'HSBC',
        'ICICI Prudential', 'IDBI', 'Invesco', 'ITI', 'JM Financial', 'Kotak Mahindra',
        'LIC', 'Mahindra Manulife', 'Mirae Asset', 'Motilal Oswal', 'Navi', 'Nippon India',
        'NJ', 'PGIM India', 'PPFAS', 'Quant', 'Quantum', 'SBI', 'Shriram', 'Sundaram',
        'Tata', 'Taurus', 'Trust', 'Union', 'UTI', 'WhiteOak Capital', 'Zerodha'
    ];
    schemes.forEach(s => {
        const name = s.schemeName || '';
        let amc = 'Other';
        for (const kw of amcKeywords) {
            if (name.startsWith(kw)) { amc = kw + ' Mutual Fund'; break; }
        }
        if (!db[amc]) db[amc] = [];
        db[amc].push({ code: String(s.schemeCode), name, nav: '0' });
    });
    GLOBAL_SCHEME_DB = db;
    populateAMCDropdowns();
}

function parseAndStoreAMFI(contents) {
    const lines = contents.split('\n');
    let curAMC = 'Other';
    const db = {};
    lines.forEach(line => {
        const parts = line.split(';');
        if (parts.length === 1 && line.trim().length > 5 && !line.includes(';')) {
            curAMC = line.trim();
            if (!db[curAMC]) db[curAMC] = [];
        } else if (parts.length >= 5) {
            const nav = parseFloat(parts[4]);
            if (!isNaN(nav)) {
                const name = parts[3].trim();
                db[curAMC]?.push({ code: parts[0].trim(), name, nav: nav.toFixed(4) });
            }
        }
    });
    GLOBAL_SCHEME_DB = db;
    // No caching — always fresh
    populateAMCDropdowns();
}

function updateHealthScore(avgRate, totalAmount, totalEquity, totalDebt) {
    const scoreVal = document.getElementById('health-score-val');
    const scoreTitle = document.getElementById('health-title');
    const scoreDesc = document.getElementById('health-desc');
    
    if (totalAmount === 0) {
        scoreVal.textContent = '0';
        scoreTitle.textContent = 'No Data';
        scoreDesc.textContent = 'Add investments to calculate your portfolio health score.';
        scoreVal.style.color = 'var(--text-muted)';
        return;
    }

    // Pull dynamic user data from FIRE calculator if available
    const userAge = parseFloat(document.getElementById('fire-current-age')?.value) || 30;
    
    let score = 0;
    let feedback = [];

    // 1. Asset Allocation Algorithm (40 points max)
    // Rule of thumb: Target Equity % = 100 - age
    const actualEquityPct = (totalEquity / totalAmount) * 100;
    const targetEquityPct = Math.max(0, 100 - userAge);
    
    const equityDiff = Math.abs(actualEquityPct - targetEquityPct);
    if (equityDiff <= 10) {
        score += 40;
        feedback.push("Excellent age-adjusted asset allocation.");
    } else if (equityDiff <= 25) {
        score += 25;
        if (actualEquityPct > targetEquityPct) feedback.push("Slightly over-exposed to equity for your age.");
        else feedback.push("Slightly under-exposed to equity for your age.");
    } else {
        score += 10;
        if (actualEquityPct > targetEquityPct) feedback.push("High risk: Equity exposure is significantly above recommended levels.");
        else feedback.push("Growth risk: Portfolio is too conservative. Inflation may erode value.");
    }

    // 2. Diversification Algorithm (30 points max)
    // Good diversification: Neither asset class is > 90% or < 10%
    if (actualEquityPct >= 20 && actualEquityPct <= 80) {
        score += 30;
        feedback.push("Strong diversification between growth and fixed-income assets.");
    } else if (actualEquityPct >= 10 && actualEquityPct <= 90) {
        score += 20;
    } else {
        score += 5;
        feedback.push("Poor diversification. Heavily concentrated in one asset class.");
    }

    // 3. Return vs Inflation Algorithm (30 points max)
    // Assuming baseline Indian inflation at ~6%
    if (avgRate >= 10) {
        score += 30;
        feedback.push("Returns comfortably beat inflation, generating real wealth.");
    } else if (avgRate >= 7.5) {
        score += 20;
        feedback.push("Returns outpace inflation, but growth is moderate.");
    } else if (avgRate >= 6) {
        score += 10;
        feedback.push("Returns barely match inflation. Zero real growth.");
    } else {
        score += 0;
        feedback.push("Warning: Returns are below inflation. You are losing purchasing power.");
    }

    // Update UI
    scoreVal.textContent = Math.round(score);
    
    if (score >= 80) {
        scoreTitle.textContent = 'Excellent Health';
        scoreVal.style.color = 'var(--primary)';
    } else if (score >= 60) {
        scoreTitle.textContent = 'Moderate / Needs Tweaking';
        scoreVal.style.color = '#f59e0b';
    } else {
        scoreTitle.textContent = 'High Risk / Unbalanced';
        scoreVal.style.color = 'var(--danger)';
    }

    scoreDesc.textContent = feedback.join(" ");
}

// --- FIRE Calculator Logic ---
function calculateFIRE() {
    const currentAge = parseFloat(document.getElementById('fire-current-age').value) || 30;
    const retireAge  = parseFloat(document.getElementById('fire-retire-age').value)  || 50;
    const lifeExp    = parseFloat(document.getElementById('fire-life-age').value)    || 85;
    const expenses   = parseFloat(document.getElementById('fire-expenses').value)    || 50000;
    const inflation  = Math.min(parseFloat(document.getElementById('fire-inflation').value)  || 6, 30);   // cap at 30%
    const rawPre    = parseFloat(document.getElementById('fire-pre-return').value)  || 12;
    const rawPost   = parseFloat(document.getElementById('fire-post-return').value) || 8;
    const preReturn  = Math.min(rawPre, 50);  // cap at 50%
    const postReturn = Math.min(rawPost, 30);   // cap at 30%
    const corpus     = parseFloat(document.getElementById('fire-corpus').value) || 0;

    // Show warning if user inputs are way beyond caps
    const warningEl = document.getElementById('fire-warning');
    if (warningEl) {
        warningEl.style.display = (rawPre > 50 || rawPost > 30) ? 'block' : 'none';
    }

    const yearsToRetire     = Math.max(retireAge - currentAge, 1);
    const yearsInRetirement = Math.max(lifeExp - retireAge, 1);

    const futureExpenses    = expenses * Math.pow(1 + inflation / 100, yearsToRetire);
    const annualExpense     = futureExpenses * 12;
    const realRate          = ((1 + postReturn / 100) / (1 + inflation / 100)) - 1;

    let targetCorpus;
    if (Math.abs(realRate) < 0.0001) {
        targetCorpus = annualExpense * yearsInRetirement;
    } else {
        targetCorpus = annualExpense * (1 - Math.pow(1 + realRate, -yearsInRetirement)) / realRate;
    }

    const futureValueOfCorpus = corpus * Math.pow(1 + preReturn / 100, yearsToRetire);
    const shortfall = targetCorpus - futureValueOfCorpus;

    let requiredSIP = 0;
    if (shortfall > 0) {
        const monthlyRate = (preReturn / 100) / 12;
        const months = yearsToRetire * 12;
        if (monthlyRate === 0) {
            requiredSIP = shortfall / months;
        } else {
            requiredSIP = shortfall / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate));
        }
    }

    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    document.getElementById('fire-target-corpus').textContent = fmt.format(Math.max(targetCorpus, 0));
    document.getElementById('fire-future-expenses').textContent = fmt.format(futureExpenses) + ' / mo';
    document.getElementById('fire-years-to-build').textContent = `${yearsToRetire} years`;

    // Calculate Archetypes
    const leanCorpus = annualExpense * 15;
    const normCorpus = annualExpense * 25;
    const fatCorpus  = annualExpense * 50;
    // Coast FIRE: Amount needed now to reach normCorpus by retirement at preReturn rate
    const coastCorpus = normCorpus / Math.pow(1 + preReturn / 100, yearsToRetire);

    document.getElementById('fire-lean').textContent   = fmt.format(Math.max(leanCorpus, 0));
    document.getElementById('fire-normal').textContent = fmt.format(Math.max(normCorpus, 0));
    document.getElementById('fire-fat').textContent    = fmt.format(Math.max(fatCorpus, 0));
    document.getElementById('fire-coast').textContent  = fmt.format(Math.max(coastCorpus, 0));

    const sipEl = document.getElementById('fire-monthly-sip');
    if (requiredSIP > 1) { // Greater than 1 to avoid rounding noise showing tiny SIPs
        sipEl.textContent = fmt.format(requiredSIP);
        sipEl.style.color = 'var(--red)';
    } else {
        sipEl.textContent = '₹0 — Goal Achieved! 🎯';
        sipEl.style.color = 'var(--green)';
    }
}

// --- Calendar & Market Events Logic ---
let currentCalendarDate = new Date();

const TAX_EVENTS = [
    { day: 15, month: 5, title: 'Advance Tax (Q1)', type: 'tax' },
    { day: 31, month: 6, title: 'ITR Filing Deadline', type: 'tax' },
    { day: 15, month: 8, title: 'Advance Tax (Q2)', type: 'tax' },
    { day: 15, month: 11, title: 'Advance Tax (Q3)', type: 'tax' },
    { day: 15, month: 2, title: 'Advance Tax (Q4)', type: 'tax' },
    { day: 31, month: 2, title: 'Tax Saving Deadline', type: 'tax' }
];

let CORPORATE_EVENTS = []; // Stores dynamic earnings/financial releases
let USER_CUSTOM_EVENTS = []; // Stores user-added events

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-gui-grid');
    const display = document.getElementById('current-month-display');
    if (!grid || !display) return;

    // Clear previous days (keep labels)
    const labels = grid.querySelectorAll('.calendar-day-label');
    grid.innerHTML = '';
    labels.forEach(l => grid.appendChild(l));

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    display.textContent = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(currentCalendarDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        grid.appendChild(div);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (new Date().toDateString() === new Date(year, month, d).toDateString()) div.classList.add('today');

        div.innerHTML = `<span class='calendar-day-num'>${d}</span>`;

        // Add Tax Events
        TAX_EVENTS.forEach(e => {
            if (e.day === d && e.month === month) {
                const ev = document.createElement('div');
                ev.className = 'calendar-event event-tax';
                ev.textContent = e.title;
                div.appendChild(ev);
            }
        });

        // Add Corporate Events (Earnings/Releases)
        CORPORATE_EVENTS.forEach(e => {
            if (e.day === d && e.month === month && e.year === year) {
                const ev = document.createElement('div');
                ev.className = 'calendar-event event-corp';
                ev.textContent = e.title;
                div.appendChild(ev);
            }
        });

        // Add User Custom Events
        USER_CUSTOM_EVENTS.forEach(e => {
            if (e.day === d && e.month === month && e.year === year) {
                const ev = document.createElement('div');
                ev.className = 'calendar-event event-market';
                ev.textContent = e.title;
                div.appendChild(ev);
            }
        });

        // Add Investment Events (Buy/Sell)
        const portfolio = JSON.parse(localStorage.getItem('portfolioDataPro') || '[]');
        const history = JSON.parse(localStorage.getItem('portfolioHistoryPro') || '[]');
        
        [...portfolio, ...history].forEach(item => {
            if (item.date) {
                const itemDate = new Date(item.date);
                if (itemDate.getDate() === d && itemDate.getMonth() === month && itemDate.getFullYear() === year) {
                    const ev = document.createElement('div');
                    const isSold = item.isSold === true;
                    ev.className = isSold ? 'calendar-event event-tax' : 'calendar-event event-corp';
                    ev.style.background = isSold ? 'var(--danger)' : 'var(--primary)';
                    ev.textContent = (isSold ? 'SELL: ' : 'BUY: ') + (item.ticker || item.provider || 'Asset');
                    div.appendChild(ev);
                }
            }
        });

        // Make calendar day clickable
        div.style.cursor = 'pointer';
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-event')) return;
            const clickedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            promptAddFromCalendar(clickedDate);
        });

        grid.appendChild(div);
    }
}

function promptAddFromCalendar(date) {
    const title = prompt("Enter asset name/ticker to add for " + date + ":");
    if (!title) return;
    
    const type = prompt("Enter asset type (mf, eq, fi, pf):", "mf").toLowerCase();
    const validTypes = ['mf', 'eq', 'fi', 'pf'];
    const finalType = validTypes.includes(type) ? type : 'mf';

    const newAsset = {
        type: finalType,
        provider: 'Manual Entry (from Calendar)',
        ticker: title,
        date: date
    };
    
    const portfolio = JSON.parse(localStorage.getItem('portfolioDataPro') || '[]');
    portfolio.push(newAsset);
    localStorage.setItem('portfolioDataPro', JSON.stringify(portfolio));
    
    alert(`Added ${title} (${finalType}) to portfolio for ${date}. Page will refresh to update views.`);
    location.reload(); 
}

function markAsSold(btn) {
    const item = btn.closest('.asset-item');
    const parentId = item.parentElement.id;
    const type = parentId.replace('grid-', '');
    
    const getVal = (selector) => {
        const el = item.querySelector(selector);
        return el ? el.value : '';
    };

    const soldDate = prompt("Enter Sale Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!soldDate) return;

    const obj = {
        type,
        provider: getVal('.provider-select'),
        ticker: getVal('.field-ticker'),
        invested: getVal('.field-invested'),
        current: getVal('.field-current'),
        date: soldDate, // Save the sale date
        isSold: true
    };

    const history = JSON.parse(localStorage.getItem('portfolioHistoryPro') || '[]');
    history.push(obj);
    localStorage.setItem('portfolioHistoryPro', JSON.stringify(history));

    item.remove();
    saveState();
    calculateWealth();
    renderCalendar();
}

// --- Custom Event Management ---
function openAddEventModal() {
    document.getElementById('add-event-form').style.display = 'block';
}

function closeAddEventModal() {
    document.getElementById('add-event-form').style.display = 'none';
}

function addCustomEvent() {
    const title = document.getElementById('custom-event-title').value;
    const dateStr = document.getElementById('custom-event-date').value;
    
    if (!title || !dateStr) {
        alert("Please provide both a title and a date.");
        return;
    }

    const eventDate = new Date(dateStr);
    const eventObj = {
        title: title,
        day: eventDate.getDate(),
        month: eventDate.getMonth(),
        year: eventDate.getFullYear(),
        dateStr: dateStr
    };

    USER_CUSTOM_EVENTS.push(eventObj);
    localStorage.setItem('userCustomEvents', JSON.stringify(USER_CUSTOM_EVENTS));
    
    renderCalendar();
    closeAddEventModal();
    
    // Clear inputs
    document.getElementById('custom-event-title').value = '';
    document.getElementById('custom-event-date').value = '';
}

function loadCustomEvents() {
    const saved = localStorage.getItem('userCustomEvents');
    if (saved) {
        try {
            USER_CUSTOM_EVENTS = JSON.parse(saved);
        } catch (e) { console.error("Error loading custom events", e); }
    }
}

// --- MF Explorer Logic ---
function initExplorer() {
    const amcSelect = document.getElementById('explorer-amc-select');
    if (!amcSelect) return;

    if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
        const saved = localStorage.getItem('mfSchemeDb');
        if (saved) GLOBAL_SCHEME_DB = JSON.parse(saved);
    }

    if (Object.keys(GLOBAL_SCHEME_DB).length > 0) {
        document.getElementById('explorer-status').style.display = 'none';
        amcSelect.innerHTML = '<option value="">Select AMC to Explore...</option>';
        Object.keys(GLOBAL_SCHEME_DB).sort().forEach(amc => {
            const opt = document.createElement('option');
            opt.value = amc;
            opt.textContent = amc;
            amcSelect.appendChild(opt);
        });
    }
}

function populateExplorerSchemes() {
    const amc = document.getElementById('explorer-amc-select').value;
    const grid = document.getElementById('explorer-schemes-grid');
    if (!amc || !grid) return;

    grid.innerHTML = '';
    const schemes = GLOBAL_SCHEME_DB[amc] || [];
    schemes.forEach(s => {
        const div = document.createElement('div');
        div.className = 'asset-item';
        div.style.flexDirection = 'row';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '0.75rem 1rem';
        
        div.innerHTML = `
            <div style="flex: 1;">
                <h4 style="font-size:0.9rem; margin-bottom:0.25rem;">${s.name}</h4>
                <div style="font-size:0.75rem; color:var(--text-secondary);">Code: ${s.code} • NAV: ₹${s.nav}</div>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-outline btn-sm" onclick="viewHistory('${s.code}', '${s.name.replace(/'/g, "\\'")}')">📈 History</button>
                <button class="btn btn-primary btn-sm" onclick="addFromExplorer('${amc.replace(/'/g, "\\'")}', '${s.name.replace(/'/g, "\\'")}', ${s.nav})">+ Add</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

function filterExplorerSchemes() {
    const query = document.getElementById('explorer-search').value.toUpperCase();
    const items = document.querySelectorAll('#explorer-schemes-grid .asset-item');
    items.forEach(item => {
        const text = item.textContent.toUpperCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

function addFromExplorer(amc, name, nav) {
    addAssetObj({
        type: 'mf',
        provider: amc,
        ticker: name,
        current: nav
    }, true);
    alert(`${name} added to your portfolio!`);
}

// --- Historical Charting Logic ---
async function viewHistory(code, name) {
    const modal = document.getElementById('chart-modal');
    const loading = document.getElementById('chart-loading');
    const title = document.getElementById('chart-modal-title');
    
    modal.style.display = 'flex';
    loading.style.display = 'flex';
    title.textContent = `Performance History: ${name}`;

    try {
        const today = new Date();
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 2);

        const fmt = (d) => `${d.getDate()}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`;
        const historyUrl = `https://portal.amfiindia.com/DownloadNAVHistoryReport.aspx?task=1&frmdt=${fmt(lastYear)}&todt=${fmt(today)}&scmCode=${code}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(historyUrl)}`;

        const res = await fetch(proxyUrl);
        const dataRaw = await res.json();
        const contents = dataRaw.contents;

        if (!contents || contents.includes('No Data Found')) throw new Error("No data found");

        const lines = contents.split('\n');
        const labels = [];
        const values = [];

        lines.forEach(line => {
            const parts = line.split(';');
            if (parts.length >= 5) {
                const nav = parseFloat(parts[4]);
                const date = parts[5];
                if (!isNaN(nav) && date) {
                    labels.push(date.trim());
                    values.push(nav);
                }
            }
        });

        // Reverse to show chronological order
        labels.reverse();
        values.reverse();

        renderHistoryChart(labels, values, name);
    } catch (e) {
        alert("Could not fetch historical data for this scheme. Error: " + e.message);
        closeChartModal();
    } finally {
        loading.style.display = 'none';
    }
}

function renderHistoryChart(labels, values, name) {
    const ctx = document.getElementById('performance-chart').getContext('2d');
    
    if (PERFORMANCE_CHART) PERFORMANCE_CHART.destroy();

    PERFORMANCE_CHART = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'NAV (₹)',
                data: values,
                borderColor: '#00e5a0',
                backgroundColor: 'rgba(0,229,160,0.07)',
                fill: true,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#00e5a0',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#131720',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#8892a4',
                    bodyColor: '#f0f4ff',
                    padding: 12
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#4a5568', maxRotation: 0, autoSkip: true, maxTicksLimit: 10, font: { size: 11 } }
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#4a5568', font: { size: 11 } }
                }
            }
        }
    });
}

function closeChartModal() {
    document.getElementById('chart-modal').style.display = 'none';
}

function populateAMCDropdowns() {
    // Load DB from cache if not in memory
    if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
        const saved = localStorage.getItem('mfSchemeDb');
        if (saved) {
            try { GLOBAL_SCHEME_DB = JSON.parse(saved); } catch(e) {}
        }
    }

    const amcs = Object.keys(GLOBAL_SCHEME_DB).sort();
    if (amcs.length === 0) return; // Not loaded yet — autoLoadAMFI will call us again

    // Target: top-level page dropdowns + every per-card AMC select
    const selects = document.querySelectorAll('#add-mf-amc-dropdown, #explorer-amc-select, .amc-list');

    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select AMC...</option>';
        amcs.forEach(amc => {
            const opt = document.createElement('option');
            opt.value = amc;
            opt.textContent = amc;
            select.appendChild(opt);
        });
        // Restore previously selected value
        if (currentVal) select.value = currentVal;
    });
}

function updateSchemeDropdown() {
    // For the top-level "add" dropdowns on the MF page
    const amc = document.getElementById('add-mf-amc-dropdown').value;
    const schemeSelect = document.getElementById('add-mf-scheme-dropdown');
    if (!schemeSelect) return;

    schemeSelect.innerHTML = '<option value="">Select Scheme...</option>';
    if (!amc) return;

    if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
        const saved = localStorage.getItem('mfSchemeDb');
        if (saved) GLOBAL_SCHEME_DB = JSON.parse(saved);
    }

    (GLOBAL_SCHEME_DB[amc] || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name;
        opt.dataset.nav = s.nav;
        schemeSelect.appendChild(opt);
    });
}

function populateSchemeSelect(amcSelectEl) {
    // For the per-card scheme dropdown inside each template-mf asset
    const amc = amcSelectEl.value;
    const card = amcSelectEl.closest('.asset-item');
    if (!card) return;
    const schemeSelect = card.querySelector('.scheme-select');
    if (!schemeSelect) return;

    schemeSelect.innerHTML = '<option value="">Select Scheme...</option>';
    if (!amc) return;

    if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
        const saved = localStorage.getItem('mfSchemeDb');
        if (saved) GLOBAL_SCHEME_DB = JSON.parse(saved);
    }

    (GLOBAL_SCHEME_DB[amc] || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name;
        opt.dataset.nav = s.nav;
        schemeSelect.appendChild(opt);
    });

    saveState();
}

function addSelectedMFFromDropdowns() {
    const amc = document.getElementById('add-mf-amc-dropdown').value;
    const schemeSelect = document.getElementById('add-mf-scheme-dropdown');
    const schemeName = schemeSelect.value;
    
    if (!amc || !schemeName) {
        alert("Please select both an AMC and a Scheme.");
        return;
    }

    const selectedOption = schemeSelect.options[schemeSelect.selectedIndex];
    const nav = selectedOption.dataset.nav;

    addAssetObj({
        type: 'mf',
        provider: amc,
        ticker: schemeName,
        current: nav
    }, true);

    alert(`Successfully added ${schemeName} to your portfolio.`);
}

// ─────────────────────────────────────────────────────────
// MF Duration Badge
// ─────────────────────────────────────────────────────────
function updateMFDuration(dateInput) {
    const badge = dateInput.parentElement.querySelector('.mf-duration-badge');
    if (!badge) return;
    if (!dateInput.value) { badge.textContent = ''; return; }
    const start = new Date(dateInput.value);
    const now = new Date();
    if (start > now) { badge.textContent = 'Future date'; return; }
    const days = Math.floor((now - start) / 86400000);
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    const d = days % 30;
    let parts = [];
    if (y > 0) parts.push(`${y}y`);
    if (m > 0) parts.push(`${m}m`);
    if (d > 0 && y === 0) parts.push(`${d}d`);
    badge.textContent = parts.length ? `⏱ ${parts.join(' ')} ago` : 'Today';
}

// ─────────────────────────────────────────────────────────
// MF Backtester & Fund Comparator
// ─────────────────────────────────────────────────────────
const BT_COLORS = ['#00e5a0','#8b5cf6','#f59e0b','#06b6d4','#f43f5e','#84cc16'];
let BACKTEST_SLOTS = [];
let BT_CHART = null;

function addBacktestSlot() {
    if (BACKTEST_SLOTS.length >= 6) { alert('Maximum 6 funds for comparison.'); return; }
    BACKTEST_SLOTS.push({ id: Date.now() });
    renderBacktestSlots();
}

function removeBacktestSlot(id) {
    BACKTEST_SLOTS = BACKTEST_SLOTS.filter(s => s.id !== id);
    renderBacktestSlots();
}

function renderBacktestSlots() {
    const container = document.getElementById('backtest-slots');
    if (!container) return;
    
    // Ensure Scheme DB is populated from cache if missing
    if (Object.keys(GLOBAL_SCHEME_DB).length === 0) {
        const saved = localStorage.getItem('mf_amc_db');
        if (saved) {
            try { GLOBAL_SCHEME_DB = JSON.parse(saved); } catch(e) {}
        }
    }

    if (BACKTEST_SLOTS.length === 0) {
        container.innerHTML = '<p style="color:var(--text-2);text-align:center;padding:2rem 0;font-size:0.875rem;">Click <strong style="color:var(--green)">+ Add Fund</strong> to begin comparing mutual funds.</p>';
        return;
    }
    const amcs = Object.keys(GLOBAL_SCHEME_DB).sort();
    const amcOpts = amcs.map(a => `<option value="${a}">${a}</option>`).join('');
    container.innerHTML = '';
    BACKTEST_SLOTS.forEach((slot, i) => {
        const color = BT_COLORS[i % BT_COLORS.length];
        const div = document.createElement('div');
        div.className = 'backtest-slot';
        div.innerHTML = `
            <span class="slot-color-dot" style="background:${color};"></span>
            <span class="slot-num">F${i+1}</span>
            <select class="app-select" id="bt-amc-${slot.id}" onchange="populateBtSchemes(${slot.id})" style="flex:1;min-width:160px;">
                <option value="">Select AMC...</option>${amcOpts}
            </select>
            <select class="app-select" id="bt-scheme-${slot.id}" style="flex:2;min-width:240px;">
                <option value="">← Select AMC first</option>
            </select>
            <button class="remove-btn" onclick="removeBacktestSlot(${slot.id})">&#10005;</button>`;
        container.appendChild(div);
    });
}

function populateBtSchemes(slotId) {
    const amc = document.getElementById(`bt-amc-${slotId}`)?.value;
    const sel = document.getElementById(`bt-scheme-${slotId}`);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Scheme...</option>';
    (GLOBAL_SCHEME_DB[amc] || []).forEach(s => {
        const o = document.createElement('option');
        o.value = s.code; o.textContent = s.name;
        sel.appendChild(o);
    });
}

async function runBacktest() {
    const startStr = document.getElementById('bt-start-date').value;
    const endStr   = document.getElementById('bt-end-date').value || new Date().toISOString().split('T')[0];
    if (!startStr) { alert('Please select a start date.'); return; }
    if (BACKTEST_SLOTS.length === 0) { alert('Add at least one fund.'); return; }

    const statusEl    = document.getElementById('backtest-status');
    const chartCard   = document.getElementById('backtest-chart-card');
    const metricsCard = document.getElementById('backtest-metrics-card');
    chartCard.style.display = metricsCard.style.display = 'block';
    if (statusEl) statusEl.textContent = '⏳ Fetching historical NAVs...';

    const startMs = new Date(startStr).getTime();
    const endMs   = new Date(endStr).getTime();
    const datasets = [], metrics = [];

    for (let i = 0; i < BACKTEST_SLOTS.length; i++) {
        const slot  = BACKTEST_SLOTS[i];
        const code  = document.getElementById(`bt-scheme-${slot.id}`)?.value;
        const name  = document.getElementById(`bt-scheme-${slot.id}`)?.selectedOptions[0]?.textContent || 'Fund';
        if (!code) continue;
        if (statusEl) statusEl.textContent = `⏳ Loading ${name.substring(0,32)}...`;
        try {
            const url = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.mfapi.in/mf/${code}`)}`;
            const res = await fetchWithTimeout(url, 15000);
            if (!res.ok) continue;
            const resData = await res.json();
            const json = JSON.parse(resData.contents);
            if (!json.data || json.data.length < 2) continue;

            // AMFI format: DD-MM-YYYY, newest first
            const allParsed = json.data
                .map(d => {
                    const [dd,mm,yyyy] = d.date.split('-');
                    return { ts: new Date(`${yyyy}-${mm}-${dd}`).getTime(), nav: parseFloat(d.nav) };
                })
                .filter(p => !isNaN(p.nav))
                .reverse(); // oldest first

            // Find the effective start: the first available NAV on or after startMs
            // (allows up to 10 calendar days ahead to skip weekends & holidays)
            const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
            const firstAvail = allParsed.find(p => p.ts >= startMs && p.ts <= startMs + tenDaysMs);
            if (!firstAvail) {
                if (statusEl) statusEl.textContent = `⚠ No NAV found within 10 days of start date for "${name.substring(0,32)}". Try an earlier start date.`;
                continue;
            }
            const effectiveStartMs = firstAvail.ts;

            const points = allParsed.filter(p => p.ts >= effectiveStartMs && p.ts <= endMs);

            if (points.length < 2) {
                if (statusEl) statusEl.textContent = `⚠ Not enough NAV data for "${name.substring(0,32)}" in selected range.`;
                continue;
            }

            const baseNav = points[0].nav;
            const color   = BT_COLORS[i % BT_COLORS.length];
            const allLabels = points.map(p => new Date(p.ts).toISOString().split('T')[0]);
            const allValues = points.map(p => +((p.nav / baseNav * 100).toFixed(2)));

            // Downsample to ~200 points for chart performance
            const step = Math.max(1, Math.floor(points.length / 200));
            const labels = allLabels.filter((_, j) => j % step === 0 || j === allLabels.length-1);
            const values = allValues.filter((_, j) => j % step === 0 || j === allValues.length-1);

            datasets.push({
                label: name.length > 45 ? name.substring(0,45)+'…' : name,
                data: values, _labels: labels,
                borderColor: color, backgroundColor: color + '15',
                borderWidth: 2, pointRadius: 0, tension: 0.2
            });

            const firstNav = points[0].nav, lastNav = points[points.length-1].nav;
            const yrs = (endMs - startMs) / (1000*60*60*24*365.25);
            const cagr = yrs > 0 ? ((Math.pow(lastNav/firstNav, 1/yrs)-1)*100).toFixed(2) : 'N/A';
            metrics.push({ name, color,
                firstNav: firstNav.toFixed(2), lastNav: lastNav.toFixed(2),
                cagr, tot: (((lastNav-firstNav)/firstNav)*100).toFixed(2), pts: points.length });
        } catch(e) { console.warn('Backtest error for', code, e); }
    }

    if (!datasets.length) {
        if (statusEl) statusEl.textContent = '⚠️ No data — check scheme & date range.';
        return;
    }

    // Unified labels from widest dataset
    const masterLabels = datasets.reduce((a,b) => (a._labels.length > b._labels.length ? a : b))._labels;
    datasets.forEach(ds => {
        const map = {};
        ds._labels.forEach((l,i) => map[l] = ds.data[i]);
        ds.data = masterLabels.map(l => map[l] ?? null);
    });

    // Thin x-axis labels
    const maxTicks = 16;
    const step2 = Math.max(1, Math.floor(masterLabels.length / maxTicks));
    const xLabels = masterLabels.map((l,i) => i % step2 === 0 ? l.substring(0,7) : '');

    if (typeof Chart === 'undefined') {
        if (statusEl) statusEl.textContent = '⚠️ Chart.js could not be loaded from CDN. Please check your connection or adblocker.';
        return;
    }
    if (BT_CHART) BT_CHART.destroy();
    const ctx = document.getElementById('backtest-chart').getContext('2d');
    BT_CHART = new Chart(ctx, {
        type: 'line',
        data: { labels: xLabels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false, spanGaps: true,
            plugins: {
                legend: { labels: { color: '#8892a4', font: { family: 'Inter', size: 11 }, padding: 16 } },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: '#131720', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
                    titleColor: '#8892a4', bodyColor: '#f0f4ff', padding: 12,
                    callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y != null ? c.parsed.y.toFixed(1)+'%' : '—'}` }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', maxRotation: 0 } },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#4a5568', callback: v => v+'%' },
                    title: { display: true, text: 'Normalised Return (Start = 100%)', color: '#4a5568', font: { size: 11 } }
                }
            }
        }
    });

    document.getElementById('backtest-metrics').innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
                <tr style="border-bottom:1px solid var(--border);color:var(--text-3);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;">
                    <th style="padding:0.75rem;text-align:left;">Fund</th>
                    <th style="padding:0.75rem;text-align:right;">Start NAV</th>
                    <th style="padding:0.75rem;text-align:right;">End NAV</th>
                    <th style="padding:0.75rem;text-align:right;">Total Return</th>
                    <th style="padding:0.75rem;text-align:right;">CAGR</th>
                    <th style="padding:0.75rem;text-align:right;">Data Points</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.map(m => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:0.75rem;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${m.color};margin-right:0.5rem;vertical-align:middle;"></span>
                        <span style="color:${m.color};font-weight:600;">${m.name}</span>
                    </td>
                    <td style="padding:0.75rem;text-align:right;color:var(--text-2);">&#8377;${m.firstNav}</td>
                    <td style="padding:0.75rem;text-align:right;color:var(--text-2);">&#8377;${m.lastNav}</td>
                    <td style="padding:0.75rem;text-align:right;font-weight:700;color:${parseFloat(m.tot)>=0?'var(--green)':'var(--red)'};">${parseFloat(m.tot)>=0?'+':''}${m.tot}%</td>
                    <td style="padding:0.75rem;text-align:right;font-weight:900;font-size:1rem;color:${parseFloat(m.cagr)>=0?'var(--green)':'var(--red)'};">${parseFloat(m.cagr)>=0?'+':''}${m.cagr}%</td>
                    <td style="padding:0.75rem;text-align:right;color:var(--text-3);font-size:0.75rem;">${m.pts} days</td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    const yrs = Math.round((endMs-startMs)/(1000*60*60*24*365.25)*10)/10;
    if (statusEl) statusEl.textContent = `✅ ${datasets.length} fund(s) compared over ${yrs} year${yrs!==1?'s':''}`;
}

function clearBacktest() {
    BACKTEST_SLOTS = [];
    renderBacktestSlots();
    document.getElementById('backtest-chart-card').style.display = 'none';
    document.getElementById('backtest-metrics-card').style.display = 'none';
    if (BT_CHART) { BT_CHART.destroy(); BT_CHART = null; }
}

// ─────────────────────────────────────────────────────────
// MF Unit & Current Value Auto-Calculator
// ─────────────────────────────────────────────────────────

/**
 * Compute CAGR (or absolute return for < 1 month) and write it
 * into .field-rate — always overwrites so it stays in sync.
 */
function applyMFCagr(card, purchaseNav, todayNav, purchaseDateStr) {
    const rateEl = card.querySelector('.field-rate');
    if (!rateEl || !purchaseNav || !todayNav || !purchaseDateStr) return;
    const yearsHeld = (Date.now() - new Date(purchaseDateStr).getTime()) / (365.25 * 86400_000);
    let cagrStr;
    if (yearsHeld >= (1 / 12)) {   // ≥ 1 month → true CAGR
        cagrStr = ((Math.pow(todayNav / purchaseNav, 1 / yearsHeld) - 1) * 100).toFixed(2);
    } else {                        // < 1 month → absolute return
        cagrStr = (((todayNav - purchaseNav) / purchaseNav) * 100).toFixed(2);
    }
    rateEl.value = cagrStr;
    rateEl.title = yearsHeld >= (1/12) ? 'CAGR (auto)' : 'Absolute return — holding < 1 month (auto)';
}

/**
 * For a single MF card:
 *  1. Resolves the scheme code from GLOBAL_SCHEME_DB
 *  2. If units are already cached (dataset.mfUnits), uses current NAV to recalculate
 *  3. Otherwise fetches mfapi historical data to find the purchase-date NAV,
 *     derives units = invested / purchase_nav, then sets current = units × today_nav
 */
async function syncMFCurrentValue(card) {
    const invested    = parseFloat(card.querySelector('.field-invested')?.value) || 0;
    const purchaseDate = card.querySelector('.field-date')?.value; // "YYYY-MM-DD"
    const amcName     = card.querySelector('.provider-select')?.value;
    const schemeName  = card.querySelector('.scheme-select, .field-ticker')?.value;

    if (!invested || !schemeName) return;

    // Resolve scheme from GLOBAL_SCHEME_DB
    const schemes   = GLOBAL_SCHEME_DB[amcName] || [];
    const scheme    = schemes.find(s => s.name === schemeName);
    const currentNav = scheme ? parseFloat(scheme.nav) : 0;

    const currentEl = card.querySelector('.field-current');

    // --- Fast path: units already computed, just apply today's NAV ---
    if (card.dataset.mfUnits && currentNav > 0) {
        const units = parseFloat(card.dataset.mfUnits);
        const currentValue = units * currentNav;
        if (currentEl) {
            currentEl.value    = currentValue.toFixed(2);
            currentEl.readOnly = true;
            currentEl.title    = `${units.toFixed(4)} units × ₹${currentNav.toFixed(4)} NAV`;
        }
        // Recompute CAGR using stored purchase NAV
        const storedPurchaseNav = parseFloat(card.dataset.mfPurchaseNav) || 0;
        if (storedPurchaseNav > 0 && purchaseDate) {
            applyMFCagr(card, storedPurchaseNav, currentNav, purchaseDate);
        }
        updateCardSummary(card);
        return;
    }

    // --- Slow path: need to fetch historical NAV to find purchase price ---
    if (!scheme?.code) return;
    if (!purchaseDate) {
        // No purchase date → can't backtrack; use current NAV directly
        if (currentNav > 0 && currentEl && !currentEl.value) {
            currentEl.value = currentNav.toFixed(4);
        }
        return;
    }

    try {
        const res = await fetch(`https://api.mfapi.in/mf/${scheme.code}`);
        if (!res.ok) throw new Error('mfapi error');
        const json = await res.json();
        if (!json.data?.length) return;

        // Find the closest NAV entry to the purchase date — no hard cutoff
        // (handles weekends, holidays, discontinued/merged funds)
        const purchaseMs = new Date(purchaseDate).getTime();
        let best = null, bestDiff = Infinity;
        for (const entry of json.data) {
            const [dd, mm, yyyy] = entry.date.split('-');
            const entryMs = new Date(`${yyyy}-${mm}-${dd}`).getTime();
            const diff    = Math.abs(entryMs - purchaseMs);
            if (diff < bestDiff) { bestDiff = diff; best = entry; }
        }

        if (!best) return;

        const purchaseNav = parseFloat(best.nav);
        if (!purchaseNav) return;

        const units        = invested / purchaseNav;
        const todayNav     = currentNav > 0 ? currentNav : purchaseNav;
        const currentValue = units * todayNav;

        // Persist computed values
        card.dataset.mfUnits       = units.toFixed(6);
        card.dataset.mfPurchaseNav = purchaseNav.toFixed(4);

        if (currentEl) {
            currentEl.value    = currentValue.toFixed(2);
            currentEl.readOnly = true;
            currentEl.title    = `${units.toFixed(4)} units @ ₹${purchaseNav.toFixed(4)} purchase NAV × ₹${todayNav.toFixed(4)} current NAV`;
        }

        // Auto-compute & always fill CAGR/return % (works for gains AND losses)
        applyMFCagr(card, purchaseNav, todayNav, purchaseDate);

        card.querySelector('.mf-nav-note')?.remove();

        // Info note — warn if closest date is >5 days away (holiday gap, discontinued fund)
        const daysDiff = Math.round(bestDiff / 86400_000);
        let note = card.querySelector('.api-note');
        if (!note) {
            note = document.createElement('div');
            note.className = 'api-note';
            note.style.cssText = 'font-size:0.72rem;margin-top:4px;font-weight:600;';
            card.querySelector('.edit-panel')?.querySelector('.asset-data-grid')?.after(note);
        }
        const navDateLabel = daysDiff > 5 ? ` (closest: ${best.date}, ${daysDiff}d off)` : ` (${best.date})`;
        note.style.color = daysDiff > 5 ? '#f59e0b' : 'var(--green)';
        note.textContent = `${units.toFixed(3)} units @ ₹${purchaseNav.toFixed(2)}${navDateLabel} → ₹${todayNav.toFixed(2)} today`;

    } catch (e) {
        console.warn('syncMFCurrentValue failed:', e.message);
    }

    updateCardSummary(card);
    calculateWealth();
    saveState();
}

/** Run syncMFCurrentValue for every MF card — called after page load */
async function syncAllMFCurrentValues() {
    const cards = [...document.querySelectorAll('#grid-mf .asset-item[data-type="mf"]')];
    for (const card of cards) {
        await syncMFCurrentValue(card);
    }
    if (cards.length) { calculateWealth(); saveState(); }
}

// ─────────────────────────────────────────────────────────
// Card Edit Toggle
// ─────────────────────────────────────────────────────────
function toggleCardEdit(btn) {
    const card  = btn.closest('.asset-item');
    const panel = card.querySelector('.edit-panel');
    const open  = panel.classList.toggle('open');
    btn.classList.toggle('active', open);
    if (!open) updateCardSummary(card);
}

// ─────────────────────────────────────────────────────────
// Card Summary Updater
// ─────────────────────────────────────────────────────────
function updateCardSummary(card) {
    const type   = card.dataset.type;
    if (!type) return;
    const getNum = (s) => { const e = card.querySelector(s); return e ? parseFloat(e.value) || 0 : 0; };
    const getStr = (s) => { const e = card.querySelector(s); return e ? (e.value || '') : ''; };
    const getTxt = (s) => { const e = card.querySelector(s); return e?.selectedOptions?.[0]?.textContent?.trim() || ''; };

    let name = '', current = 0, invested = 0, dateStr = '', maturityStr = '', brokerTag = '';

    if (type === 'mf') {
        name     = getTxt('.scheme-select') || 'Select a fund →';
        invested = getNum('.field-invested');
        current  = getNum('.field-current') || invested;
        dateStr  = getStr('.field-date');
    } else if (type === 'eq' || type === 'etf') {
        name     = getStr('.field-ticker') || (type === 'etf' ? 'ETF Symbol' : 'Stock Symbol');
        brokerTag = getStr('.provider-select');
        const qty = getNum('.field-qty'), buy = getNum('.field-buyprice'), cmp = getNum('.field-cmp');
        invested  = getNum('.field-invested') || (qty * buy);
        current   = qty * (cmp || buy);
        dateStr   = getStr('.field-date');
    } else if (type === 'fi') {
        name       = getTxt('.provider-select') || 'Bank / FD';
        invested   = getNum('.field-invested');
        current    = getNum('.field-current') || invested;
        dateStr    = getStr('.field-date');
        maturityStr = getStr('.field-maturity');
    } else if (type === 'pf') {
        name       = getTxt('.provider-select') || 'Provident Fund';
        current    = getNum('.field-current');
        invested   = current;
        dateStr    = getStr('.field-date');
        maturityStr = getStr('.field-maturity');
    } else if (type === 'nps') {
        const fm   = getTxt('.provider-select') || 'NPS';
        const tier = getStr('.field-tier');
        const cls  = getStr('.field-scheme-class');
        name       = fm + (tier ? ` · T${tier}` : '') + (cls ? ` · ${cls}` : '');
        const units = getNum('.field-qty'), nav = getNum('.field-cmp');
        current     = (units > 0 && nav > 0) ? units * nav : getNum('.field-current');
        invested    = getNum('.field-invested');
        dateStr     = getStr('.field-date');
    }

    const fmt    = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });
    const change = current - invested;
    const pct    = invested > 0 ? ((change / invested) * 100).toFixed(1) : null;
    const up     = change >= 0;

    const nameEl = card.querySelector('.cs-name');
    if (nameEl) nameEl.textContent = name;

    const currEl = card.querySelector('.cs-current');
    if (currEl) currEl.textContent = current > 0 ? fmt.format(current) : '₹0';

    const chEl = card.querySelector('.cs-change');
    if (chEl) {
        if (pct !== null && invested > 0) {
            chEl.textContent = `${up?'+':''}${fmt.format(change)} (${up?'+':''}${pct}%)`;
            chEl.className = `cs-change ${up ? 'value-up' : 'value-down'}`;
        } else { chEl.textContent = ''; chEl.className = 'cs-change'; }
    }

    const dateEl = card.querySelector('.cs-date');
    if (dateEl) {
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d)) dateEl.textContent = 'Added ' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        } else { dateEl.textContent = ''; }
    }

    const matEl = card.querySelector('.cs-maturity');
    if (matEl) {
        if (maturityStr) {
            const md = new Date(maturityStr);
            if (!isNaN(md)) matEl.textContent = '· Matures ' + md.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
        } else { matEl.textContent = ''; }
    }

    const brkEl = card.querySelector('.cs-broker-tag');
    if (brkEl) brkEl.textContent = brokerTag || '';
}

// ─────────────────────────────────────────────────────────
// MF Sparkline (SVG, no extra library)
// ─────────────────────────────────────────────────────────
async function renderMFSparkline(card, schemeName, acquisitionDate) {
    const container = card.querySelector('.mf-sparkline');
    if (!container) return;
    // Resolve scheme code from GLOBAL_SCHEME_DB
    const amc = card.querySelector('.provider-select')?.value;
    const schemes = GLOBAL_SCHEME_DB[amc] || [];
    const found = schemes.find(s => s.name === schemeName);
    if (!found?.code) { container.innerHTML = ''; return; }

    container.innerHTML = '<span style="font-size:0.62rem;color:var(--text-3);">⏳</span>';
    try {
        const res = await fetch(`https://api.mfapi.in/mf/${found.code}`);
        if (!res.ok) throw new Error('bad response');
        const json = await res.json();
        if (!json.data || json.data.length < 5) { container.innerHTML = ''; return; }

        // Determine window: 1yr ago OR acquisition date, whichever is more recent
        const now = new Date();
        const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);
        let startMs = oneYearAgo.getTime();
        if (acquisitionDate) {
            const acq = new Date(acquisitionDate).getTime();
            if (acq > startMs) startMs = acq;
        }

        const points = json.data
            .map(d => { const [dd,mm,yyyy] = d.date.split('-'); return { ts: new Date(`${yyyy}-${mm}-${dd}`).getTime(), nav: parseFloat(d.nav) }; })
            .filter(p => !isNaN(p.nav) && p.ts >= startMs)
            .reverse();

        if (points.length < 3) { container.innerHTML = ''; return; }

        // Sample to 60 pts
        const step = Math.max(1, Math.floor(points.length / 60));
        const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        const navs = sampled.map(p => p.nav);
        const minN = Math.min(...navs), maxN = Math.max(...navs), range = maxN - minN || 1;
        const W = 120, H = 32;
        const pts = sampled.map((p, i) => `${((i / (sampled.length - 1)) * W).toFixed(1)},${(H - ((p.nav - minN) / range * H)).toFixed(1)}`).join(' ');

        const pct = (((points[points.length - 1].nav - points[0].nav) / points[0].nav) * 100).toFixed(1);
        const color = parseFloat(pct) >= 0 ? 'var(--green)' : '#f43f5e';
        const label = acquisitionDate ? 'since start' : '1yr';

        container.innerHTML = `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:2px;">
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="overflow:visible;flex-shrink:0;">
                <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
            </svg>
            <span style="font-size:0.68rem;font-weight:700;color:${color};">${parseFloat(pct)>=0?'+':''}${pct}%</span>
            <span style="font-size:0.6rem;color:var(--text-3);">${label}</span>
        </div>`;
    } catch(e) { container.innerHTML = ''; }
}
