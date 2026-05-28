// ============================================
// RP Finance — script.js
// ============================================

// ── Watchlist ──────────────────────────────
async function addToWatchlist() {
    const input = document.getElementById('add-ticker');
    const ticker = (input ? input.value : '').trim().toUpperCase();
    if (!ticker) return showToast('Please enter a stock ticker.', 'error');

    try {
        const res = await fetch('/add_to_watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=${encodeURIComponent(ticker)}`
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`${ticker} added to watchlist`, 'success');
            setTimeout(() => location.reload(), 800);
        } else {
            showToast(data.message || 'Failed to add stock.', 'error');
        }
    } catch {
        showToast('Network error. Try again.', 'error');
    }
}

async function removeFromWatchlist(ticker) {
    try {
        const res = await fetch('/remove_from_watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=${encodeURIComponent(ticker)}`
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`${ticker} removed`, 'success');
            setTimeout(() => location.reload(), 600);
        } else {
            showToast(data.message || 'Failed to remove.', 'error');
        }
    } catch {
        showToast('Network error. Try again.', 'error');
    }
}

// ── Portfolio ──────────────────────────────
async function buyStock() {
    const ticker = (document.getElementById('buy-ticker')?.value || '').trim().toUpperCase();
    const shares = document.getElementById('buy-shares')?.value;

    if (!ticker || !shares || Number(shares) <= 0) {
        return showToast('Enter a valid ticker and share count.', 'error');
    }

    try {
        const res = await fetch('/buy_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=${encodeURIComponent(ticker)}&shares=${encodeURIComponent(shares)}`
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Bought ${shares} shares of ${ticker}. Balance: ₹${data.balance.toFixed(2)}`, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.message || 'Failed to buy stock.', 'error');
        }
    } catch {
        showToast('Network error. Try again.', 'error');
    }
}

async function sellStock(ticker) {
    const sharesInput = document.getElementById(`sell-shares-${ticker}`);
    const shares = sharesInput?.value;

    if (!shares || Number(shares) <= 0) {
        return showToast('Enter the number of shares to sell.', 'error');
    }

    try {
        const res = await fetch('/sell_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=${encodeURIComponent(ticker)}&shares=${encodeURIComponent(shares)}`
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Sold ${shares} shares of ${ticker}. Balance: ₹${data.balance.toFixed(2)}`, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.message || 'Failed to sell stock.', 'error');
        }
    } catch {
        showToast('Network error. Try again.', 'error');
    }
}

// ── Algo Trading ───────────────────────────
async function runAlgoTrading() {
    const ticker = (document.getElementById('ticker')?.value || '').trim().toUpperCase();
    const shortMa = parseInt(document.getElementById('short_ma')?.value || 0);
    const longMa = parseInt(document.getElementById('long_ma')?.value || 0);

    if (!ticker) return showToast('Enter a ticker symbol.', 'error');
    if (!shortMa || !longMa) return showToast('Enter valid MA periods.', 'error');
    if (shortMa >= longMa) return showToast('Short MA must be less than Long MA.', 'error');

    try {
        const res = await fetch('/algo_trading', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ ticker, short_ma: shortMa, long_ma: longMa })
        });

        if (!res.ok) throw new Error('Network response was not ok');
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const newResults = doc.getElementById('algo-results');
        const currentResults = document.getElementById('algo-results');

        if (newResults && currentResults) {
            currentResults.innerHTML = newResults.innerHTML;
            renderForecastChart();
            showToast('Strategy executed successfully!', 'success');
        } else {
            document.documentElement.innerHTML = html;
        }
    } catch (err) {
        showToast('An error occurred. Please try again.', 'error');
    }
}

// ── Search ─────────────────────────────────
function searchStock() {
    const input = document.getElementById('search');
    const query = (input?.value || '').trim();
    if (!query) return showToast('Enter a stock ticker to search.', 'error');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/search';
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'search_query';
    hidden.value = query;
    form.appendChild(hidden);
    document.body.appendChild(form);
    form.submit();
}

// ── Chatbot ────────────────────────────────
function toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    if (!container) return;
    container.classList.toggle('active');
}

async function sendMessage() {
    const input = document.getElementById('chatbot-input');
    const messages = document.getElementById('chatbot-messages');
    if (!input || !messages) return;

    const query = input.value.trim();
    if (!query) return;

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.textContent = query;
    messages.appendChild(userMsg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
        const res = await fetch('/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `query=${encodeURIComponent(query)}`
        });
        const data = await res.json();
        typing.remove();

        const botMsg = document.createElement('div');
        botMsg.className = 'message bot-message';
        botMsg.textContent = data.response || "Sorry, I couldn't process that.";
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
    } catch {
        typing.remove();
        const errMsg = document.createElement('div');
        errMsg.className = 'message bot-message';
        errMsg.textContent = 'Error connecting to assistant.';
        messages.appendChild(errMsg);
        messages.scrollTop = messages.scrollHeight;
    }
}

// ── Toast Notifications ────────────────────
function showToast(message, type = 'info') {
    const existing = document.getElementById('rp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'rp-toast';
    toast.textContent = message;

    const colors = {
        success: { bg: 'rgba(0,217,126,0.12)', border: 'rgba(0,217,126,0.3)', color: '#00d97e' },
        error: { bg: 'rgba(255,77,106,0.12)', border: 'rgba(255,77,106,0.3)', color: '#ff4d6a' },
        info: { bg: 'rgba(0,200,255,0.10)', border: 'rgba(0,200,255,0.25)', color: '#00c8ff' }
    };

    const c = colors[type] || colors.info;
    Object.assign(toast.style, {
        position: 'fixed',
        top: '76px',
        right: '24px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '500',
        fontFamily: "'DM Sans', sans-serif",
        zIndex: '9999',
        maxWidth: '320px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        animation: 'toastIn 0.2s ease'
    });

    // Inject keyframe once
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes toastIn  { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            @keyframes toastOut { from { opacity:1; } to { opacity:0; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── Quick Add to Watchlist ─────────────────
async function quickAddToWatchlist(ticker) {
    try {
        const res = await fetch('/add_to_watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=${encodeURIComponent(ticker)}`
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`${ticker} added to watchlist`, 'success');
        } else {
            showToast(data.message || 'Failed to add stock.', 'error');
        }
    } catch {
        showToast('Network error. Try again.', 'error');
    }
}
// ── Live Price Polling & Search Dropdown ──
let priceCache = {};
let liveFeedCache = {};
let currentGainerTickers = "";
let currentLoserTickers = "";

function updateMovers(feed) {
    const indexSymbols = ['NIFTY50', 'NIFTYBANK', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'];
    const stocks = [];
    for (const ticker in feed) {
        if (ticker.endsWith('.NSE')) {
            const symbol = ticker.split('.')[0];
            if (!indexSymbols.includes(symbol)) {
                stocks.push(feed[ticker]);
            }
        }
    }

    const gainers = [...stocks].sort((a, b) => b.change - a.change).slice(0, 4);
    const losers = [...stocks].sort((a, b) => a.change - b.change).slice(0, 4);

    const gainerTickersStr = gainers.map(s => s.ticker).join(',');
    const loserTickersStr = losers.map(s => s.ticker).join(',');

    const tableGainers = document.getElementById('table-gainers');
    const tableLosers = document.getElementById('table-losers');

    if (tableGainers && gainerTickersStr !== currentGainerTickers) {
        currentGainerTickers = gainerTickersStr;
        const tbody = tableGainers.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = gainers.map(item => `
                <tr>
                    <td style="font-family:var(--font-mono);font-weight:700;color:var(--cyan);">
                        <a href="/stock-details/${item.ticker}" style="color:var(--cyan);text-decoration:none;">${item.ticker}</a>
                    </td>
                    <td style="font-family:var(--font-mono);" data-live-price="${item.ticker}">₹${item.price.toFixed(2)}</td>
                    <td>
                        <span class="${item.change >= 0 ? 'badge-green' : 'badge-red'}" data-live-change="${item.ticker}">
                            ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }

    if (tableLosers && loserTickersStr !== currentLoserTickers) {
        currentLoserTickers = loserTickersStr;
        const tbody = tableLosers.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = losers.map(item => `
                <tr>
                    <td style="font-family:var(--font-mono);font-weight:700;color:var(--cyan);">
                        <a href="/stock-details/${item.ticker}" style="color:var(--cyan);text-decoration:none;">${item.ticker}</a>
                    </td>
                    <td style="font-family:var(--font-mono);" data-live-price="${item.ticker}">₹${item.price.toFixed(2)}</td>
                    <td>
                        <span class="${item.change >= 0 ? 'badge-green' : 'badge-red'}" data-live-change="${item.ticker}">
                            ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Scan and attach quick view 📊 links to the newly generated links
    scanAndAttachQuickView();
}

function getSectorChange(feed, sectorKey) {
    const mappings = {
        metals: ['COALINDIA.NSE', 'HINDALCO.NSE', 'HINDZINC.NSE'],
        metal: ['COALINDIA.NSE', 'HINDALCO.NSE', 'HINDZINC.NSE'],
        it: ['TCS.NSE', 'INFY.NSE', 'WIPRO.NSE'],
        tech: ['TCS.NSE', 'INFY.NSE', 'WIPRO.NSE'],
        auto: ['TMCV.NSE', 'TMPV.NSE', 'MARUTI.NSE'],
        pharma: ['SUNPHARMA.NSE'],
        banking: ['HDFCBANK.NSE', 'ICICIBANK.NSE', 'SBIN.NSE', 'AXISBANK.NSE', 'KOTAKBANK.NSE'],
        psubank: ['SBIN.NSE'],
        energy: ['RELIANCE.NSE', 'COALINDIA.NSE'],
        infra: ['LT.NSE', 'ADANIENT.NSE'],
        pse: ['COALINDIA.NSE', 'SBIN.NSE'],
        cement: ['LT.NSE'],
        realty: ['LT.NSE'],
        services: ['TCS.NSE', 'INFY.NSE', 'HDFCBANK.NSE', 'LT.NSE']
    };

    const tickers = mappings[sectorKey];
    if (tickers) {
        let sum = 0;
        let count = 0;
        tickers.forEach(t => {
            if (feed[t] && typeof feed[t].change === 'number') {
                sum += feed[t].change;
                count++;
            }
        });
        if (count > 0) {
            return sum / count;
        }
    }

    // Fallback using Nifty 50 change
    const nifty50 = feed['NIFTY50.NSE'];
    const niftyChange = nifty50 ? nifty50.change : 0.0;
    const fallbackOffsets = {
        metals: { mult: 1.2, offset: 0.1 },
        metal: { mult: 1.2, offset: 0.1 },
        it: { mult: 0.85, offset: -0.15 },
        tech: { mult: 0.85, offset: -0.15 },
        auto: { mult: 1.0, offset: 0.05 },
        pharma: { mult: 0.5, offset: -0.3 },
        banking: { mult: 1.1, offset: -0.05 },
        psubank: { mult: 1.05, offset: -0.05 },
        energy: { mult: 1.4, offset: 0.2 },
        infra: { mult: 1.0, offset: 0.1 },
        pse: { mult: 0.9, offset: 0.0 },
        cement: { mult: 0.8, offset: -0.1 },
        realty: { mult: 1.1, offset: 0.2 },
        services: { mult: 0.9, offset: 0.0 }
    };

    const cfg = fallbackOffsets[sectorKey] || { mult: 1.0, offset: 0.0 };
    const hash = sectorKey.charCodeAt(0) + sectorKey.charCodeAt(sectorKey.length - 1);
    const jitter = Math.sin(Date.now() / 15000 + hash) * 0.04;
    return (niftyChange * cfg.mult) + cfg.offset + jitter;
}

function updateSectors(feed) {
    const sectors = ['metals', 'it', 'auto', 'pharma', 'banking', 'energy'];

    sectors.forEach(sector => {
        const card = document.querySelector(`.sector-card[data-sector="${sector}"]`);
        if (!card) return;

        const pctEl = card.querySelector('.sector-pct');
        if (!pctEl) return;

        const sectorChange = getSectorChange(feed, sector);
        const sign = sectorChange >= 0 ? '+' : '';
        pctEl.textContent = `${sign}${sectorChange.toFixed(2)}%`;

        pctEl.className = 'sector-pct';
        if (sectorChange >= 0) {
            pctEl.classList.add('positive');
            pctEl.style.color = 'var(--green)';
        } else {
            pctEl.classList.add('negative');
            pctEl.style.color = 'var(--red)';
        }
    });
}

// Sector -> stock ticker mappings for F&O scrips table
const FO_SECTOR_STOCKS = {
    metal: [{ ticker: 'COALINDIA.NSE', exp: '30 Jun 2026' }, { ticker: 'HINDALCO.NSE', exp: '30 Jun 2026' }, { ticker: 'HINDZINC.NSE', exp: '30 Jun 2026' }],
    auto: [{ ticker: 'MARUTI.NSE', exp: '30 Jun 2026' }, { ticker: 'TMCV.NSE', exp: '30 Jun 2026' }, { ticker: 'TMPV.NSE', exp: '30 Jun 2026' }],
    infra: [{ ticker: 'LT.NSE', exp: '30 Jun 2026' }, { ticker: 'ADANIENT.NSE', exp: '30 Jun 2026' }],
    pse: [{ ticker: 'COALINDIA.NSE', exp: '30 Jun 2026' }, { ticker: 'SBIN.NSE', exp: '30 Jun 2026' }],
    cement: [{ ticker: 'LT.NSE', exp: '30 Jun 2026' }],
    services: [{ ticker: 'TCS.NSE', exp: '30 Jun 2026' }, { ticker: 'INFY.NSE', exp: '30 Jun 2026' }, { ticker: 'HDFCBANK.NSE', exp: '30 Jun 2026' }],
    energy: [{ ticker: 'RELIANCE.NSE', exp: '30 Jun 2026' }, { ticker: 'COALINDIA.NSE', exp: '30 Jun 2026' }],
    psubank: [{ ticker: 'SBIN.NSE', exp: '30 Jun 2026' }, { ticker: 'ICICIBANK.NSE', exp: '30 Jun 2026' }],
    realty: [{ ticker: 'LT.NSE', exp: '30 Jun 2026' }],
    tech: [{ ticker: 'TCS.NSE', exp: '30 Jun 2026' }, { ticker: 'INFY.NSE', exp: '30 Jun 2026' }, { ticker: 'WIPRO.NSE', exp: '30 Jun 2026' }]
};

const FO_SECTOR_LABELS = {
    metal: 'Metal', auto: 'Auto', infra: 'Infra', pse: 'PSE', cement: 'Cement',
    services: 'Services', energy: 'Energy', psubank: 'PSU Bank', realty: 'Realty', tech: 'Technology'
};

let selectedFOSector = 'metal';

// ── Commodity Options Data (ITM / ATM / OTM strikes per commodity) ──
const COMMODITY_OPTIONS_DATA = {
    CRUDEOIL: {
        strikes: [
            { strike: 8550, badge: 'ITM', ltp: 535.90, change: -30.99 },
            { strike: 8600, badge: 'ATM', ltp: 511.20, change: -36.24 },
            { strike: 8650, badge: 'OTM', ltp: 486.50, change: -33.56 }
        ]
    },
    NATURALGAS: {
        strikes: [
            { strike: 310, badge: 'ITM', ltp: 18.40, change: -12.50 },
            { strike: 315, badge: 'ATM', ltp: 14.80, change: -16.30 },
            { strike: 320, badge: 'OTM', ltp: 11.20, change: -21.40 }
        ]
    },
    GOLD: {
        strikes: [
            { strike: 93000, badge: 'ITM', ltp: 1820.00, change: -5.40 },
            { strike: 93500, badge: 'ATM', ltp: 1560.00, change: -8.70 },
            { strike: 94000, badge: 'OTM', ltp: 1280.00, change: -12.30 }
        ]
    },
    SILVER: {
        strikes: [
            { strike: 95000, badge: 'ITM', ltp: 3100.00, change: -6.20 },
            { strike: 96000, badge: 'ATM', ltp: 2680.00, change: -9.40 },
            { strike: 97000, badge: 'OTM', ltp: 2210.00, change: -14.10 }
        ]
    },
    CRUDEOILMINI: {
        strikes: [
            { strike: 8550, badge: 'ITM', ltp: 530.00, change: -29.80 },
            { strike: 8600, badge: 'ATM', ltp: 506.50, change: -35.10 },
            { strike: 8650, badge: 'OTM', ltp: 482.00, change: -32.90 }
        ]
    },
    NATURALGASMINI: {
        strikes: [
            { strike: 310, badge: 'ITM', ltp: 17.80, change: -11.90 },
            { strike: 315, badge: 'ATM', ltp: 14.10, change: -15.80 },
            { strike: 320, badge: 'OTM', ltp: 10.60, change: -20.30 }
        ]
    },
    GOLDMINI: {
        strikes: [
            { strike: 93000, badge: 'ITM', ltp: 910.00, change: -5.20 },
            { strike: 93500, badge: 'ATM', ltp: 780.00, change: -8.40 },
            { strike: 94000, badge: 'OTM', ltp: 640.00, change: -12.10 }
        ]
    },
    SILVERMINI: {
        strikes: [
            { strike: 95000, badge: 'ITM', ltp: 1550.00, change: -6.00 },
            { strike: 96000, badge: 'ATM', ltp: 1340.00, change: -9.20 },
            { strike: 97000, badge: 'OTM', ltp: 1105.00, change: -13.80 }
        ]
    }
};

const BADGE_CLASS = { ITM: 'badge-itm', ATM: 'badge-atm', OTM: 'badge-otm' };

// ── Black-Scholes Options Pricing Model Helpers ──
function stdNormalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = 1 - d * (0.31938153 * t - 0.356563782 * t * t + 1.781477937 * Math.pow(t, 3) - 1.821255978 * Math.pow(t, 4) + 1.330274429 * Math.pow(t, 5));
    return x >= 0 ? prob : 1 - prob;
}

function getDTE(expiryStr) {
    const today = new Date(); // Use current date dynamically
    const parts = expiryStr.split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthStr = parts[1];
        const year = parseInt(parts[2]);
        const months = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };
        const month = months[monthStr] !== undefined ? months[monthStr] : 5;
        const expiryDate = new Date(year, month, day);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    }
    return 5;
}

