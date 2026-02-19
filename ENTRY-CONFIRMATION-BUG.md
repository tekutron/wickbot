# Entry Confirmation Bug - "Reset Trap" (2026-02-19)

## The Problem: We Missed the Pump After Exiting

### What Happened (Timeline):

```
11:53:58 - Trade 32: Buy at $0.000815 (TOP) → -1.08% ❌
           Price dumps to $0.000718

11:58:47 - Trade 33: Buy at $0.000718 (DIP) → +4.31% in 1.5s ✅
11:58:49 - Trade 33: Sell at $0.000749 (QUICK_TP2)
           
11:59:05 - Trade 34: Buy at $0.000721 (DIP) → +3.55% in 1.7s ✅
11:59:07 - Trade 34: Sell at $0.000746 (QUICK_TP1)

           🚨 RESET TRAP ACTIVATED HERE 🚨
           Recent 5-candle high: NOW $0.000746 (our exit price)
           Entry confirmation needs: 5% below $0.000746 = $0.000709
           
11:59-12:08 - PUMP HAPPENS! Price goes $0.000746 → $0.000800+
              Bot WAITING for $0.000709 dip (5% below recent high)
              Bot MISSES ENTIRE PUMP ❌
              
12:08-12:15 - Pump ends, price dumps back down
12:15:35 - Trade 35: Buy at $0.000730 (mid-range, NO DIP)
12:15:37 - Trade 35: Sell at $0.000667 (-8.67%, caught the dump) ❌
```

### The Bug: Dynamic "Recent High" Reset

**How entry confirmation works (CURRENT):**
```javascript
// Get last 5 candles
const recentCandles = candles.slice(-5);
const recentHigh = Math.max(...recentCandles.map(c => c.high));

// Must be 5% below recent high
const priceFromHigh = ((currentPrice - recentHigh) / recentHigh) * 100;
if (priceFromHigh > -5%) {
  // REJECT - not deep enough dip
}
```

**The problem:**
1. After Trade 34 exit at $0.000746, the "recent 5-candle high" includes that price
2. Next entry needs: $0.000746 × 0.95 = $0.000709
3. But price is PUMPING UP to $0.000800
4. Bot waits for $0.000709 dip that never comes
5. By the time price finally drops to $0.000730 (still above $0.000709!), pump is over
6. We enter mid-dump and get wrecked

### Why This Happens

**The "reset trap" pattern:**
- Exit at LOW price during dip → Recent high becomes LOW
- Need 5% below LOW = Even LOWER
- Price pumps UP from low → Can't re-enter (waiting for deeper dip)
- Pump ends, price dumps → Finally get "dip" signal
- Enter at top of dump → Get wrecked

**Visual:**
```
$0.000815 ← Trade 32 (bought top)
    ↓ DUMP
$0.000718 ← Trade 33 (bought dip) ✅
$0.000746 ← Trade 33/34 exit
    ↑ PUMP (11:59-12:08)
$0.000800 ← Peak of pump WE MISSED
    ↓ DUMP
$0.000730 ← Trade 35 entry (we thought it was a dip!)
$0.000667 ← Trade 35 exit (-8.67%)

Recent high after Trade 34 = $0.000746
Need 5% below = $0.000709
Price never went below $0.000709 during pump!
```

## Root Cause Analysis

### Design Flaw: Using Rolling Window for "Recent High"

**Intended behavior:** Prevent buying tops
**Actual behavior:** Prevents re-entry after profitable exits

**The contradiction:**
- We EXIT at dips (take profit quickly)
- Our exits happen at LOCAL LOWS
- "Recent 5-candle high" now includes our LOW exit prices
- We can only re-enter at EVEN LOWER prices
- This means we MISS PUMPS after our exits

### Why It Worked (Sort Of) in Other Sessions

Trade 33 & 34 worked because:
1. Price was in freefall ($0.000815 → $0.000718)
2. Each candle was making new lows
3. "5% below recent high" was continuously dropping
4. We caught bounces off the lows

Trade 35 failed because:
1. Price started pumping after our exits
2. "5% below recent high" was now BELOW market
3. We waited for a dip that wouldn't come during a pump
4. Finally entered when pump exhausted and dumped

## Solutions (3 Options)

### Option 1: Absolute High (Not Rolling Window)

**Change from:** Recent 5-candle high
**Change to:** Session high (highest price seen since last position close)

```javascript
// Track absolute high since last trade
if (!this.sessionHigh || currentPrice > this.sessionHigh) {
  this.sessionHigh = currentPrice;
}

// Reset only when we CLOSE a position
onPositionClose() {
  this.sessionHigh = null;  // Fresh start for next entry
}

// Entry confirmation: 5% below session high
const priceFromHigh = ((currentPrice - this.sessionHigh) / this.sessionHigh) * 100;
if (priceFromHigh > -5%) {
  // Not deep enough from SESSION high
}
```

**Pros:**
- Prevents buying tops relative to REAL highs
- Doesn't reset on every candle
- Can re-enter pumps if they're still below session high

**Cons:**
- If session starts at a high, might wait forever
- Need manual reset logic

