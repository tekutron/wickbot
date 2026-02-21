# Analysis: Tightened Filters Failed - 2026-02-20 15:30

## Summary

**Hypothesis:** Tightening entry filters (2% momentum, 3x volume) would filter out weak bounces and catch only strong pumps.

**Result:** FAILED. Performance got WORSE.

---

## Performance Comparison

### BEFORE Filter Tightening (Trades #34-62)
- Total: 29 trades
- Win rate: 34%
- Avg P&L: **-1.87%**

### AFTER Filter Tightening (Trades #63-69)
- Total: 7 trades  
- Win rate: 14%
- Avg P&L: **-2.33%**

**Delta: -0.46% worse per trade** ❌

---

## What Happened

### New Problem: Buying Tops

**Pattern discovered:** Bot is hitting QUICK_SL in 2-3 seconds

**Recent trades:**
- Trade #66: Entry $0.00021335 → $0.00020902 in **2s** (-2.03%)
- Trade #68: Entry $0.00015893 → $0.00015454 in **2s** (-2.77%)
- Trade #69: Entry $0.00006978 → $0.00006799 in **3s** (-2.57%)

**Observation:** Price IMMEDIATELY reverses after entry (drops -2 to -2.77% within seconds)

### Root Cause Analysis

**The tightened filters DID catch stronger pumps...**
- 2% momentum + 3x volume = only very strong moves
- These ARE real pumps with real volume

**...but caught them TOO LATE:**
- By the time 2% momentum + 3x volume shows up, pump is PEAKING
- Bot enters at the TOP
- Price immediately reverses (profit-takers exit)
- Stop loss hit in 2-3 seconds

### Why This Makes Sense

**Pump lifecycle:**
1. **Early phase** (0-30s): 0.5-1% momentum, 1-2x volume (small)
2. **Growth phase** (30-60s): 1-2% momentum, 2-3x volume (growing)
3. **Peak phase** (60-90s): 2%+ momentum, 3x+ volume (PEAK) ← **Bot enters HERE**
4. **Reversal** (90s+): Momentum dies, profit-takers sell, price drops

**Old filters (1% momentum, 2x volume):**
- Entered in growth phase (phases 1-2)
- Sometimes caught pumps early (good)
- Sometimes caught weak bounces (bad)

**New filters (2% momentum, 3x volume):**
- Only enter in peak phase (phase 3)
- ALWAYS catch strong pumps (good)
- ALWAYS catch them too late (bad)
- Result: Buying tops, immediate reversals

---

## Token Analysis

**Current token:** Komomo (switched from Lobstar)

**Komomo stats:**
- Price: $0.00006-0.00022 (highly volatile, dropping)
- 1h change: Need to check current data
- Volume 1h: Need to check
- Liquidity: Need to check

**Note:** Token keeps changing (GROKIUS → Lobstar → Komomo). May indicate:
- User testing different tokens manually
- Dashboard token switching being used
- Each token has different characteristics

---

## Why Tighter Filters Failed

### The Paradox

**Looser filters (old):**
- Catch pumps EARLY (phase 1-2)
- But also catch WEAK bounces
- Result: Some winners, some losers

**Tighter filters (new):**
- Catch pumps LATE (phase 3)
- Only STRONG pumps, but at PEAK
- Result: All losers (buying tops)

**Conclusion:** The problem isn't filter STRENGTH, it's filter TIMING.

---

## What We Need Instead

### Leading Indicators (Predict pumps BEFORE they start)

Current approach uses LAGGING indicators:
- Momentum % = price already moved
- Volume ratio = volume already spiked
- By the time we see these, pump is in progress or peaking

Need LEADING indicators that predict BEFORE pump:
1. **RSI divergence** - Price makes lower low, RSI makes higher low (bullish)
2. **MACD crossover** - MACD line crosses above signal line (momentum building)
3. **Bollinger Band squeeze** - Bands narrow → big move incoming
4. **Volume building** - Volume increasing but price flat (accumulation)
5. **Buy/sell ratio shift** - More buys than sells starting
6. **Order book imbalance** - More buy orders than sell orders

### Entry Timing Options

