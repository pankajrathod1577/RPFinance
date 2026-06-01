from flask import Flask, render_template, request, session, redirect, url_for, jsonify
import sqlite3
import requests
import time
from nlp_chatbot import Chatbot
from flask_session import Session

# ── Ticker normalization & Indian Stocks Live Feed ───────────────────────────
import random
import os
import threading
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Auto-detection for PythonAnywhere Free Tier (Offline/Simulated Mode) ──────
USE_SIMULATED_DATA = False

def check_external_apis():
    global USE_SIMULATED_DATA
    # Force simulated mode if running on Render or other known cloud providers
    if os.environ.get('RENDER') or os.environ.get('PYTHON_ANYWHERE') or os.environ.get('VERCEL') or os.environ.get('HEROKU') or os.environ.get('PORT'):
        USE_SIMULATED_DATA = True
        print("Cloud deployment detected via environment variables. Forcing Simulated Mode.")
        return
        
    try:
        resp = requests.get("https://httpbin.org/get", timeout=3)
        if resp.status_code == 200:
            # Check if Yahoo Finance is actually reachable (not blocked/rate-limited)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            yf_resp = requests.get("https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1m&range=1d", headers=headers, timeout=3)
            if yf_resp.status_code == 200:
                res = yf_resp.json()
                meta = res.get('chart', {}).get('result')
                if meta and isinstance(meta, list) and meta[0] is not None:
                    USE_SIMULATED_DATA = False
                    print("Yahoo Finance API is reachable. Real-time mode enabled.")
                    return
            print("Yahoo Finance is blocked/unreachable. Switching to Simulated Mode.")
            USE_SIMULATED_DATA = True
        else:
            USE_SIMULATED_DATA = True
    except Exception:
        USE_SIMULATED_DATA = True

check_external_apis()

INDIAN_COMPANIES = {
    "RELIANCE": "Reliance Industries Ltd",
    "TCS": "Tata Consultancy Services Ltd",
    "INFY": "Infosys Ltd",
    "HDFCBANK": "HDFC Bank Ltd",
    "ICICIBANK": "ICICI Bank Ltd",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel Ltd",
    "LT": "Larsen & Toubro Ltd",
    "ITC": "ITC Ltd",
    "TMCV": "Tata Motors CV Ltd",
    "TMPV": "Tata Motors PV Ltd",
    "AXISBANK": "Axis Bank Ltd",
    "KOTAKBANK": "Kotak Mahindra Bank Ltd",
    "HINDUNILVR": "Hindustan Unilever Ltd",
    "WIPRO": "Wipro Ltd",
    "MARUTI": "Maruti Suzuki India Ltd",
    "BAJFINANCE": "Bajaj Finance Ltd",
    "SUNPHARMA": "Sun Pharmaceutical Industries Ltd",
    "IDEA": "Vodafone Idea Ltd",
    "VBL": "Varun Beverages Ltd",
    "ADANIENT": "Adani Enterprises Ltd",
    "COALINDIA": "Coal India Ltd",
    "HINDALCO": "Hindalco Industries Ltd",
    "HINDZINC": "Hindustan Zinc Ltd",
    "CRUDEOIL": "Crude Oil Commodities",
    "NIFTY50": "NIFTY 50",
    "NIFTYBANK": "NIFTY BANK",
    "SENSEX": "BSE SENSEX",
    "FINNIFTY": "NIFTY FINANCIAL SERVICES",
    "MIDCPNIFTY": "NIFTY MIDCAP SELECT",
    "AUBANK": "AU Small Finance Bank Ltd",
    "TATAMOTOR": "Tata Motors Ltd",
    "TATAMOTORS": "Tata Motors Ltd",
    "SUZLON": "Suzlon Energy Ltd"
}

BASE_PRICES = {
    "RELIANCE": 1359.20,
    "TCS": 2296.50,
    "INFY": 1175.30,
    "HDFCBANK": 785.00,
    "ICICIBANK": 1289.80,
    "SBIN": 968.40,
    "BHARTIARTL": 1863.00,
    "LT": 4044.80,
    "ITC": 301.55,
    "TMCV": 387.70,
    "TMPV": 384.90,
    "AXISBANK": 1297.70,
    "KOTAKBANK": 387.95,
    "HINDUNILVR": 2212.60,
    "WIPRO": 207.05,
    "MARUTI": 13265.00,
    "BAJFINANCE": 939.45,
    "SUNPHARMA": 1834.40,
    "IDEA": 14.10,
    "VBL": 533.90,
    "ADANIENT": 2941.70,
    "COALINDIA": 458.20,
    "HINDALCO": 1120.00,
    "HINDZINC": 651.00,
    "CRUDEOIL": 6800.00,
    "NIFTY50": 22500.00,
    "NIFTYBANK": 48000.00,
    "SENSEX": 74000.00,
    "FINNIFTY": 23500.00,
    "MIDCPNIFTY": 12200.00,
    "AUBANK": 634.00,
    "TATAMOTOR": 950.00,
    "TATAMOTORS": 950.00,
    "SUZLON": 57.53
}

US_BASE_PRICES = {
    "AAPL": 180.00,
    "NVDA": 900.00,
    "INTC": 30.00,
    "IBM": 170.00,
    "MSFT": 420.00,
    "TSLA": 175.00,
    "GOOG": 170.00,
    "GOOGL": 172.00,
    "AMZN": 180.00,
    "META": 475.00,
    "NFLX": 600.00,
    "AMD": 160.00,
    "BABA": 75.00,
    "SPY": 510.00,
    "QQQ": 440.00,
    "DIA": 390.00,
    "IWM": 200.00
}

US_COMPANIES = {
    "AAPL": "Apple Inc.",
    "NVDA": "NVIDIA Corporation",
    "INTC": "Intel Corporation",
    "IBM": "IBM Common Stock",
    "MSFT": "Microsoft Corporation",
    "TSLA": "Tesla, Inc.",
    "GOOG": "Alphabet Inc. Class C",
    "GOOGL": "Alphabet Inc. Class A",
    "AMZN": "Amazon.com, Inc.",
    "META": "Meta Platforms, Inc.",
    "NFLX": "Netflix, Inc.",
    "AMD": "Advanced Micro Devices, Inc.",
    "BABA": "Alibaba Group Holding Ltd",
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco QQQ Trust",
    "DIA": "SPDR Dow Jones Industrial Average ETF",
    "IWM": "iShares Russell 2000 ETF"
}

LIVE_FEED = {}

def to_yf_symbol(ticker):
    """Convert app ticker format (e.g. TCS.NSE) to yfinance format (e.g. TCS.NS)"""
    base = ticker.split('.')[0]
    if base == 'NIFTY50': return '^NSEI'
    if base == 'NIFTYBANK': return '^NSEBANK'
    if base == 'SENSEX': return '^BSESN'
    if base == 'FINNIFTY': return '^CNXFIN'
    if base == 'MIDCPNIFTY': return '^NSEMDCP50'
    if base == 'CRUDEOIL': return 'CL=F'
    
    if ticker.endswith('.NSE'):
        return ticker.replace('.NSE', '.NS')
    elif ticker.endswith('.BSE'):
        return ticker.replace('.BSE', '.BO')
    return ticker

def init_live_feed():
    for sym, base_p in BASE_PRICES.items():
        name = INDIAN_COMPANIES[sym]
        
        # NSE Ticker
        if sym != 'SENSEX':
            nse_ticker = f"{sym}.NSE"
            LIVE_FEED[nse_ticker] = {
                "ticker": nse_ticker,
                "name": f"{name} (NSE)" if sym not in ['NIFTY50', 'NIFTYBANK'] else name,
                "price": base_p,
                "yf_price": base_p,
                "change": 0.0,
                "open": base_p,
                "high": base_p,
                "low": base_p,
                "prev_close": base_p,
                "previous_close": base_p,
                "volume": "1,520,380",
                "low_52week": round(base_p * 0.78, 2),
                "high_52week": round(base_p * 1.22, 2),
                "pe_ratio": "24.50",
                "price_to_book": "3.80",
                "dividend_yield": "1.20%",
                "description": f"{name} is a leading Indian corporation traded on the National Stock Exchange (NSE)." if sym not in ['NIFTY50', 'NIFTYBANK'] else f"{name} is a major Indian stock market index."
            }
        
        # BSE Ticker
        if sym not in ['NIFTY50', 'NIFTYBANK', 'FINNIFTY', 'MIDCPNIFTY']:
            bse_ticker = f"{sym}.BSE"
            bse_p = round(base_p * 0.999, 2)
            LIVE_FEED[bse_ticker] = {
                "ticker": bse_ticker,
                "name": f"{name} (BSE)" if sym != 'SENSEX' else name,
                "price": bse_p,
                "yf_price": bse_p,
                "change": 0.0,
                "open": bse_p,
                "high": bse_p,
                "low": bse_p,
                "prev_close": bse_p,
                "previous_close": bse_p,
                "volume": "830,410",
                "low_52week": round(bse_p * 0.78, 2),
                "high_52week": round(bse_p * 1.22, 2),
                "pe_ratio": "24.40",
                "price_to_book": "3.78",
                "dividend_yield": "1.21%",
                "description": f"{name} is a leading Indian corporation traded on the Bombay Stock Exchange (BSE)." if sym != 'SENSEX' else f"{name} is a major Indian stock market index."
            }
        
    for sym, base_p in US_BASE_PRICES.items():
        name = US_COMPANIES.get(sym, sym)
        LIVE_FEED[sym] = {
            "ticker": sym,
            "name": name,
            "price": base_p,
            "yf_price": base_p,
            "change": 0.0,
            "open": base_p,
            "high": base_p,
            "low": base_p,
            "prev_close": base_p,
            "previous_close": base_p,
            "volume": "12,450,100",
            "low_52week": round(base_p * 0.75, 2),
            "high_52week": round(base_p * 1.25, 2),
            "pe_ratio": "28.50",
            "price_to_book": "6.20",
            "dividend_yield": "0.80%",
            "description": f"{name} is a leading global technology/finance entity traded in the US markets."
        }

init_live_feed()

SIMULATED_MODE_COOLDOWN = 0

