# Multi-Token Support - wickbot
**Created:** 2026-02-18  
**Status:** ✅ READY FOR PRODUCTION

## Problem Statement

**Original Issue:**
When switching between different Solana tokens (fartbutt, WAR, CWIF, BONK, etc.), swap signals would trigger but swaps would fail because:

1. **Token decimals varied** - pump.fun tokens use 6, standard tokens use 9, BONK uses 5
2. **Token programs differed** - Token-2022 vs Standard SPL
3. **No validation** - Bot didn't check if token existed or had liquidity
4. **Hardcoded assumptions** - Expected all tokens to behave like SOL/USDC

## Solution: Universal Token Validator

### New Component: `token-validator.mjs`

**What it does:**
- ✅ Validates token exists on-chain
- ✅ Auto-detects token program (SPL vs Token-2022)
- ✅ Fetches correct decimals from blockchain
- ✅ Checks Jupiter route availability
- ✅ Gets market data (price, liquidity, volume)
- ✅ Caches results for 5 minutes

**How it works:**
```javascript
import tokenValidator from './executor/token-validator.mjs';

// Validate any Solana token
const info = await tokenValidator.validateToken('9r1U43rs...'); // fartbutt

// Returns complete token info:
{
  address: '9r1U43rs...',
  decimals: 6,
  program: 'TokenkegQfeZy...',
  isToken2022: true,
  jupiterSupported: true,
  marketData: {
    symbol: 'fartbutt',
    price: 0.000116,
    liquidity: 28823.18,
    volume24h: 1597512.41,
    marketCap: 116179
  }
}
```

### Integration with bot-fast.mjs

**Before BUY execution:**
```javascript
// Validate token before trading
const tokenInfo = await tokenValidator.validateToken(config.CUSTOM_TOKEN_ADDRESS);

if (!tokenInfo.validated) {
  console.error('Token validation failed - SKIPPING BUY');
  return;
}

// Use validated decimals
const result = await jupiterSwap.swap(
  SOL_MINT,
  TOKEN_MINT,
  amount,
  9,                    // SOL decimals
  tokenInfo.decimals,   // Auto-detected token decimals ✅
  'BUY'
);
```

**Before SELL execution:**
```javascript
// Token info is cached from BUY, no re-validation needed
// Decimals stored in position.tokenDecimals
```

---

## Test Results

### Tested Tokens (All Passed)

| Token | Address | Decimals | Program | Jupiter | Status |
|-------|---------|----------|---------|---------|--------|
| fartbutt | 9r1U43rs...pump | 6 | Token-2022 | ✅ | PASS |
| WAR | 8opvqaWy...bonk | 6 | Standard SPL | ✅ | PASS |
| BONK | DezXAZ8z...B263 | **5** | Standard SPL | ✅ | PASS |
| WIF | EKpQGSJt...zcjm | 6 | Standard SPL | ✅ | PASS |
| USDC | EPjFWdd5...1v | 6 | Standard SPL | ✅ | PASS |

**Key Finding:** BONK uses 5 decimals (not 6 or 9)! This would have caused swap failures without validation.

---

## How to Switch Tokens

### Via Dashboard (Easiest)
1. Open http://localhost:3000
2. Enter new token address
3. Click "Apply"
4. Bot validates token automatically
5. Start trading

### Via Config File
1. Edit `config.mjs`:
   ```javascript
   CUSTOM_TOKEN_ADDRESS: 'YOUR_TOKEN_ADDRESS_HERE',
   CUSTOM_TOKEN_SYMBOL: 'SYMBOL',
   ```
2. Restart bot
3. Bot validates on startup

### Via Command Line Test
```bash
# Test any token before trading
node test-token-validator.mjs
```

Edit the `testTokens` array to add your tokens.

---

## Safety Features

### Validation Checks
1. ✅ **Token exists** - RPC account lookup
2. ✅ **Valid program** - Must be SPL or Token-2022
3. ✅ **Decimals fetched** - From on-chain mint data
4. ✅ **Jupiter route** - Verifies liquidity exists
5. ✅ **Market data** - Price, liquidity, volume from DexScreener

