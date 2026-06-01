import requests
import re

US_TICKERS = {'AAPL', 'MSFT', 'TSLA', 'GOOG', 'GOOGL', 'NVDA', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'BABA', 'SPY', 'QQQ', 'DIA', 'IWM'}

KNOWN_TICKERS = {
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN",
    "BHARTIARTL", "LT", "ITC", "TMCV", "TMPV", "AXISBANK",
    "KOTAKBANK", "HINDUNILVR", "WIPRO", "MARUTI", "BAJFINANCE",
    "SUNPHARMA", "IDEA", "VBL", "ADANIENT", "NIFTY50", "NIFTYBANK", "SENSEX",
    "AAPL", "MSFT", "TSLA", "GOOG", "GOOGL", "NVDA", "AMZN", "META", "NFLX",
    "AMD", "INTC", "BABA", "SPY", "QQQ", "DIA", "IWM"
}

NAME_TO_TICKER = {
    "nifty 50": "NIFTY50.NSE",
    "nifty50": "NIFTY50.NSE",
    "nifty": "NIFTY50.NSE",
    "nifty bank": "NIFTYBANK.NSE",
    "niftybank": "NIFTYBANK.NSE",
    "bank nifty": "NIFTYBANK.NSE",
    "banknifty": "NIFTYBANK.NSE",
    "sensex": "SENSEX.BSE",
    "bse sensex": "SENSEX.BSE",
    "reliance": "RELIANCE.NSE",
    "reliance industries": "RELIANCE.NSE",
    "tcs": "TCS.NSE",
    "tata consultancy": "TCS.NSE",
    "infosys": "INFY.NSE",
    "infy": "INFY.NSE",
    "hdfc": "HDFCBANK.NSE",
    "hdfc bank": "HDFCBANK.NSE",
    "icici": "ICICIBANK.NSE",
    "icici bank": "ICICIBANK.NSE",
    "sbi": "SBIN.NSE",
    "state bank": "SBIN.NSE",
    "suzlon": "SUZLON.NSE",
    "tata motors": "TATAMOTORS.NSE",
    "wipro": "WIPRO.NSE",
    "bharti airtel": "BHARTIARTL.NSE",
    "airtel": "BHARTIARTL.NSE",
    "l&t": "LT.NSE",
    "larsen": "LT.NSE",
    "itc": "ITC.NSE",
    "axis": "AXISBANK.NSE",
    "axis bank": "AXISBANK.NSE",
    "kotak": "KOTAKBANK.NSE",
    "kotak bank": "KOTAKBANK.NSE",
    "hindustan unilever": "HINDUNILVR.NSE",
    "hul": "HINDUNILVR.NSE",
    "maruti": "MARUTI.NSE",
    "bajaj finance": "BAJFINANCE.NSE",
    "sun pharma": "SUNPHARMA.NSE",
    "idea": "IDEA.NSE",
    "vodafone": "IDEA.NSE",
    "vbl": "VBL.NSE",
    "adani": "ADANIENT.NSE",
    "adani enterprises": "ADANIENT.NSE",
    "apple": "AAPL",
    "microsoft": "MSFT",
    "tesla": "TSLA",
    "google": "GOOG",
    "nvidia": "NVDA"
}