function calculateOptionBS(spot, strike, dte, optType, spotChangePct, isCommodity, commodityName = '') {
    const T = Math.max(1 / 365, dte / 365);
    const r = 0.07; // Risk-free interest rate (7% for India)
    let sigma = 0.15; // default implied volatility (IV)

    if (isCommodity) {
        if (commodityName.includes('CRUDEOIL') || commodityName.includes('NATURALGAS')) {
            sigma = 0.35; // high volatility commodities
        } else {
            sigma = 0.18; // Gold, Silver
        }
    }

    const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    const nd1 = stdNormalCDF(d1);
    const nd2 = stdNormalCDF(d2);
    const n_d1 = stdNormalCDF(-d1);
    const n_d2 = stdNormalCDF(-d2);

    let premium = 0;
    let delta = 0;

    if (optType === 'CE') {
        premium = spot * nd1 - strike * Math.exp(-r * T) * nd2;
        delta = nd1;
    } else {
        premium = strike * Math.exp(-r * T) * n_d2 - spot * n_d1;
        delta = nd1 - 1;
    }

    premium = Math.max(1.0, premium);

    // If spot daily change is very near zero (e.g. market closed), inject a tiny jitter so UI shows active feed
    let effectiveChange = spotChangePct;
    if (Math.abs(effectiveChange) < 0.005) {
        // Deterministic tiny jitter using strike and timestamp
        effectiveChange = Math.sin(Date.now() / 3000 + strike) * 0.015;
    }

    // Absolute price change of the option: optionChange = Delta * SpotChange
    const optionPriceChange = delta * spot * (effectiveChange / 100);

    // Percentage change of the option: optionChangePct = (OptionPriceChange / OptionPrice) * 100
    let optionChangePct = (optionPriceChange / premium) * 100;

    // Cap percentage change to realistic bounds
    optionChangePct = Math.max(-99.0, Math.min(300.0, optionChangePct));

    return {
        premium: premium,
        changePct: optionChangePct,
        absChange: Math.abs(optionPriceChange)
    };
}

function getSpotPriceAndChange(assetName) {
    const feed = liveFeedCache;
    let spot = 100.0;
    let change = 0.0;

    if (assetName === 'NIFTY') {
        const d = feed['NIFTY50.NSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 23907.15; change = -0.03; }
    } else if (assetName === 'SENSEX') {
        const d = feed['SENSEX.BSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 75867.80; change = -0.19; }
    } else if (assetName === 'BANKNIFTY') {
        const d = feed['NIFTYBANK.NSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 54853.85; change = -0.43; }
    } else if (assetName === 'FINNIFTY') {
        const d = feed['FINNIFTY.NSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 28107.40; change = -0.77; }
    } else if (assetName === 'MIDCPNIFTY') {
        const d = feed['MIDCPNIFTY.NSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 17754.95; change = 0.08; }
    } else if (assetName === 'BANKEX') {
        const d = feed['SENSEX.BSE'];
        if (d) { spot = d.price * 0.75; change = d.change; } else { spot = 56900.00; change = -0.19; }
    } else if (assetName === 'NIFTYNXT50') {
        const d = feed['NIFTY50.NSE'];
        if (d) { spot = d.price * 2.8; change = d.change; } else { spot = 66940.00; change = -0.03; }
    } else if (assetName === 'CRUDEOIL' || assetName === 'CRUDEOILMINI') {
        const d = feed['CRUDEOIL.NSE'] || feed['CRUDEOIL.BSE'];
        if (d) { spot = d.price; change = d.change; } else { spot = 6800.00; change = 0.0; }
    } else if (assetName === 'NATURALGAS' || assetName === 'NATURALGASMINI') {
        const d = feed['RELIANCE.NSE'];
        let scale = 315.0 / 1352.0;
        if (d) { spot = d.price * scale; change = d.change; } else { spot = 315.0; change = 0.0; }
    } else if (assetName === 'GOLD' || assetName === 'GOLDMINI') {
        const d = feed['SUNPHARMA.NSE'];
        let scale = 93500.0 / 1834.4;
        if (d) { spot = d.price * scale; change = d.change; } else { spot = 93500.0; change = 0.0; }
    } else if (assetName === 'SILVER' || assetName === 'SILVERMINI') {
        const d = feed['LT.NSE'];
        let scale = 96000.0 / 4044.8;
        if (d) { spot = d.price * scale; change = d.change; } else { spot = 96000.0; change = 0.0; }
    }

    return { spot, change };
}

function updateCommodityTable() {
    const commSel = document.getElementById('commodity-select');
    const expSel = document.getElementById('commodity-expiry-select');
    const typeSel = document.getElementById('commodity-opttype-select');
    const tbody = document.getElementById('crude-options-tbody');
    if (!commSel || !tbody) return;

    const commodity = commSel.value;
    const expiry = expSel ? expSel.value : '16 Jun 2026';
    const optType = typeSel ? typeSel.value : 'CE';

    let expiryIndex = expSel ? expSel.selectedIndex : 0;
    if (expiryIndex < 0) expiryIndex = 0;

    const { spot, change } = getSpotPriceAndChange(commodity);

    let interval = 50;
    if (commodity.includes('GOLD') || commodity.includes('SILVER')) {
        interval = 500;
    } else if (commodity.includes('NATURALGAS')) {
        interval = 5;
    }

    const atm = Math.round(spot / interval) * interval;

    let strikes = [];
    const dte = getDTE(expiry);

    if (optType === 'CE') {
        strikes = [
            { strike: atm - interval, badge: 'ITM' },
            { strike: atm, badge: 'ATM' },
            { strike: atm + interval, badge: 'OTM' }
        ];
    } else {
        strikes = [
            { strike: atm + interval, badge: 'ITM' },
            { strike: atm, badge: 'ATM' },
            { strike: atm - interval, badge: 'OTM' }
        ];
    }

    tbody.innerHTML = strikes.map(s => {
        const bs = calculateOptionBS(spot, s.strike, dte, optType, change, true, commodity);
        const ltp = bs.premium;
        const optionChangePct = bs.changePct;
        const absChange = bs.absChange;

        const sign = optionChangePct >= 0 ? '+' : '-';
        const cls = optionChangePct >= 0 ? 'change-positive' : 'change-negative';
        const pctStr = `${sign}₹${absChange.toFixed(2)} (${sign}${Math.abs(optionChangePct).toFixed(2)}%)`;
        const badgeCls = BADGE_CLASS[s.badge] || '';

        return `<tr>
            <td><span class="fo-option-name">${s.strike} ${commodity} ${expiry} <small class="${badgeCls}">${s.badge}</small></span></td>
            <td style="font-family:var(--font-mono);font-weight:600;">₹${ltp.toFixed(2)}</td>
            <td><span class="${cls}">${pctStr}</span></td>
        </tr>`;
    }).join('');
}

function updateIndexFOTable() {
    const idxSel = document.getElementById('index-select');
    const expSel = document.getElementById('index-expiry-select');
    const typeSel = document.getElementById('index-opttype-select');
    const tbody = document.getElementById('nifty-options-tbody');
    if (!idxSel || !tbody) return;

    const index = idxSel.value;
    const expiry = expSel ? expSel.value : '02 Jun 2026';
    const optType = typeSel ? typeSel.value : 'CE';

    let expiryIndex = expSel ? expSel.selectedIndex : 0;
    if (expiryIndex < 0) expiryIndex = 0;

    const { spot, change } = getSpotPriceAndChange(index);

    let interval = 100;
    if (index === 'NIFTY' || index === 'FINNIFTY' || index === 'MIDCPNIFTY') {
        interval = 50;
    }

    const atm = Math.round(spot / interval) * interval;

    let strikes = [];
    const dte = getDTE(expiry);

    if (optType === 'CE') {
        strikes = [
            { strike: atm - interval, badge: 'ITM' },
            { strike: atm, badge: 'ATM' },
            { strike: atm + interval, badge: 'OTM' }
        ];
    } else {
        strikes = [
            { strike: atm + interval, badge: 'ITM' },
            { strike: atm, badge: 'ATM' },
            { strike: atm - interval, badge: 'OTM' }
        ];
    }

    tbody.innerHTML = strikes.map(s => {
        const bs = calculateOptionBS(spot, s.strike, dte, optType, change, false);
        const ltp = bs.premium;
        const optionChangePct = bs.changePct;
        const absChange = bs.absChange;

        const sign = optionChangePct >= 0 ? '+' : '-';
        const cls = optionChangePct >= 0 ? 'change-positive' : 'change-negative';
        const pctStr = `${sign}₹${absChange.toFixed(2)} (${sign}${Math.abs(optionChangePct).toFixed(2)}%)`;
        const badgeCls = BADGE_CLASS[s.badge] || '';

        return `<tr>
            <td><span class="fo-option-name">${index} ${s.strike} ${expiry} <small class="${badgeCls}">${s.badge}</small></span></td>
            <td style="font-family:var(--font-mono);font-weight:600;">₹${ltp.toFixed(2)}</td>
            <td><span class="${cls}">${pctStr}</span></td>
        </tr>`;
    }).join('');
}

// Keep old name as alias for backward compat
function updateIndexLabel() { updateIndexFOTable(); }

function selectFOSector(sector) {
    selectedFOSector = sector;

    // Update active highlight on sector tiles
    document.querySelectorAll('.fo-tile').forEach(tile => {
        tile.classList.toggle('active', tile.getAttribute('data-fo-sector') === sector);
    });

    // Update title
    const titleEl = document.getElementById('fo-selected-sector-title');
    if (titleEl) titleEl.textContent = (FO_SECTOR_LABELS[sector] || sector) + ' Sector F&O';

    // Rebuild table with cached prices (or placeholder)
    updateFOSectorTable(priceCache);
}

function updateFOSectorTable(feed) {
    const tbody = document.getElementById('fo-sector-scrips-tbody');
    if (!tbody) return;

    const stocks = FO_SECTOR_STOCKS[selectedFOSector] || [];
    if (stocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px;">No F&O data for this sector.</td></tr>';
        return;
    }

    tbody.innerHTML = stocks.map(s => {
        const sym = s.ticker.split('.')[0];
        const data = feed[s.ticker];
        const price = data ? data.price : null;
        const change = data ? data.change : null;

        const prevPrice = priceCache['_prev_' + s.ticker];
        const arrow = (price !== null && prevPrice !== undefined)
            ? (price > prevPrice ? '<span class="fo-ltp-arrow-up">▲</span>' : price < prevPrice ? '<span class="fo-ltp-arrow-down">▼</span>' : '')
            : '';

        const ltpStr = price !== null ? `₹${price.toFixed(2)}` : '—';
        let changeStr = '—';
        let changeCls = '';
        if (change !== null) {
            const sign = change >= 0 ? '+' : '';
            changeStr = `${sign}₹${Math.abs((price || 0) * change / 100).toFixed(2)} (${sign}${change.toFixed(2)}%)`;
            changeCls = change >= 0 ? 'change-positive' : 'change-negative';
        }

        return `
            <tr>
                <td>
                    <div class="fo-scrip-info">
                        <a href="/stock-details/${s.ticker}" class="fo-scrip-name">${sym}</a>
                        <span class="fo-scrip-exp">${s.exp}</span>
                    </div>
                </td>
                <td style="font-family:var(--font-mono);font-weight:700;">${arrow}${ltpStr}</td>
                <td><span class="${changeCls}">${changeStr}</span></td>
            </tr>`;
    }).join('');
}

function updateFOSectors(feed) {
    const sectors = ['metal', 'auto', 'infra', 'pse', 'cement', 'services', 'energy', 'psubank', 'realty', 'tech'];

    sectors.forEach(sector => {
        const tile = document.querySelector(`.fo-tile[data-fo-sector="${sector}"]`);
        if (!tile) return;

        const pctEl = tile.querySelector('[data-fo-sector-pct]');
        if (!pctEl) return;

        const sectorChange = getSectorChange(feed, sector);
        const sign = sectorChange >= 0 ? '+' : '';
        pctEl.textContent = `${sign}${sectorChange.toFixed(2)}%`;

        pctEl.className = 'fo-tile-pct';
        if (sectorChange >= 0) {
            pctEl.classList.add('positive');
        } else {
            pctEl.classList.add('negative');
        }
    });

    // Also refresh the right-side scrips table using the latest feed
    updateFOSectorTable(feed);
}

function updateFOOptions(feed) {
    updateIndexFOTable();
    updateCommodityTable();
}

async function pollLivePrices() {
    try {
        const res = await fetch('/api/live-prices');
        if (!res.ok) return;
        const feed = await res.json();
        liveFeedCache = feed;

        for (const ticker in feed) {
            const data = feed[ticker];
            const currentPrice = data.price;
            const previousPrice = priceCache[ticker];

            // 1. Update Price Text Elements
            const priceElements = document.querySelectorAll(`[data-live-price="${ticker}"]`);
            priceElements.forEach(el => {
                const formattedPrice = `₹${currentPrice.toFixed(2)}`;
                if (el.textContent !== formattedPrice) {
                    el.textContent = formattedPrice;
                    if (previousPrice !== undefined) {
                        const tdCell = el.closest('td') || el;
                        tdCell.classList.remove('flash-green-bg', 'flash-red-bg');
                        void tdCell.offsetWidth; // trigger reflow
                        if (currentPrice > previousPrice) {
                            tdCell.classList.add('flash-green-bg');
                        } else if (currentPrice < previousPrice) {
                            tdCell.classList.add('flash-red-bg');
                        }
                    }
                }
            });

            // 2. Update Change Percent Elements
            const changeElements = document.querySelectorAll(`[data-live-change="${ticker}"]`);
            changeElements.forEach(el => {
                const changeVal = data.change;
                const sign = changeVal >= 0 ? '+' : '';
                const formattedChange = `${sign}${changeVal.toFixed(2)}%`;
                if (el.textContent !== formattedChange) {
                    el.textContent = formattedChange;

                    // Adapt badges/text colors
                    el.classList.remove('badge-green', 'badge-red', 'positive', 'negative', 'change-positive', 'change-negative');
                    if (changeVal >= 0) {
                        if (el.tagName === 'SPAN' && el.parentElement.tagName === 'TD' || el.classList.contains('badge-target')) {
                            el.classList.add('badge-green');
                        } else if (el.classList.contains('change-target')) {
                            el.classList.add('change-positive');
                        } else {
                            el.classList.add('positive');
                        }
                    } else {
                        if (el.tagName === 'SPAN' && el.parentElement.tagName === 'TD' || el.classList.contains('badge-target')) {
                            el.classList.add('badge-red');
                        } else if (el.classList.contains('change-target')) {
                            el.classList.add('change-negative');
                        } else {
                            el.classList.add('negative');
                        }
                    }
                }
            });

            // 3. Update Detail Page Metrics if present
            document.querySelectorAll(`[data-live-open="${ticker}"]`).forEach(el => {
                el.textContent = `₹${data.open.toFixed(2)}`;
            });
            document.querySelectorAll(`[data-live-prev-close="${ticker}"]`).forEach(el => {
                el.textContent = `₹${data.prev_close.toFixed(2)}`;
            });
            document.querySelectorAll(`[data-live-high="${ticker}"]`).forEach(el => {
                el.textContent = `₹${data.high.toFixed(2)}`;
            });
            document.querySelectorAll(`[data-live-low="${ticker}"]`).forEach(el => {
                el.textContent = `₹${data.low.toFixed(2)}`;
            });
            document.querySelectorAll(`[data-live-avg-price="${ticker}"]`).forEach(el => {
                el.textContent = `₹${currentPrice.toFixed(2)}`;
            });
            document.querySelectorAll(`[data-live-volume="${ticker}"]`).forEach(el => {
                el.textContent = data.volume;
            });

            // 4. Update portfolio page specific live holding values
            document.querySelectorAll(`[data-live-holding-value="${ticker}"]`).forEach(el => {
                const shares = parseFloat(el.getAttribute('data-shares')) || 0;
                const holdingValue = currentPrice * shares;
                el.textContent = `₹${holdingValue.toFixed(2)}`;
            });

            // 5. Update portfolio page live P&L % calculated relative to average purchase price
            document.querySelectorAll(`[data-live-pnl="${ticker}"]`).forEach(el => {
                const avgBuy = parseFloat(el.getAttribute('data-avg-buy')) || 0;
                if (avgBuy > 0) {
                    const pnlPct = ((currentPrice - avgBuy) / avgBuy) * 100;
                    const sign = pnlPct >= 0 ? '+' : '';
                    el.textContent = `${sign}${pnlPct.toFixed(2)}%`;
                    el.classList.remove('badge-green', 'badge-red');
                    el.classList.add(pnlPct >= 0 ? 'badge-green' : 'badge-red');
                }
            });

            priceCache['_prev_' + ticker] = priceCache[ticker];
            priceCache[ticker] = currentPrice;
        }

        // 6. Update dynamic portfolio summary cards (cash, holdings value, net worth)
        if (typeof userHoldings !== 'undefined' && Array.isArray(userHoldings)) {
            let totalHoldingsValue = 0.0;
            userHoldings.forEach(hold => {
                const matchingFeed = feed[hold.ticker];
                if (matchingFeed) {
                    totalHoldingsValue += matchingFeed.price * hold.shares;
                } else if (priceCache[hold.ticker]) {
                    totalHoldingsValue += priceCache[hold.ticker] * hold.shares;
                }
            });

            // Update holdings value element
            const holdingsValueEl = document.getElementById('portfolio-holdings-value');
            if (holdingsValueEl) {
                holdingsValueEl.textContent = `₹${totalHoldingsValue.toFixed(2)}`;
            }

            // Get Cash available
            const cashEl = document.getElementById('portfolio-cash-value');
            const headerCashEl = document.getElementById('portfolio-header-cash');
            let cashVal = 0.0;
            const refEl = cashEl || headerCashEl;
            if (refEl) {
                cashVal = parseFloat(refEl.textContent.replace(/[^\d.]/g, '')) || 0.0;
            }

            // Update Net Worth card
            const netWorthEl = document.getElementById('portfolio-net-worth');
            if (netWorthEl) {
                const netWorthVal = cashVal + totalHoldingsValue;
                netWorthEl.textContent = `₹${netWorthVal.toFixed(2)}`;
            }
        }

        // Update Movers & Sectors widgets on Dashboard
        updateMovers(feed);
        updateSectors(feed);

        // Update F&O widgets on Dashboard
        updateFOSectors(feed);
        updateFOOptions(feed);
    } catch (e) {
        console.error("Live price polling error:", e);
    }
}

let searchTimeout = null;
function initSearchDropdown() {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;

    let dropdown = document.querySelector('.search-results-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-results-dropdown';
        searchInput.parentElement.appendChild(dropdown);
        searchInput.parentElement.style.position = 'relative';
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) return;
                const results = await res.json();
                if (results.length === 0) {
                    dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size:12px;">No Indian stocks found.</div>';
                    dropdown.classList.add('active');
                    return;
                }

                let html = '';
                results.forEach(item => {
                    html += `
                        <div class="search-result-item">
                            <div class="search-result-item-header">${item.name}</div>
                            <div class="search-result-tickers">
                                <a href="/stock-details/${item.nse_ticker}" class="search-result-badge">
                                    <span class="search-result-badge-ticker">NSE: ${item.symbol}</span>
                                    <span class="search-result-badge-price">₹${item.nse_price.toFixed(2)}</span>
                                </a>
                                <a href="/stock-details/${item.bse_ticker}" class="search-result-badge">
                                    <span class="search-result-badge-ticker">BSE: ${item.symbol}</span>
                                    <span class="search-result-badge-price">₹${item.bse_price.toFixed(2)}</span>
                                </a>
                            </div>
                        </div>
                    `;
                });
                dropdown.innerHTML = html;
                dropdown.classList.add('active');
                scanAndAttachQuickView();
            } catch (e) {
                console.error("Search fetch error:", e);
            }
        }, 250);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// ── Event Listeners ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Initialise search results dropdown & start live pricing updates
    initSearchDropdown();
    pollLivePrices();
    setInterval(pollLivePrices, 3000);

    // Quick view initialization and link attachment
    initQuickViewDOM();
    scanAndAttachQuickView();

    // Indices widget initialization
    initIndicesWidget();

    // Initialise F&O sector table with default sector (metal)
    selectFOSector('metal');

    // Chatbot Enter key
    const chatInput = document.getElementById('chatbot-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    }

    // Search Enter key
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchStock(); });
    }

    // Watchlist Enter key
    const addTicker = document.getElementById('add-ticker');
    if (addTicker) {
        addTicker.addEventListener('keypress', e => { if (e.key === 'Enter') addToWatchlist(); });
    }

    // Uppercase ticker inputs
    document.querySelectorAll('input[id$="ticker"], input[id="ticker"]').forEach(el => {
        el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
    });

    // Prefill Buy Stock form from Discover Stocks
    const prefilledTicker = sessionStorage.getItem('prefilled_ticker');
    if (prefilledTicker) {
        const buyTicker = document.getElementById('buy-ticker');
        if (buyTicker) {
            buyTicker.value = prefilledTicker;
            sessionStorage.removeItem('prefilled_ticker');
            setTimeout(() => {
                buyTicker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                buyTicker.focus();
            }, 300);
        }
    }

    // Initial draw of forecast chart if data exists
    renderForecastChart();
});

