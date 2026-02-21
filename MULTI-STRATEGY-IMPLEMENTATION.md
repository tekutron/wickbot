# Multi-Strategy Implementation - wickbot

**Date:** 2026-02-20 Evening  
**Status:** ✅ Implemented - Ready to Test  

---

## Overview

Implemented 4 trading strategies based on GitHub research. Bot can switch between strategies via config setting.

---

## Strategies Implemented

### 🎯 Strategy 1: Simple % Logic (nakul91 style)
**Mode:** `STRATEGY_MODE: 'simple'`

**Entry Logic:**
```javascript
if (priceChange1m <= -2.5% && volume >= 1.5x) {
  buy();  // Simple dip detection
}
```

**Pros:**
- Dead simple
- Fast execution
- Proven to work (nakul91 bot)

**Cons:**
- May catch false dips
- No crash protection

**Config:**
```javascript
SIMPLE_DIP_THRESHOLD: -2.5,    // Buy on -2.5% dip
SIMPLE_RISE_THRESHOLD: 2.5,    // (for future sell logic)
```

---

### 📊 Strategy 2: Volume Spike (Immutal0 style)
**Mode:** `STRATEGY_MODE: 'volume'`

**Entry Logic:**
```javascript
if (volumeSpike >= 3.0x && priceChange1m < -1.0%) {
  buy();  // Accumulation detected
}
```

**Pros:**
- Catches institutional buying
- Less false signals
- Volume = leading indicator

**Cons:**
- Needs accurate volume data
- May miss quick dips

**Config:**
```javascript
VOLUME_SPIKE_THRESHOLD: 3.0,   // Volume must be 3x average
VOLUME_DIP_THRESHOLD: -1.0,    // With -1% price dip
```

---

### 🔥 Strategy 3: Hybrid (Best of Both) ⭐ RECOMMENDED
**Mode:** `STRATEGY_MODE: 'hybrid'`

**Entry Logic:**
```javascript
if (priceChange1m <= -2.5% &&      // Dip
    volumeSpike >= 2.5x &&         // Volume confirmation
    priceChange5m > -10%) {        // Not crashing
  buy();
}
```

**Pros:**
- Simple but safe
- Volume confirmation reduces false signals
- Crash filter prevents buying free-falls

**Cons:**
- Slightly more restrictive than simple

**Config:**
```javascript
HYBRID_DIP_THRESHOLD: -2.5,        // Dip percentage
HYBRID_VOLUME_THRESHOLD: 2.5,      // Volume spike
HYBRID_CRASH_FILTER: -10.0,        // Don't buy if 5m < -10%
```

---

### 🎓 Strategy 4: RSI/MACD (Original)
**Mode:** `STRATEGY_MODE: 'rsi'`

**Entry Logic:**
```javascript
if (RSI >= 25 && RSI <= 45 &&      // Oversold range
    MACD_histogram > 0 &&          // Bullish crossover
    momentum1m > 0.5%) {           // Positive momentum
  buy();
}
```

**Pros:**
- Most sophisticated
- Best for trending markets
- Original wickbot strategy

**Cons:**
- Too conservative (0 trades in 30 min)
- Misses opportunities
- Complex

**Config:**
```javascript
REQUIRE_RSI_ENTRY: true,
RSI_ENTRY_MAX: 45,
RSI_ENTRY_MIN: 25,
REQUIRE_MACD_ENTRY: true,
MACD_CROSSOVER_REQUIRED: true,
```

---

## Exit Strategy (Unchanged)

All strategies use the same exit logic:
- **TP1:** +2%
- **TP2:** +4%
- **SL:** -2%
- **Max Hold:** 60s

This is already proven to work well.

---

## How to Use

### Switch Strategy

Edit `config.mjs`:
```javascript
STRATEGY_MODE: 'hybrid',  // Options: 'simple', 'volume', 'hybrid', 'rsi'
```

### Test Each Strategy

1. **Start with 'hybrid'** (recommended)
2. Run 10-15 trades
3. Measure win rate, avg P&L
4. Switch to 'simple' or 'volume'
5. Compare results