### Option 2: Dual Threshold (Near vs. Far from High)

**Logic:** Different rules based on how far we are from high

```javascript
const priceFromHigh = ((currentPrice - recentHigh) / recentHigh) * 100;

// If NEAR recent high (within 2%): Need 5% dip
if (priceFromHigh > -2%) {
  if (priceFromHigh > -5%) {
    return; // Too close to top
  }
}
// If FAR from recent high (>2% down): Allow entry
else {
  // No dip requirement (we're already far from top)
}
```

**Pros:**
- Flexible based on context
- Prevents top-buying
- Allows re-entry during pumps if we're far from highs

**Cons:**
- More complex logic
- Could still buy mid-pump

### Option 3: Momentum Confirmation (No Dip Requirement)

**Change from:** Require 5% dip
**Change to:** Require positive momentum + volume spike

```javascript
// Remove "5% below high" requirement
// Replace with momentum + volume check

if (signal.momentum1m > 2% && signal.volume5m > 2x_avg) {
  // BUY - momentum is positive and volume confirms
}

// Entry rejection: Recent candle is red >2%
if (lastCandle.close < lastCandle.open && bodyPct < -2%) {
  return; // Don't catch falling knives
}
```

**Pros:**
- Catches pumps (positive momentum)
- Prevents catching dumps (no big red candles)
- Simpler logic

**Cons:**
- Might buy mid-pump
- Less protection against tops

## Recommended Solution: Option 3 (Momentum-Based)

### Why:
1. **Micro-scalping needs speed** - Waiting for 5% dips misses opportunities
2. **Momentum is the signal** - If price pumping + volume, that's our entry
3. **Red candle filter protects us** - Won't buy during dumps
4. **Aligns with strategy** - We're scalping momentum, not catching knives

### Implementation:

**REMOVE:**
```javascript
// Old logic:
if (priceFromHigh > -config.ENTRY_DIP_FROM_HIGH_PCT) {
  return; // Wait for deeper dip
}
```

**REPLACE WITH:**
```javascript
// New logic:
// 1. Check recent candle (don't catch falling knives)
const lastCandle = candles[candles.length - 1];
const candleBody = ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100;

if (candleBody < -2.0) {
  console.log(`   ⚠️  Recent candle red ${candleBody.toFixed(2)}% - avoiding dump`);
  return;
}

// 2. Check momentum is positive
if (signal.momentum1m <= 0) {
  console.log(`   ⚠️  1m momentum ${signal.momentum1m.toFixed(2)}% - not bullish`);
  return;
}

// 3. Volume spike confirms buying pressure
const volumeRatio = signal.volume5m / signal.volume1hAvg;
if (volumeRatio < config.MIN_VOLUME_RATIO) {
  console.log(`   📊 Volume ratio ${volumeRatio.toFixed(2)}x too low`);
  return;
}

console.log(`   ✅ Momentum confirmed: ${signal.momentum1m.toFixed(2)}% + ${volumeRatio.toFixed(2)}x volume`);
```

### Expected Behavior After Fix:

```
11:58:47 - Trade 33: Buy at $0.000718 (momentum +3%, volume 2.5x) ✅
11:58:49 - Trade 33: Sell at $0.000749 (+4.31%)

11:59:05 - Price $0.000721, momentum +2%, volume 2.1x
           ✅ BUY (momentum positive, volume confirmed)
11:59:07 - Sell at $0.000746 (+3.55%)

12:00:00 - Price $0.000760, momentum +4%, volume 3.0x
           ✅ BUY (catching the pump!)
12:00:05 - Sell at $0.000790 (+4%)

12:05:00 - Price $0.000800, momentum +8%, volume 4.5x
           ✅ BUY (still pumping!)
12:05:10 - Sell at $0.000820 (+2.5%)

12:15:35 - Price $0.000730, momentum -3%, red candle -4%
           ❌ REJECT (negative momentum, red candle)
           Avoided the -8.67% loss!
```

## Testing Plan

1. **Remove 5% dip requirement**
2. **Add momentum + red candle filters**
3. **Test during pump conditions**
4. Monitor:
   - Do we catch pumps now? (vs. waiting on sidelines)
   - Do we avoid dumps? (red candle filter working?)
   - Entry quality: Are we buying strength or chasing tops?

## Expected Impact

**Before (With 5% Dip Requirement):**
- Missed 11:59-12:08 pump ($0.000746 → $0.000800) = ~7% missed opportunity
- Entered at $0.000730 mid-dump = -8.67% loss
- Session result: -1.88%

**After (Momentum-Based Entry):**
- Catch 2-3 pump entries (11:59-12:08 period)
- Avoid $0.000730 entry (negative momentum, red candle)
- Expected session: +10-15% (multiple pump scalps)

## Key Insight

**"Buying dips" ≠ "Waiting for dips in a pump"**

In micro-scalping:
- ✅ Buy positive momentum with volume confirmation
- ✅ Avoid red candles >2% (dumps)
- ❌ Don't wait for "5% below high" during pumps
- ❌ Don't chase without volume confirmation

The 5% dip rule works for swing trading. For scalping, **momentum IS the signal**.