// ── SVG Forecasting Chart Renderer ────────────────────────
function renderForecastChart() {
    const container = document.getElementById('forecast-chart-container');
    if (!container) return;

    // Clear any previous chart (except tooltip)
    const existingSvg = container.querySelector('svg');
    if (existingSvg) existingSvg.remove();

    const historyData = JSON.parse(container.getAttribute('data-history') || '[]');
    const forecastData = JSON.parse(container.getAttribute('data-forecast') || '[]');

    if (historyData.length === 0 && forecastData.length === 0) return;

    const combined = [...historyData, ...forecastData];
    const prices = combined.map(d => d.price);

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const pad = (maxPrice - minPrice) * 0.12 || 10;
    const minY = minPrice - pad;
    const maxY = maxPrice + pad;

    const width = container.clientWidth || 600;
    const height = 240;
    const margin = { top: 20, right: 20, bottom: 30, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'forecast-chart-svg');
    svg.style.overflow = 'visible';

    // Add glow filter and gradients
    svg.innerHTML = `
        <defs>
            <filter id="forecast-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <linearGradient id="hist-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--cyan)" stop-opacity="0.12" />
                <stop offset="100%" stop-color="var(--cyan)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="fore-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#33d4ff" stop-opacity="0.08" />
                <stop offset="100%" stop-color="#33d4ff" stop-opacity="0" />
            </linearGradient>
        </defs>
    `;

    // Map data to SVG coordinates
    const getX = (index) => margin.left + (index / (combined.length - 1)) * chartWidth;
    const getY = (price) => margin.top + chartHeight - ((price - minY) / (maxY - minY)) * chartHeight;

    // Y-Axis Gridlines and Labels
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
        const val = minY + (i / yTicks) * (maxY - minY);
        const y = getY(val);

        // Gridline
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', margin.left);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - margin.right);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'var(--border-light)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '3,3');
        svg.appendChild(line);

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', margin.left - 8);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', 'var(--text-muted)');
        text.style.fontSize = '10px';
        text.style.fontFamily = 'var(--font-mono)';
        text.textContent = `₹${val.toFixed(0)}`;
        svg.appendChild(text);
    }

    // X-Axis Labels (draw 3 labels: start, middle/transition, end)
    const xLabelIndices = [0, historyData.length - 1, combined.length - 1];
    xLabelIndices.forEach(idx => {
        if (idx < 0 || idx >= combined.length) return;
        const item = combined[idx];
        const x = getX(idx);

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', height - 8);
        text.setAttribute('text-anchor', idx === 0 ? 'start' : idx === combined.length - 1 ? 'end' : 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.style.fontSize = '10px';
        text.textContent = item.date;
        svg.appendChild(text);

        // Tick mark
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', height - 25);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', height - 20);
        tick.setAttribute('stroke', 'var(--border)');
        tick.setAttribute('stroke-width', '1');
        svg.appendChild(tick);
    });

    // Build historic line path
    let histPathD = '';
    let histAreaD = `M ${getX(0)} ${getY(minY)}`;

    for (let i = 0; i < historyData.length; i++) {
        const x = getX(i);
        const y = getY(historyData[i].price);
        const cmd = i === 0 ? 'M' : 'L';
        histPathD += ` ${cmd} ${x} ${y}`;
        histAreaD += ` L ${x} ${y}`;
    }
    histAreaD += ` L ${getX(historyData.length - 1)} ${getY(minY)} Z`;

    // Draw historic gradient area
    const histArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    histArea.setAttribute('d', histAreaD);
    histArea.setAttribute('fill', 'url(#hist-gradient)');
    svg.appendChild(histArea);

    // Draw historic line
    const histLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    histLine.setAttribute('d', histPathD);
    histLine.setAttribute('fill', 'none');
    histLine.setAttribute('stroke', 'var(--cyan)');
    histLine.setAttribute('stroke-width', '2.5');
    svg.appendChild(histLine);

    // Build forecast line path
    let forePathD = '';
    let foreAreaD = `M ${getX(historyData.length - 1)} ${getY(minY)}`;

    for (let i = 0; i < forecastData.length; i++) {
        const idx = historyData.length - 1 + i;
        const x = getX(idx);
        const y = getY(forecastData[i].price);
        const cmd = i === 0 ? 'M' : 'L';
        forePathD += ` ${cmd} ${x} ${y}`;
        foreAreaD += ` L ${x} ${y}`;
    }
    foreAreaD += ` L ${getX(combined.length - 1)} ${getY(minY)} Z`;

    // Draw forecast gradient area
    const foreArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    foreArea.setAttribute('d', foreAreaD);
    foreArea.setAttribute('fill', 'url(#fore-gradient)');
    svg.appendChild(foreArea);

    // Draw forecast line
    const foreLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    foreLine.setAttribute('d', forePathD);
    foreLine.setAttribute('fill', 'none');
    foreLine.setAttribute('stroke', '#33d4ff');
    foreLine.setAttribute('stroke-width', '2.5');
    foreLine.setAttribute('stroke-dasharray', '5,4');
    foreLine.setAttribute('filter', 'url(#forecast-glow)');
    svg.appendChild(foreLine);

    // Transition point (joint dot)
    const transitionIdx = historyData.length - 1;
    if (transitionIdx >= 0 && transitionIdx < combined.length) {
        const x = getX(transitionIdx);
        const y = getY(combined[transitionIdx].price);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', '5');
        dot.setAttribute('fill', 'var(--cyan)');
        dot.setAttribute('stroke', '#ffffff');
        dot.setAttribute('stroke-width', '1.5');
        svg.appendChild(dot);
    }

    // Hover vertical line and tooltip handling
    const hoverLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hoverLine.setAttribute('x1', '0');
    hoverLine.setAttribute('y1', margin.top);
    hoverLine.setAttribute('x2', '0');
    hoverLine.setAttribute('y2', height - margin.bottom);
    hoverLine.setAttribute('stroke', 'var(--text-muted)');
    hoverLine.setAttribute('stroke-width', '1');
    hoverLine.setAttribute('stroke-dasharray', '2,2');
    hoverLine.style.display = 'none';
    svg.appendChild(hoverLine);

    const hoverDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hoverDot.setAttribute('cx', '0');
    hoverDot.setAttribute('cy', '0');
    hoverDot.setAttribute('r', '6');
    hoverDot.setAttribute('fill', 'var(--cyan)');
    hoverDot.setAttribute('stroke', '#ffffff');
    hoverDot.setAttribute('stroke-width', '2');
    hoverDot.style.display = 'none';
    svg.appendChild(hoverDot);

    container.appendChild(svg);

    // Hover interactive listeners
    const tooltip = document.getElementById('chart-tooltip');
    const tooltipDate = document.getElementById('chart-tooltip-date');
    const tooltipPrice = document.getElementById('chart-tooltip-price');

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - margin.left;

        if (mouseX >= 0 && mouseX <= chartWidth) {
            // Find closest data index
            const percent = mouseX / chartWidth;
            const index = Math.round(percent * (combined.length - 1));

            if (index >= 0 && index < combined.length) {
                const item = combined[index];
                const x = getX(index);
                const y = getY(item.price);

                // Position hover elements
                hoverLine.setAttribute('x1', x);
                hoverLine.setAttribute('x2', x);
                hoverLine.style.display = 'block';

                hoverDot.setAttribute('cx', x);
                hoverDot.setAttribute('cy', y);
                // Color dots differently if they are in forecast range
                hoverDot.setAttribute('fill', index >= historyData.length ? '#33d4ff' : 'var(--cyan)');
                hoverDot.style.display = 'block';

                // Position and update tooltip
                if (tooltip && tooltipDate && tooltipPrice) {
                    tooltipDate.textContent = (index >= historyData.length ? 'AI Forecast: ' : 'Close Price: ') + item.date;
                    tooltipPrice.textContent = `₹${item.price.toFixed(2)}`;

                    tooltip.style.display = 'block';
                    // Center tooltip above the point
                    tooltip.style.left = `${x - tooltip.clientWidth / 2}px`;
                    tooltip.style.top = `${y - tooltip.clientHeight - 10}px`;
                }
            }
        }
    });

    container.addEventListener('mouseleave', () => {
        hoverLine.style.display = 'none';
        hoverDot.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
    });
}

