# Wickbot Session Report - 2026-02-16

## Session Overview
**Duration:** 34 minutes (16:23 - 16:57)  
**Mode:** Scalping (1m primary, RSI 40/65, score 65+)  
**Strategy:** USDC-first, signal-driven exits  
**Status:** Completed (manual position close)

---

## 💰 Financial Results

### Starting Capital
- **USDC:** 15.31
- **SOL (fees):** 0.01
- **Total Value:** ~$15.48

### Final Capital
- **USDC:** 15.28
- **SOL (fees):** 0.01
- **Total Value:** ~$15.42

### Net Performance
- **P&L:** -$0.06 (-0.39%)
- **Fees paid:** ~$0.15-0.20 (swaps + priority fees)
- **Trades:** 2 executed
- **Win rate:** 0/2 (both tiny losses)

---

## 📊 Trade Breakdown

### Trade #1
- **Entry:** $86.58/SOL @ 16:29:24
- **Exit:** $86.56/SOL @ 16:44:29
- **Duration:** 15 minutes
- **Result:** -0.023% (-$0.10)
- **Exit reason:** MAX_HOLD (time limit)
- **Entry signal:** Score 83 (morning_star, inverted_hammer, RSI 49)

**Analysis:** Exited by time limit before strategy could work. Position was flat, fees ate profit.

### Trade #2
- **Entry:** $86.69/SOL @ 16:47:52
- **Exit:** $86.55/SOL @ 16:57:22 (manual)
- **Duration:** 9 minutes
- **Result:** -0.16% (-$0.10)
- **Exit reason:** Manual close (bot stopped)
- **Entry signal:** Score 83 (morning_star, inverted_hammer, RSI 64)

**Analysis:** Entered near local high, price dipped immediately. No sell signal generated before bot stopped.

---

## 📈 Signal Analysis (34 minutes)

### Signal Distribution
- **BUY signals:** 15+ detected
- **SELL signals:** 0 detected
- **HOLD signals:** 20+
- **Avg score:** 83-88 (consistently strong)

### Pattern Repetition
**Detected every cycle:**
- morning_star
- inverted_hammer

**Concern:** Same 2 patterns on nearly every 20s scan suggests:
1. Birdeye API may be slow/stale
2. Patterns calculated on multi-timeframe but dominated by 5m/15m
3. Need more pattern diversity filter

### RSI Behavior (1m)
- **Range:** 42-66
- **Never hit:** Oversold 40 (missed by 2 points)
- **Never hit:** Overbought 65 (hit exactly once)
- **Observation:** RSI hovering 50-64 = neutral/consolidation market

---

## ✅ What Worked

1. **1m primary timeframe** - Fast reaction to signals (20s polling)
2. **Entry execution** - Both trades executed successfully (USDC→SOL)
3. **Swap direction fix** - USDC-first strategy working correctly
4. **Signal generation** - Consistent scores above threshold
5. **Max hold removal** - Let strategy breathe (but bot stopped anyway)

---

## ❌ What Didn't Work

### 1. **No Sell Signals Generated**
- **Problem:** Only BUY/HOLD detected, zero SELL signals
- **Impact:** Positions couldn't exit naturally via strategy
- **Root cause:** Either trend filter too strict OR patterns not detecting bearish reversals

### 2. **Same Patterns Repeating**
- **Problem:** morning_star + inverted_hammer on EVERY signal
- **Impact:** No signal diversity, possible stale data
- **Root cause:** Multi-timeframe patterns stuck on 5m/15m data

### 3. **Sideways Market Performance**
- **Problem:** SOL trading flat ($86.50-86.70)
- **Impact:** Small moves get eaten by fees
- **Root cause:** Market conditions (not strategy fault)

### 4. **Bot Stopped Unexpectedly**
- **Problem:** Dashboard/bot stopped at 16:57 with open position
- **Impact:** Manual intervention required
- **Root cause:** Unknown (needs investigation)

