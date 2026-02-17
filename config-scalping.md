# Scalping Config - Optimized for Small Dips (2026-02-16)

## Strategy: 1m Primary, Multi-TF Confirmation

### Key Changes from Conservative Strategy:

**1. PRIMARY_TIMEFRAME: '5m' → '1m'**
- React to dips in real-time (60 seconds vs 300 seconds)
- Catch small 2-5% moves before they reverse

**2. MIN_SIGNAL_SCORE: 75 → 65**
- Accept more opportunities
- 65+ = decent setup, 75+ = excellent setup

**3. RSI Thresholds: 30/70 → 40/65**
- 40 RSI = early oversold (not extreme)
- 65 RSI = early overbought
- Catches dips BEFORE they hit extreme levels

**4. REQUIRE_TREND_ALIGNMENT: true → false**
- Allow counter-trend scalps (buy dips in downtrends)
- MA filter becomes INFO only, not a blocker

**5. POLL_INTERVAL_MS: 45000 → 20000**
- Check every 20 seconds (3x faster)
- Tighter reaction time

**6. POSITION_SIZE_PCT: 30 → 40**
- Larger positions = better fee efficiency
- 40% of 15 USDC = $6 per trade (~3% fees vs 5% on $3 trades)

**7. MAX_PROFIT_PCT: 20 → 10**
- Take profit faster (scalping = quick in/out)
- Don't wait for big moves

**8. SAFETY_STOP_LOSS_PCT: 15 → 8**
- Tighter stop loss
- Cut losers faster

### Multi-Timeframe Usage:
- **1m** = PRIMARY (entry signal, patterns, RSI)
- **5m** = CONFIRMATION (trend direction, volume)
- **15m** = CONTEXT (support/resistance levels)
- **1h** = BIG PICTURE (overall market direction)

### Entry Criteria (Relaxed for Scalping):
1. **1m pattern detected** (hammer, morning_star, engulfing_bullish)
2. **1m RSI < 45** (slight dip)
3. **Score ≥ 65** (decent setup)
4. **(Optional) 5m trend not extreme bearish** (not mandatory)

### Exit Criteria (Fast Scalping):
1. **+10% profit** (take it and run)
2. **-8% stop loss** (cut fast)
3. **Bearish 1m pattern** (reversal detected)
4. **1m RSI > 65** (overbought, exit)
5. **Max hold: 15 minutes** (don't baghold)

### Expected Performance:
- **Trades/day**: 5-15 (much more active)
- **Win rate**: 55-65% (lower than conservative, but more volume)
- **Avg gain**: +3-8% per win
- **Avg loss**: -3-5% per loss
- **Daily target**: +10-20% on winning days

### Risk Profile:
🟡 **MEDIUM-HIGH** - More trades = more fees, but catches small moves

### Comparison:

| Metric | Conservative (5m) | Scalping (1m) |
|--------|-------------------|---------------|
| Primary TF | 5m | 1m |
| Min Score | 75 | 65 |
| RSI | 30/70 | 40/65 |
| Trend Filter | Required | Optional |
| Poll Interval | 45s | 20s |
| Position Size | 30% | 40% |
| TP/SL | +20/-15% | +10/-8% |
| Trades/Day | 1-3 | 5-15 |
| Style | Patient | Aggressive |