// ── Stock Quick View Component (Everywhere Tickers are Links) ───────────────
class SeededRandomGlobal {
    constructor(seed) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    nextRange(min, max, decimals = 2) {
        const val = min + this.next() * (max - min);
        return parseFloat(val.toFixed(decimals));
    }
    choice(arr) {
        const idx = Math.floor(this.next() * arr.length);
        return arr[idx];
    }
}

function getTickerSeedGlobal(ticker) {
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
        hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

function switchQVRatioTab(ratioTabId) {
    // Hide all panes
    document.querySelectorAll('.qv-pane').forEach(p => p.style.display = 'none');

    // Deactivate tab buttons
    document.getElementById('qv-tab-btn-val').classList.remove('active');
    document.getElementById('qv-tab-btn-growth').classList.remove('active');
    document.getElementById('qv-tab-btn-fin').classList.remove('active');

    // Activate clicked tab
    document.getElementById(`qv-tab-btn-${ratioTabId}`).classList.add('active');
    document.getElementById(`qv-pane-${ratioTabId}`).style.display = 'block';
}

function initQuickViewDOM() {
    if (document.getElementById('quickview-modal')) return;

    const modalHTML = `
    <div id="quickview-modal" class="qv-modal">
        <div class="qv-modal-content">
            <div class="qv-modal-header">
                <div>
                    <h2 id="qv-ticker-title">-</h2>
                    <p id="qv-company-name">-</p>
                </div>
                <span class="qv-close-btn" onclick="closeQuickViewModal()">&times;</span>
            </div>
            <div class="qv-modal-body">
                <div class="qv-row-price">
                    <div class="price-large" id="qv-live-price">₹0.00</div>
                    <div id="qv-live-change" class="change-badge">+0.00%</div>
                </div>
                
                <div class="qv-grid-sliders">
                    <div class="qv-slider-card">
                        <h3>Lower Circuit / Upper Circuit</h3>
                        <div class="qv-slider-track-wrap">
                            <div class="qv-slider-track" style="background: linear-gradient(90deg, var(--red) 0%, var(--yellow) 50%, var(--green) 100%);"></div>
                            <div id="qv-circuit-pointer" class="qv-pointer"></div>
                        </div>
                        <div class="qv-slider-labels">
                            <span>L: <strong id="qv-lower-circuit">-</strong></span>
                            <span>H: <strong id="qv-upper-circuit">-</strong></span>
                        </div>
                    </div>
                    <div class="qv-slider-card">
                        <h3>52 Week Low / High</h3>
                        <div class="qv-slider-track-wrap">
                            <div class="qv-slider-track" style="background: linear-gradient(90deg, #f87171 0%, #fbbf24 50%, #34d399 100%);"></div>
                            <div id="qv-52wk-pointer" class="qv-pointer"></div>
                        </div>
                        <div class="qv-slider-labels">
                            <span>L: <strong id="qv-52wk-low">-</strong></span>
                            <span>H: <strong id="qv-52wk-high">-</strong></span>
                        </div>
                    </div>
                </div>

                <div class="qv-grid-ratios-analyst">
                    <div class="qv-card">
                        <h3>Fundamental Ratios</h3>
                        <div class="qv-subtabs">
                            <button id="qv-tab-btn-val" onclick="switchQVRatioTab('val')" class="qv-tab-btn active">Valuation</button>
                            <button id="qv-tab-btn-growth" onclick="switchQVRatioTab('growth')" class="qv-tab-btn">Growth</button>
                            <button id="qv-tab-btn-fin" onclick="switchQVRatioTab('fin')" class="qv-tab-btn">Financial</button>
                        </div>
                        <div id="qv-pane-val" class="qv-pane" style="display:block;">
                            <div class="qv-ratio-row"><span>PE Ratio</span><strong id="qv-pe">-</strong></div>
                            <div class="qv-ratio-row"><span>Price to Book</span><strong id="qv-pb">-</strong></div>
                            <div class="qv-ratio-row"><span>PEG Ratio</span><strong id="qv-peg">-</strong></div>
                            <div class="qv-ratio-row"><span>ROE (Latest)</span><strong id="qv-roe">-</strong></div>
                        </div>
                        <div id="qv-pane-growth" class="qv-pane" style="display:none;">
                            <div class="qv-ratio-row"><span>Growth</span><strong id="qv-growth-val">-</strong></div>
                            <div class="qv-ratio-row"><span>EV to EBITDA</span><strong id="qv-evebitda">-</strong></div>
                            <div class="qv-ratio-row"><span>ROCE (Latest)</span><strong id="qv-roce">-</strong></div>
                        </div>
                        <div id="qv-pane-fin" class="qv-pane" style="display:none;">
                            <div class="qv-ratio-row"><span>EV to Cap Employed</span><strong id="qv-evcap">-</strong></div>
                            <div class="qv-ratio-row"><span>EV to Sales</span><strong id="qv-evsales">-</strong></div>
                            <div class="qv-ratio-row"><span>Dividend Yield</span><strong id="qv-divyield">-</strong></div>
                        </div>
                    </div>
                    
                    <div class="qv-card">
                        <h3>Performance Overview</h3>
                        <div class="qv-perf-metrics">
                            <div class="qv-perf-metric"><span>Quality</span><strong id="qv-quality">-</strong></div>
                            <div class="qv-perf-metric"><span>Valuation</span><strong id="qv-valuation">-</strong></div>
                            <div class="qv-perf-metric"><span>Financial</span><strong id="qv-financial">-</strong></div>
                            <div class="qv-perf-metric"><span>Short Term</span><strong id="qv-short-term">-</strong></div>
                            <div class="qv-perf-metric"><span>Long Term</span><strong id="qv-long-term">-</strong></div>
                            <div class="qv-perf-metric"><span>Market Cap</span><strong id="qv-mcap">-</strong></div>
                        </div>
                    </div>
                </div>

                <div class="qv-card" style="margin-top:16px;">
                    <h3>Insights to Look For</h3>
                    <ul id="qv-insights-list" style="margin: 8px 0 0; padding-left: 20px; font-size:12.5px; color:var(--text-secondary);"></ul>
                </div>
                
                <div class="qv-footer-links" style="margin-top:20px;">
                    <a id="qv-full-details-link" href="#" class="cta-btn" style="display:block; text-align:center; text-decoration:none;">View Full Details & Trade →</a>
                </div>
            </div>
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);

    // Close modal on click outside modal content
    const modal = document.getElementById('quickview-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQuickViewModal();
    });

    initQuickViewObserver();
}

function closeQuickViewModal() {
    const modal = document.getElementById('quickview-modal');
    if (modal) modal.classList.remove('active');
}

function initQuickViewObserver() {
    const qvPriceEl = document.getElementById('qv-live-price');
    if (!qvPriceEl) return;
    const observer = new MutationObserver(() => {
        const priceVal = parseFloat(qvPriceEl.textContent.replace(/[^\d.]/g, ''));
        if (!isNaN(priceVal)) {
            updateQVSubSliders(priceVal);
        }
    });
    observer.observe(qvPriceEl, { childList: true, characterData: true, subtree: true });
}

async function showQuickViewModal(ticker) {
    initQuickViewDOM();
    const modal = document.getElementById('quickview-modal');
    if (!modal) return;

    // Reset tabs
    switchQVRatioTab('val');

    const normalizedTicker = ticker.split('.')[0].toUpperCase();
    document.getElementById('qv-ticker-title').textContent = ticker;
    document.getElementById('qv-full-details-link').setAttribute('href', `/stock-details/${ticker}`);

    // Try to get live price from global price cache
    let initialPrice = 100.0;
    let initialChange = 0.0;
    if (priceCache[ticker]) {
        initialPrice = priceCache[ticker];
        // Find change
        const changeEl = document.querySelector(`[data-live-change="${ticker}"]`);
        if (changeEl) {
            initialChange = parseFloat(changeEl.textContent.replace(/[^\d.+-]/g, '')) || 0.0;
        }
    }

    // If details.price is rendered in elements, read it
    const detailsPriceEl = document.querySelector(`[data-live-price="${ticker}"]`);
    if (detailsPriceEl) {
        initialPrice = parseFloat(detailsPriceEl.textContent.replace(/[^\d.]/g, '')) || initialPrice;
    }

    const priceText = `₹${initialPrice.toFixed(2)}`;
    const changeText = `${initialChange >= 0 ? '+' : ''}${initialChange.toFixed(2)}%`;

    const priceEl = document.getElementById('qv-live-price');
    const changeEl = document.getElementById('qv-live-change');
    priceEl.textContent = priceText;
    changeEl.textContent = changeText;

    // Color change badge
    changeEl.className = 'change-badge';
    changeEl.classList.add(initialChange >= 0 ? 'change-positive' : 'change-negative');

    // Set data live attribute on modal price/change for MutationObserver syncing
    priceEl.setAttribute('data-live-price', ticker);
    changeEl.setAttribute('data-live-change', ticker);

    // Dynamic / Seeded fields populating
    let companyName = normalizedTicker;
    if (normalizedTicker === 'SUZLON') {
        companyName = 'Suzlon Energy Limited';
        document.getElementById('qv-pe').textContent = '23.48';
        document.getElementById('qv-pb').textContent = '7.85';
        document.getElementById('qv-peg').textContent = '0.45';
        document.getElementById('qv-roe').textContent = '33.43%';
        document.getElementById('qv-growth-val').textContent = '27.13';
        document.getElementById('qv-evebitda').textContent = '24.27';
        document.getElementById('qv-roce').textContent = '31.60%';
        document.getElementById('qv-evcap').textContent = '8.57';
        document.getElementById('qv-evsales').textContent = '4.38';
        document.getElementById('qv-divyield').textContent = 'NA';

        document.getElementById('qv-quality').textContent = 'GOOD (4/5)';
        document.getElementById('qv-quality').style.color = 'var(--green)';
        document.getElementById('qv-valuation').textContent = 'EXPENSIVE (2/5)';
        document.getElementById('qv-valuation').style.color = 'var(--red)';
        document.getElementById('qv-financial').textContent = 'POSITIVE (3/5)';
        document.getElementById('qv-financial').style.color = 'var(--green)';

        document.getElementById('qv-short-term').textContent = 'neutral';
        document.getElementById('qv-short-term').style.color = 'var(--yellow)';
        document.getElementById('qv-long-term').textContent = 'neutral';
        document.getElementById('qv-long-term').style.color = 'var(--yellow)';

        document.getElementById('qv-mcap').textContent = 'Rs 74,979 Cr';

        document.getElementById('qv-lower-circuit').textContent = '₹49.13';
        document.getElementById('qv-upper-circuit').textContent = '₹60.03';
        document.getElementById('qv-52wk-low').textContent = '₹38.19';
        document.getElementById('qv-52wk-high').textContent = '₹74.30';

        document.getElementById('qv-insights-list').innerHTML = `
            <li>Good quality company basis long term financial performance.</li>
            <li>Size - Ranks 3rd out of 18 companies in Renewable Energy sector</li>
        `;
    } else {
        // Try to fetch company name from search elements or list if available
        const nseLabel = document.querySelector(`.search-result-item:has(a[href*="/stock-details/${ticker}"]) .search-result-item-header`);
        if (nseLabel) {
            companyName = nseLabel.textContent.trim();
        } else {
            companyName = normalizedTicker + ' LTD';
        }

        const seed = getTickerSeedGlobal(normalizedTicker);
        const rand = new SeededRandomGlobal(seed);

        // Circuits
        const lc = initialPrice * 0.90;
        const uc = initialPrice * 1.10;
        document.getElementById('qv-lower-circuit').textContent = '₹' + lc.toFixed(2);
        document.getElementById('qv-upper-circuit').textContent = '₹' + uc.toFixed(2);

        // 52 Week Low/High
        const low52 = initialPrice * rand.nextRange(0.55, 0.92);
        const high52 = initialPrice * rand.nextRange(1.08, 1.95);
        document.getElementById('qv-52wk-low').textContent = '₹' + low52.toFixed(2);
        document.getElementById('qv-52wk-high').textContent = '₹' + high52.toFixed(2);

        // Ratios
        document.getElementById('qv-pe').textContent = rand.nextRange(8, 95).toFixed(2);
        document.getElementById('qv-pb').textContent = rand.nextRange(0.8, 22.0).toFixed(2);
        document.getElementById('qv-peg').textContent = rand.nextRange(0.15, 4.5).toFixed(2);
        document.getElementById('qv-roe').textContent = rand.nextRange(2, 48).toFixed(2) + '%';

        document.getElementById('qv-growth-val').textContent = rand.nextRange(-10, 65).toFixed(2);
        document.getElementById('qv-evebitda').textContent = rand.nextRange(4, 52).toFixed(2);
        document.getElementById('qv-roce').textContent = rand.nextRange(2, 52).toFixed(2) + '%';

        document.getElementById('qv-evcap').textContent = rand.nextRange(1.5, 32.0).toFixed(2);
        document.getElementById('qv-evsales').textContent = rand.nextRange(0.2, 18.0).toFixed(2);
        document.getElementById('qv-divyield').textContent = rand.next() > 0.45 ? rand.nextRange(0.1, 5.5).toFixed(2) + '%' : 'NA';

        // Performance
        const quality = Math.floor(rand.nextRange(1, 6, 0));
        const qualityText = ['POOR', 'BELOW AVERAGE', 'AVERAGE', 'GOOD', 'EXCELLENT'][quality - 1];
        document.getElementById('qv-quality').textContent = `${qualityText} (${quality}/5)`;
        document.getElementById('qv-quality').style.color = quality >= 4 ? 'var(--green)' : quality <= 2 ? 'var(--red)' : 'var(--yellow)';

        const valuation = Math.floor(rand.nextRange(1, 6, 0));
        const valuationText = ['VERY EXPENSIVE', 'EXPENSIVE', 'FAIR', 'CHEAP', 'VERY CHEAP'][valuation - 1];
        document.getElementById('qv-valuation').textContent = `${valuationText} (${valuation}/5)`;
        document.getElementById('qv-valuation').style.color = valuation >= 4 ? 'var(--green)' : valuation <= 2 ? 'var(--red)' : 'var(--yellow)';

        const financial = Math.floor(rand.nextRange(1, 6, 0));
        const financialText = ['NEGATIVE', 'WEAK', 'NEUTRAL', 'POSITIVE', 'VERY POSITIVE'][financial - 1];
        document.getElementById('qv-financial').textContent = `${financialText} (${financial}/5)`;
        document.getElementById('qv-financial').style.color = financial >= 4 ? 'var(--green)' : financial <= 2 ? 'var(--red)' : 'var(--yellow)';

        const shortSignal = rand.choice(['bullish', 'neutral', 'bearish']);
        document.getElementById('qv-short-term').textContent = shortSignal;
        document.getElementById('qv-short-term').style.color = shortSignal === 'bullish' ? 'var(--green)' : shortSignal === 'bearish' ? 'var(--red)' : 'var(--yellow)';

        const longSignal = rand.choice(['bullish', 'neutral', 'bearish']);
        document.getElementById('qv-long-term').textContent = longSignal;
        document.getElementById('qv-long-term').style.color = longSignal === 'bullish' ? 'var(--green)' : longSignal === 'bearish' ? 'var(--red)' : 'var(--yellow)';

        const mcapSize = rand.choice(['LARGE CAP', 'MID CAP', 'SMALL CAP']);
        const mcapInCr = Math.floor(rand.nextRange(1000, mcapSize === 'LARGE CAP' ? 1200000 : mcapSize === 'MID CAP' ? 150000 : 20000));
        document.getElementById('qv-mcap').textContent = 'Rs ' + mcapInCr.toLocaleString('en-IN') + ' Cr';

        const sector = rand.choice(['RENEWABLE ENERGY', 'BANKING', 'IT SERVICES', 'AUTOMOBILE', 'PHARMACEUTICALS', 'TELECOM', 'POWER & ENERGY', 'METALS & MINING', 'OIL & GAS']);

        // Insights
        let insightsHtml = '';
        if (quality >= 4) {
            insightsHtml += '<li>Good quality company basis long term financial performance.</li>';
        } else if (quality <= 2) {
            insightsHtml += '<li>Keep an eye on company metrics due to weaker long term performance.</li>';
        } else {
            insightsHtml += '<li>Average quality company exhibiting steady long term performance.</li>';
        }
        insightsHtml += `<li>Size - Ranks ${Math.floor(rand.nextRange(1, 15, 0))}rd out of ${Math.floor(rand.nextRange(15, 45, 0))} companies in ${sector} sector</li>`;
        document.getElementById('qv-insights-list').innerHTML = insightsHtml;
    }

    document.getElementById('qv-company-name').textContent = companyName;

    // Position slider pointers
    updateQVSubSliders(initialPrice);

    // Show modal
    modal.classList.add('active');
}

function updateQVSubSliders(currentPrice) {
    const lcText = document.getElementById('qv-lower-circuit')?.textContent;
    const ucText = document.getElementById('qv-upper-circuit')?.textContent;
    const low52Text = document.getElementById('qv-52wk-low')?.textContent;
    const high52Text = document.getElementById('qv-52wk-high')?.textContent;

    if (lcText && ucText) {
        const lc = parseFloat(lcText.replace(/[^\d.]/g, ''));
        const uc = parseFloat(ucText.replace(/[^\d.]/g, ''));
        if (!isNaN(lc) && !isNaN(uc) && uc > lc) {
            let circuitPct = ((currentPrice - lc) / (uc - lc)) * 100;
            circuitPct = Math.max(0, Math.min(100, circuitPct));
            document.getElementById('qv-circuit-pointer').style.left = `${circuitPct}%`;
        }
    }

    if (low52Text && high52Text) {
        const l52 = parseFloat(low52Text.replace(/[^\d.]/g, ''));
        const h52 = parseFloat(high52Text.replace(/[^\d.]/g, ''));
        if (!isNaN(l52) && !isNaN(h52) && h52 > l52) {
            let wk52Pct = ((currentPrice - l52) / (h52 - l52)) * 100;
            wk52Pct = Math.max(0, Math.min(100, wk52Pct));
            document.getElementById('qv-52wk-pointer').style.left = `${wk52Pct}%`;
        }
    }
}

// Function to automatically attach info buttons next to stock details links
function scanAndAttachQuickView() {
    document.querySelectorAll('a[href^="/stock-details/"]').forEach(link => {
        // Skip links that are already badge wrappers or have quickview classes
        if (link.classList.contains('has-quickview') ||
            link.classList.contains('search-result-badge') ||
            link.classList.contains('cta-btn') ||
            link.classList.contains('card-link') ||
            link.closest('.search-result-tickers') ||
            link.closest('.ticker-bar')) return;

        link.classList.add('has-quickview');

        // Add info eye icon button next to it
        const qvBtn = document.createElement('span');
        qvBtn.className = 'quickview-btn';
        qvBtn.innerHTML = ' 📊';
        qvBtn.style.cursor = 'pointer';
        qvBtn.style.display = 'inline-block';
        qvBtn.style.fontSize = '12px';
        qvBtn.style.transition = 'transform 0.15s ease';
        qvBtn.title = 'Quick View Overview';

        qvBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ticker = link.getAttribute('href').split('/').pop();
            showQuickViewModal(ticker);
        });

        link.parentNode.insertBefore(qvBtn, link.nextSibling);
    });
}

// ── Live Indices Navbar Widget ──────────────────────────────
function initIndicesWidget() {
    const topBar = document.querySelector('.top-bar');
    const logo = document.querySelector('.top-bar .logo');
    if (!topBar || !logo || document.getElementById('nav-indices-container')) return;

    const widget = document.createElement('div');
    widget.id = 'nav-indices-container';
    widget.className = 'nav-indices';
    widget.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        margin-left: 24px;
        font-size: 11.5px;
        font-family: var(--font-mono);
        border-left: 1px solid var(--border);
        padding-left: 16px;
        position: relative;
        height: 100%;
    `;

    widget.innerHTML = `
        <div class="nav-index-item" style="cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';" onclick="location.href='/stock-details/NIFTY50.NSE';">
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-main);">NIFTY 50</span>
            <span style="color: var(--text-secondary); font-weight: 600;" data-live-price="NIFTY50.NSE">₹22,500.00</span>
            <span class="positive" style="font-size: 11px; font-weight: 600;" data-live-change="NIFTY50.NSE">+0.00%</span>
        </div>
        <div class="nav-index-item" style="cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';" onclick="location.href='/stock-details/NIFTYBANK.NSE';">
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-main);">BANKNIFTY</span>
            <span style="color: var(--text-secondary); font-weight: 600;" data-live-price="NIFTYBANK.NSE">₹48,000.00</span>
            <span class="positive" style="font-size: 11px; font-weight: 600;" data-live-change="NIFTYBANK.NSE">+0.00%</span>
        </div>
        <div class="nav-index-arrow" style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; transition: background 0.2s; color: var(--text-muted); font-size: 8px;" onmouseover="this.style.background='var(--bg-hover)'; this.style.color='var(--text-primary)';" onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)';" onclick="toggleIndicesDropdown(event)">
            ▼
        </div>
        
        <!-- Indices Dropdown Menu -->
        <div id="indices-dropdown-menu" style="display: none; position: absolute; top: calc(100% - 6px); left: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); width: 280px; z-index: 10000; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 12px 0; font-family: var(--font-main);">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); padding: 0 16px 8px; border-bottom: 1px solid var(--border-light); text-transform: uppercase; letter-spacing: 0.5px;">Indices List</div>
            <div style="max-height: 280px; overflow-y: auto; padding: 4px 0;">
                <div class="index-row" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 16px; align-items: center; border-bottom: 1px solid var(--border-light);" onclick="location.href='/stock-details/NIFTY50.NSE';" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';">
                    <span style="font-weight: 600; color: var(--text-secondary);">NIFTY 50</span>
                    <div style="text-align: right;">
                        <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 13px;" data-live-price="NIFTY50.NSE">₹22,500.00</strong>
                        <span class="positive" style="display: block; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;" data-live-change="NIFTY50.NSE">+0.00%</span>
                    </div>
                </div>
                <div class="index-row" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 16px; align-items: center; border-bottom: 1px solid var(--border-light);" onclick="location.href='/stock-details/SENSEX.BSE';" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';">
                    <span style="font-weight: 600; color: var(--text-secondary);">SENSEX</span>
                    <div style="text-align: right;">
                        <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 13px;" data-live-price="SENSEX.BSE">₹74,000.00</strong>
                        <span class="positive" style="display: block; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;" data-live-change="SENSEX.BSE">+0.00%</span>
                    </div>
                </div>
                <div class="index-row" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 16px; align-items: center; border-bottom: 1px solid var(--border-light);" onclick="location.href='/stock-details/NIFTYBANK.NSE';" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';">
                    <span style="font-weight: 600; color: var(--text-secondary);">BANKNIFTY</span>
                    <div style="text-align: right;">
                        <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 13px;" data-live-price="NIFTYBANK.NSE">₹48,000.00</strong>
                        <span class="positive" style="display: block; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;" data-live-change="NIFTYBANK.NSE">+0.00%</span>
                    </div>
                </div>
                <div class="index-row" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 16px; align-items: center; border-bottom: 1px solid var(--border-light);" onclick="location.href='/stock-details/FINNIFTY.NSE';" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';">
                    <span style="font-weight: 600; color: var(--text-secondary);">FINNIFTY</span>
                    <div style="text-align: right;">
                        <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 13px;" data-live-price="FINNIFTY.NSE">₹23,500.00</strong>
                        <span class="positive" style="display: block; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;" data-live-change="FINNIFTY.NSE">+0.00%</span>
                    </div>
                </div>
                <div class="index-row" style="cursor: pointer; display: flex; justify-content: space-between; padding: 8px 16px; align-items: center;" onclick="location.href='/stock-details/MIDCPNIFTY.NSE';" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='transparent';">
                    <span style="font-weight: 600; color: var(--text-secondary);">MIDCPNIFTY</span>
                    <div style="text-align: right;">
                        <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 13px;" data-live-price="MIDCPNIFTY.NSE">₹12,200.00</strong>
                        <span class="positive" style="display: block; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;" data-live-change="MIDCPNIFTY.NSE">+0.00%</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    logo.insertAdjacentElement('afterend', widget);
}

function toggleIndicesDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('indices-dropdown-menu');
    if (!menu) return;
    const isShowing = menu.style.display === 'block';
    menu.style.display = isShowing ? 'none' : 'block';
}

// Close indices dropdown on window click
window.addEventListener('click', (e) => {
    const menu = document.getElementById('indices-dropdown-menu');
    if (menu && menu.style.display === 'block') {
        const triggers = document.querySelectorAll('.nav-index-item, .nav-index-arrow');
        let clickedTrigger = false;
        triggers.forEach(t => {
            if (t.contains(e.target)) clickedTrigger = true;
        });
        if (!clickedTrigger && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    }
});

// ============================================================================
// ── Groww-Style IPO Details Modal System ──────────────────────────────────
// ============================================================================

const IPO_DATABASE = {
    smr_jewels: {
        name: "SMR Jewels Ltd",
        logoText: "SMR",
        logoBg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        logoColor: "#b45309",
        category: "SME",
        sector: "DIAMOND, GEMS AND JEWELLERY",
        issueSize: "₹67.23 Cr",
        offerType: "SME",
        ipoType: "Book Building",
        overallSubscription: "0.26x",
        subscriptionDetails: {
            retail: "0.18x",
            hni: "0.34x",
            qib: "0.00x",
            overall: "0.26x"
        },
        dates: {
            starts: "26 May 2026",
            ends: "29 May 2026",
            allotment: "01 Jun 2026",
            listing: "03 Jun 2026"
        },
        about: "We specialize in Designer Heritage Jewellery that blends the richness of India's cultural and artistic traditions with modern aesthetics. Our jewellery reflects intricate craftsmanship, heritage artistry, and traditional motifs, while incorporating contemporary styles to suit the evolving tastes of today's customers. Each piece is created with its own storytelling, carrying cultural meaning, emotional value, and artistic expression.",
        history: "Our Company was originally incorporated as a private limited Company under the name \"SMR Jewels Private Limited\" on October 26, 2018 under the provisions of the Companies Act, 2013 with the Registrar of Companies, Central Registration Centre bearing registration number as U74999GJ2018PTC104946. Subsequently, pursuant to Special Resolution passed by the Shareholders at the Extra Ordinary General Meeting, held on September 14, 2024, our Company was converted into a Public Limited Company and consequently the name of our Company was changed from \"SMR Jewels Private Limited\" to \"SMR Jewels Limited\" vide a fresh certificate of incorporation consequent upon conversion from private company to public company dated October 11, 2024 issued by the Registrar of Companies, Central Registration Centre bearing CIN U74999GJ2018PLC104946.",
        objective: [
            "Initial public offer of upto 49,800,000 equity shares of face value of Rs. 10/- each (\"Equity Shares\") of SMR Jewels Limited (the \"Company\" or \"SMR Jewels\" or \"Issuer\") at an offer price of",
            "Rs. 128-135 per equity share (including a share premium of Rs. 118-125 per equity share) for cash, aggregating upto Rs. 63.74-67.23 Crores (\"public offer\") comprising a fresh issue of upto 40,000,000 equity shares aggregating to Rs. 51.2-54 Crores (the \"fresh issue\") and an offer for sale of upto 3,50,000 equity shares by Parul Manoj Soni, upto 3,50,000 equity shares by Dipikaben Virendra Soni, upto 1,40,000 equity shares by Vismay Manojkumar Soni; upto 50,000 equity shares by Drashti Pal Modi, upto 30,000 equity shares by Bhanumati Ramanlal Parekh, upto 30,000 equity shares by Soni Mitul Virendra and upto 30,000 equity shares by Soni Niharika Vismay (\"the selling shareholders\") aggregating to..."
        ],
        investorTypes: {
            Retail: {
                priceRange: "₹128.00 - ₹135.00",
                lotSize: "1000 Shares",
                discount: "₹0.00",
                minInv: "₹1,35,000.00 / 1 Lot",
                maxInv: "₹1,35,000.00 / 1 Lot"
            },
            HNI: {
                priceRange: "₹128.00 - ₹135.00",
                lotSize: "1000 Shares",
                discount: "₹0.00",
                minInv: "₹2,00,000.00 / 2 Lots",
                maxInv: "₹5,00,000.00 / 3 Lots"
            }
        },
        financials: {
            Profit: {
                "FY23": "0.91",
                "FY24": "3.85",
                "FY25": "10.41"
            },
            Assets: {
                "FY23": "8.40",
                "FY24": "25.60",
                "FY25": "62.80"
            },
            Revenue: {
                "FY23": "12.50",
                "FY24": "45.80",
                "FY25": "112.40"
            }
        },
        shareholding: {
            promoterPre: "90.37%",
            promoterPost: "65.74%",
            otherPre: "9.63%",
            otherPost: "34.26%"
        },
        strengths: [
            "Experienced Promoter and management team with proven execution capabilities and Skilled work force and Karigars with contemporary designing capabilities.",
            "Long business experience and established network of suppliers and Clients.",
            "Profitable track record and strong balance sheet.",
            "Wide and diverse range of ornament offerings.",
            "Strong relationships with premium certified suppliers."
        ],
        risks: [
            "High dependency on gold and diamond price volatility in Indian market.",
            "Fragmented market share with intense competition from regional jewelers.",
            "Vulnerability to fluctuations in exchange rates and import duties.",
            "Substantial working capital requirements to maintain gold and gemstone inventories.",
            "Regulatory compliance risks related to manufacturing units."
        ],
        faqs: [
            {
                q: "What is the issue size of SMR Jewels Ltd IPO?",
                a: "The SMR Jewels Ltd IPO issue size is ₹67.23 Cr."
            },
            {
                q: "What is 'pre-apply' for SMR Jewels Ltd IPO?",
                a: "Pre-apply allows you to apply for an IPO before its official bidding starts. The system will hold your application and place it automatically with the exchange when bidding officially opens."
            },
            {
                q: "If I pre-apply for SMR Jewels Ltd IPO, when will my order get placed?",
                a: "Your order will be placed automatically as soon as the IPO bidding window opens officially."
            },
            {
                q: "When will I know if my SMR Jewels Ltd IPO order is placed?",
                a: "You will receive an email/SMS confirmation and updates inside the application as soon as the broker places your order on the exchange."
            },
            {
                q: "What are the open and close dates of the SMR Jewels Ltd IPO?",
                a: "The IPO starts on 26 May 2026 and closes on 29 May 2026."
            },
            {
                q: "What is the lot size and minimum investment of the SMR Jewels Ltd IPO?",
                a: "The lot size is 1000 shares. For HNI, the minimum investment is ₹2,00,000.00 / 2 Lots. For Retail, the minimum investment is ₹1,35,000.00 / 1 Lot."
            },
            {
                q: "What is the allotment date for the SMR Jewels Ltd IPO?",
                a: "The allotment date for SMR Jewels Ltd IPO is scheduled for 01 Jun 2026."
            }
        ]
    },
    rajnandini_fashion: {
        name: "Rajnandini Fashion India Ltd",
        logoText: "RFI",
        logoBg: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        logoColor: "#0369a1",
        category: "SME",
        sector: "TEXTILES AND APPAREL",
        issueSize: "₹45.50 Cr",
        offerType: "SME",
        ipoType: "Book Building",
        overallSubscription: "6.97x",
        subscriptionDetails: {
            retail: "9.24x",
            hni: "4.70x",
            qib: "0.00x",
            overall: "6.97x"
        },
        dates: {
            starts: "25 May 2026",
            ends: "29 May 2026",
            allotment: "01 Jun 2026",
            listing: "03 Jun 2026"
        },
        about: "Rajnandini Fashion India Ltd is a premier fashion apparel brand specializing in traditional ethnic wear, designer sarees, and modern fusion wear. With a strong distribution network across India and rising exports, the company is scaling its manufacturing capabilities.",
        history: "Incorporated in 2020, Rajnandini Fashion has quickly built a brand reputation in Rajasthan, Gujarat, and Maharashtra. The company supplies high-quality ethnic garments to national distributors and is upgrading to direct-to-consumer e-commerce lines.",
        objective: [
            "Fund working capital requirements to finance ethnic wear wholesale lines.",
            "Establish two new retail outlets in Jaipur and Surat.",
            "General corporate and brand advertisement purposes."
        ],
        investorTypes: {
            Retail: {
                priceRange: "₹110.00 - ₹118.00",
                lotSize: "1000 Shares",
                discount: "₹0.00",
                minInv: "₹1,18,000.00 / 1 Lot",
                maxInv: "₹1,18,000.00 / 1 Lot"
            },
            HNI: {
                priceRange: "₹110.00 - ₹118.00",
                lotSize: "1000 Shares",
                discount: "₹0.00",
                minInv: "₹2,36,000.00 / 2 Lots",
                maxInv: "₹4,72,000.00 / 4 Lots"
            }
        },
        financials: {
            Profit: {
                "FY23": "1.20",
                "FY24": "2.90",
                "FY25": "6.80"
            },
            Assets: {
                "FY23": "12.50",
                "FY24": "20.80",
                "FY25": "38.60"
            },
            Revenue: {
                "FY23": "18.20",
                "FY24": "32.40",
                "FY25": "68.50"
            }
        },
        shareholding: {
            promoterPre: "85.00%",
            promoterPost: "62.40%",
            otherPre: "15.00%",
            otherPost: "37.60%"
        },
        strengths: [
            "Robust wholesale distribution channels covering major wholesale hubs in India.",
            "Cost-efficient production facility giving a competitive edge in ethnic wear."
        ],
        risks: [
            "High inventory holding periods and vulnerability to fast-changing fashion trends.",
            "Long working capital cash conversion cycles."
        ],
        faqs: [
            {
                q: "What is the subscription status of Rajnandini Fashion IPO?",
                a: "As of Day 3, the IPO is subscribed 6.97x, with retail category showing a high demand of 9.24x subscription."
            }
        ]
    }
};

let activeIpoId = null;
let activeInvestorType = 'HNI';
let activeFinancialTab = 'Profit';
let activeSrTab = 'strengths';

// Resolves IPO details from database or creates dynamic profile
function getIpoDetailsFromDb(ipoId) {
    if (IPO_DATABASE[ipoId]) {
        return IPO_DATABASE[ipoId];
    }

    // Dynamic Fallback profile generation
    let name = ipoId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!name.endsWith('Ltd') && !name.toLowerCase().includes('phonepe') && !name.toLowerCase().includes('boat') && !name.toLowerCase().includes('oyo') && !name.toLowerCase().includes('flipkart')) {
        name += ' Ltd';
    }
    if (name.toLowerCase() === 'boat') name = 'boAt';
    if (name.toLowerCase() === 'oyo') name = 'OYO';
    if (name.toLowerCase() === 'flipkart') name = 'Flipkart';
    if (name.toLowerCase() === 'nse ipo') name = 'National Stock Exchange';

    const logoText = name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const isSme = !['boat', 'oyo', 'flipkart', 'nse_ipo', 'bajaj_energy', 'fabindia', 'hexagon_nutrition'].includes(ipoId);
    const category = isSme ? "SME" : "MAINBOARD";
    const sector = isSme ? "MANUFACTURING & SERVICES" : "TECHNOLOGY & DIVERSIFIED";

    // Pricing fallbacks
    let priceRange = "₹120.00 - ₹128.00";
    let lotSize = "1000 Shares";
    let issueSize = "₹250 Cr";
    let minInv = "₹1,28,000.00 / 1 Lot";
    let maxInv = "₹1,28,000.00 / 1 Lot";

    if (ipoId === 'hexagon_nutrition') {
        priceRange = "₹42.00 - ₹45.00";
        lotSize = "330 Shares";
        issueSize = "₹600.00 Cr";
        minInv = "₹14,850.00 / 1 Lot";
        maxInv = "₹1,93,050.00 / 13 Lots";
    } else if (ipoId === 'merritronix') {
        priceRange = "₹141.00 - ₹149.00";
        lotSize = "1000 Shares";
        issueSize = "₹35.40 Cr";
        minInv = "₹1,49,000.00 / 1 Lot";
        maxInv = "₹1,49,000.00 / 1 Lot";
    } else if (ipoId === 'aureate_tradde') {
        priceRange = "₹70.00 - ₹70.00";
        lotSize = "2000 Shares";
        issueSize = "₹14.00 Cr";
        minInv = "₹1,40,000.00 / 1 Lot";
        maxInv = "₹1,40,000.00 / 1 Lot";
    }

    const retailDetails = {
        priceRange: priceRange,
        lotSize: lotSize,
        discount: "₹0.00",
        minInv: minInv,
        maxInv: maxInv
    };

    const hniDetails = {
        priceRange: priceRange,
        lotSize: lotSize,
        discount: "₹0.00",
        minInv: minInv.includes("To be announced") ? "To be announced" : "₹2,56,000.00 / 2 Lots",
        maxInv: maxInv.includes("To be announced") ? "To be announced" : "₹5,12,000.00 / 4 Lots"
    };

    // Dates fallback
    let starts = "To be announced";
    let ends = "To be announced";
    let allotment = "To be announced";
    let listing = "To be announced";

    if (ipoId === 'hexagon_nutrition') {
        starts = "05 Jun 2026";
        ends = "09 Jun 2026";
        allotment = "12 Jun 2026";
        listing = "15 Jun 2026";
    } else if (ipoId === 'merritronix') {
        starts = "01 Jun 2026";
        ends = "04 Jun 2026";
        allotment = "05 Jun 2026";
        listing = "09 Jun 2026";
    } else if (ipoId === 'aureate_tradde') {
        starts = "29 May 2026";
        ends = "03 Jun 2026";
        allotment = "04 Jun 2026";
        listing = "08 Jun 2026";
    } else if (['harikanta', 'yaashvi', 'maniveni', 'biomedica', 'vegorama', 'teamtech', 'nfp_foods', 'bagmane'].includes(ipoId)) {
        starts = "12 May 2026";
        ends = "15 May 2026";
        allotment = "18 May 2026";
        listing = "20 May 2026";
        if (ipoId === 'vegorama') listing = "27 May 2026";
        if (ipoId === 'teamtech') listing = "26 May 2026";
        if (ipoId === 'nfp_foods') listing = "25 May 2026";
        if (ipoId === 'biomedica') listing = "28 May 2026";
    }

    return {
        name: name,
        logoText: logoText,
        logoBg: isSme ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)",
        logoColor: isSme ? "#16a34a" : "#7c3aed",
        category: category,
        sector: sector,
        issueSize: issueSize,
        offerType: category,
        ipoType: "Book Building",
        overallSubscription: isSme ? "1.50x" : "N/A",
        subscriptionDetails: {
            retail: isSme ? "1.80x" : "0.00x",
            hni: isSme ? "1.20x" : "0.00x",
            qib: "0.00x",
            overall: isSme ? "1.50x" : "0.00x"
        },
        dates: { starts, ends, allotment, listing },
        about: `${name} is an enterprise operating within the ${sector.toLowerCase()} sector, working on scaling up market penetration and executing strategic expansion plans.`,
        history: `Incorporated under the provisions of the Companies Act, ${name} has built a solid base of operations and customer trust over the past several fiscal years.`,
        objective: [
            "Finance capital expenditure requirements for business facilities expansion.",
            "Meet working capital demand for general growth expansion.",
            "Fund general corporate operations."
        ],
        investorTypes: {
            Retail: retailDetails,
            HNI: hniDetails
        },
        financials: {
            Profit: { "FY23": "2.10", "FY24": "4.50", "FY25": "7.80" },
            Assets: { "FY23": "15.50", "FY24": "28.90", "FY25": "42.40" },
            Revenue: { "FY23": "25.20", "FY24": "48.40", "FY25": "82.80" }
        },
        shareholding: {
            promoterPre: "80.00%",
            promoterPost: "60.00%",
            otherPre: "20.00%",
            otherPost: "40.00%"
        },
        strengths: [
            "Experienced professional promoters and leadership team.",
            "Strong balance sheet with healthy margins."
        ],
        risks: [
            "Vulnerability to general business cycles and raw material inflation."
        ],
        faqs: [
            {
                q: `What does ${name} do?`,
                a: `${name} provides specialized services and high-quality products to corporate and individual clients in the ${sector.toLowerCase()} space.`
            }
        ]
    };
}

function showIpoDetails(ipoId) {
    activeIpoId = ipoId;
    activeInvestorType = 'HNI'; // Selected HNI by default to match image
    activeFinancialTab = 'Profit';
    activeSrTab = 'strengths';

    let modal = document.getElementById('ipo-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ipo-details-modal';
        modal.className = 'ipo-modal-overlay';
        modal.innerHTML = `
            <div class="ipo-modal-content">
                <div class="ipo-modal-body" id="ipo-modal-body-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeIpoDetails();
        });
    }

    // Override modal content background to match Groww grey background
    const modalContent = modal.querySelector('.ipo-modal-content');
    if (modalContent) {
        modalContent.style.background = '#f8fafc';
        modalContent.style.padding = '20px';
    }

    const ipo = getIpoDetailsFromDb(ipoId);
    const bodyContent = document.getElementById('ipo-modal-body-content');
    const isApplied = checkIsIpoApplied(ipoId);

    // Bidding close status or generic status
    let biddingClosesLabel = "";
    let isBiddingOpen = false;
    if (ipoId === 'smr_jewels' || ipoId === 'rajnandini_fashion') {
        biddingClosesLabel = "Bidding closes tomorrow";
        isBiddingOpen = true;
    } else if (ipoId === 'aureate_tradde') {
        biddingClosesLabel = "Bidding starts tomorrow";
        isBiddingOpen = false;
    } else if (ipo.dates.starts === "To be announced") {
        biddingClosesLabel = "Upcoming IPO";
        isBiddingOpen = false;
    } else {
        const isClosed = ['harikanta', 'yaashvi', 'maniveni', 'biomedica', 'vegorama', 'teamtech', 'nfp_foods', 'bagmane'].includes(ipoId);
        biddingClosesLabel = isClosed ? "Bidding Closed" : `Starts on ${ipo.dates.starts}`;
        isBiddingOpen = false;
    }

    const currentInv = ipo.investorTypes.HNI; // Defaults to HNI to match screenshot

    bodyContent.innerHTML = `
        <!-- Card 1: Main info & Metrics -->
        <div class="ipo-modal-card">
            <!-- Header Row -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <!-- Logo & Name -->
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="width:48px; height:48px; border-radius:50%; background:${ipo.logoBg}; color:${ipo.logoColor}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.05); font-weight:800; font-size:13px; font-family:var(--font-heading);">
                        ${ipo.logoText}
                    </div>
                    <div>
                        <h2 style="font-size:18px; font-weight:700; color:#0f172a; margin:0;">${ipo.name}</h2>
                        <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                            <span style="font-size:9.5px; font-weight:700; color:#7c3aed; background:#f5f3ff; border:1px solid #ede9fe; padding:1px 6px; border-radius:3px; text-transform:uppercase;">${ipo.category}</span>
                            <span style="font-size:9.5px; font-weight:700; color:#475569; background:#f1f5f9; border:1px solid #e2e8f0; padding:1px 6px; border-radius:3px; text-transform:uppercase;">${ipo.sector}</span>
                        </div>
                    </div>
                </div>
                
                <!-- CTA Button and Close circle button -->
                <div style="display:flex; align-items:center; gap:16px;">
                    ${isBiddingOpen ? `
                        <button class="ipo-modal-cta-apply" onclick="applyForIpo('${ipoId}')" ${isApplied ? 'disabled' : ''} style="background:#2563eb; color:#ffffff; border:none; padding:10px 24px; font-size:12.5px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.15);">
                            ${isApplied ? 'APPLIED' : 'APPLY NOW'}
                        </button>
                    ` : `
                        <button class="ipo-modal-cta-apply" disabled style="background:#e2e8f0; color:#94a3b8; border:none; padding:10px 24px; font-size:12.5px; font-weight:700; border-radius:6px; cursor:not-allowed;">
                            ${biddingClosesLabel}
                        </button>
                    `}
                    <div style="width:1px; height:32px; background:#e2e8f0;"></div>
                    <button class="ipo-close-btn-circle" onclick="closeIpoDetails()" style="width:32px; height:32px; border-radius:50%; border:1px solid #e2e8f0; background:#ffffff; color:#64748b; font-size:18px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;">×</button>
                </div>
            </div>

            <!-- Investor Type Pill selector -->
            <div style="margin-bottom:24px;">
                <div style="font-size:12.5px; font-weight:600; color:#64748b; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                    Investor Type <span style="cursor:help; font-size:12px; color:#94a3b8;">ⓘ</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="pill-Retail" class="investor-pill" onclick="switchIpoInvestorType('Retail')">Retail</button>
                    <button id="pill-HNI" class="investor-pill active" onclick="switchIpoInvestorType('HNI')">HNI</button>
                </div>
            </div>

            <!-- Metrics Table Grid -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; border-bottom:1px solid #f1f5f9; padding-bottom:20px; margin-bottom:20px;">
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Bid Price Range</div>
                    <div id="ipo-detail-priceRange" style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${currentInv.priceRange}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Lot Size</div>
                    <div id="ipo-detail-lotSize" style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${currentInv.lotSize}</div>
                </div>
                <div>
                    <div id="ipo-detail-discount-label" style="font-size:12px; color:#94a3b8; margin-bottom:4px;">HNI Discount</div>
                    <div id="ipo-detail-discount" style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${currentInv.discount}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Issue Size</div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${ipo.issueSize}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Offer Type</div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px;">${ipo.offerType}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">IPO Type</div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px;">${ipo.ipoType}</div>
                </div>
            </div>

            <!-- Min / Max Investment Limits -->
            <div style="display:flex; gap:40px; margin-bottom:20px;">
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Minimum Investment</div>
                    <div id="ipo-detail-minInv" style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${currentInv.minInv}</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Maximum Investment</div>
                    <div id="ipo-detail-maxInv" style="font-weight:700; color:#0f172a; font-size:14px; font-family:var(--font-mono);">${currentInv.maxInv}</div>
                </div>
            </div>

            <!-- Soft pink/red warning banner -->
            ${isBiddingOpen ? `
                <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; padding:10px; display:flex; align-items:center; justify-content:center; gap:6px; color:#b91c1c; font-weight:600; font-size:13px;">
                    <span>🕒</span> ${biddingClosesLabel}
                </div>
            ` : ''}
        </div>

        <!-- Card 2: Important Dates -->
        <div class="ipo-modal-card">
            <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:4px;">Important Dates</h3>
            <p style="font-size:12px; color:#64748b; margin-bottom:24px; margin-top:0;">Important dates with respect to IPO allotment and listing</p>
            
            <!-- Horizontal Timeline matching Image 2 -->
            <div style="display:flex; justify-content:space-between; align-items:center; position:relative; margin-top:20px; padding:0 24px;">
                <!-- progress line background -->
                <div style="position:absolute; top:12px; left:24px; right:24px; height:3px; background:#e2e8f0; z-index:1;"></div>
                <!-- active progress line -->
                <div id="timeline-active-line" style="position:absolute; top:12px; left:24px; width:${ipoId === 'smr_jewels' || ipoId === 'rajnandini_fashion' ? '33%' : '0%'}; height:3px; background:#10b981; z-index:1;"></div>
                
                <!-- Node 1: Offer Starts -->
                <div style="display:flex; flex-direction:column; align-items:center; z-index:2; width:70px; text-align:center;">
                    <div style="width:24px; height:24px; border-radius:50%; background:#ecfdf5; border:2px solid #10b981; display:flex; align-items:center; justify-content:center; color:#10b981; font-size:11px; margin-bottom:8px; font-weight:bold;">✓</div>
                    <span style="font-size:11.5px; font-weight:600; color:#475569;">Offer Starts</span>
                    <span style="font-size:11px; font-weight:700; color:#0f172a; font-family:var(--font-mono); margin-top:4px; white-space:nowrap;">${ipo.dates.starts}</span>
                </div>
                
                <!-- Node 2: Offer Ends -->
                <div style="display:flex; flex-direction:column; align-items:center; z-index:2; width:70px; text-align:center;">
                    <div style="width:24px; height:24px; border-radius:50%; background:#ffffff; border:4px solid #2563eb; display:flex; align-items:center; justify-content:center; color:#2563eb; font-size:11px; margin-bottom:8px; font-weight:bold;"></div>
                    <span style="font-size:11.5px; font-weight:600; color:#0f172a; font-weight:700;">Offer Ends</span>
                    <span style="font-size:11px; font-weight:700; color:#0f172a; font-family:var(--font-mono); margin-top:4px; white-space:nowrap;">${ipo.dates.ends}</span>
                </div>
                
                <!-- Node 3: Allotment -->
                <div style="display:flex; flex-direction:column; align-items:center; z-index:2; width:70px; text-align:center;">
                    <div style="width:16px; height:16px; border-radius:50%; background:#ffffff; border:3px solid #cbd5e1; display:flex; align-items:center; justify-content:center; margin-bottom:12px;"></div>
                    <span style="font-size:11.5px; font-weight:600; color:#64748b;">Allotment</span>
                    <span style="font-size:11px; font-weight:700; color:#64748b; font-family:var(--font-mono); margin-top:4px; white-space:nowrap;">${ipo.dates.allotment}</span>
                </div>
                
                <!-- Node 4: Listing -->
                <div style="display:flex; flex-direction:column; align-items:center; z-index:2; width:70px; text-align:center;">
                    <div style="width:16px; height:16px; border-radius:50%; background:#ffffff; border:3px solid #cbd5e1; display:flex; align-items:center; justify-content:center; margin-bottom:12px;"></div>
                    <span style="font-size:11.5px; font-weight:600; color:#64748b;">Listing</span>
                    <span style="font-size:11px; font-weight:700; color:#64748b; font-family:var(--font-mono); margin-top:4px; white-space:nowrap;">${ipo.dates.listing}</span>
                </div>
            </div>
        </div>

        <!-- Card 3: Subscription Banner -->
        <div class="download-card" style="margin-bottom:16px;" onclick="alert('Subscription details:\\nRetail: ${ipo.subscriptionDetails.retail}\\nHNI: ${ipo.subscriptionDetails.hni}\\nQIB: ${ipo.subscriptionDetails.qib}')">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:#e0f2fe; color:#0369a1; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; text-transform:uppercase;">DAY 2</span>
                <span style="font-weight:700; color:#0f172a; font-size:13px;">Overall Subscription</span>
                <span style="color:#10b981; font-weight:700; font-family:var(--font-mono); font-size:13px; margin-left:4px;">${ipo.overallSubscription}</span>
            </div>
            <span style="color:#94a3b8; font-weight:bold; font-size:14px;">&gt;</span>
        </div>

        <!-- Card 4: About the Company -->
        <div class="ipo-modal-card">
            <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">About the Company</h3>
            <p style="font-size:13px; color:#475569; line-height:1.6; margin-bottom:20px;">${ipo.about}</p>
            
            ${ipo.history ? `
                <h4 style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:8px;">Company History</h4>
                <p style="font-size:13px; color:#475569; line-height:1.6; margin-bottom:20px;">${ipo.history}</p>
            ` : ''}
            
            ${ipo.objective ? `
                <h4 style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:8px;">Objective of the issue</h4>
                <ul style="padding-left:20px; margin:0; display:flex; flex-direction:column; gap:8px;">
                    ${ipo.objective.map(obj => `<li style="font-size:13px; color:#475569; line-height:1.5;">${obj}</li>`).join('')}
                </ul>
            ` : ''}
        </div>

        <!-- Card 5: Financials -->
        <div class="ipo-modal-card">
            <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">Financials</h3>
            
            <!-- Horizontal Tabs -->
            <div style="display:flex; justify-content:center; gap:24px; border-bottom:1px solid #e2e8f0; margin-bottom:20px;">
                <button id="fin-tab-Profit" class="fin-tab active" onclick="switchIpoFinancialsTab('Profit')">Profit (₹ Cr)</button>
                <button id="fin-tab-Assets" class="fin-tab" onclick="switchIpoFinancialsTab('Assets')">Total Assets (₹ Cr)</button>
                <button id="fin-tab-Revenue" class="fin-tab" onclick="switchIpoFinancialsTab('Revenue')">Total Revenue (₹ Cr)</button>
            </div>
            
            <!-- Chart Container -->
            <div id="ipo-financials-chart" style="position:relative; min-height:150px;"></div>
        </div>

        <!-- Cards Row 1: Split Shareholding and Strengths/Risks -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
            <!-- Left: Shareholding Pattern Card -->
            <div class="ipo-modal-card" style="margin-bottom:0;">
                <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">Shareholding Pattern</h3>
                
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Promoters -->
                    <div>
                        <div style="font-size:12.5px; font-weight:600; color:#475569; margin-bottom:6px;">Promoters</div>
                        <!-- Pre (Blue) -->
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <div style="flex:1; background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="width:${ipo.shareholding.promoterPre}; background:#2563eb; height:100%;"></div>
                            </div>
                            <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; width:45px; text-align:right;">${ipo.shareholding.promoterPre}</span>
                        </div>
                        <!-- Post (Orange) -->
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="width:${ipo.shareholding.promoterPost}; background:#f59e0b; height:100%;"></div>
                            </div>
                            <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; width:45px; text-align:right;">${ipo.shareholding.promoterPost}</span>
                        </div>
                    </div>
                    
                    <!-- Others -->
                    <div>
                        <div style="font-size:12.5px; font-weight:600; color:#475569; margin-bottom:6px;">Others</div>
                        <!-- Pre (Blue) -->
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <div style="flex:1; background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="width:${ipo.shareholding.otherPre}; background:#2563eb; height:100%;"></div>
                            </div>
                            <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; width:45px; text-align:right;">${ipo.shareholding.otherPre}</span>
                        </div>
                        <!-- Post (Orange) -->
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="width:${ipo.shareholding.otherPost}; background:#f59e0b; height:100%;"></div>
                            </div>
                            <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; width:45px; text-align:right;">${ipo.shareholding.otherPost}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Legend -->
                <div style="display:flex; justify-content:center; gap:16px; margin-top:20px; font-size:11.5px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#2563eb; display:inline-block;"></span>
                        <span style="color:#64748b; font-weight:600;">Pre-Issue</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#f59e0b; display:inline-block;"></span>
                        <span style="color:#64748b; font-weight:600;">Post-Issue</span>
                    </div>
                </div>
            </div>
            
            <!-- Right: Strengths & Risks Card -->
            <div class="ipo-modal-card" style="margin-bottom:0; display:flex; flex-direction:column;">
                <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">Strengths & Risks</h3>
                
                <!-- Badge Tabs -->
                <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:16px;">
                    <button id="sr-tab-strengths" class="sr-tab active" onclick="switchSrTab('strengths')">
                        Strengths <span class="sr-badge strengths">${ipo.strengths.length}</span>
                    </button>
                    <button id="sr-tab-risks" class="sr-tab" onclick="switchSrTab('risks')">
                        Risks <span class="sr-badge risks">${ipo.risks.length}</span>
                    </button>
                </div>
                
                <!-- Dynamic List Content -->
                <div id="sr-tab-content" style="flex:1;"></div>
            </div>
        </div>

        <!-- Cards Row 2: Split FAQs and Company Report -->
        <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px;">
            <!-- Left: FAQs Card -->
            <div class="ipo-modal-card" style="margin-bottom:0;">
                <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">Frequently Asked Questions</h3>
                
                <div class="faq-accordion" style="border:none; border-radius:0;">
                    ${ipo.faqs.map((f, idx) => `
                        <div class="faq-item" style="border-bottom:1px solid #f1f5f9; padding:12px 0;">
                            <div class="faq-header" onclick="toggleIpoModalFaq(this)" style="padding:0; background:transparent; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:600; font-size:13px; color:#1e293b; text-align:left; line-height:1.4;">${f.q}</span>
                                <span class="faq-chevron" style="font-size:10px; color:#94a3b8; transition:transform 0.2s;">▼</span>
                            </div>
                            <div class="faq-body" style="display:none; padding:10px 0 0; background:transparent; font-size:12.5px; color:#475569; line-height:1.5; border-top:none;">
                                <p style="margin:0;">${f.a}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Right: Company Report Card -->
            <div class="ipo-modal-card" style="margin-bottom:0;">
                <h3 style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:16px;">Company Report</h3>
                
                <div class="download-card" onclick="downloadRhp('${ipoId}')">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <!-- Red/White PDF Card Icon -->
                        <div style="width:36px; height:42px; background:#fee2e2; border-radius:4px; border:1px solid #fecaca; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; flex-shrink:0;">
                            <span style="font-size:8px; font-weight:900; color:#ef4444; text-transform:uppercase; font-family:var(--font-heading);">PDF</span>
                            <div style="width:20px; height:2px; background:#ef4444; margin-top:3px; border-radius:1px;"></div>
                            <div style="width:14px; height:2px; background:#ef4444; margin-top:2px; border-radius:1px;"></div>
                        </div>
                        <div>
                            <div style="font-weight:700; color:#1e293b; font-size:12.5px; line-height:1.3;">${ipo.logoText} Company Report</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">Download RHP</div>
                        </div>
                    </div>
                    <!-- Download Blue Icon -->
                    <span style="color:#2563eb; font-weight:bold; font-size:16px; cursor:pointer;" title="Download RHP">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                    </span>
                </div>
            </div>
        </div>
    `;

    // Render Strengths list initially
    renderSrListContent('strengths');

    // Draw initial financials chart
    renderFinancialsChart('Profit', ipo.financials.Profit);

    // Show Modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeIpoDetails() {
    const modal = document.getElementById('ipo-details-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        activeIpoId = null;
    }
}

function switchIpoInvestorType(type) {
    if (activeInvestorType === type) return;
    activeInvestorType = type;

    document.getElementById('pill-Retail').classList.remove('active');
    document.getElementById('pill-HNI').classList.remove('active');
    document.getElementById(`pill-${type}`).classList.add('active');

    const ipo = getIpoDetailsFromDb(activeIpoId);
    const invInfo = ipo.investorTypes[type];

    document.getElementById('ipo-detail-priceRange').innerText = invInfo.priceRange;
    document.getElementById('ipo-detail-lotSize').innerText = invInfo.lotSize;
    document.getElementById('ipo-detail-discount').innerText = invInfo.discount;
    document.getElementById('ipo-detail-minInv').innerText = invInfo.minInv;
    document.getElementById('ipo-detail-maxInv').innerText = invInfo.maxInv;

    // Update discount label
    document.getElementById('ipo-detail-discount-label').innerText = `${type} Discount`;
}

function switchIpoFinancialsTab(financialType) {
    if (activeFinancialTab === financialType) return;
    activeFinancialTab = financialType;

    const tabs = document.querySelectorAll('.fin-tab');
    tabs.forEach(t => t.classList.remove('active'));

    // Find matching by text content since id doesn't cover total strings
    const tabEl = Array.from(tabs).find(t => t.innerText.includes(financialType));
    if (tabEl) tabEl.classList.add('active');

    const ipo = getIpoDetailsFromDb(activeIpoId);
    renderFinancialsChart(financialType, ipo.financials[financialType]);
}

function renderFinancialsChart(financialType, financialsData) {
    const chartContainer = document.getElementById('ipo-financials-chart');
    if (!chartContainer) return;

    const years = Object.keys(financialsData);
    const valuesStr = Object.values(financialsData);

    const values = valuesStr.map(str => {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    });

    const maxVal = Math.max(...values, 1);

    let html = `
        <div style="position:relative; margin-top:20px; padding:20px 10px 10px;">
            <!-- Asterisk top right -->
            <span style="position:absolute; top:0; right:10px; font-size:13px; color:#94a3b8; font-weight:bold;">*</span>
            
            <!-- Chart Wrapper with horizontal baseline -->
            <div style="display:flex; align-items:flex-end; justify-content:space-around; height:120px; border-bottom:1.5px solid #cbd5e1; position:relative; padding-bottom:2px; margin-bottom:28px;">
    `;

    years.forEach((year, index) => {
        const valStr = valuesStr[index];
        const val = values[index];
        const heightPct = Math.max(12, (val / maxVal) * 100);

        html += `
            <div style="display:flex; flex-direction:column; align-items:center; width:65px; height:100%; justify-content:flex-end; position:relative;">
                <!-- Value directly on top of bar -->
                <span style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px; font-family:var(--font-mono);">${valStr}</span>
                
                <!-- Bar (Thin blue cylinder) -->
                <div style="width:32px; height:${heightPct}%; background:#2563eb; border-radius:4px 4px 0 0; transition:all 0.3s ease; box-shadow: 0 2px 4px rgba(37,99,235,0.15);" class="ipo-chart-bar-hover"></div>
                
                <!-- Year label below baseline -->
                <span style="position:absolute; bottom:-24px; font-size:11.5px; font-weight:700; color:#64748b; font-family:var(--font-main);">${year}</span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;
    chartContainer.innerHTML = html;
}

