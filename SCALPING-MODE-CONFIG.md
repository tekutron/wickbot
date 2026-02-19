# 🎯 Scalping Mode for Volatile Tokens (CWIF, etc.)

## Problem Identified

Bot missed +16% pump because settings were too conservative:
- **Current:** Need 4/6 conditions (67% confidence) to buy
- **Current:** RSI must be < 35 (very oversold)
- **Current:** Ignore moves < 0.5%

For volatile low-cap tokens, these are too strict!

## Recommended Settings for Scalping

### Option 1: Aggressive Scalping (Recommended for CWIF)
```javascript
// Signal confidence thresholds
MIN_BUY_CONFIDENCE: 50,       // 3/6 conditions (catch dips faster)
MIN_SELL_CONFIDENCE: 50,      // 3/5 conditions (exit tops faster)

// Dip/Top detection
RSI_DIP_THRESHOLD: 45,        // Less oversold needed
RSI_TOP_THRESHOLD: 55,        // Less overbought needed
MIN_CANDLE_BODY_PCT: 0.2,     // React to smaller moves
```

**Why:** Catches dips earlier, exits tops faster, reacts to 0.2%+ moves

### Option 2: Moderate Scalping
```javascript
MIN_BUY_CONFIDENCE: 58,       // 3.5/6 conditions
MIN_SELL_CONFIDENCE: 55,      
RSI_DIP_THRESHOLD: 40,        
RSI_TOP_THRESHOLD: 60,        
MIN_CANDLE_BODY_PCT: 0.3,     
```

**Why:** More selective than aggressive, still catches most moves

### Option 3: Current (Conservative)
```javascript
MIN_BUY_CONFIDENCE: 67,       // 4/6 conditions (current)
MIN_SELL_CONFIDENCE: 60,      
RSI_DIP_THRESHOLD: 35,        
RSI_TOP_THRESHOLD: 65,        
MIN_CANDLE_BODY_PCT: 0.5,     
```

**Why:** Safer, fewer trades, misses some opportunities

## Buy Conditions Breakdown

The bot checks 6 conditions for BUY:
1. ✅ RSI < threshold (oversold)
2. ✅ Price touching lower BB (dip confirmation)
3. ✅ Bullish candle (buyers stepping in)
4. ✅ MACD histogram positive (momentum up)
5. ✅ Price above EMA50 (uptrend)
6. ✅ EMA20 > EMA50 (golden cross)

**Current (67%):** Need 4/6 = strict
**Aggressive (50%):** Need 3/6 = catches dips faster

## Trade-offs

**Aggressive Mode:**
- ✅ Catch more moves (16% pump wouldn't be missed)
- ✅ Enter dips earlier
- ⚠️ More false signals
- ⚠️ More trades = more fees

**Conservative Mode:**
- ✅ Higher quality signals
- ✅ Fewer false entries
- ⚠️ Miss quick pumps
- ⚠️ Slower reactions

## Recommendation for CWIF

Use **Aggressive Scalping** because:
- Low market cap ($200K) = high volatility
- Quick pumps/dumps (16% in 1 hour)
- Need fast reaction time
- Small position size = manageable risk

