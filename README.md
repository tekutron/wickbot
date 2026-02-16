# 🕯️ wickbot

**Automated Candle Pattern Trading Bot for Solana**

Analyzes SOL/USDC price action across multiple timeframes, detects bullish/bearish candle patterns, and automatically executes trades to buy lows and sell highs.

---

## 🎯 Strategy

- **Token Pair:** SOL/USDC
- **Starting Capital:** 1 SOL
- **Timeframes:** 1m, 5m, 15m, 30m, 1h candles
- **Entry:** Buy lows based on bullish signals (hammer, engulfing, morning star, etc.)
- **Exit:** Sell when bearish signals trigger (shooting star, evening star, RSI overbought)
- **Safety:** Max profit cap (+25%) and safety stop (-20%) to prevent disasters
- **Mode:** Set and forget (automated)

---

## 🔥 Features

- ✅ **Multi-timeframe analysis** - Stronger signals when patterns align across timeframes
- ✅ **20+ pattern detectors** - Hammer, Engulfing, Doji, Three White Soldiers, etc.
- ✅ **Technical indicators** - RSI, MACD, Volume, Moving Averages
- ✅ **Signal scoring** - Weighted scores based on pattern strength + indicators
- ✅ **Auto-execution** - Jupiter Aggregator for best swap rates
- ✅ **Live dashboard** - Real-time chart with pattern markers and signals
- ✅ **Risk management** - Position sizing, max drawdown protection

---

## 📁 Project Structure

```
wickbot/
├── bot.mjs                    # Main bot loop
├── config.mjs                 # Configuration
├── data/
│   ├── birdeye-api.mjs       # Fetch OHLCV data from Birdeye
│   └── candle-builder.mjs    # Build multi-timeframe candles
├── patterns/
│   ├── detectors.mjs         # Pattern detection (hammer, engulfing, etc.)
│   ├── indicators.mjs        # Technical indicators (RSI, MACD, etc.)
│   └── signals.mjs           # Signal generation & scoring
├── executor/
│   ├── jupiter-swap.mjs      # Jupiter swap execution
│   └── position-manager.mjs  # Track positions, P&L, capital
├── dashboard/
│   ├── server.mjs            # WebSocket server for live updates
│   ├── index.html            # Dashboard UI
│   └── chart.js              # Lightweight Charts setup
├── test/
│   └── test-patterns.mjs     # Pattern detection tests
└── wallets/
    └── wickbot_wallet.json   # Dedicated trading wallet
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Wallet
```bash
# Generate a new Solana wallet for wickbot
solana-keygen new --outfile wallets/wickbot_wallet.json

