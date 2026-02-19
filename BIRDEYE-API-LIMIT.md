# ⚠️ Birdeye API Rate Limit Issue

**Date:** 2026-02-18 17:23 PST

## Problem

Bot fails to start with error:
```
Birdeye fetch error: Birdeye API error: 400 Bad Request
❌ Failed to fetch initialization candles
```

**Root Cause:**  
Birdeye API returns: `{"success":false,"message":"Compute units usage limit exceeded"}`

The free tier API key has hit its rate limit and cannot fetch candle data.

## Impact

- ❌ Bot cannot initialize (needs 100 candles for indicators)
- ❌ Cannot fetch historical OHLCV data
- ❌ RSI, MACD, Bollinger Bands require historical candles
- ✅ DexScreener API still works (current price only)

## Solutions

### Option 1: Get Better Birdeye API Key ⭐ Recommended
**What:** Upgrade to paid Birdeye plan or use a different API key

**Pros:**
- Full indicator support (RSI, MACD, BB)
- Historical candle data
- All features work

**Cons:**
- Requires Birdeye account/payment
- May cost money

**How to apply:**
```bash
cd /home/j/.openclaw/wickbot
# Add to .env file:
echo "BIRDEYE_API_KEY=your_new_key_here" >> .env
```

### Option 2: Use SOL/USDC Instead
**What:** Trade SOL/USDC instead of custom tokens

**Pros:**
- Birdeye has SOL data
- All indicators work
- Tested and stable

**Cons:**
- Less volatility than pump.fun tokens
- Misses custom token opportunities

**How to apply:**
```bash
# In dashboard:
1. Clear token address field
2. Click "Apply Token"
3. Start bot (will trade SOL/USDC)
```

### Option 3: Wait for Rate Limit Reset
**What:** Birdeye free tier resets daily/hourly

**Pros:**
- No changes needed
- Free

**Cons:**
- Unknown when it resets
- May hit limit again quickly

### Option 4: Simplified Price-Only Mode (Development Needed)
**What:** Create mode that trades without historical indicators

**Uses:**
- Current price from DexScreener
- Simple momentum (% change)
- Volume analysis

**Requires:**
- Code changes to bot-fast.mjs
- Remove indicator initialization
- Simplified signal generation

## Current Workaround

**For immediate testing, switch to SOL/USDC:**

1. **Dashboard:** http://localhost:3000
2. **Token Configuration section:**
   - Clear the token address field
   - Click "🪙 Apply Token"
   - Select "Reset to default SOL/USDC"
3. **Start bot** - Should work without Birdeye issues

**Why this works:**
- SOL is a major token, always available on Birdeye
- Lower API usage
- All features functional

## Testing Each Solution

### Test Birdeye API Key:
```bash
cd /home/j/.openclaw/wickbot
node -e "
import { BirdeyeAPI } from './data/birdeye-api.mjs';
const api = new BirdeyeAPI();
const sol = 'So11111111111111111111111111111111111111112';
const candles = await api.fetchCandles(sol, '1m', 1);
console.log(candles ? '✅ Works!' : '❌ Still rate limited');
"
```

## Recommendation

**For NOW:** Use SOL/USDC to test bot functionality  
**For LATER:** Get a better Birdeye API key or build DexScreener candle aggregator

The aggressive scalping settings will still work great with SOL/USDC!
