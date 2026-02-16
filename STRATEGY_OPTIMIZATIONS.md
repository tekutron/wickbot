# wickbot Strategy Optimizations
**Date:** February 16, 2026  
**Commit:** `6759898`

## Overview
Optimized trading strategy based on technical analysis best practices to improve signal quality, reduce false positives, and increase win rate.

---

## 1. RSI Threshold Adjustment ⚡

**Problem:** RSI 40/60 is too moderate, catches weak reversals

**Solution:** Classic TA levels for extreme conditions

| Metric | Before | After | Why |
|--------|--------|-------|-----|
| RSI Oversold | 40 | **30** | Classic TA level, more extreme = stronger signal |
| RSI Overbought | 60 | **70** | Classic TA level, confirms actual overbought |

**Impact:** Only enters on EXTREME oversold/overbought, reducing noise

---

## 2. MA Crossover Filter 📈

**New Feature:** Trend confirmation using Moving Average crossovers

### Logic Added:
```
BUY Requirements:
✅ Bullish patterns
✅ Bullish indicators (RSI < 30)
✅ Uptrend: Price > MA20 > MA50 (NEW!)

SELL Requirements:
✅ Bearish patterns
✅ Bearish indicators (RSI > 70)
✅ Downtrend: Price < MA20 < MA50 (NEW!)
```

### Trend Detection:
- **Strong Uptrend:** Price > MA20 > MA50
- **Strong Downtrend:** Price < MA20 < MA50
- **Golden Cross:** MA20 crosses above MA50 (bullish)
- **Death Cross:** MA20 crosses below MA50 (bearish)
- **Weak Trends:** Counter-trend bounces (detected & labeled)

**Config:** `REQUIRE_TREND_ALIGNMENT: true` (can disable if too restrictive)

**Impact:** Prevents buying in downtrends, selling in uptrends

---

## 3. Signal Scoring Rebalance ⚖️

**Problem:** 70/30 weight favored patterns over trend

**Solution:** Increase indicator weight (trend matters!)

| Component | Before | After | Reasoning |
|-----------|--------|-------|-----------|
| Patterns | 70% | **60%** | Patterns show reversals |
| Indicators | 30% | **40%** | Indicators show trend strength |
| Multi-TF Bonus | +20 | **+25** | Multi-timeframe = stronger signal |
| Min Score | 70 | **75** | More selective entries |

**Impact:** Trend-following signals get more weight, better entries

---

## 4. Pattern Weight Optimization 🎯

**Problem:** All patterns treated similarly, weak patterns caused noise

**Solution:** Ranked by TA reliability & historical accuracy

### Bullish Patterns (Ranked by Strength):
| Pattern | Old Weight | New Weight | Reliability |
|---------|------------|------------|-------------|
| Three White Soldiers | 95 | **95** | Strongest (3-candle confirmation) |
| Bullish Engulfing | 90 | **90** | Very strong (reversal at support) |
| Morning Star | 85 | **88** | ↑ Strong (3-candle bottom) |
| Piercing Pattern | 80 | **82** | ↑ Strong (deep reversal) |
| Hammer | 80 | **78** | ↓ Moderate (1-candle, needs volume) |
| Inverted Hammer | 75 | **72** | ↓ Moderate (less reliable than hammer) |
| Bullish Harami | 70 | **68** | ↓ Weak (needs confirmation) |
| Dragonfly Doji | 65 | **65** | Weak (indecision) |

### Bearish Patterns (Ranked by Strength):
| Pattern | Old Weight | New Weight | Reliability |
|---------|------------|------------|-------------|
| Three Black Crows | 95 | **95** | Strongest (3-candle confirmation) |
| Bearish Engulfing | 90 | **90** | Very strong (reversal at resistance) |
| Evening Star | 85 | **88** | ↑ Strong (3-candle top) |
| Dark Cloud Cover | 80 | **82** | ↑ Strong (deep reversal) |
| Shooting Star | 80 | **78** | ↓ Moderate (1-candle, needs volume) |
| Hanging Man | 75 | **72** | ↓ Moderate (less reliable) |
| Bearish Harami | 70 | **68** | ↓ Weak (needs confirmation) |
| Gravestone Doji | 65 | **65** | Weak (indecision) |

