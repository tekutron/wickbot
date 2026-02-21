# Strategy Analysis - Top Solana Trading Bots

**Date:** 2026-02-20 Evening  
**Source:** Desktop/botstrat file  
**Purpose:** Learn from established bots to improve wickbot

---

## Current wickbot Status

**Strategy:** RSI + MACD leading indicators  
**Problem:** Too conservative - RSI <45 filter blocking most entries  
**Result:** 0 trades in 30+ minutes (filters rejecting everything)

**Our Approach:**
- Entry: RSI 25-45 + MACD crossover + 0.5% momentum + 1.5x volume
- Exit: +2%/+4% TP | -2% SL | 60s max hold
- Issue: Waiting for RSI <45 = missing opportunities

---

## Analysis of Top GitHub Bots

### 1. nakul91/solana-trading-bot ⭐ SIMPLEST
**Stars:** 2 / **Language:** Go  

**Strategy:**
- Poll price every 10 seconds
- **Buy dip:** USDC → SOL on 3-5% price drop
- **Sell top:** SOL → USDC on 3-5% price rise
- Max 3 swaps/day (risk control)

**Why it works:**
- Dead simple % logic (no complex indicators)
- Fast execution (Go + direct wallet signing)
- Tailored for Solana volatility

**What we can learn:**
- Our RSI/MACD might be overkill
- Simple % change detection could work better
- Frequency: 10s polling vs our 5s (similar)

**Possible implementation:**
```javascript
// Simple dip/top detector (no RSI/MACD)
if (priceChange1m < -3%) {
  buy();  // Dip detected
} else if (priceChange1m > +3%) {
  sell(); // Top detected
}
```

---

### 2. warp-id/solana-trading-bot ⭐ MOST POPULAR
**Stars:** 2,300 / **Language:** TypeScript  

**Strategy:**
- Real-time market monitoring
- Configurable buy/sell parameters (slippage, delays)
- Token filters (liquidity burn check)
- Auto TP/SL
- Warp executor for faster tx

**Why it works:**
- Community-tested (2,300 stars = trust)
- Optimizes Solana speed (caching/pre-loading)
- Snipes new/low-liquidity pools
- Automated TP/SL (no manual intervention)

