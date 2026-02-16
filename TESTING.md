# 🧪 Testing wickbot

## Quick Test (Dry-Run Mode)

**No real trades will be executed.**

### 1. Setup

```bash
cd /home/j/.openclaw/wickbot

# Install dependencies
npm install

# Create wallet (needed for position tracking)
solana-keygen new --outfile wallets/wickbot_wallet.json
```

### 2. Configure Birdeye API Key

Get a free API key from: https://birdeye.so

**Option A: Environment variable**
```bash
export BIRDEYE_API_KEY="your-key-here"
```

**Option B: Edit config.mjs**
```javascript
// In config.mjs, line ~27
BIRDEYE_API_KEY: 'your-key-here',
```

### 3. Run Test

```bash
npm test
```

This will:
- ✅ Fetch real SOL/USDC candle data
- ✅ Build multi-timeframe analysis
- ✅ Detect patterns (hammer, engulfing, etc.)
- ✅ Calculate indicators (RSI, MACD, Volume)
- ✅ Generate BUY/SELL signals
- ❌ NOT execute actual trades

**Expected output:**
```
🕯️  wickbot starting...

💰 Starting Capital: 1.0000 SOL (~$200.00)
📊 Trading Pair: SOL/USDC
⚙️  Strategy: Buy lows, Sell highs (Pattern-based)
📈 Timeframes: 1m, 5m, 15m, 30m, 1h
🎯 Position Size: 20% (~0.2000 SOL)
✅ Take Profit: +10%
🛑 Stop Loss: -5%

🧪 DRY-RUN MODE: No real trades will be executed

🚀 Bot active - watching for signals...

[2026-02-15T20:45:00.000Z]
Signal: HOLD (Score: 45/100)

[2026-02-15T20:46:00.000Z]
Signal: BUY (Score: 75/100)
Patterns: hammer, bullish_engulfing
RSI (5m): 35.2

💰 BUY SIGNAL TRIGGERED (Score: 75)
   Reason: Patterns: hammer, bullish_engulfing | Indicators: RSI oversold, Volume spike
   Patterns: hammer, bullish_engulfing
   Position size: 0.2000 SOL
   🧪 DRY-RUN: Skipping actual trade
```

### 4. What to Look For

**Good signs:**
- ✅ Bot fetches candles successfully
- ✅ Patterns are detected on multiple timeframes
- ✅ Signals have clear reasoning
- ✅ Buy signals appear when RSI is low + bullish patterns
- ✅ Sell signals appear when RSI is high + bearish patterns

**Bad signs:**
- ❌ "No candle data received" (Birdeye API issue)
- ❌ All signals are HOLD with score 0 (pattern detection broken)
- ❌ Errors about missing modules (run `npm install`)

---

## Live Test (Small Position)

⚠️ **This executes real trades! Only proceed if:**
- ✅ Dry-run test passed
- ✅ You understand the risks
- ✅ Wallet is funded with 1+ SOL
- ✅ You're comfortable losing the test amount

### 1. Fund Wallet

```bash
# Get wallet address
solana address --keypair wallets/wickbot_wallet.json

# Send 1.1 SOL to that address
# (1 SOL for trading + 0.1 SOL for fees)
```

### 2. Verify Balance

```bash
solana balance --keypair wallets/wickbot_wallet.json
# Should show: ~1.1 SOL
```

### 3. Start Small Live Test

```bash
# Edit config.mjs first:
# - Set POSITION_SIZE_PCT: 10 (only 10% = 0.1 SOL per trade)
# - Set STARTING_CAPITAL_SOL: 1.0

# Then run (without DRY_RUN):
node bot.mjs
```

### 4. Monitor Output

Watch for:
- 💰 "BUY SIGNAL TRIGGERED" → Actual swap executes
- 💱 "Swapping 0.1 SOL → USDC" → Jupiter quote
- ✅ "Position opened: 20.00 USDC" → Trade confirmed
- 💎 "Position #1: +5.2% | Hold: 120s" → TP/SL monitoring
- 🎯 "TAKE PROFIT HIT!" → Auto-exit at +10%

### 5. Stop Bot

```bash
Ctrl+C
```

Positions will be tracked in `wickbot_state.json` and can be resumed.

---

## Emergency Stop

If bot is misbehaving:

```bash
# 1. Kill the bot
Ctrl+C

# 2. Check for open positions
cat wickbot_state.json

# 3. Manually close positions if needed
# (Use Jupiter UI: jup.ag)
```

---

## Troubleshooting

### "BIRDEYE_API_KEY not set"
- Get free key from birdeye.so
- Add to config.mjs or export as environment variable

### "Wallet not found"
```bash
solana-keygen new --outfile wallets/wickbot_wallet.json
```

### "No candle data received"
- Check Birdeye API status
- Verify API key is valid
- Check RPC_URL is working

### "Failed to get quote from Jupiter"
- Check internet connection
- Verify token addresses in config.mjs
- Jupiter may be rate-limiting (wait 30s and retry)

### "Transaction failed"
- Insufficient balance for fees
- Slippage too tight (increase in config)
- Network congestion (retry later)

---

## Next: Backtest on Historical Data

Coming soon: Test strategies on past data without risking real funds.

---

## Support

Issues? Check:
- README.md - Full project documentation
- TODO.md - Known limitations
- PROGRESS.md - Current status