def fetch_real_prices():
    """Background task to fetch actual stock prices from yfinance in parallel and update LIVE_FEED."""
    global USE_SIMULATED_DATA, SIMULATED_MODE_COOLDOWN
    if USE_SIMULATED_DATA:
        current_time_bucket = int(time.time() / 5)
        for app_ticker in list(LIVE_FEED.keys()):
            try:
                base_sym = app_ticker.split('.')[0]
                price_base = BASE_PRICES.get(base_sym, US_BASE_PRICES.get(base_sym, 100.0))
                local_rand = random.Random(f"update_feed_{app_ticker}_{current_time_bucket}")
                drift = local_rand.uniform(-0.002, 0.002)
                new_price = round(price_base * (1 + drift), 2)
                prev_close = price_base
                change_pct = round(((new_price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
                LIVE_FEED[app_ticker].update({
                    "price": new_price,
                    "yf_price": new_price,
                    "change": change_pct,
                    "high": round(max(new_price, prev_close) * 1.01, 2),
                    "low": round(min(new_price, prev_close) * 0.99, 2),
                })
            except Exception:
                pass
        return

    yf_tickers = []
    ticker_map = {}
    for app_ticker in list(LIVE_FEED.keys()):
        yf_ticker = to_yf_symbol(app_ticker)
        yf_tickers.append(yf_ticker)
        if yf_ticker not in ticker_map:
            ticker_map[yf_ticker] = []
        ticker_map[yf_ticker].append(app_ticker)

    failed_tickers = []

    def fetch_ticker_data(yf_ticker):
        try:
            # Stagger requests to Yahoo Finance to avoid rate limiting
            time.sleep(random.uniform(0.1, 0.4))
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_ticker}?interval=1m&range=1d"
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code != 200:
                failed_tickers.append(yf_ticker)
                return

            res = r.json()
            result_list = res.get('chart', {}).get('result')
            if not result_list or not isinstance(result_list, list) or result_list[0] is None:
                failed_tickers.append(yf_ticker)
                return
            meta = result_list[0].get('meta', {})
            if not meta:
                failed_tickers.append(yf_ticker)
                return

            app_tickers = ticker_map[yf_ticker]
            ref_ticker = app_tickers[0]

            def to_float(val, default_val=0.0):
                if val is None:
                    return default_val
                try:
                    return float(val)
                except:
                    return default_val

            price = to_float(meta.get('regularMarketPrice'))
            prev_close = to_float(meta.get('previousClose', meta.get('chartPreviousClose')))
            open_val = price
            high_val = to_float(meta.get('regularMarketDayHigh', price))
            low_val = to_float(meta.get('regularMarketDayLow', price))

            # Convert USD crude oil futures to INR
            if yf_ticker == 'CL=F':
                if price > 0 and price < 200.0: price = price * 83.5
                if prev_close > 0 and prev_close < 200.0: prev_close = prev_close * 83.5
                if open_val > 0 and open_val < 200.0: open_val = open_val * 83.5
                if high_val > 0 and high_val < 200.0: high_val = high_val * 83.5
                if low_val > 0 and low_val < 200.0: low_val = low_val * 83.5

            # Keep existing price if API returned 0.0 or failed
            if price == 0.0:
                price = LIVE_FEED.get(ref_ticker, {}).get('price', BASE_PRICES.get(ref_ticker.split('.')[0], 100.0))
            if prev_close == 0.0:
                prev_close = LIVE_FEED.get(ref_ticker, {}).get('prev_close', price)
            if open_val == 0.0:
                open_val = price
            if high_val == 0.0:
                high_val = max(price, LIVE_FEED.get(ref_ticker, {}).get('high', price))
            if low_val == 0.0:
                low_val = min(price, LIVE_FEED.get(ref_ticker, {}).get('low', price))

            vol_raw = meta.get('regularMarketVolume')
            volume_str = f"{int(vol_raw):,}" if vol_raw else LIVE_FEED[ref_ticker]["volume"]

            pe_str = LIVE_FEED[ref_ticker]["pe_ratio"]
            pb_str = LIVE_FEED[ref_ticker]["price_to_book"]
            div_str = LIVE_FEED[ref_ticker]["dividend_yield"]
            desc = LIVE_FEED[ref_ticker]["description"]
            change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0

            low_52 = to_float(meta.get('fiftyTwoWeekLow'), LIVE_FEED[ref_ticker]["low_52week"])
            high_52 = to_float(meta.get('fiftyTwoWeekHigh'), LIVE_FEED[ref_ticker]["high_52week"])
            if yf_ticker == 'CL=F':
                if low_52 > 0 and low_52 < 200.0: low_52 = low_52 * 83.5
                if high_52 > 0 and high_52 < 200.0: high_52 = high_52 * 83.5

            # Thread-safe write to shared LIVE_FEED
            for app_ticker in app_tickers:
                LIVE_FEED[app_ticker].update({
                    "price": price,
                    "yf_price": price,
                    "change": change_pct,
                    "open": open_val,
                    "high": high_val,
                    "low": low_val,
                    "prev_close": prev_close,
                    "previous_close": prev_close,
                    "volume": volume_str,
                    "low_52week": low_52,
                    "high_52week": high_52,
                    "pe_ratio": pe_str,
                    "price_to_book": pb_str,
                    "dividend_yield": div_str,
                    "description": desc
                })
        except Exception as e:
            pass

    # Reduce thread workers to 3 to prevent API rate limiting blocks
    with ThreadPoolExecutor(max_workers=3) as executor:
        executor.map(fetch_ticker_data, list(set(yf_tickers)))

    # If the majority of tickers failed to fetch, set USE_SIMULATED_DATA to True
    unique_yf_tickers = list(set(yf_tickers))
    if unique_yf_tickers and len(failed_tickers) >= len(unique_yf_tickers) * 0.5:
        USE_SIMULATED_DATA = True
        SIMULATED_MODE_COOLDOWN = 10  # Try again after 10 loops (10 minutes)
        print("Yahoo Finance API requests are blocked (likely by Render/cloud provider). Switching to simulated mode.")

def background_price_updater():
    """Loops every 60 seconds to fetch real-time market data in background, with automatic recovery."""
    global USE_SIMULATED_DATA, SIMULATED_MODE_COOLDOWN
    while True:
        try:
            if USE_SIMULATED_DATA:
                # If we are in simulated mode, check if rate limiting block has cleared
                if SIMULATED_MODE_COOLDOWN > 0:
                    SIMULATED_MODE_COOLDOWN -= 1
                else:
                    print("Checking if Yahoo Finance API block has cleared...")
                    try:
                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                        # Query a single major index ticker to test availability
                        r = requests.get("https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1m&range=1d", headers=headers, timeout=5)
                        if r.status_code == 200:
                            USE_SIMULATED_DATA = False
                            print("Successfully recovered from simulated mode! Yahoo Finance API is online.")
                        else:
                            SIMULATED_MODE_COOLDOWN = 10
                            print(f"Yahoo Finance API still offline (status {r.status_code}). Retrying in 10 minutes.")
                    except Exception as ex:
                        SIMULATED_MODE_COOLDOWN = 10
                        print(f"Failed to connect to Yahoo Finance during recovery check: {ex}. Retrying in 10 minutes.")
            fetch_real_prices()
        except Exception as e:
            print(f"Background update error: {e}")
        time.sleep(60)

# Run updater thread
try:
    threading.Thread(target=background_price_updater, daemon=True).start()
except Exception as e:
    print(f'Background thread could not start: {e}')

def is_indian_market_open():
    import datetime
    # Get current time in India (IST = UTC + 5:30)
    tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now_ist = datetime.datetime.now(tz_ist)
    
    # Check weekday (0 = Monday, ..., 6 = Sunday)
    if now_ist.weekday() >= 5:
        return False
        
    # Check time (09:15 to 15:30)
    market_start = now_ist.replace(hour=9, minute=15, second=0, microsecond=0)
    market_end = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
    
    return market_start <= now_ist <= market_end

def update_live_prices():
    """Update live prices from yfinance, or simulate micro-fluctuations if simulated mode is on."""
    if USE_SIMULATED_DATA:
        # Simulate micro-fluctuations at all times to allow local testing and demo
        current_time_bucket = int(time.time() / 5)
        for ticker, data in LIVE_FEED.items():
            try:
                base_sym = ticker.split('.')[0]
                price_base = BASE_PRICES.get(base_sym, US_BASE_PRICES.get(base_sym, 100.0))
                
                # Deterministic seed using ticker and 5-second time bucket for cross-worker stability
                local_rand = random.Random(f"update_feed_{ticker}_{current_time_bucket}")
                
                drift = local_rand.uniform(-0.002, 0.002)
                new_p = round(price_base * (1 + drift), 2)
                prev_close = price_base
                change_pct = round(((new_p - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
                
                data["price"] = new_p
                data["change"] = change_pct
                data["high"] = round(max(new_p, prev_close) * 1.01, 2)
                data["low"] = round(min(new_p, prev_close) * 0.99, 2)
                
                # Base volume from initial feed or default
                vol_base = 100000
                vol_raw = vol_base + local_rand.randint(100, 10000)
                data["volume"] = f"{vol_raw:,}"
            except:
                pass
    else:
        for ticker, data in LIVE_FEED.items():
            yf_price = data.get("yf_price", data["prev_close"])
            prev_close = data.get("prev_close", yf_price)
            
            data["price"] = yf_price
            data["change"] = round(((yf_price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
            data["high"] = max(data["high"], yf_price)
            data["low"] = min(data["low"], yf_price)

def fetch_simulated_ticker(app_ticker):
    """Fallback generator to simulate a single ticker with a realistic base price from BASE_PRICES."""
    try:
        ticker = app_ticker.upper().strip()
        base = ticker.split('.')[0]
        company_name = INDIAN_COMPANIES.get(base, US_COMPANIES.get(base, base))
        is_index = base in ['NIFTY50', 'NIFTYBANK', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY']
        if app_ticker.endswith('.NSE'):
            display_name = f"{company_name} (NSE)" if not is_index else company_name
        elif app_ticker.endswith('.BSE'):
            display_name = f"{company_name} (BSE)" if not is_index else company_name
        else:
            display_name = company_name
        
        # Seed local random generator for consistency
        local_rand = random.Random(f"sim_feed_{ticker}")
        
        # Get base price from BASE_PRICES or US_BASE_PRICES, fallback to 100.0
        price_base = BASE_PRICES.get(base, US_BASE_PRICES.get(base, 100.0))
        
        price = round(price_base * local_rand.uniform(0.98, 1.02), 2)
        prev_close = round(price_base, 2)
        change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
        
        LIVE_FEED[app_ticker] = {
            "ticker": app_ticker,
            "name": display_name,
            "price": price,
            "yf_price": price,
            "change": change_pct,
            "open": prev_close,
            "high": round(max(price, prev_close) * 1.01, 2),
            "low": round(min(price, prev_close) * 0.99, 2),
            "prev_close": prev_close,
            "previous_close": prev_close,
            "volume": f"{local_rand.randint(50000, 1000000):,}",
            "low_52week": round(price_base * 0.75, 2),
            "high_52week": round(price_base * 1.25, 2),
            "pe_ratio": f"{local_rand.uniform(12.0, 35.0):.2f}",
            "price_to_book": f"{local_rand.uniform(1.2, 6.0):.2f}",
            "dividend_yield": f"{local_rand.uniform(0.0, 3.5):.2f}%",
            "description": f"{display_name} stock representational data for offline / cloud environment."
        }
        return True
    except Exception:
        return False

def fetch_and_add_to_live_feed(app_ticker):
    global USE_SIMULATED_DATA
    if USE_SIMULATED_DATA:
        return fetch_simulated_ticker(app_ticker)

    try:
        yf_ticker = to_yf_symbol(app_ticker)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_ticker}?interval=1m&range=1d"
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code != 200:
            # Fall back to simulated data for this ticker only, without setting global USE_SIMULATED_DATA to True!
            return fetch_simulated_ticker(app_ticker)

        res = r.json()
        result_list = res.get('chart', {}).get('result')
        if not result_list or not isinstance(result_list, list) or result_list[0] is None:
            return fetch_simulated_ticker(app_ticker)
            
        meta = result_list[0].get('meta', {})
        if not meta:
            return fetch_simulated_ticker(app_ticker)

        def to_float(val, default_val=0.0):
            if val is None: return default_val
            try: return float(val)
            except: return default_val

        price = to_float(meta.get('regularMarketPrice'))
        if price == 0.0:
            return False

        prev_close = to_float(meta.get('previousClose', meta.get('chartPreviousClose')))
        change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
        name = meta.get('shortName', meta.get('longName', app_ticker))

        # Convert USD crude oil futures to INR
        if yf_ticker == 'CL=F':
            if price > 0 and price < 200.0: price = price * 83.5
            if prev_close > 0 and prev_close < 200.0: prev_close = prev_close * 83.5

        vol_raw = meta.get('regularMarketVolume', 0)

        LIVE_FEED[app_ticker] = {
            "ticker": app_ticker,
            "name": name,
            "price": price,
            "yf_price": price,
            "change": change_pct,
            "open": price,
            "high": to_float(meta.get('regularMarketDayHigh', price)),
            "low": to_float(meta.get('regularMarketDayLow', price)),
            "prev_close": prev_close,
            "previous_close": prev_close,
            "volume": f"{int(vol_raw):,}" if vol_raw else "1,000,000",
            "low_52week": to_float(meta.get('fiftyTwoWeekLow', price * 0.8)),
            "high_52week": to_float(meta.get('fiftyTwoWeekHigh', price * 1.2)),
            "pe_ratio": "20.00",
            "price_to_book": "3.00",
            "dividend_yield": "1.00%",
            "description": f"{name} stock."
        }
        return True
    except Exception as e:
        return False

US_TICKERS = {'AAPL', 'MSFT', 'TSLA', 'GOOG', 'GOOGL', 'NVDA', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'BABA', 'SPY', 'QQQ', 'DIA', 'IWM'}

def normalize_ticker(ticker):
    if not ticker:
        return ""
    ticker = ticker.upper().strip()
    # Normalize old TATAMOTORS to new demerged Commercial Vehicles TMCV
    if ticker.startswith("TATAMOTORS"):
        ticker = ticker.replace("TATAMOTORS", "TMCV")
    # Handle indices default suffix
    if ticker == 'SENSEX':
        return 'SENSEX.BSE'
    if ticker in ['NIFTY50', 'NIFTYBANK']:
        return f"{ticker}.NSE"
    
    # Check if US ticker
    if ticker in US_TICKERS:
        return ticker
        
    # Default to .NSE if no suffix
    if not (ticker.endswith('.NSE') or ticker.endswith('.BSE')):
        ticker = f"{ticker}.NSE"
    return ticker


# ── AI Stock Analysis & Prediction Helpers ───────────────────────────────────
def calculate_rsi(prices, period=14):
    if len(prices) <= period:
        return 50.0
    gains = []
    losses = []
    for i in range(1, len(prices)):
        diff = prices[i] - prices[i-1]
        if diff > 0:
            gains.append(diff)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(diff))
            
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0:
        rsi = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi = 100.0 - (100.0 / (1.0 + rs))
        
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100.0 - (100.0 / (1.0 + rs))
    return round(rsi, 2)

def calculate_ema(prices, span):
    if len(prices) < span:
        return prices
    k = 2.0 / (span + 1.0)
    ema = [prices[0]]
    for p in prices[1:]:
        ema.append(p * k + ema[-1] * (1.0 - k))
    return ema

def calculate_macd(prices):
    if len(prices) < 26:
        return 0.0, 0.0, 0.0
    ema12 = calculate_ema(prices, 12)
    ema26 = calculate_ema(prices, 26)
    macd_line = [e12 - e26 for e12, e26 in zip(ema12, ema26)]
    signal_line = calculate_ema(macd_line, 9)
    hist = macd_line[-1] - signal_line[-1]
    return round(macd_line[-1], 2), round(signal_line[-1], 2), round(hist, 2)

def get_ai_recommendation(prices, short_ma=10, long_ma=50):
    if len(prices) < long_ma:
        return "HOLD", 50.0, 0.0, 0
        
    rsi = calculate_rsi(prices)
    macd_line, signal_line, macd_hist = calculate_macd(prices)
    
    sma_curr = sum(prices[-short_ma:]) / short_ma
    lma_curr = sum(prices[-long_ma:]) / long_ma
    
    ema12 = calculate_ema(prices, 12)
    ema26 = calculate_ema(prices, 26)
    macd_line_seq = [e12 - e26 for e12, e26 in zip(ema12, ema26)]
    signal_line_seq = calculate_ema(macd_line_seq, 9)
    
    macd_cross = 0
    if len(macd_line_seq) >= 3:
        for j in range(-3, 0):
            if macd_line_seq[j] > signal_line_seq[j] and macd_line_seq[j-1] <= signal_line_seq[j-1]:
                macd_cross = 2
                break
            elif macd_line_seq[j] < signal_line_seq[j] and macd_line_seq[j-1] >= signal_line_seq[j-1]:
                macd_cross = -2
                break
                
    score = 0
    if rsi < 30: score += 2
    elif rsi < 40: score += 1
    elif rsi > 70: score -= 2
    elif rsi > 60: score -= 1
    
    score += macd_cross
    if macd_hist > 0: score += 1
    elif macd_hist < 0: score -= 1
    
    if sma_curr > lma_curr: score += 1
    else: score -= 1
    
    if score >= 3:
        rec = "STRONG BUY"
    elif score >= 1:
        rec = "BUY"
    elif score <= -3:
        rec = "STRONG SELL"
    elif score <= -1:
        rec = "SELL"
    else:
        rec = "HOLD"
        
    return rec, rsi, macd_hist, score

def calculate_backtest_accuracy(prices, short_ma=10, long_ma=50):
    if len(prices) < long_ma + 20:
        return 75.0
        
    total_trades = 0
    wins = 0
    
    for t in range(long_ma, len(prices) - 15, 3):
        sub_prices = prices[:t+1]
        rec, _, _, _ = get_ai_recommendation(sub_prices, short_ma, long_ma)
        
        entry_price = prices[t]
        action = None
        if "BUY" in rec:
            action = "BUY"
        elif "SELL" in rec:
            action = "SELL"
            
        if action:
            total_trades += 1
            win = False
            for future_idx in range(t + 1, min(t + 16, len(prices))):
                future_p = prices[future_idx]
                if action == "BUY":
                    if future_p >= entry_price * 1.05:
                        win = True
                        break
                    elif future_p <= entry_price * 0.97:
                        win = False
                        break
                elif action == "SELL":
                    if future_p <= entry_price * 0.95:
                        win = True
                        break
                    elif future_p >= entry_price * 1.03:
                        win = False
                        break
            else:
                final_p = prices[min(t + 15, len(prices) - 1)]
                if action == "BUY" and final_p > entry_price:
                    win = True
                elif action == "SELL" and final_p < entry_price:
                    win = True
                    
            if win:
                wins += 1
                
    if total_trades == 0:
        return 75.0
    return round((wins / total_trades) * 100, 1)

def generate_forecast_path(current_price, target_price, std_dev, steps=20):
    path = [current_price]
    import datetime
    import random
    curr_date = datetime.date.today()
    forecast_data = []
    
    for k in range(1, steps + 1):
        curr_date += datetime.timedelta(days=1)
        while curr_date.weekday() >= 5:
            curr_date += datetime.timedelta(days=1)
            
        date_str = curr_date.strftime('%Y-%m-%d')
        
        remaining_steps = steps - k + 1
        drift = (target_price - path[-1]) / remaining_steps
        noise = path[-1] * random.normalvariate(0, std_dev) * 0.4
        
        next_price = path[-1] + drift + noise
        next_price = max(current_price * 0.6, min(current_price * 1.4, next_price))
        next_price = round(next_price, 2)
        path.append(next_price)
        forecast_data.append({'date': date_str, 'price': next_price})
    return forecast_data


def get_cached_quote(ticker, api_key=None):
    update_live_prices()
    ticker = normalize_ticker(ticker)
    if ticker in LIVE_FEED:
        return LIVE_FEED[ticker]["price"], LIVE_FEED[ticker]["change"]
    if fetch_and_add_to_live_feed(ticker):
        return LIVE_FEED[ticker]["price"], LIVE_FEED[ticker]["change"]
    return 100.0, 0.0

def generate_shareholding_pattern(ticker, insiders_pct=None, institutions_pct=None):
    import random
    local_rand = random.Random(f"shareholding_v2_{ticker}")
    
    p_dec = insiders_pct * 100 if insiders_pct is not None else local_rand.uniform(35.0, 75.0)
    inst_dec = institutions_pct * 100 if institutions_pct is not None else local_rand.uniform(15.0, 45.0)
    
    if p_dec + inst_dec > 95.0:
        scale = 95.0 / (p_dec + inst_dec)
        p_dec *= scale
        inst_dec *= scale
        
    fii_dec = inst_dec * local_rand.uniform(0.40, 0.50)
    mf_dec = inst_dec * local_rand.uniform(0.30, 0.40)
    ins_dec = inst_dec * local_rand.uniform(0.08, 0.15)
    other_dec = inst_dec - (fii_dec + mf_dec + ins_dec)
    if other_dec < 0:
        other_dec = 0.0
        
    pub_dec = 100.0 - (p_dec + fii_dec + mf_dec + ins_dec + other_dec)
    
    dec_vals = {
        "Promoters": round(p_dec, 2),
        "FIIs": round(fii_dec, 2),
        "Mutual Funds": round(mf_dec, 2),
        "Insurance Companies": round(ins_dec, 2),
        "Other DIIs": round(other_dec, 2),
        "Non Institution": round(pub_dec, 2)
    }
    
    sep_vals = {}
    total_sep = 0.0
    for cat, val in dec_vals.items():
        drift = local_rand.uniform(-0.8, 0.8)
        if val < 5.0:
            drift = local_rand.uniform(-0.15, 0.15)
        sep_vals[cat] = max(0.0, val - drift)
        total_sep += sep_vals[cat]
        
    if total_sep > 0:
        for cat in sep_vals:
            sep_vals[cat] = round((sep_vals[cat] / total_sep) * 100.0, 2)
            
    diff_dec = round(100.0 - sum(dec_vals.values()), 2)
    dec_vals["Non Institution"] = round(dec_vals["Non Institution"] + diff_dec, 2)
    
    diff_sep = round(100.0 - sum(sep_vals.values()), 2)
    sep_vals["Non Institution"] = round(sep_vals["Non Institution"] + diff_sep, 2)
    
    changes = {}
    for cat in dec_vals:
        changes[cat] = round(dec_vals[cat] - sep_vals[cat], 2)
        
    return {
        "dec_25": dec_vals,
        "sep_25": sep_vals,
        "changes": changes
    }


STOCK_REAL_DATA = {
    "AUBANK": {
        "sector_rank": "Sector Trend (#41)",
        "market_cap_size": "MID CAP",
        "sector_name": "BANK - PRIVATE",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 45,690 Cr",
        "perf_1yr": "+31.73%",
        "perf_sec": "+54.82%",
        "perf_mkt": "+19.39%",
        "quality_score": 3,
        "quality_text": "AVERAGE",
        "valuation_score": 4,
        "valuation_text": "CHEAP",
        "financial_score": 3,
        "financial_text": "NEUTRAL",
        "cap_struct": "Average",
        "score_growth": "Good",
        "mgmt_risk": "Average",
        "insights_html": "<li>Average quality company exhibiting steady long term performance.</li><li>Size - Ranks in top tier of the Bank - Private sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 35.62,
                "FIIs": 10.87,
                "Mutual Funds": 10.47,
                "Insurance Companies": 2.62,
                "Other DIIs": 2.65,
                "Non Institution": 37.77
            },
            "sep_25": {
                "Promoters": 35.98,
                "FIIs": 10.91,
                "Mutual Funds": 9.80,
                "Insurance Companies": 2.53,
                "Other DIIs": 2.55,
                "Non Institution": 38.23
            },
            "changes": {
                "Promoters": -0.36,
                "FIIs": -0.04,
                "Mutual Funds": 0.67,
                "Insurance Companies": 0.09,
                "Other DIIs": 0.10,
                "Non Institution": -0.46
            }
        }
    },
    "AXISBANK": {
        "sector_rank": "Sector Trend (#16)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "BANK - PRIVATE",
        "short_trend": "mildly positive",
        "long_trend": "mildly positive",
        "market_cap_val": "Rs 4,03,611 Cr",
        "perf_1yr": "9.07%",
        "perf_sec": "-9.31%",
        "perf_mkt": "-3.7%",
        "quality_score": 4,
        "quality_text": "GOOD",
        "valuation_score": 2,
        "valuation_text": "EXPENSIVE",
        "financial_score": 2,
        "financial_text": "EXPENSIVE",
        "cap_struct": "Good",
        "score_growth": "Good",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Good quality company basis long term financial performance.</li><li>Size - Ranks 3rd out of 26 companies in Bank - Private sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 8.15,
                "FIIs": 42.57,
                "Mutual Funds": 33.48,
                "Insurance Companies": 5.04,
                "Other DIIs": 4.13,
                "Non Institution": 6.63
            },
            "sep_25": {
                "Promoters": 8.16,
                "FIIs": 41.89,
                "Mutual Funds": 33.97,
                "Insurance Companies": 4.99,
                "Other DIIs": 3.92,
                "Non Institution": 7.07
            },
            "changes": {
                "Promoters": -0.01,
                "FIIs": 0.68,
                "Mutual Funds": -0.49,
                "Insurance Companies": 0.05,
                "Other DIIs": 0.21,
                "Non Institution": -0.44
            }
        }
    },
    "HDFCBANK": {
        "sector_rank": "Sector Trend (#2)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "BANK - PRIVATE",
        "short_trend": "mildly positive",
        "long_trend": "mildly positive",
        "market_cap_val": "Rs 12,50,450 Cr",
        "perf_1yr": "-8.15%",
        "perf_sec": "-9.31%",
        "perf_mkt": "-3.7%",
        "quality_score": 5,
        "quality_text": "EXCELLENT",
        "valuation_score": 3,
        "valuation_text": "FAIR",
        "financial_score": 4,
        "financial_text": "POSITIVE",
        "cap_struct": "Good",
        "score_growth": "Good",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Excellent quality company basis long term financial performance.</li><li>Size - Ranks 1st out of 26 companies in Bank - Private sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 0.00,
                "FIIs": 52.13,
                "Mutual Funds": 28.45,
                "Insurance Companies": 8.12,
                "Other DIIs": 3.20,
                "Non Institution": 8.10
            },
            "sep_25": {
                "Promoters": 0.00,
                "FIIs": 52.30,
                "Mutual Funds": 28.10,
                "Insurance Companies": 8.05,
                "Other DIIs": 3.15,
                "Non Institution": 8.40
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": -0.17,
                "Mutual Funds": 0.35,
                "Insurance Companies": 0.07,
                "Other DIIs": 0.05,
                "Non Institution": -0.30
            }
        }
    },
    "ICICIBANK": {
        "sector_rank": "Sector Trend (#4)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "BANK - PRIVATE",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 7,85,690 Cr",
        "perf_1yr": "+18.40%",
        "perf_sec": "-9.31%",
        "perf_mkt": "-3.7%",
        "quality_score": 5,
        "quality_text": "EXCELLENT",
        "valuation_score": 2,
        "valuation_text": "EXPENSIVE",
        "financial_score": 5,
        "financial_text": "VERY POSITIVE",
        "cap_struct": "Strong",
        "score_growth": "Excellent",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Excellent quality company basis long term financial performance.</li><li>Size - Ranks 2nd out of 26 companies in Bank - Private sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 0.00,
                "FIIs": 44.80,
                "Mutual Funds": 29.20,
                "Insurance Companies": 7.40,
                "Other DIIs": 2.80,
                "Non Institution": 15.80
            },
            "sep_25": {
                "Promoters": 0.00,
                "FIIs": 44.60,
                "Mutual Funds": 28.90,
                "Insurance Companies": 7.50,
                "Other DIIs": 2.90,
                "Non Institution": 16.10
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": 0.20,
                "Mutual Funds": 0.30,
                "Insurance Companies": -0.10,
                "Other DIIs": -0.10,
                "Non Institution": -0.30
            }
        }
    },
    "SBIN": {
        "sector_rank": "Sector Trend (#8)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "BANK - PUBLIC",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 7,20,380 Cr",
        "perf_1yr": "+35.40%",
        "perf_sec": "+12.60%",
        "perf_mkt": "+19.39%",
        "quality_score": 4,
        "quality_text": "GOOD",
        "valuation_score": 3,
        "valuation_text": "FAIR",
        "financial_score": 4,
        "financial_text": "POSITIVE",
        "cap_struct": "Average",
        "score_growth": "Good",
        "mgmt_risk": "Good",
        "insights_html": "<li>Good quality company basis long term financial performance.</li><li>Size - Ranks 1st out of 10 companies in Bank - Public sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 57.49,
                "FIIs": 10.90,
                "Mutual Funds": 13.40,
                "Insurance Companies": 6.20,
                "Other DIIs": 1.80,
                "Non Institution": 10.21
            },
            "sep_25": {
                "Promoters": 57.49,
                "FIIs": 10.85,
                "Mutual Funds": 13.50,
                "Insurance Companies": 6.15,
                "Other DIIs": 1.75,
                "Non Institution": 10.26
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": 0.05,
                "Mutual Funds": -0.10,
                "Insurance Companies": 0.05,
                "Other DIIs": 0.05,
                "Non Institution": -0.05
            }
        }
    },
    "RELIANCE": {
        "sector_rank": "Sector Trend (#1)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "OIL & GAS",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 19,84,310 Cr",
        "perf_1yr": "+22.40%",
        "perf_sec": "+15.20%",
        "perf_mkt": "+19.39%",
        "quality_score": 5,
        "quality_text": "EXCELLENT",
        "valuation_score": 2,
        "valuation_text": "EXPENSIVE",
        "financial_score": 4,
        "financial_text": "POSITIVE",
        "cap_struct": "Average",
        "score_growth": "Good",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Excellent quality company with strong conglomerate dominance.</li><li>Size - Ranks 1st out of 12 companies in Oil & Gas sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 50.39,
                "FIIs": 22.15,
                "Mutual Funds": 16.42,
                "Insurance Companies": 6.10,
                "Other DIIs": 1.20,
                "Non Institution": 3.74
            },
            "sep_25": {
                "Promoters": 50.39,
                "FIIs": 22.25,
                "Mutual Funds": 16.30,
                "Insurance Companies": 6.05,
                "Other DIIs": 1.15,
                "Non Institution": 3.86
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": -0.10,
                "Mutual Funds": 0.12,
                "Insurance Companies": 0.05,
                "Other DIIs": 0.05,
                "Non Institution": -0.12
            }
        }
    },
    "TCS": {
        "sector_rank": "Sector Trend (#3)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "IT SERVICES",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 14,23,580 Cr",
        "perf_1yr": "+14.80%",
        "perf_sec": "+10.40%",
        "perf_mkt": "+19.39%",
        "quality_score": 5,
        "quality_text": "EXCELLENT",
        "valuation_score": 2,
        "valuation_text": "EXPENSIVE",
        "financial_score": 5,
        "financial_text": "VERY POSITIVE",
        "cap_struct": "Strong",
        "score_growth": "Good",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Excellent quality IT service giant with outstanding margins.</li><li>Size - Ranks 1st out of 34 companies in IT Services sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 72.41,
                "FIIs": 12.50,
                "Mutual Funds": 8.30,
                "Insurance Companies": 3.40,
                "Other DIIs": 0.50,
                "Non Institution": 2.89
            },
            "sep_25": {
                "Promoters": 72.41,
                "FIIs": 12.40,
                "Mutual Funds": 8.50,
                "Insurance Companies": 3.30,
                "Other DIIs": 0.50,
                "Non Institution": 2.89
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": 0.10,
                "Mutual Funds": -0.20,
                "Insurance Companies": 0.10,
                "Other DIIs": 0.00,
                "Non Institution": 0.00
            }
        }
    },
    "INFY": {
        "sector_rank": "Sector Trend (#6)",
        "market_cap_size": "LARGE CAP",
        "sector_name": "IT SERVICES",
        "short_trend": "bullish",
        "long_trend": "bullish",
        "market_cap_val": "Rs 6,85,420 Cr",
        "perf_1yr": "+8.20%",
        "perf_sec": "+10.40%",
        "perf_mkt": "+19.39%",
        "quality_score": 5,
        "quality_text": "EXCELLENT",
        "valuation_score": 3,
        "valuation_text": "FAIR",
        "financial_score": 4,
        "financial_text": "POSITIVE",
        "cap_struct": "Strong",
        "score_growth": "Average",
        "mgmt_risk": "Excellent",
        "insights_html": "<li>Excellent quality company with top tier corporate governance.</li><li>Size - Ranks 2nd out of 34 companies in IT Services sector</li>",
        "shareholding_pattern": {
            "dec_25": {
                "Promoters": 14.80,
                "FIIs": 33.60,
                "Mutual Funds": 18.40,
                "Insurance Companies": 7.20,
                "Other DIIs": 0.40,
                "Non Institution": 25.60
            },
            "sep_25": {
                "Promoters": 14.80,
                "FIIs": 33.80,
                "Mutual Funds": 18.10,
                "Insurance Companies": 7.10,
                "Other DIIs": 0.40,
                "Non Institution": 25.80
            },
            "changes": {
                "Promoters": 0.00,
                "FIIs": -0.20,
                "Mutual Funds": 0.30,
                "Insurance Companies": 0.10,
                "Other DIIs": 0.00,
                "Non Institution": -0.20
            }
        }
    }
}


