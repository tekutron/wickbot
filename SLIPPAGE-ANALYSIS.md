# Slippage Analysis - Trade 35 Deep Dive

## The Problem: -2% SL Became -8.67% Loss

### What Happened (Timeline)

```
12:15:35 - Bot detects: Price = $0.00073041 (entry)
12:15:37 - Bot calculates: PnL = -2.0% (triggers QUICK_SL)
12:15:37 - Bot executes: Jupiter swap
12:15:37 - Actual exit price: $0.00066708
12:15:37 - Actual P&L: -8.67%
```

**Hold time:** 1.8 seconds (ultra-fast exit, as designed)
**Expected loss:** -2.0%
**Actual loss:** -8.67%
**Slippage impact:** -6.67% (335% worse than expected!)

## Root Cause Analysis

### Issue 1: No Slippage Protection in Jupiter Calls

**Current code (jupiter-swap.mjs):**
```javascript
const params = new URLSearchParams({
  inputMint: inputMint,
  outputMint: outputMint,
  amount: amountIn.toString(),
  taker: this.wallet.publicKey.toBase58(),
  priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
  // ❌ NO SLIPPAGE PARAMETER!
});
```

**Jupiter API supports:**
- `slippageBps` - Max slippage in basis points (100 = 1%)
- Default when not specified: **UNLIMITED SLIPPAGE** ⚠️

**What this means:**
- We said "sell at ANY price"
- Jupiter found a route that gave us -8.67% execution
- No protection against bad fills

### Issue 2: PnL Check vs. Execution Price Mismatch

**Bot logic:**
1. Fetches price from DexScreener API: $0.00073041
2. Calculates PnL: -2.0% (vs entry $0.00074653)  
3. Triggers QUICK_SL exit
4. Calls Jupiter swap

**Jupiter execution:**
1. Quotes best route at current moment
2. Market has moved since DexScreener data (5-10s lag)
3. Low liquidity = wide spread
4. Executes at -8.67% (actual liquidity available)

**Time lag:** DexScreener price → Jupiter execution = 2-5 seconds
**In volatile tokens:** 2-5 seconds = massive price movement

### Issue 3: Low Liquidity Token (GROKIUS)

**Token stats:**
- Liquidity: $74,344 (relatively low)
- 5m Volume: $9,718 (thin trading)
- Position size: ~0.075 SOL = ~$6

**Market depth analysis:**
- Our $6 sell order moving price -6.67% = shallow order book
- Indicates: Very few buyers at ask price
- Result: Had to sell into much lower bids

## Why This Matters

### Math Check:
- Position: 0.075 SOL = $6.15 at entry
- Expected -2% loss: -$0.12
- Actual -8.67% loss: -$0.53
- **Unexpected slippage cost: $0.41 (77% of total loss!)**

### Pattern:
This isn't isolated. Let's check our wins:

**Trade 33 (Winner):**
- TP2 target: +4%
- Actual P&L: +4.31%
- Slippage impact: +0.31% (POSITIVE!)

**Trade 34 (Winner):**
- TP1 target: +2%
- Actual P&L: +3.55%
- Slippage impact: +1.55% (POSITIVE!)

**Key insight:** Slippage helps on exits during pumps, DESTROYS on exits during dumps!

## Solutions (Priority Order)

### 1. Add Slippage Protection to Jupiter Swaps (CRITICAL)

```javascript
// In jupiter-swap.mjs
const params = new URLSearchParams({
  inputMint: inputMint,
  outputMint: outputMint,
  amount: amountIn.toString(),
  taker: this.wallet.publicKey.toBase58(),
  priorityFee: config.PRIORITY_FEE_LAMPORTS.toString(),
  slippageBps: 500,  // 5% max slippage (500 basis points)
});
```

**Benefits:**
- Swap fails if price worse than 5%
- Prevents catastrophic exits
- Forces us to retry with better timing

**Trade-off:**
- Failed swaps during flash crashes
- Might miss exits if we're too strict
- Need balance: Too tight = can't exit, Too loose = same problem

### 2. Pre-Flight Price Check (DEFENSIVE)

