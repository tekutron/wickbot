# Swap API Comparison - Feb 21, 2026

## ✅ Jupiter Ultra API (WORKING - RECOMMENDED)
**Endpoint:** `https://lite-api.jup.ag/ultra/v1/`
**Status:** ✅ Fully functional
**Evidence:** Successfully sold both Lobstefeller + pepper (recovered 0.144 SOL)

**Pros:**
- Works with ALL Solana tokens (pump.fun + graduated)
- Aggregator routes through best liquidity
- Has API key authentication
- 3-step process: order → sign → execute
- Proven working RIGHT NOW

**Cons:**
- May be slower than direct bonding curve (but still fast: ~300ms)
- Requires API key (we have: 1f76dcbd-dc35-4766-a29e-d81e2b31a7a8)

**Code:** 
- `sell-lobster-ultra.mjs` (working)
- `sell-pepper-ultra.mjs` (working)
- `test-jupiter-ultra.mjs` (working)

---

## ❓ PumpPortal.fun API (UNTESTED FOR SWAPS)
**Endpoint:** `https://pumpportal.fun/api/trade-local`
**Status:** ⚠️ Returns 400 Bad Request (needs debugging)

**Pros:**
- Direct bonding curve trades (potentially faster)
- SDK exists in pump-sniper project
- No API key needed
- Designed specifically for pump.fun tokens

**Cons:**
- Current test returns 400 error
- API may have changed or requires different parameters
- Only works for bonding curve tokens (not graduated)
- Would need time to debug (we have 4.5 hours left)

**Code:**
- `/home/j/.openclaw/pump-sniper/pumpportal-sdk.mjs` (exists)
- Test failed with 400 Bad Request

---

## ❌ Helius (NO SWAP API)
**Service:** RPC Provider
**Status:** ❌ Not a swap service

Helius provides:
- Fast RPC endpoints
- Enhanced APIs (webhooks, NFT data, etc.)
- NOT a DEX aggregator or swap service

---

## 🎯 RECOMMENDATION

**USE JUPITER ULTRA API**

**Reasons:**
1. ✅ Working RIGHT NOW (proven with real trades)
2. ✅ Handles all token types
3. ✅ Already integrated into wickbot
4. ⏰ No time to debug alternatives (4.5 hours to 20x)
5. 💰 Just recovered 0.144 SOL with it

**For trading pump.fun tokens:**
Jupiter Ultra routes through Pump.fun AMM when appropriate, so we get the same liquidity as PumpPortal would provide, but with more routing options.

**Evidence from our test:**
```
Quote received for Lobstefeller:
  Out: 0.116794 SOL
  Route: Pump.fun Amm (direct)
  Price impact: 0.013%
```

Jupiter IS using Pump.fun AMM directly when it's the best route!

---

## Decision: KEEP JUPITER ULTRA API ✅

No need to switch. It's working, it's fast, and we've already recovered all capital with it.
