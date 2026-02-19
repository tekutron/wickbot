# Priority Fee Update

**Date:** 2026-02-18  
**Priority Fee:** 0.001 SOL (~$0.086 at $86/SOL)

## Changes Made

### 1. Config Update (`config.mjs`)
Added new configuration parameter:
```javascript
PRIORITY_FEE_LAMPORTS: 1000000  // 0.001 SOL priority fee
```

### 2. Jupiter Swap Updates (`executor/jupiter-swap.mjs`)

Updated all swap functions to include priority fee parameter:

**swapSolToUsdc():**
```javascript
priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
```

**swapUsdcToSol():**
```javascript
priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
```

**swap() (generic function for custom tokens):**
```javascript
priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
```

## Impact

- **Faster execution:** Transactions will be prioritized by validators
- **Higher success rate:** Less chance of transactions timing out during high network activity
- **Cost per trade:** +0.001 SOL (~$0.086)
- **Total trade cost:** Network fee + Priority fee + Jupiter fee

## Jupiter Ultra API

The Jupiter Ultra API accepts `priorityFee` as a URL parameter in lamports.
This fee is added directly to the transaction as a priority fee instruction.

## Testing

To verify priority fee is applied:
```bash
node test-custom-token.mjs
```

Check Solscan transaction details to see priority fee in action.