```javascript
async executeSell(position, currentPrice, reason) {
  // Get FRESH price from Jupiter quote BEFORE committing
  const quote = await this.jupiterSwap.getQuote(...);
  const quotedExitPrice = quote.price;
  const quotedPnL = ((quotedExitPrice - position.entryPrice) / position.entryPrice) * 100;
  
  // If Jupiter quote is MUCH WORSE than DexScreener, abort
  if (quotedPnL < currentPnL - 2.0) {  // More than 2% worse
    console.log(`   ⚠️  Jupiter price ${quotedPnL.toFixed(2)}% worse than expected!`);
    console.log(`   ⏸️  Waiting for better execution price...`);
    return;
  }
  
  // Proceed with swap
  await this.jupiterSwap.swap(...);
}
```

**Benefits:**
- Catches price discrepancies before execution
- Prevents "sell at -8% when we expected -2%"
- Gives us chance to wait for recovery

### 3. Market Order Type Logic (ADAPTIVE)

```javascript
// For PROFITS: Use limit-like behavior (slippage 1-2%)
if (pnl > 0) {
  slippageBps = 200;  // 2% slippage (take profits cleanly)
}
// For SMALL LOSSES: Use tighter slippage, retry if fails
else if (pnl > -5) {
  slippageBps = 300;  // 3% slippage (try to minimize loss)
}
// For BIG LOSSES: Use market order (get out at ANY price)
else {
  slippageBps = 1000;  // 10% slippage (emergency exit)
}
```

**Benefits:**
- Optimize for profit preservation
- Allow emergency exits when necessary
- Prevents small losses becoming big losses

### 4. Wait-and-Retry on Failed Exits (PATIENCE)

```javascript
// If swap fails due to slippage, wait 2-3 seconds and retry
let attempts = 0;
while (attempts < 3) {
  const result = await this.jupiterSwap.swap(...);
  if (result.success) break;
  
  if (result.error.includes('slippage')) {
    console.log(`   ⏸️  Slippage too high, waiting 3s...`);
    await sleep(3000);
    attempts++;
  } else {
    throw new Error(result.error);
  }
}
```

**Benefits:**
- Gives price chance to stabilize
- Better fills on retry
- Prevents panic selling into dumps

## Recommended Configuration

### Conservative (Default):
```javascript
SELL_SLIPPAGE_BPS: 500,     // 5% max slippage
PRE_FLIGHT_CHECK: true,      // Verify Jupiter price before swap
MAX_PRICE_DEVIATION_PCT: 1.5 // Abort if Jupiter >1.5% worse than expected
RETRY_ON_SLIPPAGE: true,     // Wait and retry if slippage too high
MAX_RETRIES: 3,              // 3 attempts before giving up
```

### Aggressive (Accept Risk):
```javascript
SELL_SLIPPAGE_BPS: 1000,    // 10% max slippage (accept big losses)
PRE_FLIGHT_CHECK: false,     // Trust DexScreener price
MAX_PRICE_DEVIATION_PCT: 5   // Allow bigger discrepancies
RETRY_ON_SLIPPAGE: false,    // Immediate exits
```

## Expected Impact

### Before (Current):
- QUICK_SL triggers at -2%
- Actual loss: -8.67% (average)
- Slippage eats 77% of loss

### After (With 5% Slippage Cap):
- QUICK_SL triggers at -2%
- Jupiter quote shows -8% → ABORT
- Wait 2-3 seconds for recovery
- Retry: Exit at -3% to -4%
- **Save 4-5% per bad exit**

### After (With Pre-Flight Check):
- QUICK_SL triggers at -2%
- Pre-flight: Jupiter price -3.5%
- Within tolerance (+1.5% deviation)
- Execute: -3.5% actual
- **Predictable losses, no surprises**

## Next Steps

1. **Implement slippage protection** (5% for sells, 3% for buys)
2. **Add pre-flight price check** (abort if >2% worse)
3. **Test on next session** (monitor slippage impact)
4. **Fine-tune based on data** (adjust caps if needed)

## Key Lesson

**"Execution price ≠ Market price"** in low-liquidity tokens.

We can't assume DexScreener price = Jupiter execution price. Need to:
1. Protect with slippage caps
2. Verify price before executing
3. Be willing to retry on bad fills
4. Accept that some exits will fail (better than -8% losses)