def get_rich_stock_details(ticker, api_key=None):
    update_live_prices()
    ticker = normalize_ticker(ticker)
    
    if ticker not in LIVE_FEED:
        fetch_and_add_to_live_feed(ticker)
        
    if ticker in LIVE_FEED:
        data = LIVE_FEED[ticker]
        
        # Merge real deterministic fallback data if present (NSE / BSE compatible)
        base_sym = ticker.split('.')[0]
        if base_sym in STOCK_REAL_DATA:
            import copy
            real_data = copy.deepcopy(STOCK_REAL_DATA[base_sym])
            data.update(real_data)
            data["has_real_ratios"] = True
            
        if "shareholding_pattern" not in data:
            data["shareholding_pattern"] = generate_shareholding_pattern(ticker)
            
        if not data.get("has_real_ratios") and not USE_SIMULATED_DATA:
            try:
                yf_ticker = to_yf_symbol(ticker)
                t = yf.Ticker(yf_ticker)
                info = t.info
                if info:
                    # 1. PE Ratio
                    pe = info.get('trailingPE') or info.get('forwardPE')
                    data['pe_ratio'] = f"{pe:.2f}" if pe else "N/A"
                    
                    # 2. Price to Book
                    pb = info.get('priceToBook')
                    data['price_to_book'] = f"{pb:.2f}" if pb else "N/A"
                    
                    # 3. PEG Ratio
                    peg = info.get('pegRatio')
                    data['peg_ratio'] = f"{peg:.2f}" if peg else "N/A"
                    
                    # 4. ROE
                    roe = info.get('returnOnEquity')
                    data['roe'] = f"{roe * 100:.2f}%" if roe else "N/A"
                    
                    # 5. Growth
                    growth = info.get('earningsGrowth') or info.get('revenueGrowth')
                    data['growth'] = f"{growth * 100:.2f}" if growth else "N/A"
                    
                    # 6. EV to EBITDA
                    evebitda = info.get('enterpriseToEbitda')
                    data['ev_to_ebitda'] = f"{evebitda:.2f}" if evebitda else "N/A"
                    
                    # 7. ROCE (using ROA returnOnAssets as proxy)
                    roce = info.get('returnOnAssets')
                    data['roce'] = f"{roce * 100:.2f}%" if roce else "N/A"
                    
                    # 8. EV to Capital Employed
                    data['ev_to_capital'] = "N/A"
                    
                    # 9. EV to Sales
                    evsales = info.get('enterpriseToRevenue')
                    data['ev_to_sales'] = f"{evsales:.2f}" if evsales else "N/A"
                    
                    # 10. Dividend Yield
                    div_yield = info.get('dividendYield')
                    if div_yield is not None:
                        if div_yield < 0.01 and div_yield > 0:
                            data['dividend_yield'] = f"{div_yield * 100:.2f}%"
                        else:
                            data['dividend_yield'] = f"{div_yield:.2f}%"
                    else:
                        data['dividend_yield'] = "0.00%"
                        
                    # 11. Market Cap
                    mcap = info.get('marketCap')
                    if mcap:
                        is_indian = ticker.endswith('.NSE') or ticker.endswith('.BSE') or ticker in BASE_PRICES
                        if is_indian:
                            mcap_cr = mcap / 10000000
                            data['market_cap_val'] = f"Rs {mcap_cr:,.2f} Cr"
                            if mcap > 200000000000:
                                data['market_cap_size'] = "LARGE CAP"
                            elif mcap > 50000000000:
                                data['market_cap_size'] = "MID CAP"
                            else:
                                data['market_cap_size'] = "SMALL CAP"
                        else:
                            mcap_bill = mcap / 1000000000
                            data['market_cap_val'] = f"${mcap_bill:,.2f} B"
                            if mcap > 10000000000:
                                data['market_cap_size'] = "LARGE CAP"
                            elif mcap > 2000000000:
                                data['market_cap_size'] = "MID CAP"
                            else:
                                data['market_cap_size'] = "SMALL CAP"
                                
                    # 12. Sector
                    sector = info.get('sector')
                    if sector:
                        data['sector_name'] = sector.upper()
                        
                    # 13. Target Price & Expected Profit
                    target = info.get('targetMeanPrice') or info.get('targetMedianPrice')
                    if target:
                        data['target_price'] = target
                        price = data.get('price', 100.0)
                        data['upside_pct'] = ((target - price) / price) * 100
                        
                    # 14. Analyst Recommendations
                    recommendation = info.get('recommendationKey', 'hold')
                    data['short_trend'] = 'bullish' if recommendation in ['buy', 'strong_buy'] else 'bearish' if recommendation in ['sell', 'strong_sell'] else 'neutral'
                    data['long_trend'] = data['short_trend']
                    
                    if recommendation == 'strong_buy':
                        data['buy_pct'], data['hold_pct'], data['sell_pct'] = 85, 10, 5
                    elif recommendation == 'buy':
                        data['buy_pct'], data['hold_pct'], data['sell_pct'] = 70, 20, 10
                    elif recommendation == 'sell' or recommendation == 'strong_sell':
                        data['buy_pct'], data['hold_pct'], data['sell_pct'] = 10, 20, 70
                    else:
                        data['buy_pct'], data['hold_pct'], data['sell_pct'] = 30, 50, 20
                        
                    # 15. Score Synthesis
                    roe_val = roe if roe else 0.15
                    quality = 5 if roe_val > 0.25 else 4 if roe_val > 0.15 else 3 if roe_val > 0.08 else 2
                    data['quality_score'] = quality
                    data['quality_text'] = ['POOR', 'BELOW AVERAGE', 'AVERAGE', 'GOOD', 'EXCELLENT'][quality - 1]
                    
                    pe_val = pe if pe else 25.0
                    valuation = 5 if pe_val < 15.0 else 4 if pe_val < 25.0 else 3 if pe_val < 45.0 else 2
                    data['valuation_score'] = valuation
                    data['valuation_text'] = ['VERY EXPENSIVE', 'EXPENSIVE', 'FAIR', 'CHEAP', 'VERY CHEAP'][valuation - 1]
                    
                    debt_to_equity = info.get('debtToEquity')
                    financial = 4 if debt_to_equity and debt_to_equity < 100 else 3
                    data['financial_score'] = financial
                    data['financial_text'] = ['NEGATIVE', 'WEAK', 'NEUTRAL', 'POSITIVE', 'VERY POSITIVE'][financial - 1]
                    
                    data['cap_struct'] = "Strong" if debt_to_equity and debt_to_equity < 50 else "Average"
                    data['score_growth'] = "Excellent" if (growth and growth > 0.2) else "Good" if (growth and growth > 0.0) else "Average"
                    data['mgmt_risk'] = "Low" if quality >= 4 else "Average"
                    
                    # 16. Insights HTML
                    insights = ""
                    if quality >= 4:
                        insights += "<li>Good quality company basis long term financial performance.</li>"
                    else:
                        insights += "<li>Average quality company exhibiting steady long term performance.</li>"
                    if sector:
                        insights += f"<li>Size - Ranks in top tier of the {sector} sector</li>"
                    data['insights_html'] = insights
                    
                    # 17. Shareholding Pattern
                    insiders_pct = info.get('insidersPercentHeld')
                    institutions_pct = info.get('institutionsPercentHeld')
                    data['shareholding_pattern'] = generate_shareholding_pattern(ticker, insiders_pct, institutions_pct)
                    
                    data['has_real_ratios'] = True
            except Exception as e:
                print(f"Error fetching real ratios for {ticker}: {e}")
                
        return data
        
    return {
        "ticker": ticker, "name": ticker,
        "price": 100.0, "yf_price": 100.0, "change": 0.0, "change_percent": 0.0,
        "open": 100.0, "high": 100.0, "low": 100.0, "previous_close": 100.0,
        "volume": "10,000", "low_52week": 80.0, "high_52week": 120.0,
        "pe_ratio": "N/A", "price_to_book": "N/A", "dividend_yield": "0.00%",
        "description": "Indian stock detail representation.", "is_fallback": True
    }

