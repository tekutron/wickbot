# 🚀 wickbot Pre-Flight Checklist

**Date:** 2026-02-18 16:53 PST

## ✅ Configuration

- [x] **Birdeye API Key:** Set (2394a19e...)
- [x] **Jupiter API Key:** Set (1f76dcbd...)
- [x] **Priority Fee:** 0.001 SOL (1,000,000 lamports)
- [x] **DRY_RUN:** false (live trading enabled)
- [x] **Active Wallet:** USDC wallet (0.197 SOL available)

## ✅ Custom Token Support

- [x] **Config Helper Functions:** Dynamic token address resolution
- [x] **Price Data Fetching:** Uses `config.getTargetTokenAddress()`
- [x] **Jupiter Swaps:** Generic `swap()` function for any token pair
- [x] **Dashboard UI:** Token address input + validation (DexScreener)

## ✅ Capital

- [x] **USDC Wallet:** 0.197 SOL (~$16.92 @ $86/SOL)
- [x] **SOL Wallet:** 0.010 SOL (backup)
- [x] **Total:** ~0.207 SOL (~$17.80)
- [x] **Position Size:** 40% = ~0.079 SOL per trade (~$6.79)

## ✅ Trading Logic

- [x] **Default Mode:** Hold USDC → Buy SOL → Sell to USDC
- [x] **Custom Token Mode:** Hold SOL → Buy TOKEN → Sell to SOL
- [x] **Signal Detection:** Fast incremental indicators (RSI, MACD, BB)
- [x] **Entry:** Buy-dip detection (4/6 conditions)
- [x] **Exit:** Sell-top detection (3/5 conditions) + Safety nets (±20%)

## ✅ Dashboard

- [x] **Running:** http://localhost:3000 (port 3000)
- [x] **Token Configuration:** Input + Apply + Validation
- [x] **Position Size Slider:** 10-100% adjustable
- [x] **Controls:** Start/Stop bot, Emergency close

## 📋 Pre-Flight Tests

### Test 1: Config Validation
```bash
cd /home/j/.openclaw/wickbot
node test-custom-token.mjs
```
Expected: Shows config helper functions working

### Test 2: Balance Check
```bash
node dashboard/get-both-balances.mjs
```
Expected: Shows SOL (0.010) and USDC (0.197) wallets

### Test 3: Dashboard Access
```
http://localhost:3000
```
Expected: Dashboard loads, shows controls + token config

## ⚠️ Before Starting Bot

1. **Choose Token:**
   - Default: Leave empty (trades SOL/USDC)
   - Custom: Paste token address in dashboard

2. **Check Settings:**
   - Position Size: 40% (adjust with slider if needed)
   - Priority Fee: 0.001 SOL (set in config)
   - DRY_RUN: false (live trading)

3. **Understand Risks:**
   - Early tokens can be volatile
   - Check liquidity ($15K+ recommended)
   - Start with small position size
   - Monitor first few trades closely

## 🎯 Recommended Test Tokens

**High Liquidity (Safer):**
- FARTCOIN: `9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump`
  - Liquidity: $7M USD
  - Volume: High
  - Price: ~$0.18

**Lower Liquidity (Higher Risk):**
- CWIF: `GjAVDGJs2gP4QzaKT9qvJ4Q47mjP9G2URsKcDAMPpump`
  - Liquidity: $37K USD
  - Volume: Medium
  - Price: ~$0.0002

## 🚀 Launch Command

```bash
cd /home/j/.openclaw/wickbot
node bot-fast.mjs
```

Or start from dashboard (Start Bot button)

## 📊 Monitoring

- Dashboard: Live position tracking
- Console: Real-time signal logs
- State File: `wickbot_state.json`
- Trades File: `wickbot_trades.json`

---

**Status:** ✅ READY FOR TESTING
**Risk Level:** 🟡 MEDIUM (small capital, high volatility tokens)
**Recommendation:** Start with FARTCOIN (higher liquidity)