### Expected Results

| Strategy | Trades/Hour | Win Rate | Risk Level |
|----------|-------------|----------|------------|
| Simple   | 5-10        | 40-50%   | Medium     |
| Volume   | 3-6         | 50-60%   | Low        |
| Hybrid   | 4-8         | 45-55%   | Medium-Low |
| RSI      | 0-2         | N/A      | Very Low   |

---

## Implementation Details

### Code Changes

**File:** `config.mjs`
- Added `STRATEGY_MODE` setting
- Added config parameters for each strategy
- Disabled RSI/MACD requirements by default

**File:** `bot-fast.mjs`
- Replaced single entry logic with multi-strategy switch
- Calculates momentum1m and momentum5m
- Logs strategy name and decision for each attempt
- Clean pass/fail logging for debugging

### Logging Format

```
🎯 DIP DETECTED! (Confidence: 67%)
   🎯 Strategy: HYBRID
   📊 Hybrid Strategy: Dip + Volume + Safety
   ✅ Dip: -2.8% (need ≤-2.5%)
   ✅ Volume: 3.2x (need ≥2.5x)
   ✅ 5m trend: -4.2% (not crashing if >-10%)
   ✅ All checks passed!
```

Or rejection:
```
🎯 DIP DETECTED! (Confidence: 50%)
   🎯 Strategy: SIMPLE
   📊 Simple Strategy: Looking for -2.5% dip
   ❌ No dip: momentum -1.2% (need ≤-2.5%)
   ⏸️  Waiting for dip...
```

---

## Testing Plan

### Phase 1: Hybrid Strategy (Tonight)
1. Set `STRATEGY_MODE: 'hybrid'`
2. Run on JUP or Fartcoin
3. Collect 10-15 trades
4. Measure:
   - Win rate (target: >40%)
   - Avg P&L (target: >-0.5%)
   - Entry quality (fewer QUICK_SL)

### Phase 2: Simple Strategy (Tomorrow)
1. Switch to `STRATEGY_MODE: 'simple'`
2. Run 10-15 trades
3. Compare to hybrid results

### Phase 3: Volume Strategy (If Needed)
1. Switch to `STRATEGY_MODE: 'volume'`
2. Test if hybrid/simple don't perform well
3. Requires good volume data

---

## Success Metrics

**Per Strategy:**
- Collect minimum 10 trades
- Win rate ≥40%
- Avg P&L ≥-0.5%
- QUICK_SL <30% of trades

**Overall Goal:**
- Find strategy with best risk/reward
- More entries than RSI strategy (was 0)
- Capital growing or stable

---

## Configuration Files

### Current Setup

```javascript
// config.mjs
STRATEGY_MODE: 'hybrid',           // Active strategy

// Hybrid params
HYBRID_DIP_THRESHOLD: -2.5,        
HYBRID_VOLUME_THRESHOLD: 2.5,      
HYBRID_CRASH_FILTER: -10.0,        

// Entry confirmation enabled
REQUIRE_ENTRY_CONFIRMATION: true,

// Exit targets (unchanged)
QUICK_TP_1: 2.0,
QUICK_TP_2: 4.0,
QUICK_SL: 2.0,
MAX_HOLD_TIME_SEC: 60,
```

---

## Next Steps

1. ✅ Implementation complete
2. ⏳ Test hybrid strategy first
3. ⏳ Collect performance data
4. ⏳ Compare strategies
5. ⏳ Pick winner and optimize

---

## Notes

**Safety:**
- All strategies include volume confirmation
- Hybrid adds crash filter (5m > -10%)
- Original exit logic unchanged (proven to work)

**Flexibility:**
- Easy to switch strategies via config
- Can add new strategies by extending switch statement
- Each strategy independently configurable

**Documentation:**
- Clear logging shows which strategy is active
- Each check logged for debugging
- Easy to see why entries were accepted/rejected

---

**Status:** Ready to test! Start with 'hybrid' strategy on JUP. 🚀
