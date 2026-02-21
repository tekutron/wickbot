# CRITICAL BUG: RSI/MACD Entry Filters Never Executed

**Date:** 2026-02-20 16:43 PM  
**Status:** 🔴 CRITICAL - Strategy completely failed due to this bug  
**Impact:** 7 consecutive losses, -1.45% avg P&L, 0% win rate

---

## Summary

The RSI+MACD "leading indicators" pivot (implemented 2026-02-20 3:30 PM) **completely failed** because the entry filters were **never actually executing**. The bot was still using old momentum-only criteria despite having RSI/MACD filters in the code.

---

## Root Cause

**File:** `bot-fast.mjs` lines 345-378  
**Bug:** Checking for `indicators.ready` property that doesn't exist

### The Broken Code

```javascript
// 4. RSI ENTRY FILTER (NEW 2026-02-20)
if (config.REQUIRE_RSI_ENTRY) {
  const indicators = this.incrementalEngine?.getIndicators();
  if (indicators && indicators.ready) {  // ❌ BUG: indicators.ready is ALWAYS undefined
    const rsi = indicators.rsi;
    
    if (rsi > config.RSI_ENTRY_MAX) {
      console.log(`   📈 RSI ${rsi.toFixed(1)} too high...`);
      return;  // Never executes!
    }
    // ... more RSI logic
  }
}
```

### Why It Fails

`IncrementalEngine.getIndicators()` returns:
```javascript
{
  rsi: 45.2,
  macd: {...},
  bb: {...},
  ema20: 123.45,
  ema50: 125.67,
  candle: {...},
  updateCount: 150
  // ❌ NO .ready PROPERTY!
}
```

The class HAS an `isReady()` **method**, but the returned object doesn't include a `.ready` **property**.

So the check `if (indicators && indicators.ready)` always evaluates to:
```javascript
if (indicators && undefined)  // = false
```

Result: **The entire RSI/MACD filter block is skipped every single time.**

---

## Evidence

### 1. Zero Filter Messages in Logs

Searched 3000+ lines of logs - **ZERO instances** of:
- `"RSI confirmed"`
- `"RSI too high"`
- `"RSI too low"`
- `"MACD confirmed"`
- `"MACD histogram negative"`

If filters were working, we'd see these on EVERY entry attempt.

### 2. Log Output Shows Filters Skipped

```
🎯 DIP DETECTED! (Confidence: 50%)
   DIP DETECTED: Bullish candle + MACD rising + In uptrend
   ✅ Momentum confirmed: 2.61%
   ✅ Entry confirmed: GREEN candle (0.10%)
```

**What's missing:**
- `✅ RSI confirmed: 45.1 (oversold/neutral)`
- `✅ MACD confirmed: histogram 0.0023 (bullish)`

These SHOULD appear between "Momentum confirmed" and "Entry confirmed" if the filters were executing.

### 3. Config Shows Filters Enabled

```javascript
REQUIRE_RSI_ENTRY: true          // ✅ Enabled
RSI_ENTRY_MAX: 45                // ✅ Configured
RSI_ENTRY_MIN: 25                // ✅ Configured
REQUIRE_MACD_ENTRY: true         // ✅ Enabled
MACD_CROSSOVER_REQUIRED: true    // ✅ Enabled
```

Filters are configured correctly - the code just never reaches them.

---

## Impact Analysis

### Trades After "Pivot" (#66-72)

| Trade | Exit Reason | P&L | Hold Time | Pattern |
|-------|-------------|-----|-----------|---------|
| #66 | QUICK_SL | -2.03% | 2s | Immediate reversal |
| #67 | MAX_HOLD | -1.03% | 66s | Stalled |
| #68 | QUICK_SL | -2.77% | 2s | Immediate reversal |
| #69 | QUICK_SL | -2.57% | 4s | Immediate reversal |
| #70 | MAX_HOLD | -0.78% | 64s | Stalled |
| #71 | MAX_HOLD | -0.57% | 65s | Stalled |
| #72 | MAX_HOLD | -0.43% | 65s | Stalled |

**Results:**
- Win Rate: **0%** (0/7)
- Avg P&L: **-1.45%**
- Pattern: Same as before (QUICK_SL immediate reversals + MAX_HOLD stalls)

### Comparison: Before vs After

| Metric | Before Pivot | After "Pivot" | Change |
|--------|--------------|---------------|--------|
| Win Rate | 32.6% | 0.0% | -32.6% |
| Avg P&L | -1.62% | -1.45% | +0.17% |
| QUICK_SL | 23% | 43% | +20% |
| MAX_HOLD | 26% | 57% | +31% |

**Analysis:**
- No improvement because filters never ran
- Still entering at wrong times (buying tops)
- Still seeing immediate reversals (QUICK_SL in 2-4s)
- Still timing out on weak bounces (MAX_HOLD)

---

## The Correct Fix

### Option 1: Use isReady() Method

```javascript
if (config.REQUIRE_RSI_ENTRY) {
  if (this.incrementalEngine && this.incrementalEngine.isReady()) {  // ✅ Use method
    const indicators = this.incrementalEngine.getIndicators();
    const rsi = indicators.rsi;
    
    if (rsi > config.RSI_ENTRY_MAX) {
      console.log(`   📈 RSI ${rsi.toFixed(1)} too high...`);
      return;
    }
    // ... rest of RSI logic
  }
}
```

### Option 2: Add .ready Property to getIndicators()

In `data/incremental-indicators.mjs`:
```javascript
getIndicators() {
  return {
    rsi: this.rsi.getValue(),
    bb: this.bb.getValue(),
    macd: this.macd.getValue(),
    ema20: this.ema20.getValue(),
    ema50: this.ema50.getValue(),
    candle: this.lastCandle,
    updateCount: this.updateCount,
    ready: this.isReady()  // ✅ Add ready property
  };
}
```

**Recommendation:** Use **Option 2** - it's cleaner and matches the expected API pattern.

---

## Lessons Learned

1. **Test your filters are actually running** - Check logs for confirmation messages
2. **API assumptions are dangerous** - Don't assume `.ready` exists, verify it
3. **Log everything during testing** - Would have caught this immediately if we checked for filter messages
4. **Zero improvement = investigate immediately** - 7 trades with 0% win rate should have triggered debugging
5. **Type safety would prevent this** - TypeScript would catch `indicators.ready` being undefined

---

## Next Steps

1. ✅ **Stop bot** (already done)
2. ✅ **Document bug** (this file)
3. ⏳ **Fix bug** - Implement Option 2 (add .ready property)
4. ⏳ **Verify fix** - Check logs show RSI/MACD messages
5. ⏳ **Restart with clean session** - Test RSI+MACD properly this time
6. ⏳ **Collect 10-15 trades** - Validate leading indicators actually help

---

## Files Affected

- `bot-fast.mjs` - Contains broken filter checks
- `data/incremental-indicators.mjs` - Missing .ready property in return object
- Dashboard logs - Show filters never executed
- `wickbot_trades.json` - Trades #66-72 are invalid test results

---

## Conclusion

The RSI+MACD "leading indicators" pivot **never happened**. The strategy appeared to fail, but it was never actually tested. The bot continued using the old momentum-only entry logic that was proven to buy tops.

This bug wasted:
- 7 trades
- -1.45% avg loss per trade
- ~1 hour of testing time
- Analysis cycles on a strategy that wasn't running

**Critical takeaway:** Always verify your code is executing before analyzing results.