function switchSrTab(type) {
    if (activeSrTab === type) return;
    activeSrTab = type;

    document.getElementById('sr-tab-strengths').classList.remove('active');
    document.getElementById('sr-tab-risks').classList.remove('active');
    document.getElementById(`sr-tab-${type}`).classList.add('active');

    renderSrListContent(type);
}

function renderSrListContent(type) {
    const container = document.getElementById('sr-tab-content');
    if (!container) return;

    const ipo = getIpoDetailsFromDb(activeIpoId);
    const list = type === 'strengths' ? ipo.strengths : ipo.risks;

    // Style matches circular icons on the left
    let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;

    list.forEach(item => {
        if (type === 'strengths') {
            html += `
                <div style="display:flex; gap:12px; align-items:flex-start;">
                    <!-- Circular thumbs-up icon outline style -->
                    <div style="width:24px; height:24px; border-radius:50%; background:#ecfdf5; color:#10b981; border:1px solid #a7f3d0; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; transform: translateY(2px);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a9.84 9.84 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.53.16 1.162-.234 1.733.058.119.103.242.138.363.077.27.113.567.113.856 0 .289-.036.586-.113.856-.039.135-.09.273-.16.404.167.332.235.718.178 1.102-.035.233-.105.471-.21.689-.105.216-.252.416-.456.574-.29.226-.695.34-1.072.352H6.957a1.5 1.5 0 0 1-1.302-.756l-3.35-6a1.5 1.5 0 0 1 .15-1.542l.446-.532A4.1 4.1 0 0 1 5.6 4h.018l.19-.38a.5.5 0 0 0-.01-.486L5.617 2.9A1.5 1.5 0 0 1 6.956 1.745z"/>
                        </svg>
                    </div>
                    <span style="font-size:12.5px; color:#475569; line-height:1.5;">${item}</span>
                </div>
            `;
        } else {
            html += `
                <div style="display:flex; gap:12px; align-items:flex-start;">
                    <!-- Circular warning icon outline style -->
                    <div style="width:24px; height:24px; border-radius:50%; background:#fff5f5; color:#ef4444; border:1px solid #fecaca; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; transform: translateY(2px);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                        </svg>
                    </div>
                    <span style="font-size:12.5px; color:#475569; line-height:1.5;">${item}</span>
                </div>
            `;
        }
    });

    html += `</div>`;
    container.innerHTML = html;
}

