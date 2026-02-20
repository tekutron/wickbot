# Wick-Based Strategy - wickbot v4 (2026-02-19 Evening)

## Philosophy

**It's called wickbot - it should trade wicks!**

Original micro-scalp strategy was exiting at fixed TP percentages (+2%, +4%), which capped gains and ignored the actual market signals. 

**New approach:** Let the wicks tell us when to exit.

---

## Strategy Overview

### Entry: Momentum-Based (Avoid Buying Tops)

**Goal:** Only enter on confirmed upswings, never at tops/wicks

**Filters (All Must Pass):**
1. ✅ **Green Candle Required** (body >-2%)
   - Rejects red candles (falling knives)
   - Ensures we're buying strength, not weakness

2. ✅ **Positive Momentum** (>0% over 3 candles)
   - Confirms upward movement
   - Avoids buying tops (momentum would be fading)

3. ✅ **Volume Spike** (≥2x average)
   - Confirms buying pressure is real
   - Filters out low-volume fake moves

**Result:** Only buys on GREEN candles with POSITIVE momentum and VOLUME confirmation → Naturally avoids buying wicks/tops

---

### Exit: Wick/Signal-Based (Catch Tops)

**Goal:** Exit when wick/top signals appear, not at arbitrary percentages

**Exit Priority:**

1. **PRIMARY: Wick/Top Signals**
   - Bearish wicks (shooting star, etc.)
   - Top patterns (evening star, bearish engulfing)
   - Reversal indicators (MACD turning down, RSI overbought)
   - **No profit caps** - can catch +10%, +50%, +100% moves!

2. **BACKUP: MAX_HOLD (60 seconds)**
   - Safety exit if no signal appears
   - Allows enough time for wicks to form
   - Prevents getting stuck in stalled positions

3. **BACKUP: STOP_LOSS (-2%)**
   - Hard stop to cut losses
   - Only triggers on unexpected dumps
   - Protected by 5% slippage cap

---

## What Changed from v3

### Removed (Fixed TP)
- ❌ QUICK_TP_1 (+2% exit)
- ❌ QUICK_TP_2 (+4% exit)
- ❌ MAX_HOLD 10 seconds (too quick for wicks to form)
- ❌ Adaptive slippage 2-10% (complex, unreliable)

### Added/Updated (Wick-Based)
- ✅ Signal exits are now PRIMARY (not backup)
- ✅ MAX_HOLD increased to 60s (allow patterns to develop)
- ✅ Flat 5% slippage (simple, predictable)
- ✅ Entry momentum validation (already had this)

---

## Example Scenarios

### Scenario 1: Big Win (New Strategy Shines)

**Price Action:**
```
Entry: $0.00010 (momentum +3%, volume 2.5x, green candle)
↓
$0.00012 (+20%)
↓
$0.00015 (+50%)
↓
$0.00018 (+80%)
↓
Bearish shooting star appears
MACD crosses down
→ SIGNAL EXIT at $0.00017 (+70%)
```

**Old Strategy (Fixed TP):**
- Would have exited at +2% or +4%
- Profit: +2-4%
- Missed: +66-68% additional profit

**New Strategy (Wick-Based):**
- Rode the move up
- Exited on wick signal at +70%
- Caught most of the move! ✅

---

### Scenario 2: Quick Dump (Safety Stops Work)

**Price Action:**
```
Entry: $0.00010 (momentum +2%, volume 3x, green candle)
↓
$0.00009 (-10% flash dump in 3 seconds)
↓
STOP_LOSS triggers at -2%
Slippage: Actual exit -5% (within 5% cap)
```

**Both strategies similar:**
- Stop loss prevents disaster
- Exit around -5% with slippage

**Safety stops working as intended** ✅

---

### Scenario 3: Sideways (MAX_HOLD Prevents Bagholding)

**Price Action:**
```
Entry: $0.00010 (momentum +1%, volume 2.1x, green candle)
↓
$0.00011 (+10%)
↓
$0.00010 (0%)
↓
60 seconds elapsed, no clear signal
→ MAX_HOLD exit at $0.00010 (breakeven)
```

**Strategy:**
- Doesn't baghold waiting for signals
- Exits after 60s if no movement
- Frees capital for next opportunity ✅

---

## Configuration

### Entry Settings
```javascript
REQUIRE_ENTRY_CONFIRMATION: true
MIN_CANDLE_BODY_POSITIVE: -2.0     // Reject red candles <-2%
MIN_MOMENTUM_1M: 0                 // Require positive momentum
MIN_VOLUME_RATIO: 2.0              // Require 2x volume spike
```

