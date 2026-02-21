# Critical Bug Investigation - 2026-02-20 7:15 PM

## Symptoms

**Bot stopped unexpectedly with "Max drawdown reached"**

### Timeline
- **6:56 PM:** Test session started
  - Starting capital: 0.065254 SOL
  - Last trade before session (#76): +1.50% profit
  
- **7:11 PM:** Bot auto-stopped (15 minutes into test)
  - Logged balance: 0.016295 SOL (-75% loss!)
  - Max drawdown circuit breaker triggered (30% threshold)
  - Only 1 trade executed (#77): -0.07% loss

### The Discrepancy

**Logged Balance vs. Actual Balance:**
- Bot log shows: 0.016295 SOL
- Actual wallet balance: **0.064731 SOL**
- Real loss: ~0.8% (matches -0.07% trade)
- Phantom loss: ~75% (doesn't exist!)

## Root Cause Analysis

### Evidence from Logs

```
[Trade #76 end - 6:54 PM]
✅ Position closed: 0.0491 SOL
📊 Final P&L: -1.13%
💰 New balance: 0.065254 SOL

[Trade #77 start - 6:56 PM]
[Trade #77 end - 6:58 PM]
✅ Position closed: 0.0485 SOL
📊 Final P&L: -0.97%
💰 New balance: 0.016295 SOL  ⚠️ BUG HERE

[Circuit Breaker Triggered]
⚠️ Max drawdown reached - stopping trading
```

### Bug Location

**File:** `bot-fast.mjs` line 632  
**Function:** `executeSell()`

```javascript
// After sell completes:
await this.positionManager.updateCapitalFromChain();
const newBalance = this.positionManager.currentCapital;
console.log(`   💰 New balance: ${newBalance.toFixed(6)} SOL\n`);
```

**File:** `executor/position-manager.mjs` lines 73-98  
**Function:** `updateCapitalFromChain()`

```javascript
async updateCapitalFromChain() {
  try {
    const balance = await this.getBalance();
    
    // For custom token trading (TOKEN/SOL), track SOL balance
    // For SOL/USDC trading, track USDC balance
    if (config.isCustomTokenMode()) {
      // Custom token mode: Always track SOL (since we trade TOKEN/SOL)
      this.currentCapital = balance.sol;  // ⚠️ Should work correctly
    } else if (config.ACTIVE_WALLET === 'USDC') {
      // SOL/USDC mode: Track USDC
      this.currentCapital = balance.usdc / 86; // ⚠️ SUSPICIOUS CONVERSION
    } else {
      // SOL wallet mode: Track SOL
      this.currentCapital = balance.sol;
    }
    
    // ... validation code ...
  }
}
```

### Hypothesis #1: Wrong Balance Source

**Possible Issue:** `getBalance()` returning wrong value OR reading wrong token account.

**Test:** Run `get-balance.mjs` directly:
```
Result: 0.064731 SOL (CORRECT)
```
✅ Balance fetching works correctly when called directly.

### Hypothesis #2: Token Account Confusion

**Possible Issue:** After selling token back to SOL, bot might be reading the TOKEN balance instead of SOL balance.

**Evidence:**
- Trade sold 347.97 tokens → 0.0485 SOL
- Bot shows balance = 0.016295 SOL
- Could this be reading remaining TOKEN balance instead of SOL?

**Check:** What's the current token balance?
```
Need to check: Do we have 0.016295 worth of Lobstar tokens left?
```

### Hypothesis #3: State File Corruption

**Possible Issue:** `wickbot_state.json` corrupted and overwriting live balance.

**Evidence:**
```json
{
  "positions": [],
  "currentCapital": 0.016294805,  // ⚠️ MATCHES BUG!
  "startingCapital": 0.085845,
  "updatedAt": "2026-02-21T02:58:00.819Z"
}
```

State file shows same wrong balance. This suggests:
1. Either: State file caused the bug (wrote wrong value)
2. Or: State file is symptom (saved the wrong calculated value)

### Hypothesis #4: Race Condition

**Possible Issue:** `updateCapitalFromChain()` called before sell transaction finalized on-chain.

**Evidence:**
- Sell transaction signature: `65g4bu8HnqD1UC8UxQrGe9xjNDP3HVS2cuX9SkvnzMnZnU7TwFVF1M7mX9pc9tVSxwgJiC9AKs5kwhErKrawiZ4y`
- Bot immediately calls `updateCapitalFromChain()` after swap
- If SOL hasn't arrived yet, balance would be OLD - tokens already gone

**But:** This would show LESS SOL (before swap completed), not MORE tokens.

### Hypothesis #5: Multiple Wallets / Wrong Wallet

**Possible Issue:** Bot reading balance from WRONG wallet address.

**Evidence:**
- Wallet address: `DqfDgvcGMhHczhAeQp6nUNFGNkhQSbGPGjKLEn4QGihf`
- Direct balance check: 0.064731 SOL ✅
- Bot balance check: 0.016295 SOL ❌

**Check:** Is bot using correct wallet for balance queries?

## Next Steps

### Immediate Actions
1. ✅ Stop bot (already stopped)
2. ✅ Verify real wallet balance: 0.064731 SOL (safe!)
3. ⏳ Check token balances (are we holding Lobstar tokens?)
4. ⏳ Verify last transaction on-chain
5. ⏳ Review `getBalance()` implementation
6. ⏳ Add debug logging to `updateCapitalFromChain()`

### Debug Plan
1. Add logging to every step of `updateCapitalFromChain()`:
   ```javascript
   console.log('[DEBUG] getBalance() returned:', balance);
   console.log('[DEBUG] config.isCustomTokenMode():', config.isCustomTokenMode());
   console.log('[DEBUG] Setting currentCapital to:', balance.sol);
   ```

2. Check for token balances:
   ```javascript
   // Get ALL token accounts, not just SOL/USDC
   const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
     wallet.publicKey,
     { programId: TOKEN_PROGRAM_ID }
   );
   ```

3. Verify transaction finality:
   ```javascript
   // After swap, wait for confirmation
   await connection.confirmTransaction(signature, 'confirmed');
   // THEN update balance
   ```

### Test Plan
1. Create isolated test script that mimics the swap flow
2. Log balance at every step:
   - Before swap
   - Immediately after swap (before confirmation)
   - After confirmation
   - After `updateCapitalFromChain()`
3. Compare logged values with on-chain reality

## Risk Assessment

**Current Risk:** 🟢 LOW (Capital is safe)
- Real balance: 0.064731 SOL
- No actual loss of funds
- Bug is in balance REPORTING, not execution

**If Not Fixed:** 🔴 HIGH
- Circuit breakers trigger incorrectly
- Bot stops trading when it shouldn't
- False drawdown readings prevent profitable trading
- Cannot trust P&L calculations

## Recommendation

**DO NOT RESTART BOT** until bug is identified and fixed.

This is a critical calculation bug that makes the bot unreliable. The circuit breakers are working correctly (they stopped the bot when they thought capital crashed), but they're getting false data.

---

**Investigation Started:** 2026-02-20 7:15 PM PST  
**Status:** IN PROGRESS  
**Priority:** CRITICAL