**Option A: Earlier Entry (RISKIER)**
- LOWER momentum threshold (0.5% instead of 2%)
- Catch pump in early phase
- Risk: More false signals

**Option B: Wait for Confirmation (SAFER)**
- Wait for pump to START (0.5-1% move)
- Enter ONLY if it continues (1.5-2% within 10s)
- Confirms pump has legs, not just a spike

**Option C: Different Strategy (PIVOT)**
- Stop trying to catch pumps mid-flight
- Wait for PULLBACKS after pumps
- Enter on dip, ride the bounce

**Option D: Use Leading Indicators (SMARTER)**
- RSI <40 + MACD crossover = pump likely starting
- Enter BEFORE momentum shows 2%
- Catch pump from beginning

---

## Available Indicators in Bot

**Checking data/incremental-indicators.mjs:**
- RSI (already implemented)
- MACD (already implemented)  
- Bollinger Bands (already implemented)
- EMA (already implemented)
- SMA (already implemented)

**All the tools we need are ALREADY THERE!**

**Current problem:** Bot uses these for CONFIRMATION (after pump started)

**Solution:** Use them for PREDICTION (before pump starts)

---

## Recommended Changes

### Immediate (Test This):

**1. Use RSI + MACD for Early Entry**
```javascript
// BEFORE (current - lagging):
if (momentum1m > 2.0% && volumeRatio > 3.0x) {
  enter(); // Pump already at peak
}

// AFTER (leading):
if (RSI < 40 && MACD_crossover && momentum1m > 0.5%) {
  enter(); // Pump just starting
}
```

**Logic:**
- RSI <40 = oversold, bounce likely
- MACD crossover = momentum building
- 0.5% momentum = pump starting (not peaked)

**2. Add Continuation Filter**
```javascript
// After entry, check if pump continues
if (10 seconds passed && price hasn't moved +1%) {
  exit(); // False signal, pump didn't materialize
}
```

**3. Lower Initial Filters**
```javascript
MIN_MOMENTUM_1M: 0.5%  // Was 2.0% (catch earlier)
MIN_VOLUME_RATIO: 1.5x // Was 3.0x (catch earlier)
```

**Then ADD RSI + MACD requirements:**
```javascript
REQUIRE_RSI_DIP: true
RSI_ENTRY_MAX: 45      // Only enter when RSI <45 (oversold/neutral)
REQUIRE_MACD_CROSS: true
```

---

## Alternative: Completely Different Approach

### Mean Reversion Strategy

Instead of chasing pumps, trade REVERSALS:

**When to enter:**
- Token dumps -5 to -10% quickly
- RSI drops below 30 (oversold)
- MACD shows divergence (price down, MACD up)
- Enter expecting bounce back to mean

**Exit:**
- +2-3% bounce (mean reversion)
- Or stop loss at -2%

**Why this might work better:**
- Entering CHEAP (after dump), not EXPENSIVE (at peak)
- Clear risk/reward (bounce is predictable)
- RSI <30 has strong mean reversion tendency

---

## Next Steps

### Option 1: Test RSI + MACD Entry
1. Lower momentum filters (2% → 0.5%)
2. Add RSI <45 requirement
3. Add MACD crossover requirement
4. Test 10-20 trades
5. See if we catch pumps EARLIER

### Option 2: Pivot to Mean Reversion
1. Change strategy completely
2. Enter on RSI <30 after dump
3. Exit on bounce to RSI 50-60
4. Test on same volatile tokens

### Option 3: Find Better Tokens
1. Current tokens (Komomo, Lobstar) extremely volatile
2. Maybe try tokens with:
   - Higher liquidity (>$500K)
   - Lower volatility (24h change <50%)
   - More consistent volume

---

## Bottom Line

**The analysis was right:** Bot catches strong pumps vs weak bounces

**The solution was wrong:** Catching them LATER made it worse

**The real problem:** Using LAGGING indicators to time entries

**The real solution:** Use LEADING indicators (RSI, MACD) to enter BEFORE pump peaks

Bot has all the indicators we need. We just need to:
1. Use RSI + MACD to PREDICT pumps
2. Lower momentum threshold to catch them EARLY
3. Add confirmation filter to reject false signals

Or pivot entirely to mean reversion (enter on RSI <30 dips).