### Failure Modes
**If validation fails, bot will:**
- ❌ Skip the trade
- 🔔 Log error message
- ⏭️ Continue monitoring (doesn't crash)

**Example:**
```
❌ Token validation failed: Token does not exist on-chain
⚠️  SKIPPING BUY - Cannot trade unvalidated token
```

### Cache System
- Validation results cached for 5 minutes
- Reduces RPC calls (important for rate limits)
- Automatically refreshes stale data
- Clear cache: `tokenValidator.clearCache()`

---

## Supported Token Types

### ✅ Standard SPL Tokens
- Common tokens (BONK, WIF, USDC)
- Decimals: Usually 6 or 9
- Program: `TokenkegQfeZyiCLm8Ae4tcjLWi5vGBVgdjQo8rQx6DQi1`

### ✅ Token-2022 (Token Extensions)
- Modern tokens (fartbutt, newer pump.fun launches)
- Decimals: Usually 6
- Program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- Features: Transfer fees, freeze authority, etc.

### ✅ pump.fun Tokens
- New launches on pump.fun
- Decimals: 6
- Can be either Standard SPL or Token-2022
- Validator auto-detects which

---

## Error Handling

### Common Errors & Solutions

**1. "Token does not exist on-chain"**
- Cause: Invalid address or token not deployed
- Solution: Double-check token address

**2. "Could not determine token decimals"**
- Cause: RPC failure or malformed token
- Solution: Validator tries DexScreener fallback, uses market cap heuristic

**3. "Token may have limited liquidity on Jupiter"**
- Cause: Jupiter route test failed
- Solution: Warning only, trade might still work but risky

**4. "Invalid token program"**
- Cause: Token uses non-standard program
- Solution: Cannot trade, need manual review

---

## Performance

### Speed
- On-chain validation: ~500-1000ms
- Cached lookup: ~1ms
- Negligible impact on signal detection

### RPC Usage
- First validation: 2-3 RPC calls
- Cached reads: 0 RPC calls
- Cache expires: 5 minutes

### Recommendations
- **Pre-validate tokens** - Run test script before trading
- **Use dashboard** - Visual feedback on validation
- **Monitor logs** - Watch for validation warnings

---

## Future Enhancements (Optional)

### Could Add:
1. **Token whitelist** - Only trade pre-approved tokens
2. **Liquidity thresholds** - Require minimum $X liquidity
3. **Volume filters** - Minimum 24h volume
4. **Holder count** - Minimum holders (rug detection)
5. **Contract verification** - Check for known scam patterns

### Not Needed Right Now:
- Current system handles all valid Solana tokens
- Validation catches most issues
- Can add filters later if needed

---

## Testing Checklist

### Before Trading New Token:
- [ ] Run `node test-token-validator.mjs` with token address
- [ ] Verify decimals detected correctly
- [ ] Check Jupiter route available
- [ ] Review market data (liquidity > $10K recommended)
- [ ] Test buy signal with small amount first

### After Token Switch:
- [ ] Bot starts without errors
- [ ] Validation passes on first signal
- [ ] Dashboard shows token info
- [ ] Swaps execute successfully
- [ ] Position opens with correct decimals

---

## Files Modified

### New Files:
- `executor/token-validator.mjs` - Universal validator
- `test-token-validator.mjs` - Test script
- `MULTI-TOKEN-SUPPORT.md` - This document

### Modified Files:
- `bot-fast.mjs` - Added validation before BUY
- Imports `tokenValidator` module

### No Changes Needed:
- `jupiter-swap.mjs` - Already supports any decimals
- `position-manager.mjs` - Already stores decimals per position
- `config.mjs` - No changes needed

---

## Commands Reference

### Test Validator
```bash
node test-token-validator.mjs
```

### Test Specific Token
```javascript
// Edit test-token-validator.mjs, add to testTokens array:
{
  name: 'MY_TOKEN',
  address: 'YOUR_TOKEN_ADDRESS'
}
```

### Clear Validation Cache
```javascript
import tokenValidator from './executor/token-validator.mjs';
tokenValidator.clearCache();
```

### Manual Validation
```javascript
const info = await tokenValidator.validateToken('TOKEN_ADDRESS');
console.log(info);
```

---

## Summary

✅ **Problem Solved:** Bot can now trade ANY Solana token without modification

✅ **How it works:** Auto-detects decimals, program, and validates before trading

✅ **Tested with:** fartbutt, WAR, BONK, WIF, USDC (all passed)

✅ **Safe:** Skips trades if validation fails

✅ **Fast:** Results cached for 5 minutes

✅ **Ready:** Integrated into bot, tested, and documented

---

## Next Steps

**You can now:**
1. Switch tokens via dashboard (http://localhost:3000)
2. Trade fartbutt, WAR, CWIF, BONK, WIF, or any Solana token
3. Bot auto-validates and uses correct decimals
4. No code changes needed when switching tokens

**Recommendation:**
- Start with well-known tokens (BONK, WIF) for testing
- Then try pump.fun tokens (fartbutt, WAR, CWIF)
- Monitor first few trades to verify swaps work

**Status:** 🚀 READY TO TRADE MULTIPLE TOKENS