**What we can learn:**
- Pre-load/cache market data (we're not doing this)
- Focus on new pool sniping (different strategy)
- Automated TP/SL already working for us ✅

**Risk:** High popularity = more likely to be forked/modified (audit carefully)

---

### 3. YZYLAB/solana-trade-bot ⭐ MOST ADVANCED
**Stars:** 156 / **Language:** Node.js  
**Last Updated:** June 2025 (RECENT)

**Strategy:**
- **WebSocket-based** real-time data (faster than polling!)
- Multi-DEX (Raydium, Pumpfun, Orca, Jupiter)
- Advanced filters (liquidity, market cap, risk score)
- Auto buy/sell with TP/SL
- **Parallel trade execution**
- Real-time PNL tracking

**Why it works:**
- Sub-second monitoring via WebSocket streams
- Buys dips via low-price/liquidity filters
- Sells tops through real-time PNL tracking
- PoC design = easy customization

**What we can learn:**
- **WebSocket > polling** (we're polling every 5s)
- Real-time PNL tracking (we calculate but don't stream)
- Multi-DEX support (we only use Jupiter)
- Parallel execution (we're sequential)

**Possible implementation:**
- Switch from polling to WebSocket price feeds
- Stream PNL updates instead of checking every 5s

---

### 4. Immutal0/solana-trading-bot ⭐ FASTEST
**Stars:** 8 / **Language:** Rust + JS  
**Last Updated:** July 2025 (RECENT)

**Strategy:**
- **gRPC for 1-2 block execution** (ultra-fast!)
- **Jito bundling** (MEV protection + priority)
- Multiple bot types (sniper, bundler, volume, copy-trading)
- TP/SL built-in
- AI sentiment analysis
- Volume/trend detection

**Why it works:**
- Yellowstone gRPC = near-instant trades
- Jito bundling = front-run protection
- Modular design (combine strategies)
- Volume spikes trigger buys

**What we can learn:**
- **Jito bundling** for priority execution
- **Volume spike detection** (we have MIN_VOLUME_RATIO but not spikes)
- Trend detection before entry
- gRPC streams (advanced)

**Risk:** Rust components = harder to audit

---

### 5. axioris/SolanaTradingBot
**Stars:** 7 / **Language:** Node.js  
**Last Updated:** January 2025

**Strategy:**
- HTTP + WebSocket modes
- Customizable filters (liquidity, cap, risk)
- Concurrent buy/sell
- Persistent position logging
- Jito optimization

**Why it works:**
- Balanced approach (HTTP fallback if WebSocket fails)
- Detailed logging for tuning
- Concurrent execution

**What we can learn:**
- Fallback mechanisms (our API already has this ✅)
- Better logging for analysis
- Concurrent position handling

---

## Key Insights

### 1. We're Overthinking Entry Criteria
**Problem:** RSI <45 + MACD + momentum + volume = too strict

**Simple alternatives that work:**
- **% drop:** Buy on -3% to -5% dip (nakul91)
- **Volume spike:** Buy when volume 2-3x avg (Immutal0)
- **Trend + dip:** Buy when trending up + small pullback

### 2. Our Exit Strategy is Already Good ✅
- Fixed TP/SL (+2%/+4%, -2%)
- Max hold time (60s)
- This matches what successful bots use

### 3. Data Feed Optimization
**Current:** Polling every 5s (DexScreener synthetic candles)  
**Better:** WebSocket streams (sub-second updates)

**Benefit:** Catch dips/tops faster

### 4. Volume is More Important Than RSI
**Current focus:** RSI + MACD (lagging indicators)  
**Better focus:** Volume spikes + price % change (leading)

**Pattern:**
- Volume spike + small price drop = accumulation (buy signal)
- Volume spike + price rise = distribution (sell signal)

---

## Recommendations for wickbot

### Option 1: Simple % Logic (nakul91 style) ⭐ EASIEST
**Replace RSI/MACD with:**
```javascript
// Entry
if (priceChange1m <= -2.5% && volume > 1.5x) {
  buy();  // Dip with volume
}

// Exit (already have this via TP/SL)
```

**Pros:** Simple, proven to work, fast  
**Cons:** Might catch false dips

### Option 2: Volume Spike Detection (Immutal0 style) ⭐ BALANCED
**Add volume spike trigger:**
```javascript
// Detect sudden volume increase
const volumeSpike = volume5m / volume1hAvg;

if (volumeSpike >= 3.0 && priceChange1m < -1.0%) {
  buy();  // Accumulation detected
}
```

**Pros:** Catches institutional buying, less false signals  
**Cons:** Need accurate volume data

### Option 3: Hybrid (Best of All)
**Combine simple logic with safety checks:**
```javascript
// Entry
if (priceChange1m <= -2.5% &&        // Dip
    volumeSpike >= 2.5x &&           // Volume confirmation
    priceChange5m > -10%) {          // Not in free-fall
  buy();
}

// Keep current TP/SL exit
```

**Pros:** Simple but safer  
**Cons:** Slightly more complex

### Option 4: WebSocket Upgrade (YZYLAB style) 🚀 ADVANCED
**Switch from polling to streaming:**
- Real-time price updates (sub-second)
- Instant volume spike detection
- Lower latency entries/exits

**Pros:** Fastest possible execution  
**Cons:** More complex implementation

---

## Security Notes

⚠️ **DO NOT download/run code from these repos directly:**
- Many forks contain malware (private key stealers)
- Always audit code line-by-line before use
- Use concepts, not copy-paste

✅ **Safe approach:**
- Read strategies from documentation
- Implement logic ourselves
- Test with small amounts

---

## Immediate Action Plan

### Phase 1: Simplify Entry (Tonight)
1. Remove RSI <45 filter (too strict)
2. Add simple % dip detection (-2% to -3%)
3. Keep volume confirmation (2x minimum)
4. Test 10-20 trades

**Expected result:** More entries, similar or better win rate

### Phase 2: Volume Spike Detection (Tomorrow)
1. Calculate volume spike ratio (5m / 1h avg)
2. Trigger on 3x+ spikes with small dips
3. Compare performance

### Phase 3: WebSocket Streams (Future)
1. Research Solana WebSocket providers
2. Implement real-time price feed
3. Measure latency improvement

---

## Conclusion

**Main takeaway:** Our strategy is too conservative (RSI <45 blocks everything)

**Best immediate fix:** Simplify to % dip detection with volume confirmation

**Inspiration from GitHub bots:**
- nakul91: Proves simple % logic works
- YZYLAB: Shows WebSocket is the future
- Immutal0: Volume spikes are key signal

**Next step:** Implement Option 3 (Hybrid) - simple dip detection with safety checks

---

**Files to update:**
- `bot-fast.mjs` - Simplify entry logic
- `config.mjs` - Add dip % threshold, remove RSI requirements
- Test and iterate based on results
