# Ready to Test: RSI + MACD Leading Indicators - 2026-02-20 15:45

## Summary

**Strategy pivot complete.** Bot now uses LEADING indicators (RSI + MACD) to PREDICT pumps early, instead of LAGGING indicators (momentum, volume) that caught pumps too late.

---

## What Changed

### Config (config.mjs)

**Entry Filters - LOWERED to catch pumps EARLIER:**
```javascript
MIN_MOMENTUM_1M: 2.0% → 0.5%   // Catch pumps in phase 1, not phase 3
MIN_MOMENTUM_5M: 1.0% → 0.3%   // Trend just starting
MIN_VOLUME_RATIO: 3.0x → 1.5x  // Earlier detection
```

**NEW: RSI Entry Filter (LEADING)**
```javascript
REQUIRE_RSI_ENTRY: true
RSI_ENTRY_MAX: 45              // Only enter when RSI <45 (oversold/neutral)
RSI_ENTRY_MIN: 25              // Don't enter if RSI <25 (too oversold)
```

**NEW: MACD Entry Filter (LEADING)**
```javascript
REQUIRE_MACD_ENTRY: true
MACD_CROSSOVER_REQUIRED: true  // MACD histogram must be positive (momentum building)
```

### Bot Logic (bot-fast.mjs)

**Added RSI Check (before entry):**
- Rejects if RSI >45 (not oversold, no bounce expected)
- Rejects if RSI <25 (too oversold, might dump more)
- Confirms if RSI 25-45 (oversold/neutral, bounce likely)

**Added MACD Check (before entry):**
- Rejects if MACD histogram <=0 (momentum not building)
- Confirms if MACD histogram >0 (bullish crossover, momentum building)

### Dashboard (index.html)

**Updated Strategy Display:**
- "Entry (LEADING 2/20 PM): RSI <45 + MACD crossover + 0.5% momentum"
- "Strategy: PREDICT pumps early (not chase peaks)"

---

## Why This Should Work

### Pump Lifecycle (4 Phases)

**Phase 1 (0-30s): Early**
- Momentum: 0.3-0.5%
- Volume: 1-1.5x
- RSI: 30-45
- MACD: Crossing positive
- **NEW ENTRY WINDOW** ← Bot will enter HERE

**Phase 2 (30-60s): Growth**
- Momentum: 1-2%
- Volume: 2-3x
- RSI: 45-60
- **OLD ENTRY WINDOW** (1% momentum filter)

**Phase 3 (60-90s): PEAK**
- Momentum: 2%+
- Volume: 3x+
- RSI: 60-70
- **RECENT ENTRY WINDOW** (2% momentum filter) ← Was buying HERE (TOPS!)

**Phase 4 (90s+): Reversal**
- Price drops
- Profit-takers exit
- Stop losses hit

### How Leading Indicators Work

**RSI <45:**
- Predicts bounce BEFORE it happens
- RSI 30-45 = oversold/neutral = reversion likely
- Enters BEFORE momentum shows on chart

**MACD Crossover (histogram >0):**
- Detects momentum building BEFORE price moves significantly
- MACD leads price (momentum oscillator)
- Confirms trend is starting, not ending

**0.5% Momentum:**
- Confirms pump is starting (not a false signal)
- Low enough to catch phase 1-2 (early)
- High enough to filter out noise

---

## Expected Results

### Before (Tightened Filters):
- Caught pumps in phase 3 (PEAK)
- Entered at $0.00021335, dropped to $0.00020902 in 2s (-2.03%)
- All QUICK_SL exits (buying tops)
- Win rate: 14%
- Avg P&L: -2.33%

### After (Leading Indicators):
- Catch pumps in phase 1-2 (EARLY/GROWTH)
- Enter when RSI <45 + MACD positive + 0.5% momentum
- Should hit QUICK_TP1/TP2 (not QUICK_SL)
- Target win rate: 50-60%
- Target avg P&L: +1-2%

---

## Testing Plan

### Test Metrics (Next 10-20 Trades)

**Success Indicators:**
1. ✅ Fewer QUICK_SL exits (not hitting stop in 2-3s)
2. ✅ More QUICK_TP1/TP2 exits (hitting profit targets)
3. ✅ Win rate >45%
4. ✅ Average hold time 10-30s (caught early, hit target fast)
5. ✅ No immediate reversals after entry

**Failure Indicators:**
1. ❌ Still hitting QUICK_SL in 2-3s
2. ❌ Win rate <40%
3. ❌ Entries rejected for RSI/MACD reasons (filters too tight)
4. ❌ Missing pumps entirely (filters too restrictive)

### What to Watch

**Entry Logs:**
- Should see: "✅ RSI confirmed: 38.2 (oversold/neutral)"
- Should see: "✅ MACD confirmed: histogram 0.0023 (bullish)"
- Should NOT see: "📈 RSI 52.1 too high - not oversold"

**Exit Patterns:**
- Should see: QUICK_TP1, QUICK_TP2 (hitting targets)
- Should NOT see: QUICK_SL in 2-3s (immediate reversals)

**Trade Timing:**
- Entries should happen when RSI 25-45, MACD just crossed positive
- Exits should happen when price hits +2-4% (target hit)

---

## Alternative Strategies (If This Fails)

### Option 1: Loosen RSI/MACD
- If filters too tight (rejecting too many entries):
  - RSI_ENTRY_MAX: 45 → 50
  - Allow MACD histogram slightly negative (-0.0005 to 0)

### Option 2: Mean Reversion
- Complete strategy flip:
  - Enter on RSI <30 (deep oversold)
  - Exit on RSI 50-60 (mean reversion)
  - Target +2-3% bounces after dumps

### Option 3: Better Token Selection
- Current token (Komomo) down 73% in 1h
- Find token with:
  - Liquidity >$500K
  - 24h change: -20% to +50%
  - Stable uptrend, not extreme volatility

---

## Current Status

**Bot:** Stopped, ready to restart  
**Strategy:** RSI + MACD leading indicators  
**Capital:** 0.0731 SOL (~$6.05)  
**Token:** Komomo (⚠️ down 73% in 1h - consider switching)  

**Git:**
- ✅ Code changes committed (a2d7c56)
- ✅ Dashboard updated (1aa0b91)
- ✅ Analysis documented (ANALYSIS-TIGHTENED-FILTERS-FAILED.md)
- ✅ Memory saved (8 new lessons)

**Ready to test when you restart the bot.**

---

## Key Differences Summary

| Aspect | OLD (Tightened) | NEW (Leading) |
|--------|----------------|---------------|
| **Entry timing** | Phase 3 (peak) | Phase 1-2 (early) |
| **Momentum** | 2.0% | 0.5% |
| **Volume** | 3.0x | 1.5x |
| **RSI filter** | None | <45 required |
| **MACD filter** | None | Crossover required |
| **Result** | Buying tops | Predicting pumps |
| **Win rate** | 14% | Target: 50-60% |

---

## Bottom Line

**The hypothesis:**
- RSI <45 predicts bounces BEFORE they happen
- MACD crossover detects momentum building BEFORE price moves
- 0.5% momentum confirms pump starting (not peaked)
- This catches pumps in phase 1-2, not phase 3

**The test:**
- Run 10-20 trades
- Measure win rate, exit reasons, hold times
- Compare to previous sessions

**Success = Win rate >45%, more TP exits, fewer SL exits**

**Failure = Still hitting SL in 2-3s, need different approach**

Ready to find out which it is. 🚀