# ── App Setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = 'rp_finance_secret_2024'
_session_dir = os.path.join(BASE_DIR, 'flask_session')
os.makedirs(_session_dir, exist_ok=True)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = _session_dir
Session(app)
chatbot = Chatbot()
chatbot.live_feed = LIVE_FEED
chatbot.use_simulated_data = USE_SIMULATED_DATA

ALPHA_VANTAGE_API_KEY = "SAG8H3CTU5377P5V"
NEWS_API_KEY          = "50dcf43690214250b84a164a5c52fc33"

MARKET_TICKERS = [{"name": data["name"], "ticker": ticker} for ticker, data in LIVE_FEED.items()]

# ── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    db_path = os.path.join(BASE_DIR, 'database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  balance REAL DEFAULT 10000.0)''')
    c.execute('''CREATE TABLE IF NOT EXISTS portfolio
                 (user_id INTEGER, ticker TEXT, shares INTEGER,
                  avg_buy_price REAL DEFAULT 0.0,
                  PRIMARY KEY (user_id, ticker))''')
    c.execute('''CREATE TABLE IF NOT EXISTS watchlist
                 (user_id INTEGER, ticker TEXT,
                  UNIQUE(user_id, ticker))''')
    c.execute('''CREATE TABLE IF NOT EXISTS trade_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER, ticker TEXT, action TEXT,
                  shares INTEGER, price REAL, total REAL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()

    # Dynamic migrations for existing databases
    # 1. Add avg_buy_price to portfolio if missing
    c.execute("PRAGMA table_info(portfolio)")
    cols = [row[1] for row in c.fetchall()]
    if 'avg_buy_price' not in cols:
        try:
            c.execute("ALTER TABLE portfolio ADD COLUMN avg_buy_price REAL DEFAULT 0.0")
            conn.commit()
            print("Migration: Added avg_buy_price column to portfolio table.")
        except Exception as e:
            print(f"Migration Error (portfolio): {e}")

    # 2. Add UNIQUE constraint to watchlist if missing
    c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='watchlist'")
    row = c.fetchone()
    if row and "UNIQUE" not in row[0]:
        try:
            c.execute("ALTER TABLE watchlist RENAME TO watchlist_old")
            c.execute('''CREATE TABLE watchlist
                         (user_id INTEGER, ticker TEXT,
                          UNIQUE(user_id, ticker))''')
            c.execute("INSERT OR IGNORE INTO watchlist (user_id, ticker) SELECT user_id, ticker FROM watchlist_old")
            c.execute("DROP TABLE watchlist_old")
            conn.commit()
            print("Migration: Added UNIQUE constraint to watchlist table.")
        except Exception as e:
            print(f"Migration Error (watchlist): {e}")

    conn.close()
    print("DB initialized.")

# ── Helper: market_stocks for ticker bar ──────────────────────────────────────
def get_market_bar():
    out = []
    for s in MARKET_TICKERS:
        p, c = get_cached_quote(s["ticker"])
        out.append({"name": s["name"], "ticker": s["ticker"], "price": p, "change": c})
    return out

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    logged_in = 'user_id' in session
    market_stocks = get_market_bar()

    if logged_in:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT balance FROM users WHERE id=?", (session['user_id'],))
        balance = c.fetchone()[0]
        c.execute("SELECT ticker, shares FROM portfolio WHERE user_id=?", (session['user_id'],))
        portfolio = c.fetchall()
        c.execute("SELECT ticker FROM watchlist WHERE user_id=?", (session['user_id'],))
        watchlist = c.fetchall()
        conn.close()

        portfolio_data = []
        total_holdings = 0.0
        for row in portfolio:
            ticker, shares = row[0], row[1]
            price, chg = get_cached_quote(ticker)
            val = price * shares
            total_holdings += val
            portfolio_data.append({'ticker': ticker, 'shares': shares, 'price': price, 'change': chg, 'total_value': val, 'value_inr': val})

        watchlist_data = []
        for (t,) in watchlist:
            wp, wc = get_cached_quote(t)
            watchlist_data.append({'ticker': t, 'price': wp, 'change': wc})

        return render_template('index.html', logged_in=True, balance=balance,
                               portfolio=portfolio, portfolio_data=portfolio_data,
                               watchlist=watchlist, watchlist_data=watchlist_data,
                               market_stocks=market_stocks,
                               total_holdings_value=total_holdings,
                               total_portfolio_value=balance + total_holdings)
    return render_template('index.html', logged_in=False, market_stocks=market_stocks)


@app.route('/auth', methods=['GET', 'POST'])
def auth():
    """Unified login + signup page."""
    mode  = request.args.get('mode', 'login')
    error = None

    if request.method == 'POST':
        action = request.form.get('action', 'login')
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if action == 'login':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
            user = c.fetchone()
            conn.close()
            if user:
                session['user_id'] = user[0]
                return redirect(url_for('index'))
            error = "Invalid username or password."
            mode  = 'login'

        elif action == 'signup':
            if not username or not password:
                error = "Username and password are required."
                mode  = 'signup'
            else:
                balance_raw = request.form.get('balance', '10000.00')
                try:
                    balance_float = float(balance_raw) if balance_raw else 10000.0
                except:
                    balance_float = 10000.0
                conn = get_db()
                c = conn.cursor()
                try:
                    c.execute("INSERT INTO users (username, password, balance) VALUES (?,?,?)",
                              (username, password, balance_float))
                    conn.commit()
                    c.execute("SELECT id FROM users WHERE username=?", (username,))
                    session['user_id'] = c.fetchone()[0]
                    return redirect(url_for('index'))
                except sqlite3.IntegrityError:
                    error = "Username already taken."
                    mode  = 'signup'
                finally:
                    conn.close()

    return render_template('auth.html', mode=mode, error=error)


# Keep old routes working
@app.route('/login', methods=['GET', 'POST'])
def login():
    return redirect(url_for('auth', mode='login'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    return redirect(url_for('auth', mode='signup'))


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))


@app.route('/portfolio')
def portfolio():
    logged_in = 'user_id' in session
    if not logged_in:
        return render_template('portfolio.html', logged_in=False)
    error = request.args.get('error')
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE id=?", (session['user_id'],))
    balance = c.fetchone()[0]
    c.execute("SELECT ticker, shares, avg_buy_price FROM portfolio WHERE user_id=?", (session['user_id'],))
    holdings = c.fetchall()
    # Trade history (last 20)
    c.execute("""SELECT ticker, action, shares, price, total, timestamp
                 FROM trade_history WHERE user_id=?
                 ORDER BY timestamp DESC LIMIT 20""", (session['user_id'],))
    trade_history = c.fetchall()
    conn.close()

    portfolio_data = []
    total_holdings = 0.0
    for row in holdings:
        ticker, shares, avg_buy = row[0], row[1], row[2]
        price, gain_loss = get_cached_quote(ticker)
        val = price * shares
        total_holdings += val
        # Real PnL % based on avg buy price
        pnl_pct = ((price - avg_buy) / avg_buy * 100) if avg_buy > 0 else gain_loss
        portfolio_data.append({
            'ticker': ticker, 'shares': shares,
            'current_price': price, 'avg_buy_price': avg_buy,
            'total_value': val, 'value_inr': val,
            'gain_loss': round(pnl_pct, 2)
        })

    return render_template('portfolio.html', logged_in=True, balance=balance,
                           portfolio=holdings, portfolio_data=portfolio_data,
                           total_holdings_value=total_holdings,
                           total_portfolio_value=balance + total_holdings,
                           trade_history=trade_history, error=error)


@app.route('/buy_stock', methods=['POST'])
def buy_stock():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Please log in.'}), 401
    ticker = normalize_ticker(request.form.get('ticker', ''))
    try:
        shares = int(request.form.get('shares', 0))
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Quantity must be a valid integer.'})
    if shares <= 0:
        return jsonify({'status': 'error', 'message': 'Shares must be positive.'})

    update_live_prices()
    if ticker not in LIVE_FEED:
        if not fetch_and_add_to_live_feed(ticker):
            return jsonify({'status': 'error', 'message': 'Invalid stock ticker. We only support Indian BSE/NSE stocks.'})

    price = LIVE_FEED[ticker]["price"]
    cost = price * shares

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE id=?", (session['user_id'],))
    balance = c.fetchone()[0]
    if balance < cost:
        conn.close()
        return jsonify({'status': 'error', 'message': f'Insufficient balance. Need ₹{cost:.2f}, have ₹{balance:.2f}.'})

    new_balance = balance - cost
    c.execute("UPDATE users SET balance=? WHERE id=?", (new_balance, session['user_id']))

    c.execute("SELECT shares, avg_buy_price FROM portfolio WHERE user_id=? AND ticker=?", (session['user_id'], ticker))
    existing = c.fetchone()
    if existing:
        old_shares, old_avg = existing[0], existing[1]
        new_shares = old_shares + shares
        new_avg = ((old_avg * old_shares) + (price * shares)) / new_shares
        c.execute("UPDATE portfolio SET shares=?, avg_buy_price=? WHERE user_id=? AND ticker=?",
                  (new_shares, new_avg, session['user_id'], ticker))
    else:
        c.execute("INSERT INTO portfolio (user_id, ticker, shares, avg_buy_price) VALUES (?,?,?,?)",
                  (session['user_id'], ticker, shares, price))

    c.execute("INSERT INTO trade_history (user_id, ticker, action, shares, price, total) VALUES (?,?,?,?,?,?)",
              (session['user_id'], ticker, 'BUY', shares, price, cost))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'ticker': ticker, 'shares': shares, 'balance': new_balance, 'price': price})


@app.route('/sell_stock', methods=['POST'])
def sell_stock():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Please log in.'}), 401
    ticker = normalize_ticker(request.form.get('ticker', ''))
    try:
        shares_sell = int(request.form.get('shares', 0))
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Quantity must be a valid integer.'})
    if shares_sell <= 0:
        return jsonify({'status': 'error', 'message': 'Shares must be positive.'})

    update_live_prices()
    if ticker not in LIVE_FEED:
        if not fetch_and_add_to_live_feed(ticker):
            return jsonify({'status': 'error', 'message': 'Invalid stock ticker. We only support Indian BSE/NSE stocks.'})

    price = LIVE_FEED[ticker]["price"]
    proceeds = price * shares_sell

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT shares FROM portfolio WHERE user_id=? AND ticker=?", (session['user_id'], ticker))
    row = c.fetchone()
    if not row or row[0] < shares_sell:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Not enough shares.'})

    c.execute("SELECT balance FROM users WHERE id=?", (session['user_id'],))
    balance = c.fetchone()[0]
    new_balance = balance + proceeds

    new_shares = row[0] - shares_sell
    if new_shares > 0:
        c.execute("UPDATE portfolio SET shares=? WHERE user_id=? AND ticker=?", (new_shares, session['user_id'], ticker))
    else:
        c.execute("DELETE FROM portfolio WHERE user_id=? AND ticker=?", (session['user_id'], ticker))
    c.execute("UPDATE users SET balance=? WHERE id=?", (new_balance, session['user_id']))
    c.execute("INSERT INTO trade_history (user_id, ticker, action, shares, price, total) VALUES (?,?,?,?,?,?)",
              (session['user_id'], ticker, 'SELL', shares_sell, price, proceeds))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'ticker': ticker, 'shares': new_shares, 'balance': new_balance, 'price': price})


@app.route('/watchlist')
def watchlist():
    logged_in = 'user_id' in session
    if not logged_in:
        return render_template('watchlist.html', logged_in=False)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT ticker FROM watchlist WHERE user_id=?", (session['user_id'],))
    tickers = c.fetchall()
    conn.close()
    watchlist_data = []
    for (t,) in tickers:
        nt = normalize_ticker(t)
        price, chg = get_cached_quote(nt, ALPHA_VANTAGE_API_KEY)
        watchlist_data.append({'ticker': t, 'current_price': price, 'daily_change': chg})
    return render_template('watchlist.html', logged_in=True, watchlist=tickers, watchlist_data=watchlist_data)


@app.route('/add_to_watchlist', methods=['POST'])
def add_to_watchlist():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Please log in.'}), 401
    ticker = normalize_ticker(request.form.get('ticker', ''))
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT OR IGNORE INTO watchlist (user_id, ticker) VALUES (?,?)", (session['user_id'], ticker))
        conn.commit()
        return jsonify({'status': 'success', 'ticker': ticker})
    finally:
        conn.close()


@app.route('/remove_from_watchlist', methods=['POST'])
def remove_from_watchlist():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Please log in.'}), 401
    ticker_raw = request.form.get('ticker', '')
    ticker_norm = normalize_ticker(ticker_raw)
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM watchlist WHERE user_id=? AND ticker IN (?, ?)", (session['user_id'], ticker_raw, ticker_norm))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'ticker': ticker_raw})


YF_HISTORY_CACHE = {}

def get_yf_history(ticker, period="3mo", interval="1d"):
    if USE_SIMULATED_DATA:
        return {}
        
    cache_key = (ticker, period, interval)
    now = time.time()
    
    # 30 seconds cache for intraday, 5 minutes for daily/weekly
    is_intraday = any(x in interval for x in ['m', 'h', 's']) and 'mo' not in interval and 'wk' not in interval and 'd' not in interval
    cache_duration = 30 if is_intraday else 300
    
    if cache_key in YF_HISTORY_CACHE:
        cached_data, timestamp = YF_HISTORY_CACHE[cache_key]
        if now - timestamp < cache_duration:
            return cached_data

    try:
        yf_symbol = to_yf_symbol(ticker)
        t = yf.Ticker(yf_symbol)
        hist = t.history(period=period, interval=interval)
        if not hist.empty:
            out = {}
            for dt, row in hist.iloc[::-1].iterrows():
                if interval in ['1m', '2m', '5m', '15m', '30m', '60m', '90m']:
                    date_str = dt.strftime('%Y-%m-%d %H:%M')
                else:
                    date_str = dt.strftime('%Y-%m-%d')
                out[date_str] = {
                    "1. open": str(round(row['Open'], 2)),
                    "2. high": str(round(row['High'], 2)),
                    "3. low": str(round(row['Low'], 2)),
                    "4. close": str(round(row['Close'], 2)),
                    "5. volume": str(int(row['Volume']))
                }
            YF_HISTORY_CACHE[cache_key] = (out, now)
            return out
    except Exception as e:
        print(f"yfinance history error for {ticker}: {e}")
    return {}

@app.route('/algo_trading', methods=['GET', 'POST'])
def algo_trading():
    logged_in = 'user_id' in session
    if not logged_in:
        return render_template('algo_trading.html', logged_in=False)
    if request.method == 'POST':
        try:
            ticker = normalize_ticker(request.form.get('ticker', ''))
            try:
                short_ma = int(request.form.get('short_ma', 0))
                long_ma  = int(request.form.get('long_ma', 0))
            except ValueError:
                return render_template('algo_trading.html', logged_in=True, error="Short MA and Long MA must be valid integers.")

            if not ticker or short_ma <= 0 or long_ma <= 0 or short_ma >= long_ma:
                return render_template('algo_trading.html', logged_in=True, error="Invalid parameters. Short MA and Long MA must be positive, and Short MA must be less than Long MA.")
            
            # Fetch history from yfinance - request 1 year to ensure enough crossover signals are found
            data = get_yf_history(ticker, period="1y")

            # Fallback to simulated data if API limits hit
            if not data:
                import datetime
                base_sym = ticker.split('.')[0]
                p = BASE_PRICES.get(base_sym, 100.0)
                if ticker in LIVE_FEED:
                    p = LIVE_FEED[ticker]["price"]
                
                curr_date = datetime.date.today()
                temp_p = p
                data = {}
                # Generate enough days (e.g. 150 trading days) to ensure crossover signals can be found
                target_count = max(short_ma, long_ma) + 150
                while len(data) < target_count:
                    curr_date -= datetime.timedelta(days=1)
                    if curr_date.weekday() >= 5:
                        continue
                    date_str = curr_date.strftime('%Y-%m-%d')
                    drift = random.uniform(-0.015, 0.015)
                    data[date_str] = {'4. close': str(round(temp_p, 2))}
                    temp_p = temp_p * (1 - drift)

            # Sort data by date string chronologically (oldest to newest)
            history_list = sorted(data.items())
            dates = [item[0] for item in history_list]
            prices = [float(item[1]['4. close']) for item in history_list]

            signals = []
            if len(prices) > long_ma:
                for i in range(long_ma, len(prices)):
                    # Calculate MAs for day i
                    sma_curr = sum(prices[i - short_ma + 1 : i + 1]) / short_ma
                    lma_curr = sum(prices[i - long_ma + 1 : i + 1]) / long_ma
                    
                    # Calculate MAs for day i - 1
                    sma_prev = sum(prices[i - short_ma : i]) / short_ma
                    lma_prev = sum(prices[i - long_ma : i]) / long_ma
                    
                    if sma_curr > lma_curr and sma_prev <= lma_prev:
                        signals.append({'date': dates[i], 'action': 'Buy', 'price': round(prices[i], 2)})
                    elif sma_curr < lma_curr and sma_prev >= lma_prev:
                        signals.append({'date': dates[i], 'action': 'Sell', 'price': round(prices[i], 2)})

            # AI Stock analysis and predictions
            recommendation, rsi, macd_hist, score = get_ai_recommendation(prices, short_ma, long_ma)
            accuracy = calculate_backtest_accuracy(prices, short_ma, long_ma)
            
            # Volatility-based target calculation (last 20 days standard deviation of daily returns)
            import math
            returns = [(prices[j] - prices[j-1])/prices[j-1] for j in range(len(prices)-20, len(prices))]
            avg_return = sum(returns) / len(returns)
            variance = sum((r - avg_return)**2 for r in returns) / len(returns)
            std_dev = math.sqrt(variance)
            std_dev = max(0.01, min(0.05, std_dev)) # cap daily volatility between 1% and 5%
            monthly_vol = std_dev * math.sqrt(20)
            
            current_price = prices[-1]
            if "BUY" in recommendation:
                target_price = current_price * (1.0 + monthly_vol)
                stop_loss = current_price * (1.0 - monthly_vol * 0.6)
                hold_duration = "Medium Term (30-45 Days)"
            elif "SELL" in recommendation:
                target_price = current_price * (1.0 - monthly_vol)
                stop_loss = current_price * (1.0 + monthly_vol * 0.6)
                hold_duration = "Short Term / Exit (10-15 Days)"
            else:
                target_price = current_price * (1.0 + monthly_vol * 0.2)
                stop_loss = current_price * (1.0 - monthly_vol * 0.4)
                hold_duration = "Hold & Monitor (15-30 Days)"
                
            target_price = round(target_price, 2)
            stop_loss = round(stop_loss, 2)
            upside_pct = round(((target_price - current_price) / current_price) * 100, 2)
            
            # Future forecast path
            forecast_path = generate_forecast_path(current_price, target_price, std_dev, steps=20)
            
            # Chart historical data (last 15 trading days)
            chart_history = [{'date': d, 'price': p} for d, p in zip(dates[-15:], prices[-15:])]
            
            import json
            history_json = json.dumps(chart_history)
            forecast_json = json.dumps(forecast_path)

            return render_template('algo_trading.html', logged_in=True, ticker=ticker,
                                   signals=signals[-5:], recommendation=recommendation,
                                   score=score, rsi=rsi, macd_hist=macd_hist,
                                   current_price=current_price, target_price=target_price,
                                   stop_loss=stop_loss, upside_pct=upside_pct,
                                   hold_duration=hold_duration, accuracy=accuracy,
                                   history_json=history_json, forecast_json=forecast_json,
                                   short_ma=short_ma, long_ma=long_ma)
        except Exception as e:
            return render_template('algo_trading.html', logged_in=True, error=str(e))
    return render_template('algo_trading.html', logged_in=True)


@app.route('/ipos')
def ipos():
    logged_in = 'user_id' in session
    market_stocks = get_market_bar()
    return render_template('ipos.html', logged_in=logged_in, market_stocks=market_stocks)


@app.route('/tutorials')
def tutorials():
    return render_template('tutorials.html', logged_in='user_id' in session)


@app.route('/news')
def news():
    logged_in = 'user_id' in session
    news_items = []
    try:
        url = f"https://newsapi.org/v2/everything?q=indian+stock+market&apiKey={NEWS_API_KEY}&language=en&sortBy=publishedAt&pageSize=12"
        resp = requests.get(url, timeout=8)
        articles = resp.json().get('articles', [])
        news_items = [{'title': a.get('title',''), 'description': a.get('description','') or 'Click to read more.',
                       'url': a.get('url','#'), 'thumbnail': a.get('urlToImage') or ''} for a in articles if a.get('title')]
    except Exception as e:
        print(f"News API error: {e}")
        news_items = []
        
    if not news_items:
        news_items = [
            {
                "title": "Nifty 50 Reclaims 22,500 Mark Amid Strong Buying in Banking & IT Stocks",
                "description": "Indian benchmark indices witnessed strong momentum as HDFC Bank, TCS, and Reliance Industries led the rally. Analysts attribute the gains to positive global cues and robust domestic inflows.",
                "url": "https://www.moneycontrol.com",
                "thumbnail": ""
            },
            {
                "title": "IPO Market Highlights: Multiple Companies Set to List on NSE & BSE Next Week",
                "description": "The Indian primary market remains hot as three mainboard IPOs are scheduled to open for subscription. Promoters seek to raise over Rs 15,000 crores collectively.",
                "url": "https://www.chittorgarh.com",
                "thumbnail": ""
            },
            {
                "title": "Federal Reserve Signals Pause in Interest Rate Hikes, Global Markets Rejoice",
                "description": "US Federal Reserve officials hint at holding key interest rates steady, easing pressure on emerging markets including India. Bond yields decline while technology indices surge.",
                "url": "https://www.reuters.com",
                "thumbnail": ""
            },
            {
                "title": "Crude Oil Prices Stabilize Around $83/Barrel Amid OPEC Supply Decisions",
                "description": "Brent crude oil futures trade flat as OPEC+ continues production cuts. Indian oil marketing companies watch refining margins closely amid retail price revisions.",
                "url": "https://www.bloomberg.com",
                "thumbnail": ""
            }
        ]
        
    return render_template('news.html', logged_in=logged_in, news_items=news_items)


@app.route('/search', methods=['POST'])
def search_stock():
    query = normalize_ticker(request.form.get('search_query', ''))
    if not query:
        return redirect(url_for('index'))
    session['stock_details'] = {'ticker': query, 'details': get_rich_stock_details(query)}
    return redirect(url_for('stock_details'))


@app.route('/stock-details/<ticker>')
def stock_details_direct(ticker):
    ticker = normalize_ticker(ticker)
    session['stock_details'] = {'ticker': ticker, 'details': get_rich_stock_details(ticker)}
    return redirect(url_for('stock_details'))


@app.route('/stock-details')
def stock_details():
    ticker_param = request.args.get('ticker')
    if ticker_param:
        ticker = normalize_ticker(ticker_param)
        details = get_rich_stock_details(ticker)
        session['stock_details'] = {'ticker': ticker, 'details': details}
    else:
        info = session.get('stock_details', {})
        if not info or 'ticker' not in info:
            return redirect(url_for('index'))
        ticker = normalize_ticker(info['ticker'])
        details = get_rich_stock_details(ticker)
        info['details'] = details
        session['stock_details'] = info
    
    logged_in = 'user_id' in session
    balance = 0
    if logged_in:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT balance FROM users WHERE id=?", (session['user_id'],))
        balance = c.fetchone()[0]
        conn.close()
    return render_template('stock_details.html', ticker=ticker, details=details,
                           logged_in=logged_in, balance=balance)


@app.route('/stock/<ticker>')
def stock_data(ticker):
    ticker = normalize_ticker(ticker)
    period = request.args.get('period', '3mo')
    interval = request.args.get('interval', '1d')
    
    # Sanitize interval combinations to prevent yfinance errors for native queries
    if interval in ['1m', '2m', '5m']:
        if period not in ['1d', '5d']:
            period = '5d'
    elif interval in ['15m', '30m', '60m', '90m']:
        if period not in ['1d', '5d', '1mo']:
            period = '1mo'
            
    # We only call yfinance API if it's one of the supported intervals, otherwise fall back immediately
    supported_yf_intervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']
    data = {}
    if interval in supported_yf_intervals:
        data = get_yf_history(ticker, period=period, interval=interval)
        
    if data:
        return jsonify(data)

    # Simulated chart data fallback
    import datetime
    import random
    import re
    
    # Seed the random number generator deterministically based on ticker, period, and interval
    # so that the generated chart remains stable and does not change patterns on every click/reload
    seed_str = f"{ticker}_{period}_{interval}"
    local_rand = random.Random(seed_str)
    
    out = {}
    base_sym = ticker.split('.')[0]
    base_p = BASE_PRICES.get(base_sym, 100.0)
    
    # Check if the interval is intraday
    is_intraday = False
    for suffix in ['s', 'm', 'h']:
        if suffix in interval and 'mo' not in interval and 'wk' not in interval and 'd' not in interval:
            is_intraday = True
            break
            
    if is_intraday:
        # Parse value, e.g. 15s -> 15, 5m -> 5, 2h -> 2
        match = re.match(r'(\d+)', interval)
        val = int(match.group(1)) if match else 5
        
        # Determine timedelta step
        if 's' in interval:
            delta = datetime.timedelta(seconds=val)
        elif 'h' in interval:
            delta = datetime.timedelta(hours=val)
        else: # minutes
            delta = datetime.timedelta(minutes=val)
            
        if 's' in interval:
            # For seconds, generate last 100 points of the current active day
            import datetime
            tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            curr_date = datetime.datetime.now(tz_ist)
            if curr_date.hour > 15 or (curr_date.hour == 15 and curr_date.minute > 30):
                end_time = curr_date.replace(hour=15, minute=30, second=0, microsecond=0)
            else:
                end_time = curr_date
                
            loop_time = end_time
            points = []
            for _ in range(120):
                while loop_time.weekday() >= 5:
                    loop_time -= datetime.timedelta(days=1)
                points.append(loop_time)
                loop_time -= delta
                
            # Sort chronologically to walk forward
            points = sorted(points)
            
            temp_p = base_p
            for idx, dt_val in enumerate(points):
                date_str = dt_val.strftime('%Y-%m-%d %H:%M:%S')
                
                # If it's the latest point, merge live feed values
                if idx == len(points) - 1 and ticker in LIVE_FEED:
                    feed_data = LIVE_FEED[ticker]
                    close_p = round(feed_data["price"], 2)
                    open_p = round(feed_data.get("open", temp_p), 2)
                    high_p = round(max(feed_data.get("high", close_p), open_p, close_p), 2)
                    low_p = round(min(feed_data.get("low", close_p), open_p, close_p), 2)
                    vol_val = int(feed_data["volume"].replace(',', '')) if isinstance(feed_data["volume"], str) else int(feed_data["volume"])
                else:
                    drift = local_rand.uniform(-0.003, 0.003)
                    open_p = round(temp_p, 2)
                    close_p = round(open_p * (1 + drift), 2)
                    high_p = round(max(open_p, close_p) * (1 + local_rand.uniform(0, 0.001)), 2)
                    low_p = round(min(open_p, close_p) * (1 - local_rand.uniform(0, 0.001)), 2)
                    vol_val = local_rand.randint(1000, 20000)
                
                out[date_str] = {
                    "1. open": str(open_p),
                    "2. high": str(high_p),
                    "3. low": str(low_p),
                    "4. close": str(close_p),
                    "5. volume": str(vol_val)
                }
                temp_p = close_p
        else:
            # For minutes/hours
            days_to_gen = 1 if period == '1d' else 5
            if period in ['1mo', '3mo']:
                days_to_gen = 15
            elif period in ['6mo', '1y', '5y']:
                days_to_gen = 30
                
            import datetime
            tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            curr_date = datetime.datetime.now(tz_ist)
            points = []
            
            for day_offset in range(days_to_gen):
                target_day = curr_date - datetime.timedelta(days=day_offset)
                if target_day.weekday() >= 5:
                    continue
                    
                start_time = target_day.replace(hour=9, minute=15, second=0, microsecond=0)
                end_time = target_day.replace(hour=15, minute=30, second=0, microsecond=0)
                
                loop_time = start_time
                while loop_time <= end_time:
                    points.append(loop_time)
                    loop_time += delta
                    
            points = sorted(points)[-300:] # Limit to last 300
            
            temp_p = base_p
            for idx, dt_val in enumerate(points):
                date_str = dt_val.strftime('%Y-%m-%d %H:%M')
                
                # If it's the latest point, merge live feed values
                if idx == len(points) - 1 and ticker in LIVE_FEED:
                    feed_data = LIVE_FEED[ticker]
                    close_p = round(feed_data["price"], 2)
                    open_p = round(feed_data.get("open", temp_p), 2)
                    high_p = round(max(feed_data.get("high", close_p), open_p, close_p), 2)
                    low_p = round(min(feed_data.get("low", close_p), open_p, close_p), 2)
                    vol_val = int(feed_data["volume"].replace(',', '')) if isinstance(feed_data["volume"], str) else int(feed_data["volume"])
                else:
                    drift = local_rand.uniform(-0.005, 0.005)
                    open_p = round(temp_p, 2)
                    close_p = round(open_p * (1 + drift), 2)
                    high_p = round(max(open_p, close_p) * (1 + local_rand.uniform(0, 0.002)), 2)
                    low_p = round(min(open_p, close_p) * (1 - local_rand.uniform(0, 0.002)), 2)
                    vol_val = local_rand.randint(10000, 200000)
                
                out[date_str] = {
                    "1. open": str(open_p),
                    "2. high": str(high_p),
                    "3. low": str(low_p),
                    "4. close": str(close_p),
                    "5. volume": str(vol_val)
                }
                temp_p = close_p
    else:
        # Daily / Weekly / Monthly daily simulation
        days_to_gen = 30 if period == '1mo' else 90 if period == '3mo' else 180 if period == '6mo' else 365 if period == '1y' else 1825
        days_to_gen = min(150, days_to_gen)
        
        # Calculate step based on interval
        step_days = 1
        if interval == '1wk':
            step_days = 7
        elif interval == '1mo':
            step_days = 30
            
        import datetime
        tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        curr_date = datetime.datetime.now(tz_ist).date()
        points = []
        for i in range(days_to_gen):
            target_day = curr_date - datetime.timedelta(days=i * step_days)
            if target_day.weekday() >= 5 and step_days == 1:
                continue
            points.append(target_day)
            
            # Sort chronologically to walk forward
        points = sorted(points)
        
        temp_p = base_p
        for idx, target_day in enumerate(points):
            date_str = target_day.strftime('%Y-%m-%d')
            
            # If it's the latest point, merge live feed values
            if idx == len(points) - 1 and ticker in LIVE_FEED:
                feed_data = LIVE_FEED[ticker]
                close_p = round(feed_data["price"], 2)
                open_p = round(feed_data.get("open", temp_p), 2)
                high_p = round(max(feed_data.get("high", close_p), open_p, close_p), 2)
                low_p = round(min(feed_data.get("low", close_p), open_p, close_p), 2)
                vol_val = int(feed_data["volume"].replace(',', '')) if isinstance(feed_data["volume"], str) else int(feed_data["volume"])
            else:
                drift = local_rand.uniform(-0.015, 0.015)
                open_p = round(temp_p, 2)
                close_p = round(open_p * (1 + drift), 2)
                high_p = round(max(open_p, close_p) * (1 + local_rand.uniform(0, 0.01)), 2)
                low_p = round(min(open_p, close_p) * (1 - local_rand.uniform(0, 0.01)), 2)
                vol_val = local_rand.randint(500000, 3000000)
            
            out[date_str] = {
                "1. open": str(open_p),
                "2. high": str(high_p),
                "3. low": str(low_p),
                "4. close": str(close_p),
                "5. volume": str(vol_val)
            }
            temp_p = close_p
            
    return jsonify(out)


@app.route('/chatbot', methods=['POST'])
def chatbot_endpoint():
    query = request.form.get('query', '')
    if not query:
        return jsonify({'response': 'Please provide a query.'})
    return jsonify({'response': chatbot.get_response(query)})


@app.route('/api/live-prices')
def api_live_prices():
    update_live_prices()
    return jsonify(LIVE_FEED)


@app.route('/api/search')
def api_search():
    q = request.args.get('q', '').strip().upper()
    if not q:
        return jsonify([])
    
    grouped = {}
    for ticker, data in LIVE_FEED.items():
        sym = ticker.split('.')[0]
        if q in sym or q in data['name'].upper():
            if sym not in grouped:
                grouped[sym] = {
                    "symbol": sym,
                    "name": data.get("name", sym).replace(" (NSE)", "").replace(" (BSE)", ""),
                    "nse_ticker": f"{sym}.NSE",
                    "bse_ticker": f"{sym}.BSE",
                    "nse_price": 0.0,
                    "bse_price": 0.0,
                    "nse_change": 0.0,
                    "bse_change": 0.0
                }
            if ticker.endswith('.NSE'):
                grouped[sym]["nse_price"] = data.get("price", 0.0)
                grouped[sym]["nse_change"] = data.get("change", 0.0)
            elif ticker.endswith('.BSE'):
                grouped[sym]["bse_price"] = data.get("price", 0.0)
                grouped[sym]["bse_change"] = data.get("change", 0.0)
                
    if not grouped and len(q) >= 2:
        nse_ticker = f"{q}.NSE"
        bse_ticker = f"{q}.BSE"
        has_nse = fetch_and_add_to_live_feed(nse_ticker)
        has_bse = fetch_and_add_to_live_feed(bse_ticker)
        
        if has_nse or has_bse:
            nse_data = LIVE_FEED.get(nse_ticker, {})
            bse_data = LIVE_FEED.get(bse_ticker, {})
            nse_price = nse_data.get("price", 0.0) if has_nse else 0.0
            nse_change = nse_data.get("change", 0.0) if has_nse else 0.0
            
            bse_price = bse_data.get("price", 0.0) if has_bse else (nse_price * 0.999 if has_nse else 0.0)
            bse_change = bse_data.get("change", 0.0) if has_bse else (nse_change if has_nse else 0.0)
            
            if not has_nse and has_bse:
                nse_price = bse_price * 1.001
                nse_change = bse_change
                
            name = nse_data.get("name", bse_data.get("name", q))
            name = name.replace(" (NSE)", "").replace(" (BSE)", "")
            
            grouped[q] = {
                "symbol": q,
                "name": name,
                "nse_ticker": nse_ticker,
                "bse_ticker": bse_ticker,
                "nse_price": nse_price,
                "bse_price": bse_price,
                "nse_change": nse_change,
                "bse_change": bse_change
            }
            
    return jsonify(list(grouped.values()))


# Merged static pages
@app.route('/about')
def about():
    return render_template('static_page.html', page='about', logged_in='user_id' in session)

@app.route('/contact')
def contact():
    return render_template('static_page.html', page='contact', logged_in='user_id' in session)

@app.route('/privacy')
def privacy():
    return render_template('static_page.html', page='privacy', logged_in='user_id' in session)

@app.route('/terms')
def terms():
    return render_template('static_page.html', page='terms', logged_in='user_id' in session)


init_db()

if __name__ == '__main__':
    app.run(debug=True)