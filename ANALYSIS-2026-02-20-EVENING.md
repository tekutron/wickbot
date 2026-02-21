# wickbot Analysis - 2026-02-20 Evening Session

**Time:** 4:13 PM - 4:45 PM PST  
**Status:** Bot STOPPED for critical bug analysis  
**Capital:** 0.0637 SOL (started session at 0.0858 SOL)  
**Session Loss:** -25.78% (-0.0221 SOL)

---

## Executive Summary

**The RSI+MACD "leading indicators" strategy failed completely because the entry filters were never executing.** A critical bug caused all RSI/MACD checks to be skipped, meaning the bot continued using the old momentum-only logic that was proven to buy tops.

---

## Session Timeline

### 4:13 PM - Initial Check
- Bot running on Fartcoin
- 1 position open (entered 4:15 PM)
- Capital: 0.0695 SOL
- Drawdown: -24.83% (circuit breakers should have triggered)

### 4:23 PM - Heartbeat Check
- Daily reflection completed
- User requested bot status check

### 4:25 PM - Status Report
- Bot in **circuit breaker cooldown** (7 min remaining)
- Last 15 trades: 13.3% win rate
- Circuit breaker working correctly (stopped trading after losses)

### 4:30 PM - User Requested Stop & Analysis
- Bot process killed (PID 139826)
- Deep dive analysis began

### 4:45 PM - Critical Bug Discovered
- RSI/MACD filters never executing due to `indicators.ready` bug
- All 7 "leading indicators" trades were actually still using old logic
- Strategy was never tested

---

## Performance Analysis

### Overall Session (Trades #1-72)

| Metric | Value |
|--------|-------|
| Starting Capital | 0.085845 SOL |
| Ending Capital | 0.063710 SOL |
| Total Loss | -0.022135 SOL (-25.78%) |
| Total Trades | 72 |
| Circuit Breaker Triggers | 1 (worked correctly) |

### Clean Data (Excluding 22 Outliers)

**Trades #1-65 (Before "Pivot"):**
- Win Rate: 32.6% (14/43 trades)
- Avg P&L: -1.62%
- Exit breakdown: QUICK_SL=10, MAX_HOLD=11, QUICK_TP=9

**Trades #66-72 (After "Pivot"):**
- Win Rate: 0.0% (0/7 trades)
- Avg P&L: -1.45%
- Exit breakdown: QUICK_SL=3, MAX_HOLD=4

**Comparison:**
- Win rate: 32.6% → 0.0% (-32.6%)
- But this is meaningless - filters weren't running!

---

## Critical Bug Analysis

### The Bug

**File:** `bot-fast.mjs` lines 345-378  
**Issue:** Code checks `if (indicators && indicators.ready)` but `getIndicators()` doesn't return a `.ready` property

```javascript
// This never executes:
if (config.REQUIRE_RSI_ENTRY) {
  const indicators = this.incrementalEngine?.getIndicators();
  if (indicators && indicators.ready) {  // ❌ indicators.ready = undefined
    // RSI filter logic (never runs)
  }
}
```

### Evidence

1. **Zero filter messages in 3000+ log lines**
   - Should see "✅ RSI confirmed" or "📈 RSI too high" on every entry
   - Found ZERO instances

2. **Log output missing expected messages:**
   ```
   ✅ Momentum confirmed: 2.61%
   ✅ Entry confirmed: GREEN candle (0.10%)
   ```
   Should have RSI/MACD confirmation between these lines.

3. **Config shows filters enabled:**
   - `REQUIRE_RSI_ENTRY: true`
   - `RSI_ENTRY_MAX: 45`
   - `REQUIRE_MACD_ENTRY: true`
   - But code never reached them

### Impact

- 7 trades wasted testing a strategy that wasn't running
- Bot continued buying tops (QUICK_SL in 2-4s)
- Bot continued stalling on weak bounces (MAX_HOLD 60s+)
- No improvement in performance because nothing changed

---

## Circuit Breaker Analysis

### Status: ✅ WORKING CORRECTLY

**Configuration:**
- `MAX_SESSION_DRAWDOWN_PCT: 15`
- `MAX_CONSECUTIVE_LOSSES: 3`
- `COOLDOWN_AFTER_STOP_MIN: 30`

**Trigger Event:**
- Detected after trade #72
- Entered 30-minute cooldown
- Rejecting all BUY signals during cooldown

**Log Evidence:**
```
🛑 Circuit breaker active - 7 minutes remaining
Signal: BUY (Confidence: 67%)
Reason: DIP DETECTED: Bullish candle + MACD rising...
```

Bot detected BUY opportunities but correctly blocked them.

**Conclusion:** Circuit breaker is NOT broken. It triggered correctly and protected capital during the cooldown period.

---

## Trade Patterns

### QUICK_SL Losses (Immediate Reversals)

**Pattern:** Bot enters → price immediately reverses → -2% loss in 2-4 seconds