# Fund it with 1 SOL + some for fees (~1.1 SOL total)
# Send SOL to: <wallet address>
```

### 3. Configure
Edit `config.mjs`:
- Add Birdeye API key (free at birdeye.so)
- Set risk parameters (max position size, stop loss %)
- Adjust pattern weights and indicator thresholds

### 4. Run Bot
```bash
npm start
```

### 5. Open Dashboard
```bash
npm run dashboard
# Open http://localhost:3000
```

---

## 📊 How It Works

### Data Flow
1. **Fetch 1m candles** from Birdeye (SOL/USDC)
2. **Aggregate to 5m, 15m, 30m, 1h** candles
3. **Detect patterns** on all timeframes
4. **Calculate indicators** (RSI, MACD, volume profile)
5. **Score signals** (pattern + indicator confluence)
6. **Execute trade** if signal > threshold
7. **Update dashboard** with live chart + markers

### Signal Generation
- **BUY Signal:** Bullish pattern + RSI < 40 + volume spike
- **SELL Signal:** Bearish pattern + RSI > 60 OR take profit reached
- **Multi-timeframe boost:** Pattern on 1m + 5m + 15m = stronger signal

### Risk Management
- **Position size:** 20% of capital per trade (0.2 SOL max)
- **Stop loss:** -5% from entry
- **Take profit:** +10% from entry
- **Max drawdown:** Stop trading if capital drops 30%

---

## 🕯️ Supported Patterns

### Bullish (Buy Signals)
- Hammer
- Inverted Hammer
- Bullish Engulfing
- Bullish Harami
- Morning Star
- Three White Soldiers
- Piercing Pattern
- Dragonfly Doji

### Bearish (Sell Signals)
- Shooting Star
- Hanging Man
- Bearish Engulfing
- Bearish Harami
- Evening Star
- Three Black Crows
- Dark Cloud Cover
- Gravestone Doji

### Neutral (Confirmation)
- Doji
- Spinning Top
- Long-Legged Doji

---

## 📈 Technical Indicators

- **RSI** - Relative Strength Index (oversold/overbought)
- **MACD** - Moving Average Convergence Divergence (momentum)
- **Volume** - Volume spikes confirm patterns
- **MA** - Moving Averages (trend direction)
- **Bollinger Bands** - Volatility and support/resistance

---

## ⚙️ Configuration

Key settings in `config.mjs`:

```javascript
export const config = {
  // Trading
  PAIR: 'SOL/USDC',
  STARTING_CAPITAL_SOL: 1,
  POSITION_SIZE_PCT: 20,  // 20% of capital per trade
  TAKE_PROFIT_PCT: 10,     // +10% exit
  STOP_LOSS_PCT: 5,        // -5% exit
  MAX_DRAWDOWN_PCT: 30,    // Stop if -30% total
  
  // Timeframes
  CANDLE_TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h'],
  PRIMARY_TIMEFRAME: '5m',
  
  // Signals
  MIN_SIGNAL_SCORE: 70,    // 0-100 scale (70+ = trade)
  MULTI_TIMEFRAME_BOOST: 20, // Extra points for cross-timeframe patterns
  
  // Data
  BIRDEYE_API_KEY: 'your-api-key',
  POLL_INTERVAL_MS: 60000, // Fetch new candles every 60s
  
  // Wallet
  WALLET_PATH: './wallets/wickbot_wallet.json'
};
```

---

## 📊 Dashboard

The live dashboard shows:
- **Chart:** SOL/USDC price with candles
- **Pattern markers:** Visual indicators where patterns were detected
- **Signals:** Current BUY/SELL signal strength
- **Positions:** Open positions, entry price, current P&L
- **Stats:** Win rate, total trades, capital, P&L

Access at: `http://localhost:3000`

---

## 🧪 Testing

Test pattern detection without trading:

```bash
npm test
```

This runs the pattern detectors on historical data and shows what would have been detected.

---

## 🛡️ Safety

- **Dedicated wallet** - Don't use your main wallet
- **Capital limits** - Starts with 1 SOL, max 0.2 SOL per trade
- **Stop loss** - Hard -5% exit on all trades
- **Max drawdown** - Stops trading if capital drops 30%
- **No leverage** - Spot trading only

---

## 🔧 Development Status

### Phase 1: Core (In Progress)
- [x] Project setup
- [ ] Birdeye API integration
- [ ] Candle builder (1m → multi-timeframe)
- [ ] Pattern detectors (20+ patterns)
- [ ] Indicators (RSI, MACD, volume)
- [ ] Signal generator

### Phase 2: Execution
- [ ] Jupiter swap integration
- [ ] Position manager
- [ ] Risk management

### Phase 3: Dashboard
- [ ] WebSocket server
- [ ] Lightweight Charts setup
- [ ] Pattern markers
- [ ] Live P&L display

---

## 📚 Resources

- [Birdeye API Docs](https://docs.birdeye.so)
- [Jupiter Aggregator](https://jup.ag)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- [Candlestick Patterns Guide](https://www.investopedia.com/trading/candlestick-charting-what-is-it/)

---

## 📝 License

MIT License - See LICENSE file

---

## 🤝 Contributing

This is a personal trading bot project. Not accepting contributions at this time.

---

## ⚠️ Disclaimer

**This bot trades real money.** Use at your own risk. Past performance doesn't guarantee future results. Only trade what you can afford to lose. Not financial advice.

---

**Built with 🕯️ by Dogesy**