class Chatbot:
    def __init__(self):
        # API keys 
        self.alpha_vantage_api_key = "SAG8H3CTU5377P5V"  
        self.newsapi_key = "50dcf43690214250b84a164a5c52fc33" 

        self.responses = {
            # Greeting Questions
            "hi": "Hello! How can I assist you today? ",
            "hello": "Hi there! What would you like to know? I can help with stock prices, market questions, or navigating RP Finance.",
            "hey": "Hey! I’m here to help.",
            "how are you": "I’m doing great, thanks for asking! How about you—how can I help with your investing today?",
            "howdy": "Howdy! What’s on your mind? Want to check a stock price or learn about RP Finance?",

            # Stock Market Questions
            "what is the stock market": "The stock market is a marketplace where shares of publicly traded companies are bought and sold. It’s driven by supply and demand, with prices reflecting investor confidence and economic conditions.",
            "how does the stock market work": "The stock market operates through exchanges like the NYSE or NASDAQ, where companies issue shares to raise capital. Investors trade these shares, and prices change based on performance, news, and market trends.",
            "what is a stock": "A stock is a share of ownership in a company. Buying a stock means you own a piece of that company and may earn profits through price appreciation or dividends.",
            "what is a bull market": "A bull market occurs when stock prices are rising or expected to rise, often due to strong economic growth or investor optimism.",
            "what is a bear market": "A bear market is when stock prices are falling or expected to fall, typically during economic downturns or widespread pessimism.",
            "how do i start investing": "To start investing, sign up on RP Finance, add funds to your account, and use our tools like Portfolio and Algo Trading. Research stocks, define your goals, and begin with small investments.",
            "what affects stock prices": "Stock prices are influenced by company earnings, economic indicators (e.g., interest rates, inflation), news events, geopolitical factors, and investor sentiment.",
            "what is a dividend": "A dividend is a payment made by a company to its shareholders, usually from profits, as a reward for owning the stock.",
            "what is a p/e ratio": "The P/E (Price-to-Earnings) ratio measures a company’s stock price relative to its earnings per share. It helps investors assess if a stock is overvalued or undervalued.",
            "what is market capitalization": "Market capitalization (market cap) is the total value of a company’s outstanding shares, calculated as stock price times number of shares. It indicates a company’s size.",
            "what is an ipo": "An IPO (Initial Public Offering) is when a private company first sells shares to the public, becoming a publicly traded company.",
            "what is a stock split": "A stock split increases the number of shares outstanding by dividing existing shares (e.g., 2-for-1). It lowers the price per share but doesn’t change the company’s total value.",
            "what is short selling": "Short selling is when you borrow and sell a stock you don’t own, betting its price will drop so you can buy it back cheaper and profit from the difference.",
            "what is a stock index": "A stock index tracks the performance of a group of stocks, like the S&P 500 or Dow Jones, giving a snapshot of market trends.",
            "what is volatility": "Volatility measures how much a stock’s price fluctuates over time. High volatility means bigger price swings, often tied to risk.",

            # RP Finance Website Questions
            "what is xai finance": "RP Finance is your platform for smart investing, offering AI-powered tools like real-time stock tracking, algorithmic trading, educational tutorials, and market news.",
            "how do i use xai finance": "After signing up or logging in, navigate the Dashboard for an overview, Portfolio to manage holdings, Watchlist to track stocks, Algo Trading for automation, Tutorials to learn, and News for updates.",
            "what can i do on xai finance": "You can monitor your portfolio, automate trades with algo strategies, learn trading basics, stay informed with news, and manage a watchlist—all enhanced by AI insights.",
            "how do i set up algo trading": "Visit the Algo Trading page, input a stock ticker and moving average periods (short and long), then run the strategy to generate buy/sell signals based on historical data.",
            "is xai finance free": "Basic features like tutorials and news are free. Advanced tools like algo trading may require a subscription—details will be on our pricing page soon!",
            "how do i contact xai finance": "Check the Contact page for our email (support@rpfinance.com), phone (+1 555-123-4567), or address (123 Finance St, Tech City, TC 45678).",
            "what is the privacy policy": "Our Privacy Policy details how we collect, use, and secure your data. See the Privacy page for the full policy.",
            "what are the terms of use": "The Terms of Use outline rules for using RP Finance, including risk disclaimers. Visit the Terms page for more.",
            "how do i add a stock to my watchlist": "On the Dashboard or Watchlist page, enter a ticker symbol in the input field and click 'Add' to track it.",
            "how do i check my portfolio": "Go to the Portfolio page to see your holdings, including stock tickers, shares, current prices, and gains/losses.",
            "what tutorials are available": "Our Tutorials page offers guides on stock trading basics, portfolio building, algo trading, and market news analysis.",
            "how do i log in": "Click 'Login' in the top-right corner, enter your username and password, and submit to access your account.",
            "how do i sign up": "Click 'Sign Up' in the top-right corner, provide a username, password, and optional starting balance, then submit to create an account.",
            "how do i reset my password": "Password reset isn’t available yet—contact support@rpfinance.com for assistance.",
            "what news can i find": "The News page provides updates on stock market trends, company announcements, and economic events.",
            "how do i see stock prices": "Use the Dashboard or Portfolio page for real-time prices, or ask me a stock ticker (e.g., 'AAPL') for detailed info!",

            # Navigation Through Website Questions
            "how do i go to the dashboard": "Click 'Dashboard' in the top navigation bar to see your account overview, balance, portfolio summary, and watchlist.",
            "how do i get to the portfolio page": "Click 'Portfolio' in the top navigation bar to view your stock holdings, current prices, and performance metrics.",
            "how do i navigate to the watchlist": "Click 'Watchlist' in the top navigation bar to see and manage the stocks you’re tracking.",
            "how do i find the algo trading page": "Click 'Algo Trading' in the top navigation bar to access tools for setting up automated trading strategies.",
            "how do i access tutorials": "Click 'Tutorials' in the top navigation bar to explore educational content on trading and investing.",
            "how do i check the news": "Click 'News' in the top navigation bar to read the latest stock market updates and articles.",
            "how do i get to the about page": "Click 'About' in the footer to learn more about RP Finance’s mission and features.",
            "how do i find the contact page": "Click 'Contact' in the footer to see our email, phone, and address for support.",
            "how do i view the privacy policy": "Click 'Privacy Policy' in the footer to read how we handle your data.",
            "how do i see the terms of use": "Click 'Terms of Use' in the footer to review the rules for using RP Finance.",
            "how do i log out": "If you’re logged in, click 'Logout' in the top-right corner to exit your account.",
            "where is the search bar": "The search bar is in the top-right corner of every page, next to the magnifying glass icon—use it to search stocks.",

            # Smart Custom Responses
            "best stocks to buy": "Based on our **AI Research Recommendations**, here are the top picks with strong indicators:\n- **RELIANCE.NSE** (Target: ₹1538.50, Stop Loss: ₹1280.00, Expected Profit: +13.2%)\n- **TCS.NSE** (Target: ₹2560.00, Stop Loss: ₹2180.00, Expected Profit: +11.5%)\n- **SUZLON.NSE** (Target: ₹65.83, Stop Loss: ₹49.13, Expected Profit: +14.43%)\n\nYou can view full details and trade them on the [Dashboard](/) page!",
            "recommendations": "Based on our **AI Research Recommendations**, here are the top picks with strong indicators:\n- **RELIANCE.NSE** (Target: ₹1538.50, Stop Loss: ₹1280.00, Expected Profit: +13.2%)\n- **TCS.NSE** (Target: ₹2560.00, Stop Loss: ₹2180.00, Expected Profit: +11.5%)\n- **SUZLON.NSE** (Target: ₹65.83, Stop Loss: ₹49.13, Expected Profit: +14.43%)\n\nYou can view full details and trade them on the [Dashboard](/) page!",
            "buy stocks": "Based on our **AI Research Recommendations**, here are the top picks with strong indicators:\n- **RELIANCE.NSE** (Target: ₹1538.50, Stop Loss: ₹1280.00, Expected Profit: +13.2%)\n- **TCS.NSE** (Target: ₹2560.00, Stop Loss: ₹2180.00, Expected Profit: +11.5%)\n- **SUZLON.NSE** (Target: ₹65.83, Stop Loss: ₹49.13, Expected Profit: +14.43%)\n\nYou can view full details and trade them on the [Dashboard](/) page!",
            "stock suggestion": "Based on our **AI Research Recommendations**, here are the top picks with strong indicators:\n- **RELIANCE.NSE** (Target: ₹1538.50, Stop Loss: ₹1280.00, Expected Profit: +13.2%)\n- **TCS.NSE** (Target: ₹2560.00, Stop Loss: ₹2180.00, Expected Profit: +11.5%)\n- **SUZLON.NSE** (Target: ₹65.83, Stop Loss: ₹49.13, Expected Profit: +14.43%)\n\nYou can view full details and trade them on the [Dashboard](/) page!",
            
            "how to use algo trading": "To setup **Algo Trading**:\n- Go to the [Algo Trading](/algo_trading) page.\n- Enter a stock ticker (e.g., **RELIANCE.NSE**).\n- Input the Short Moving Average (e.g., 20) and Long Moving Average (e.g., 50) periods.\n- Click **Run Backtest** to see historical signals, accuracy, and price forecasting!",
            "setup algo": "To setup **Algo Trading**:\n- Go to the [Algo Trading](/algo_trading) page.\n- Enter a stock ticker (e.g., **RELIANCE.NSE**).\n- Input the Short Moving Average (e.g., 20) and Long Moving Average (e.g., 50) periods.\n- Click **Run Backtest** to see historical signals, accuracy, and price forecasting!",
            "algo trading": "To setup **Algo Trading**:\n- Go to the [Algo Trading](/algo_trading) page.\n- Enter a stock ticker (e.g., **RELIANCE.NSE**).\n- Input the Short Moving Average (e.g., 20) and Long Moving Average (e.g., 50) periods.\n- Click **Run Backtest** to see historical signals, accuracy, and price forecasting!",
            "automated trading": "To setup **Algo Trading**:\n- Go to the [Algo Trading](/algo_trading) page.\n- Enter a stock ticker (e.g., **RELIANCE.NSE**).\n- Input the Short Moving Average (e.g., 20) and Long Moving Average (e.g., 50) periods.\n- Click **Run Backtest** to see historical signals, accuracy, and price forecasting!",
            
            "check my portfolio": "You can monitor all your active stock holdings, average buy prices, current market values, and real-time profit/loss percentages on the [Portfolio](/portfolio) page. If you are not logged in, please [Login](/auth?mode=login) to trade!",
            "my portfolio": "You can monitor all your active stock holdings, average buy prices, current market values, and real-time profit/loss percentages on the [Portfolio](/portfolio) page. If you are not logged in, please [Login](/auth?mode=login) to trade!",
            "portfolio holdings": "You can monitor all your active stock holdings, average buy prices, current market values, and real-time profit/loss percentages on the [Portfolio](/portfolio) page. If you are not logged in, please [Login](/auth?mode=login) to trade!",
            "show my portfolio": "You can monitor all your active stock holdings, average buy prices, current market values, and real-time profit/loss percentages on the [Portfolio](/portfolio) page. If you are not logged in, please [Login](/auth?mode=login) to trade!",
            
            "how to buy": "To buy or sell stocks on RP Finance:\n- Search for any stock in the top navbar search bar.\n- Click the search result to open the detailed stock analysis page.\n- Enter the number of shares in the Trade Panel on the right and click **Buy** or **Sell**.\n- Make sure you are [Logged In](/auth?mode=login) and have sufficient cash balance.",
            "how to trade": "To buy or sell stocks on RP Finance:\n- Search for any stock in the top navbar search bar.\n- Click the search result to open the detailed stock analysis page.\n- Enter the number of shares in the Trade Panel on the right and click **Buy** or **Sell**.\n- Make sure you are [Logged In](/auth?mode=login) and have sufficient cash balance.",
            "place order": "To buy or sell stocks on RP Finance:\n- Search for any stock in the top navbar search bar.\n- Click the search result to open the detailed stock analysis page.\n- Enter the number of shares in the Trade Panel on the right and click **Buy** or **Sell**.\n- Make sure you are [Logged In](/auth?mode=login) and have sufficient cash balance.",
            "buy stock": "To buy or sell stocks on RP Finance:\n- Search for any stock in the top navbar search bar.\n- Click the search result to open the detailed stock analysis page.\n- Enter the number of shares in the Trade Panel on the right and click **Buy** or **Sell**.\n- Make sure you are [Logged In](/auth?mode=login) and have sufficient cash balance.",
            
            "watchlist": "You can track your favorite stocks in one place, view their live prices, and instantly see their daily gains/losses on the [Watchlist](/watchlist) page.",
            "show my watchlist": "You can track your favorite stocks in one place, view their live prices, and instantly see their daily gains/losses on the [Watchlist](/watchlist) page.",
            "check my watchlist": "You can track your favorite stocks in one place, view their live prices, and instantly see their daily gains/losses on the [Watchlist](/watchlist) page.",
            
            "help": "I can assist you with:\n- Stock Prices: Ask for any Indian/US stock (e.g., 'TCS', 'AAPL') or index ('Nifty 50').\n- Market Research: Ask for 'Best stocks to buy'.\n- Automation: Ask for 'Algo Trading'.\n- Navigation: Ask how to reach the Portfolio, Watchlist, or Tutorials page.",
            "menu": "I can assist you with:\n- Stock Prices: Ask for any Indian/US stock (e.g., 'TCS', 'AAPL') or index ('Nifty 50').\n- Market Research: Ask for 'Best stocks to buy'.\n- Automation: Ask for 'Algo Trading'.\n- Navigation: Ask how to reach the Portfolio, Watchlist, or Tutorials page.",
            "what can you do": "I can assist you with:\n- Stock Prices: Ask for any Indian/US stock (e.g., 'TCS', 'AAPL') or index ('Nifty 50').\n- Market Research: Ask for 'Best stocks to buy'.\n- Automation: Ask for 'Algo Trading'.\n- Navigation: Ask how to reach the Portfolio, Watchlist, or Tutorials page.",

            # Contextual Follow-ups
            "tell me more": "Can you specify what you’d like to know more about? I can tell you about the stock market, RP Finance features, or navigation!",
            "what else": "What else are you curious about? I can explain stock terms, website features, or how to navigate the site."
        }

        # List of suggested questions for fallback
        self.suggestions = [
            "What is the stock market?",
            "Show NIFTY 50 price",
            "Best stocks to buy",
            "How to use Algo Trading",
            "Check my portfolio",
            "How do I buy stock?"
        ]

        # Track the last response for contextual follow-ups
        self.last_response = None

    def normalize_ticker(self, ticker):
        if not ticker:
            return ""
        ticker = ticker.upper().strip()
        if ticker.startswith("TATAMOTORS"):
            ticker = ticker.replace("TATAMOTORS", "TMCV")
        if ticker in US_TICKERS:
            return ticker
        if not (ticker.endswith('.NSE') or ticker.endswith('.BSE')):
            ticker = f"{ticker}.NSE"
        return ticker

    def extract_ticker(self, query_str):
        query_lower = query_str.lower().strip()
        # Scan for common index/company names first
        for name, tk in NAME_TO_TICKER.items():
            # Check if name exists as a word or substring in the query
            if re.search(r'\b' + re.escape(name) + r'\b', query_lower):
                return tk

        # Find all alphanumeric words
        words = re.findall(r'[a-zA-Z0-9\.\^]+', query_str)
        
        # Check known tickers case-insensitively
        for w in words:
            w_upper = w.upper()
            if w_upper in KNOWN_TICKERS:
                return w_upper
            if any(w_upper.endswith(sfx) for sfx in ['.NSE', '.BSE', '.NS', '.BO']):
                return w_upper
                
        # Check for uppercase word of length 2-10 in original query (excluding common words)
        common_words = {"HI", "HELLO", "HEY", "HOW", "ARE", "YOU", "THE", "AND", "FOR", "BUY", "SELL", "STOCK", "PRICE"}
        for w in words:
            if w.isupper() and 2 <= len(w) <= 10 and w not in common_words:
                return w
                
        return None

    def get_stock_details(self, ticker):
        """Fetch and format stock details from Live Feed or dynamically from yfinance."""
        ticker = self.normalize_ticker(ticker)
        
        # If not in live_feed, let's try to fetch it dynamically via yfinance and add it
        if hasattr(self, 'live_feed') and self.live_feed and ticker not in self.live_feed:
            if getattr(self, 'use_simulated_data', False):
                try:
                    import random
                    try:
                        from app import INDIAN_COMPANIES, US_COMPANIES
                    except ImportError:
                        INDIAN_COMPANIES = {}
                        US_COMPANIES = {}
                    base = ticker.split('.')[0]
                    company_name = INDIAN_COMPANIES.get(base, US_COMPANIES.get(base, base))
                    is_index = base in ['NIFTY50', 'NIFTYBANK', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY']
                    if ticker.endswith('.NSE'):
                        display_name = f"{company_name} (NSE)" if not is_index else company_name
                    elif ticker.endswith('.BSE'):
                        display_name = f"{company_name} (BSE)" if not is_index else company_name
                    else:
                        display_name = company_name
                        
                    random.seed(hash(ticker))
                    price = round(random.uniform(50.0, 2000.0), 2)
                    prev_close = round(price * random.uniform(0.95, 1.05), 2)
                    change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
                    
                    self.live_feed[ticker] = {
                        "ticker": ticker,
                        "name": display_name,
                        "price": price,
                        "yf_price": price,
                        "change": change_pct,
                        "open": prev_close,
                        "high": round(max(price, prev_close) * 1.02, 2),
                        "low": round(min(price, prev_close) * 0.98, 2),
                        "prev_close": prev_close,
                        "previous_close": prev_close,
                        "volume": f"{random.randint(10000, 500000):,}",
                        "low_52week": round(price * 0.7, 2),
                        "high_52week": round(price * 1.3, 2),
                        "pe_ratio": f"{random.uniform(10.0, 45.0):.2f}",
                        "price_to_book": f"{random.uniform(1.5, 8.0):.2f}",
                        "dividend_yield": f"{random.uniform(0.0, 5.0):.2f}%",
                        "description": f"{display_name} stock representational data for offline / cloud environment."
                    }
                    random.seed()
                except Exception:
                    pass
            else:
                import yfinance as yf
                try:
                    base = ticker.split('.')[0]
                    if base == 'NIFTY50': yf_sym = '^NSEI'
                    elif base == 'NIFTYBANK': yf_sym = '^NSEBANK'
                    elif base == 'SENSEX': yf_sym = '^BSESN'
                    elif ticker.endswith('.NSE'): yf_sym = ticker.replace('.NSE', '.NS')
                    elif ticker.endswith('.BSE'): yf_sym = ticker.replace('.BSE', '.BO')
                    else: yf_sym = ticker
                    
                    t = yf.Ticker(yf_sym)
                    info = t.info
                    price = info.get('currentPrice', info.get('regularMarketPrice'))
                    if price is not None:
                        price = float(price)
                        prev_close = float(info.get('previousClose', info.get('regularMarketPreviousClose', price)))
                        change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
                        name = info.get('shortName', ticker)
                        
                        vol_raw = info.get('volume', info.get('regularMarketVolume', 0))
                        vol_str = f"{int(vol_raw):,}" if vol_raw else "N/A"
                        
                        pe = info.get('trailingPE')
                        pe_str = f"{pe:.2f}" if pe else "N/A"
                        
                        pb = info.get('priceToBook')
                        pb_str = f"{pb:.2f}" if pb else "N/A"
                        
                        div = info.get('dividendYield')
                        div_str = f"{div * 100:.2f}%" if div else "0.00%"
                        
                        self.live_feed[ticker] = {
                            "ticker": ticker,
                            "name": name,
                            "price": price,
                            "yf_price": price,
                            "change": change_pct,
                            "open": float(info.get('open', price)),
                            "high": float(info.get('dayHigh', price)),
                            "low": float(info.get('dayLow', price)),
                            "prev_close": prev_close,
                            "previous_close": prev_close,
                            "volume": vol_str,
                            "low_52week": float(info.get('fiftyTwoWeekLow', price * 0.8)),
                            "high_52week": float(info.get('fiftyTwoWeekHigh', price * 1.2)),
                            "pe_ratio": pe_str,
                            "price_to_book": pb_str,
                            "dividend_yield": div_str,
                            "description": info.get('longBusinessSummary', f"{name} stock.")
                        }
                except Exception as e:
                    print(f"Chatbot dynamic fetch error for {ticker}: {e}")
                
        if hasattr(self, 'live_feed') and self.live_feed and ticker in self.live_feed:
            data = self.live_feed[ticker]
            try:
                price_val = float(data['price'])
                prev_close_val = float(data['prev_close'])
                change_val = float(data['change'])
                high_val = float(data['high'])
                low_val = float(data['low'])
                high_52 = float(data['high_52week'])
                low_52 = float(data['low_52week'])
            except:
                price_val = data.get('price', 0.0)
                prev_close_val = data.get('prev_close', 0.0)
                change_val = data.get('change', 0.0)
                high_val = data.get('high', 0.0)
                low_val = data.get('low', 0.0)
                high_52 = data.get('high_52week', 0.0)
                low_52 = data.get('low_52week', 0.0)
                
            response = (
                f"Here’s the latest info for {data['name']} ({ticker}):\n"
                f"- Current Price: ₹{price_val:.2f}\n"
                f"- Previous Close: ₹{prev_close_val:.2f}\n"
                f"- Change: {change_val:+.2f}%\n"
                f"- P/E Ratio: {data.get('pe_ratio', 'N/A')}\n"
                f"- Price to Book: {data.get('price_to_book', 'N/A')}\n"
                f"- Dividend Yield: {data.get('dividend_yield', 'N/A')}\n"
                f"- Volume: {data.get('volume', 'N/A')}\n"
                f"- Day High: ₹{high_val:.2f}\n"
                f"- Day Low: ₹{low_val:.2f}\n"
                f"- 52-Week High: ₹{high_52:.2f}\n"
                f"- 52-Week Low: ₹{low_52:.2f}"
            )
            return response
        return f"Sorry, I couldn’t find data for '{ticker}' in our list."

    def get_response(self, query):
        print(f"Received query: '{query}'")
        raw_query = query
        query = query.lower().strip()
        print(f"Normalized query: '{query}'")

        if not query:
            self.last_response = "Please ask a more detailed question or give me a stock ticker (e.g., 'AAPL')!"
            return self.last_response

        if query in ["tell me more", "more info", "go on"] and self.last_response:
            self.last_response = "Can you specify what you’d like to know more about? I just told you: " + self.last_response[:50] + "..."
            return self.last_response
        elif query in ["what else", "anything else"] and self.last_response:
            self.last_response = "What else interests you? I can dive deeper into stocks, RP Finance tools, or navigation tips."
            return self.last_response

        # Check for exact matches first (e.g., "hi", "hello")
        if query in self.responses:
            print(f"Exact match found for query: '{query}'")
            self.last_response = self.responses[query]
            return self.last_response

        for key in self.responses:
            if key in query:
                print(f"Partial match found: '{key}' in '{query}'")
                self.last_response = self.responses[key]
                return self.last_response

        # Try to extract a ticker from the raw query
        ticker = self.extract_ticker(raw_query)
        if ticker:
            print(f"Detected ticker: {ticker}")
            self.last_response = self.get_stock_details(ticker)
            return self.last_response

        suggestions_text = "Here are some things you can ask me:\n- " + "\n- ".join(self.suggestions)
        self.last_response = f"I’m not sure how to answer '{query}'. {suggestions_text}"
        print(f"No match found for query: '{query}'. Returning fallback response.")
        return self.last_response

# Example usage (for testing outside Flask)
if __name__ == "__main__":
    chatbot = Chatbot()
    test_queries = [
        "hi",
        "hello",
        "how are you",
        "What is the stock market?",
        "How do I go to the Dashboard?",
        "AAPL",
        "Tell me more",
        "MSFT",
        "How do I check the news?"
    ]
    for q in test_queries:
        print(f"\nQuery: {q}")
        print(f"Response: {chatbot.get_response(q)}\n")