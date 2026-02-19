# ✅ Test Run Checklist - Aggressive Scalping Mode

**Date:** 2026-02-18 17:15 PST  
**Mode:** Aggressive Scalping  
**Token:** CWIF (Chinese wif)

---

## Pre-Flight Status

### ✅ All Changes Saved
- [x] Git committed: `54c391f`
- [x] Git pushed to: `github.com/tekutron/wickbot.git`
- [x] Memory logged: `workspace/memory/2026-02-18.md`
- [x] Config updated: Aggressive mode active
- [x] Dashboard: Running on port 3000

### ✅ Configuration Verified
```javascript
// Aggressive Scalping Mode
MIN_BUY_CONFIDENCE: 50      ✅ (was 67)
MIN_SELL_CONFIDENCE: 50     ✅ (was 60)
RSI_DIP_THRESHOLD: 45       ✅ (was 35)
RSI_TOP_THRESHOLD: 55       ✅ (was 65)
MIN_CANDLE_BODY_PCT: 0.2    ✅ (was 0.5)
PRIORITY_FEE: 0.001 SOL     ✅

// Capital
STARTING_CAPITAL_SOL: 0.207 ✅
POSITION_SIZE_PCT: 40       ✅ (~$7.14/trade)

// Token
CUSTOM_TOKEN_ADDRESS: GjAVDGJs2gP4QzaKT9qvJ4Q47mjP9G2URsKcDAMPpump ✅
CUSTOM_TOKEN_SYMBOL: CWIF   ✅
```

---

## Test Objectives

### Primary Goals
1. ✅ **Verify aggressive mode catches dips faster**
   - Watch for BUY signals with 3/6 conditions
   - Check RSI 40-45 range triggers entries
   
2. ✅ **Monitor signal feed in dashboard**
   - Confirm reasons display correctly
   - Watch confidence percentages
   
3. ✅ **Track first 5-10 trades**
   - Entry price vs exit price
   - Hold time
   - Win rate

### Success Criteria
- ✅ Bot generates BUY signals (not just HOLD)
- ✅ Catches dips in 40-45 RSI range
- ✅ Dashboard shows live signals with reasons
- ✅ Win rate >40% (acceptable for aggressive mode)
- ✅ No errors in logs

---

## How to Start Test

### Option 1: Dashboard (Recommended)
1. Open: http://localhost:3000
2. Click "▶️ Start Bot"
3. Watch live signal feed

### Option 2: Terminal
```bash
cd /home/j/.openclaw/wickbot
node bot-fast.mjs
```

### Monitoring
- **Dashboard:** http://localhost:3000
  - Live signal feed (top section)
  - Position tracking (if trade opens)
  - Trade history table (bottom)

- **Console Log:**
  - Real-time signals
  - RSI values
  - Entry/exit confirmations

- **State File:** `wickbot_state.json`
  - Current capital
  - Open positions
  - Updated every cycle

---

## What to Watch For

### 🟢 Good Signs
- BUY signals triggering (3/6 conditions met)
- RSI 40-45 range entries
- Quick exits on tops (RSI >55)
- Reasons displayed in dashboard
- Clean logs (no errors)

### 🔴 Warning Signs
- Too many BUY signals (every cycle)
- False breakouts (buy → immediate loss)
- Win rate <30% after 10 trades
- Errors in console

### ⚪ Expected Behavior
- HOLD signals during flat markets
- "Waiting for stronger signal" messages
- Some false signals (normal in aggressive mode)

---

## Trade Tracking

### Track These Metrics
1. **Entry Conditions:** How many met? (3/6, 4/6, 5/6, 6/6)
2. **Entry RSI:** Actual RSI value at entry
3. **Hold Time:** How long until exit
4. **Exit Reason:** Signal, Safety TP, or Safety SL
5. **P&L:** Win/loss percentage

### After 5 Trades
Calculate:
- **Win Rate:** Wins / Total Trades
- **Avg P&L:** Total P&L / Trade Count
- **Avg Hold Time:** Total Minutes / Trade Count

### Decision Points
- **If Win Rate >50%:** Settings are good! ✅
- **If Win Rate 40-50%:** Acceptable for aggressive mode ⚠️
- **If Win Rate <40%:** Too aggressive, adjust:
  ```javascript
  MIN_BUY_CONFIDENCE: 50 → 58
  RSI_DIP_THRESHOLD: 45 → 40
  MIN_CANDLE_BODY_PCT: 0.2 → 0.3
  ```

---

## Emergency Controls

### Stop Bot
- Dashboard: "Stop Bot" button
- Terminal: Ctrl+C
- Emergency: `pkill -f bot-fast`

### Close Position Manually
- Dashboard: "Close Position" button
- Manual sell script: `./manual-sell.mjs`

### Revert to Conservative Mode
```bash
cd /home/j/.openclaw/wickbot
# Edit config.mjs, change to:
MIN_BUY_CONFIDENCE: 67
MIN_SELL_CONFIDENCE: 60
RSI_DIP_THRESHOLD: 35
RSI_TOP_THRESHOLD: 65
MIN_CANDLE_BODY_PCT: 0.5
```

---

## Expected Timeline

**First 5 Minutes:**
- Bot initializes indicators (100 candles)
- Generates HOLD signals (if market is flat)
- Dashboard shows live feed

**First 15 Minutes:**
- Should see at least 1-2 opportunities
- May see BUY signal if dip occurs
- Position opens (if conditions met)

**First Hour:**
- Goal: 2-5 trades (depends on volatility)
- Track win rate and P&L
- Adjust if needed

---

## Risk Management

**Position Size:** 40% = ~0.083 SOL (~$7.14)
- Small enough to test safely
- Large enough to see meaningful results
- Leaves 60% capital for more trades

**Safety Nets:** Still active
- Take Profit: +20% (safety cap)
- Stop Loss: -20% (safety cap)
- Primary exit: Signal-based

**Total Risk:** ~$7.14 per trade
- Max loss per trade: ~$1.43 (20% SL)
- Max capital at risk: ~$7.14 (one position)

---

## Status

- ✅ **All changes saved and committed**
- ✅ **Dashboard running** (port 3000)
- ✅ **Config verified** (aggressive mode)
- ✅ **Capital ready** (0.207 SOL)
- ✅ **Token configured** (CWIF)

**🚀 READY FOR TEST RUN!**

Start when ready - monitoring in progress! 📊