**Examples:**
- Trade #66: -2.03% in 2s
- Trade #68: -2.77% in 2s
- Trade #69: -2.57% in 4s

**Root Cause:** Buying at TOPS of pumps (lagging indicators catch phase 3, not phase 1-2)

### MAX_HOLD Timeouts (Stalls)

**Pattern:** Bot enters → price barely moves → times out at 60s → small loss

**Examples:**
- Trade #67: -1.03% in 66s
- Trade #70: -0.78% in 64s
- Trade #71: -0.57% in 65s
- Trade #72: -0.43% in 65s

**Root Cause:** Entering weak bounces, not strong pumps

---

## Current Config (After "Pivot")

### Entry Criteria (NOT ACTUALLY RUNNING)
```javascript
MIN_MOMENTUM_1M: 0.5%           // Lowered for early entry
MIN_MOMENTUM_5M: 0.3%           // Lowered for early entry
MIN_VOLUME_RATIO: 1.5x          // Lowered for early entry

// These filters exist but never execute:
REQUIRE_RSI_ENTRY: true         // ❌ Bug prevents execution
RSI_ENTRY_MAX: 45               // ❌ Never checked
RSI_ENTRY_MIN: 25               // ❌ Never checked
REQUIRE_MACD_ENTRY: true        // ❌ Bug prevents execution
MACD_CROSSOVER_REQUIRED: true   // ❌ Never checked
```

### Exit Criteria (WORKING)
```javascript
QUICK_TP_1: 2.0%                // Take profit target 1
QUICK_TP_2: 4.0%                // Take profit target 2
QUICK_SL: 2.0%                  // Stop loss
MAX_HOLD_TIME_SEC: 60           // Force exit timeout
```

---

## Root Cause Analysis

### Why Performance Declined

1. **Lowered momentum thresholds** (2.0% → 0.5%, 1.0% → 0.3%)
   - Allowed bot to enter on weaker signals
   - More entries = more bad entries
   
2. **Lowered volume requirement** (3.0x → 1.5x)
   - Reduced confirmation strength
   - Catching weak bounces, not strong pumps

3. **RSI/MACD filters not executing**
   - Should have filtered out high-RSI (overbought) entries
   - Should have required MACD crossover (momentum building)
   - But bug prevented any filtering

**Result:** Bot entering MORE trades with WEAKER signals and NO additional filters.

### The Irony

The "leading indicators" pivot was supposed to catch pumps EARLIER (phase 1-2).  
Instead, we lowered thresholds and removed the safety checks that would have prevented bad entries.

---

## Next Steps

### 1. Fix the Bug ✅ PRIORITY

**Recommended Fix:** Add `.ready` property to `getIndicators()` return object

In `data/incremental-indicators.mjs`:
```javascript
getIndicators() {
  return {
    rsi: this.rsi.getValue(),
    macd: this.macd.getValue(),
    bb: this.bb.getValue(),
    ema20: this.ema20.getValue(),
    ema50: this.ema50.getValue(),
    candle: this.lastCandle,
    updateCount: this.updateCount,
    ready: this.isReady()  // ✅ ADD THIS
  };
}
```

### 2. Verify Fix

- Restart bot
- Check logs for "✅ RSI confirmed" or "📈 RSI too high" messages
- If missing, filter still broken

### 3. Test Properly (10-15 trades)

**Validation Criteria:**
- RSI/MACD rejection messages appear in logs
- Fewer entries (filtering out bad signals)
- Higher win rate (avoiding overbought entries)
- Reduced QUICK_SL count (not buying tops)

**Success Metrics:**
- Win rate >40%
- Avg P&L >-1.0%
- QUICK_SL <30% of trades
- Evidence of filter rejections in logs

### 4. Alternative: Mean Reversion Strategy

If leading indicators still don't work after fix:

**Entry Criteria:**
```javascript
RSI < 30                        // Oversold
Price near lower Bollinger Band // At support
Volume spike on dip             // Selling exhaustion
```

**Target:** Catch bounces from oversold, not early pumps

---

## Files Created

1. `CRITICAL-BUG-RSI-MACD-FILTERS.md` - Complete bug documentation
2. `ANALYSIS-2026-02-20-EVENING.md` - This file

---

## Lessons Learned

1. **Always verify code is executing** - Check logs for expected messages
2. **Zero improvement = investigate immediately** - 7 trades with 0% win rate was a red flag
3. **Test incrementally** - Should have verified filters after 2-3 trades, not 7
4. **Log everything during development** - Filter confirmation messages would have caught this instantly
5. **API assumptions are dangerous** - Don't assume `.ready` exists without checking
6. **Type safety prevents these bugs** - TypeScript would catch `indicators.ready` being undefined

---

## Recommendation

**DO NOT test further until bug is fixed.** Every trade without working filters is wasted capital and invalid data.

Fix → Verify → Test → Analyze → Iterate.
