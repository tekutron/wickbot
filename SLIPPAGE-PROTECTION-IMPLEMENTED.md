# Slippage Protection Implementation (2026-02-19)

## Problem Analysis
Trade 35 lost -8.67% when we expected -2% SL due to unlimited slippage.
- Root cause: No `slippageBps` parameter = Jupiter accepts ANY price
- Impact: -6.67% slippage (335% worse than expected)
- Pattern: Slippage helps on pumps (+0.31%, +1.55%), destroys on dumps (-6.67%)

## Solution Implemented

### 1. Adaptive Slippage (Config)
```javascript
// Slippage Protection (2026-02-19 ADAPTIVE SLIPPAGE)
SLIPPAGE_PROFIT_BPS: 200,       // 2% max on wins (protect gains)
SLIPPAGE_SMALL_LOSS_BPS: 300,   // 3% max on small losses
SLIPPAGE_BIG_LOSS_BPS: 1000,    // 10% max on big losses (emergency)
SLIPPAGE_THRESHOLD_PCT: -5,     // Threshold for "big loss"
```

**Logic:**
- **Profitable exits:** 2% slippage (tight - lock in gains)
- **Small losses (0% to -5%):** 3% slippage (minimize loss)
- **Big losses (<-5%):** 10% slippage (emergency exit at any price)

### 2. Pre-Flight Price Check (Config)
```javascript
// Pre-Flight Price Check (2026-02-19 EXECUTION PROTECTION)
PRE_FLIGHT_CHECK: true,         // Verify Jupiter quote before executing
MAX_PRICE_DEVIATION_PCT: 2.0,   // Abort if Jupiter >2% worse
RETRY_ON_BAD_PRICE: true,       // Wait and retry if price bad
MAX_EXECUTION_RETRIES: 3,       // Max attempts
RETRY_DELAY_MS: 2000,           // Wait 2s between retries
```

**Logic:**
1. Get Jupiter quote BEFORE committing
2. Calculate quoted P&L vs. expected P&L
3. If deviation >2%, wait 2s and retry (up to 3 attempts)
4. Only proceed if price is within tolerance

### 3. Jupiter Swap Updates (executor/jupiter-swap.mjs)

**Added getQuote() method:**
```javascript
async getQuote(inputMint, outputMint, amountIn, inputDecimals, outputDecimals) {
  // Returns: { price, amountOut, amountOutRaw } or { error }
  // Same as swap() but WITHOUT execution
}
```

**Updated swap() method:**
```javascript
async swap(..., slippageBps = null) {
  // Now accepts slippageBps parameter
  // Adds to Jupiter API params if specified
  // Logs: "🛡️ Slippage protection: 2.0% max"
}
```

### 4. Bot Logic Updates (bot-fast.mjs)

**executeSell() complete rewrite:**
1. **Calculate adaptive slippage** based on current P&L
2. **Pre-flight check** (if enabled):
   - Get Jupiter quote
   - Compare quoted P&L vs. expected P&L
   - Abort if >2% worse
3. **Execute swap** with slippage protection
4. **Retry logic**:
   - If slippage error, wait 2s and retry
   - Up to 3 attempts total
   - Give up after max retries

**New console output:**
```
💰 Profit mode: 2.0% max slippage (protect gains)
🔍 Pre-flight check: Getting Jupiter quote...
📊 Expected P&L: +3.50%
📊 Jupiter quote: +3.20%
📊 Deviation: 0.30%
✅ Pre-flight passed: Price within 2.0% tolerance
💱 Executing swap (attempt 1)...
🛡️ Slippage protection: 2.0% max
```

## Expected Impact

### Before (Trade 35):
```
Expected: -2% SL
Actual: -8.67% loss
Slippage: -6.67% (unprotected)
```

### After (With Protection):
```
Expected: -2% SL
Pre-flight: Jupiter quotes -3.5%
Within tolerance: ✅ (1.5% deviation < 2% limit)
Execute with 3% max slippage
Actual: -3% to -4% loss
Saved: ~4-5% per bad exit
```

### Trade 35 Simulation:
```
Without protection:
- Entry: $0.00073041
- Expected exit: $0.00071520 (-2%)
- Actual exit: $0.00066708 (-8.67%) ❌

With protection:
- Entry: $0.00073041
- Pre-flight quote: $0.00069589 (-4.73%)
- Deviation: 2.73% > 2.0% limit
- ABORT → Wait 2s
- Retry quote: $0.00070620 (-3.31%)
- Deviation: 1.31% < 2.0% ✅
- Execute with 3% max slippage
- Actual exit: ~$0.00070800 (-3% to -4%) ✅
- Saved: ~5% vs. unprotected
```

## Risk Trade-offs

### Conservative Settings (Current):
- ✅ Prevents catastrophic losses (-8% → -4%)
- ✅ Predictable exits (know worst case)
- ❌ Might fail to exit during flash crashes
- ❌ Could miss quick exit opportunities

### If Swaps Keep Failing:
**Option A:** Increase MAX_PRICE_DEVIATION_PCT (2% → 3%)
- More lenient on price discrepancies
- Accepts slightly worse fills

**Option B:** Increase SLIPPAGE_SMALL_LOSS_BPS (3% → 5%)
- Accepts bigger losses but guarantees execution
- Balance: protection vs. reliability

**Option C:** Disable pre-flight for emergency exits
- Only use pre-flight on profits
- Let losses exit immediately (safer for rug-pulls)

## Files Modified
1. `config.mjs` - Added slippage + pre-flight config
2. `executor/jupiter-swap.mjs` - Added getQuote() + slippageBps parameter
3. `bot-fast.mjs` - Rewrote executeSell() with full protection

## Testing Plan
1. Start bot with current configuration
2. Monitor first 10 trades:
   - Check pre-flight logs
   - Verify slippage protection working
   - Compare expected vs. actual P&L
3. If seeing swap failures:
   - Increase MAX_PRICE_DEVIATION_PCT or slippage limits
   - Consider disabling pre-flight for losses
4. If losses still >5%:
   - Investigate liquidity issues
   - May need to filter out ultra-low liquidity tokens

## Key Metrics to Watch
- **Slippage impact:** Expected P&L vs. Actual P&L
- **Pre-flight accuracy:** Quoted P&L vs. Final P&L
- **Retry success rate:** How often retries result in better fills
- **Swap failure rate:** How often we hit max retries

## Success Criteria
- ✅ No more -8% losses on -2% SL triggers
- ✅ Actual P&L within 2% of expected P&L
- ✅ <10% swap failure rate (below this = acceptable)
- ✅ Win rate improves from 50% due to better exit execution

## Next Steps After Testing
1. If successful: Consider adding to buy side too
2. If failures: Tune MAX_PRICE_DEVIATION_PCT
3. If still issues: Look at token liquidity filters (min $100K liquidity?)
4. Long-term: Build liquidity depth checker (scan order book before trading)