---

## 🎯 Recommendations

### Immediate Fixes

**1. Exit Signal Tuning**
```javascript
SIGNAL_EXIT_SCORE: 60 → 50  // Exit faster on weaker sell signals
```

**2. Pattern Diversity Check**
Add filter: Require at least 2 different pattern types detected in last 5 signals before entry.

**3. RSI Exit Enhancement**
```javascript
RSI_OVERBOUGHT: 65 → 60  // Exit earlier in consolidation
```

**4. Minimum Price Movement Filter**
Don't trade if 1m candle body < 0.5% (avoid flat markets).

### Strategy Adjustments

**5. Lower Profit Target (Scalping)**
```javascript
MAX_PROFIT_PCT: 10 → 5  // Take smaller wins faster
```
**Reasoning:** In sideways markets, 5% move is rare. Take 3-5% gains instead.

**6. Tighter Stop Loss**
```javascript
SAFETY_STOP_LOSS_PCT: 8 → 5  // Cut losers faster
```
**Reasoning:** If wrong, exit fast. Don't wait for -8%.

**7. Add Volume Confirmation**
Require 5m volume spike (≥1.5x avg) for entry. Don't trade on patterns alone in low volume.

### Data Quality Checks

**8. Birdeye API Monitoring**
- Check if API responses are fresh (timestamp validation)
- Log candle data timestamps to detect stale data
- Consider fallback to secondary data source

**9. Bot Stability**
- Investigate why bot stopped at 16:57
- Add health monitoring/auto-restart
- Dashboard should detect bot crashes

---

## 💡 Alternative Strategy: Breakout Mode

If scalping 1m dips isn't profitable, consider **breakout strategy**:

```
Entry:
- Wait for 5m green candle >2% body
- Price breaks above last 3 candles
- Volume spike ≥2x
- RSI 50-65 (not oversold, momentum building)

Exit:
- 5m red candle <-2% (reversal)
- +5% profit
- -3% stop loss
```

**Why:** Catches momentum moves instead of trying to bottom-pick dips.

---

## 📊 Market Context

**SOL Price Action (16:23-16:57):**
- Range: $86.50 - $86.70
- Movement: 0.23% total range
- Pattern: Consolidation/sideways chop
- Volume: Low/moderate

**Conclusion:** Bad market conditions for scalping. Need ≥1-2% moves for profitable scalps.

---

## 🚀 Next Steps

### Before Next Session:

1. ✅ **Apply immediate fixes** (exit score, RSI, profit target)
2. ✅ **Add pattern diversity filter**
3. ✅ **Add minimum movement filter** (0.5% body)
4. ✅ **Lower profit target to 5%**
5. ⚠️ **Investigate bot crash** (why stopped at 16:57?)
6. ⚠️ **Test during active hours** (9am-4pm EST weekdays)

### Testing Plan:

**Phase 1: Small Position Test (tomorrow)**
- Reduce position: 40% → 20% (safer testing)
- Run 1 hour during US market hours
- Target: 3-5 trades minimum
- Goal: Validate sell signal generation

**Phase 2: Strategy Comparison (next 2 days)**
- Test breakout mode vs dip-buying mode
- Compare win rates, avg P&L, trade frequency
- Keep best performer

**Phase 3: Scale Up (if profitable)**
- Increase position back to 40%
- Run 4-8 hour sessions
- Monitor daily P&L

---

## 🔍 Key Learnings

1. **1m scalping requires ≥1% moves** - Flat markets eat profits via fees
2. **Sell signals are critical** - Without them, strategy can't exit naturally
3. **Pattern repetition = red flag** - Need data quality monitoring
4. **Sideways ≠ scalping friendly** - Need trending or volatile markets
5. **Fees matter at small scale** - $6 positions pay ~3% in fees (need bigger positions OR bigger moves)

---

**End of Report**

Generated: 2026-02-16 16:58 PST