function downloadRhp(ipoId) {
    const ipo = getIpoDetailsFromDb(ipoId);
    showToast(`Downloading ${ipo.name} RHP prospectus...`, 'success');
}

function toggleIpoModalFaq(header) {
    const faqItem = header.parentElement;
    const faqBody = faqItem.querySelector('.faq-body');
    const isShowing = faqBody.style.display === 'block';

    faqBody.style.display = isShowing ? 'none' : 'block';
    faqItem.classList.toggle('active', !isShowing);
}

function checkIsIpoApplied(ipoId) {
    const appliedStr = localStorage.getItem('applied_ipos');
    if (!appliedStr) return false;
    const applied = JSON.parse(appliedStr);
    return applied.some(app => app.ipoId === ipoId);
}

function applyForIpo(ipoId) {
    if (checkIsIpoApplied(ipoId)) {
        return showToast('You have already applied for this IPO.', 'error');
    }

    const ipo = getIpoDetailsFromDb(ipoId);

    // Determine details
    const lots = activeInvestorType === 'Retail' ? 1 : 2;
    const invInfo = ipo.investorTypes[activeInvestorType];
    const confirmMsg = `Apply for ${ipo.name} IPO?\nInvestor Type: ${activeInvestorType}\nLots: ${lots} (${invInfo.lotSize} per lot)\nTotal Amount: ${invInfo.minInv.split(' / ')[0]}`;

    if (confirm(confirmMsg)) {
        const appliedStr = localStorage.getItem('applied_ipos') || '[]';
        const applied = JSON.parse(appliedStr);

        const todayStr = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        applied.push({
            ipoId: ipoId,
            investorType: activeInvestorType,
            lots: lots,
            appliedAt: todayStr
        });

        localStorage.setItem('applied_ipos', JSON.stringify(applied));

        showToast(`Applied successfully for ${ipo.name}! ID: RP-IPO-${Math.floor(1000 + Math.random() * 9000)}`, 'success');

        // Update Action Button
        const btn = document.getElementById('ipo-apply-action-btn');
        if (btn) {
            btn.innerText = 'Applied (Pending Allotment)';
            btn.disabled = true;
        }

        // Refresh cards and list
        renderAppliedIpos();
        updateIpoStatusBadges();
    }
}