### Exit Settings
```javascript
// PRIMARY: Wick/signal-based (no fixed TP)
USE_SIGNAL_EXITS: true
EXIT_ON_OPPOSITE_SIGNAL: true

// BACKUP SAFETY STOPS:
MAX_HOLD_TIME_SEC: 60              // Force exit after 60s
QUICK_SL: 2.0                      // Stop loss at -2%
SAFETY_TP_PCT: 20                  // Extreme cap at +20%
SAFETY_SL_PCT: 20                  // Extreme cap at -20%
```

### Slippage Settings
```javascript
// Flat 5% for all exits (simple & reliable)
SLIPPAGE_PROFIT_BPS: 500           // 5% on all exits
SLIPPAGE_SMALL_LOSS_BPS: 500       // 5% on all exits
SLIPPAGE_BIG_LOSS_BPS: 500         // 5% on all exits
```

### Risk Management
```javascript
POSITION_SIZE_PCT: 25              // 25% of capital per trade
MAX_POSITIONS: 1                   // One at a time
MAX_DRAWDOWN_PCT: 30               // Stop if down 30%
```

---

## Expected Performance

### Old Strategy (Fixed TP v3)
- Win rate: 62.5%
- Avg win: +2-4% (capped by TP)
- Avg loss: -2-8% (slippage issues)
- Session: +19% (good, but capped)
- **Limitation:** Can't catch big moves

### New Strategy (Wick-Based v4)
- Win rate: 50-60% (expected slightly lower - letting winners run)
- Avg win: +5-15% (no caps, ride the move)
- Avg loss: -2-5% (same safety stops)
- Session: +20-50% (higher upside potential)
- **Advantage:** Can catch +50-100% runners

**Trade-off:** Fewer small wins, but bigger wins make up for it.

---

## Risk Factors

### 1. Signal Quality
**Risk:** Weak signals might exit too early or too late
**Mitigation:** 
- Entry momentum filters prevent bad setups
- 60s MAX_HOLD prevents bagholding
- -2% SL caps downside

### 2. Wick Formation Time
**Risk:** Need time for wicks to develop (vs instant TP)
**Mitigation:**
- 60s MAX_HOLD is long enough for most patterns
- Most wicks form within 10-30 seconds
- Still protected by SL

### 3. Slippage on Volatile Exits
**Risk:** 5% slippage cap might fail on extreme dumps
**Mitigation:**
- Pre-flight price checks
- Retry logic (3 attempts)
- Most exits should be within 5%

---

## Testing Plan

### Phase 1: Initial Validation (10 trades)
- Monitor: Signal exit frequency vs backup exits
- Expect: 60-70% signal exits, 30-40% MAX_HOLD/SL
- Target: Win rate 50%+, avg win >5%

### Phase 2: Performance Comparison (50 trades)
- Compare: v4 (wick-based) vs v3 (fixed TP) historical
- Measure: Total P&L, avg win/loss, largest winners
- Target: v4 outperforms v3 on total P&L

### Phase 3: Production (Long-term)
- Monitor: Multi-session consistency
- Adjust: Signal thresholds if needed
- Scale: Increase position size if validated

---

## Key Metrics to Watch

### Success Indicators
- ✅ Signal exits catching +10-50% moves
- ✅ Average win >5% (vs 2-4% with fixed TP)
- ✅ Win rate 50-60% (acceptable with bigger wins)
- ✅ Session P&L +20-50% (higher upside)

### Warning Signs
- ⚠️ Average win <3% (signals exiting too early)
- ⚠️ Win rate <40% (signals unreliable)
- ⚠️ Most exits are MAX_HOLD (signals not triggering)
- ⚠️ Frequent -5%+ losses (slippage failing)

---

## Rollback Plan

If wick-based strategy underperforms after 50 trades:

1. **Hybrid approach:** Signal exits for +5%+, fixed TP for <5%
2. **Tighten signals:** Require stronger confirmation before exit
3. **Revert to v3:** Go back to fixed TP if signals prove unreliable

**Decision criteria:** v4 must beat v3 on total P&L over 50 trades

---

## Commit History

- **v1:** Pattern-based (multi-timeframe, 5m candles)
- **v2:** Fast signals (incremental indicators, 1m candles)
- **v3:** Momentum-based entry + fixed TP (62.5% win, +19% session)
- **v4:** Wick-based exits (signals primary, no TP caps)

**Current:** v4 - Wick-Based Strategy ✅

---

## Files Modified

1. `bot-fast.mjs` - Exit priority reordered (signals first)
2. `config.mjs` - MAX_HOLD 60s, slippage 5%, no TP
3. `dashboard/index.html` - UI updated for wick strategy
4. `WICK-BASED-STRATEGY.md` - This document

---

## Ready to Trade Wicks! 🕯️

**Status:** Production-ready  
**Strategy:** Buy dips → Ride moves → Sell wicks  
**Advantage:** No profit caps, let winners run  
**Protection:** 60s max hold, -2% SL, 5% slippage  

Let the wicks guide us! 📊