### Neutral Patterns (Reduced Noise):
| Pattern | Old Weight | New Weight | Change |
|---------|------------|------------|--------|
| Doji | 50 | **40** | ↓ -10 (indecision, not actionable) |
| Spinning Top | 45 | **35** | ↓ -10 (weak indecision) |
| Long-Legged Doji | 55 | **45** | ↓ -10 (stronger indecision, still noise) |

**Impact:** Strong patterns get priority, weak patterns filtered out

---

## 5. Entry Logic Improvements 🔒

**Before:** Allowed pattern-only or indicator-only entries

**After:** Requires multi-signal alignment

### New Entry Requirements:

**BUY Signal:**
1. ✅ Bullish patterns detected
2. ✅ Bullish indicators (RSI < 30, MACD bullish, etc.)
3. ✅ **Uptrend confirmed** (if REQUIRE_TREND_ALIGNMENT = true)
4. ✅ Signal score ≥ 75

**SELL Signal:**
1. ✅ Bearish patterns detected
2. ✅ Bearish indicators (RSI > 70, MACD bearish, etc.)
3. ✅ **Downtrend confirmed** (if REQUIRE_TREND_ALIGNMENT = true)
4. ✅ Signal score ≥ 75

**Rejection Reasons (New):**
- "Bullish signals rejected: downtrend (MA filter)"
- "Bearish signals rejected: uptrend (MA filter)"
- "Mixed signals or insufficient strength"

**Impact:** Only enters when ALL conditions align = higher quality trades

---

## Expected Performance Impact 📊

| Metric | Before | Expected After |
|--------|--------|----------------|
| Signal Frequency | High | **Medium** (more selective) |
| Win Rate | Moderate | **Higher** (better entries) |
| False Signals | Moderate | **Lower** (trend filter) |
| Entry Quality | Variable | **Consistent** (multi-confirmation) |
| Risk/Reward | 1:1 | **Better** (trend-aligned) |

### Trade-offs:
- ✅ **Pros:** Fewer losing trades, better timing, trend-aligned
- ⚠️ **Cons:** Fewer total trades (quality over quantity)

---

## Configuration Summary

```javascript
// Signal Scoring
MIN_SIGNAL_SCORE: 75,              // Was 70 (more selective)
MULTI_TIMEFRAME_BOOST: 25,         // Was 20 (stronger multi-TF)
INDICATOR_WEIGHT: 0.4,             // Was 0.3 (trend matters more)
REQUIRE_TREND_ALIGNMENT: true,     // NEW (can disable for more trades)

// RSI Thresholds
RSI_OVERSOLD: 30,                  // Was 40 (extreme oversold)
RSI_OVERBOUGHT: 70,                // Was 60 (extreme overbought)
```

---

## Testing Recommendations 🧪

1. **Backtest** on historical data to validate improvements
2. **Paper trade** for 1-2 weeks to measure actual win rate
3. **Monitor rejection reasons** - if too many rejections, lower MIN_SIGNAL_SCORE or disable REQUIRE_TREND_ALIGNMENT
4. **Compare metrics:**
   - Win rate before/after
   - Average P&L per trade
   - Max drawdown
   - Number of trades per day

---

## Rollback Instructions

If optimizations are too restrictive:

```javascript
// config.mjs - Restore old settings
MIN_SIGNAL_SCORE: 70,              // More trades
INDICATOR_WEIGHT: 0.3,             // Less trend emphasis
REQUIRE_TREND_ALIGNMENT: false,    // Disable trend filter
RSI_OVERSOLD: 40,                  // Less extreme
RSI_OVERBOUGHT: 60,                // Less extreme
```

Or revert to commit `1314431` (pre-optimization):
```bash
git revert 6759898
```

---

## Next Steps 🚀

1. ✅ **Strategy optimized** (this commit)
2. ⏳ **Start bot** with new settings
3. ⏳ **Monitor first 10 trades** (validate improvements)
4. ⏳ **Adjust if needed** (tune thresholds based on results)
5. ⏳ **Compare to baseline** (measure win rate improvement)

**Status:** Ready to trade! 🕯️