function renderAppliedIpos() {
    const pane = document.getElementById('ipo-pane-my-apps');
    if (!pane) return;

    const appliedStr = localStorage.getItem('applied_ipos');
    if (!appliedStr) {
        pane.innerHTML = `
            <span style="font-size:36px; display:block; margin-bottom:12px;">📂</span>
            <h3 style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">No IPO Applications Yet</h3>
            <p style="color:var(--text-muted); font-size:13px;">Any IPOs you apply for will be listed here with status tracking.</p>
        `;
        return;
    }

    const applied = JSON.parse(appliedStr);
    if (applied.length === 0) {
        pane.innerHTML = `
            <span style="font-size:36px; display:block; margin-bottom:12px;">📂</span>
            <h3 style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">No IPO Applications Yet</h3>
            <p style="color:var(--text-muted); font-size:13px;">Any IPOs you apply for will be listed here with status tracking.</p>
        `;
        return;
    }

    let html = `
        <div style="text-align:left; max-width:600px; margin:0 auto;">
            <h3 style="font-weight:700; color:var(--text-primary); margin-bottom:16px;">Your Active Applications</h3>
    `;

    applied.forEach(app => {
        const ipo = getIpoDetailsFromDb(app.ipoId);
        const invInfo = ipo.investorTypes[app.investorType] || ipo.investorTypes.Retail;
        const totalCost = invInfo.minInv.split(' / ')[0];

        html += `
            <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="showIpoDetails('${app.ipoId}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:50%; background:${ipo.logoBg}; color:${ipo.logoColor}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px;">
                        ${ipo.logoText}
                    </div>
                    <div>
                        <h4 style="font-weight:700; color:var(--text-primary); font-size:13.5px; margin:0;">${ipo.name}</h4>
                        <p style="color:var(--text-secondary); font-size:11px; margin-top:2px;">
                            ${app.investorType} • ${app.lots} Lot${app.lots > 1 ? 's' : ''} (${totalCost}) • Applied ${app.appliedAt}
                        </p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span style="background:var(--cyan-glow); color:var(--cyan); border:1px solid rgba(99,102,241,0.15); font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:12px; text-transform:uppercase;">
                        Applied
                    </span>
                    <p style="color:var(--text-muted); font-size:10px; margin-top:4px;">Allotment on ${ipo.dates.allotment}</p>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    pane.innerHTML = html;
}

// (updateIpoStatusBadges defined below, along with final DOMContentLoaded initializer)

function updateIpoStatusBadges() {
    const cards = document.querySelectorAll('.ipo-card-interactive');
    cards.forEach(card => {
        const onclickAttr = card.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('showIpoDetails')) {
            const match = onclickAttr.match(/showIpoDetails\('([^']+)'\)/);
            if (match) {
                const ipoId = match[1];
                if (checkIsIpoApplied(ipoId)) {
                    const btn = card.querySelector('.ipo-apply-btn');
                    if (btn) {
                        btn.innerText = 'APPLIED';
                        btn.style.background = 'var(--cyan-glow)';
                        btn.style.color = 'var(--cyan)';
                        btn.style.borderColor = 'rgba(99,102,241,0.15)';
                    }
                }
            }
        }
    });
}

// Dynamic logo updater for list cards on page load
function initializeLogoImages() {
    const cards = document.querySelectorAll('.ipo-card-interactive, .ipo-card-main');
    cards.forEach(card => {
        const onclickAttr = card.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('showIpoDetails')) {
            const match = onclickAttr.match(/showIpoDetails\('([^']+)'\)/);
            if (match) {
                const ipoId = match[1];
                const ipo = getIpoDetailsFromDb(ipoId);
                const logoContainer = card.querySelector('.ipo-logo') || card.querySelector('div[style*="border-radius:50%"]');
                if (logoContainer && ipo) {
                    const originalHtml = logoContainer.innerHTML;
                    const logoUrl = ipo.logoUrl || (ipo.domain ? `https://logo.clearbit.com/${ipo.domain}` : null);
                    if (logoUrl) {
                        logoContainer.style.background = 'none';
                        logoContainer.style.border = '1px solid rgba(0,0,0,0.05)';
                        logoContainer.style.padding = '0';
                        logoContainer.style.overflow = 'hidden';
                        logoContainer.style.display = 'flex';
                        logoContainer.style.alignItems = 'center';
                        logoContainer.style.justifyContent = 'center';

                        logoContainer.innerHTML = `
                            <img src="${logoUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width:100%; height:100%; object-fit:cover;" alt="${ipo.name}">
                            <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; background:${ipo.logoBg || 'var(--cyan-glow)'}; color:${ipo.logoColor || 'var(--cyan)'}; font-weight:700; font-size:11px;">
                                ${ipo.logoText || originalHtml}
                            </div>
                        `;
                    }
                }
            }
        }
    });
}

// Dynamic Mobile Menu setup for full responsiveness
function setupMobileMenu() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    // 1. Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-menu-toggle';
    hamburger.innerHTML = '☰';
    hamburger.setAttribute('aria-label', 'Open Menu');
    topBar.appendChild(hamburger);

    // 2. Create mobile drawer layout
    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';

    const overlay = document.createElement('div');
    overlay.className = 'mobile-drawer-overlay';

    // 3. Clone existing navigation links
    const desktopLinks = topBar.querySelector('.nav-links');
    let clonedLinksHtml = '';
    if (desktopLinks) {
        const links = desktopLinks.querySelectorAll('a');
        links.forEach(link => {
            const activeClass = link.classList.contains('active') ? 'class="active"' : '';
            clonedLinksHtml += `<a href="${link.getAttribute('href')}" ${activeClass}>${link.innerHTML}</a>`;
        });
    } else {
        // Fallback standard links if none found on current page
        clonedLinksHtml = `
            <a href="/">Dashboard</a>
            <a href="/portfolio">Portfolio</a>
            <a href="/watchlist">Watchlist</a>
            <a href="/algo_trading">Algo Trading</a>
            <a href="/tutorials">Tutorials</a>
            <a href="/news">News</a>
        `;
    }

    // Check user logged in status from page markup
    const userOptions = topBar.querySelector('.user-options');
    const isLogoutBtn = userOptions && (userOptions.innerHTML.toLowerCase().includes('logout') || userOptions.innerHTML.includes('/logout'));
    let footerHtml = '';
    if (isLogoutBtn) {
        footerHtml = `<a href="/logout" style="background:var(--red-dim); color:var(--red);">Logout</a>`;
    } else {
        footerHtml = `
            <a href="/auth?mode=login" style="background:var(--border-light); color:var(--text-secondary);">Login</a>
            <a href="/auth?mode=signup" style="background:var(--cyan); color:#ffffff; font-weight:700;">Sign Up</a>
        `;
    }

    // 4. Fill drawer contents
    drawer.innerHTML = `
        <div class="mobile-drawer-header">
            <a href="/" class="logo" style="text-decoration:none;"><span>RP</span> Finance</a>
            <button class="mobile-drawer-close" aria-label="Close Menu">✕</button>
        </div>
        <div class="mobile-drawer-links">
            ${clonedLinksHtml}
        </div>
        <div class="mobile-drawer-footer">
            ${footerHtml}
        </div>
    `;

    document.body.appendChild(drawer);
    document.body.appendChild(overlay);

    // 5. Toggle drawer handlers
    const closeBtn = drawer.querySelector('.mobile-drawer-close');

    function openMenu() {
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // prevent page scroll
    }

    function closeMenu() {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    renderAppliedIpos();
    updateIpoStatusBadges();
    initializeLogoImages();
    setupMobileMenu();
});
