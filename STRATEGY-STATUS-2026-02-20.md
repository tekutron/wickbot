# Strategy Status & Configuration - 2026-02-20 8:16 PM

## Current Active Strategy: MOMENTUM

**Mode:** `STRATEGY_MODE: 'momentum'`

### Configuration
```javascript
// Entry Criteria
PUMP_THRESHOLD: 1.5%           // Buy when price UP ≥1.5%
MAX_PUMP: 15.0%                // Don't buy if already pumped >15%
VOLUME_THRESHOLD_MIN: 0.5      // Volume check disabled (unreliable data)

// Exit Criteria  
QUICK_TP_1: 2.0%               // First profit target
QUICK_TP_2: 4.0%               // Extended profit target
QUICK_SL: 2.0%                 // Tight stop loss
MAX_HOLD_TIME_SEC: 60          // Force exit after 60s

// Position Sizing
POSITION_SIZE_PCT: 75%         // 75% of capital per trade
MAX_POSITIONS: 1               // One position at a time

// Fees
PRIORITY_FEE: 0.00005 SOL      // Optimized (50% reduction)
```

### Strategy Philosophy
- **Catch pumps, not dips** - Enter during upward momentum
- **Ride the wave** - Let winners run to +2% or +4%
- **Cut losses fast** - Exit at -2% or 60s timeout
- **Don't chase** - Skip if already pumped >15%

### Performance (Feb 20 Evening)
- Trade #78: -0.86% (MAX_HOLD - stalled)
- Trade #79: +2.02% (QUICK_TP1 - perfect) ✅
- **Net: +1.15%**

---

## Available Strategies (Multi-Strategy System)

### 1. MOMENTUM (Active) ⭐
**Source:** Custom - evolved from failed dip-buying experiments  
**Entry:** Price UP 1.5-15%  
**Exit:** TP1 +2%, TP2 +4%, SL -2%, Max 60s  
**Risk:** Medium-High  
**Status:** Currently active, showing promise

**To Activate:**
```javascript
STRATEGY_MODE: 'momentum'
PUMP_THRESHOLD: 1.5
MAX_PUMP: 15.0
```

### 2. Hybrid Strategy
**Source:** GitHub research - combination of proven patterns  
**Entry:** -2.5% dip + 2.5x volume + crash filter (5m trend > -10%)  
**Exit:** TP +5%, SL -3%, momentum fade, volume drop  
**Risk:** Medium  
**Status:** Implemented but not active

**To Activate:**
```javascript
STRATEGY_MODE: 'hybrid'
HYBRID_DIP_THRESHOLD: -2.5
HYBRID_VOLUME_THRESHOLD: 2.5
HYBRID_CRASH_FILTER: -10.0
```

**Note:** Needs code implementation in bot-fast.mjs (currently only momentum is coded)

### 3. Simple Strategy
**Source:** pump-fun-bot (521 GitHub stars)  
**Entry:** -2.5% dip + 1.5x volume  
**Exit:** TP +5%, SL -3%  
**Risk:** Medium (more false signals)  
**Status:** Designed but not implemented

**Config:**
```javascript
STRATEGY_MODE: 'simple'
SIMPLE_DIP_THRESHOLD: -2.5
SIMPLE_VOLUME_THRESHOLD: 1.5
```

### 4. Volume Strategy
**Source:** dexscreener-sniper (312 GitHub stars)  
**Entry:** -1.0% dip + 3.0x volume spike  
**Exit:** TP +5%, SL -3%  
**Risk:** Low (most conservative)  
**Status:** Designed but not implemented

**Config:**
```javascript
STRATEGY_MODE: 'volume'
VOLUME_DIP_THRESHOLD: -1.0
VOLUME_SPIKE_THRESHOLD: 3.0
```

### 5. RSI Strategy (Original wickbot)
**Source:** Original design - leading indicators  
**Entry:** RSI 25-45 + MACD crossover + 0.5% momentum  
**Exit:** Pattern-based (bearish signals)  
**Risk:** Very Low (most selective)  
**Status:** Bug fixed, ready but untested

**Config:**
```javascript
STRATEGY_MODE: 'rsi'
REQUIRE_RSI_ENTRY: true
RSI_ENTRY_MAX: 45
RSI_ENTRY_MIN: 25
```

---

## Strategy Evolution Timeline

### Phase 1: Pattern-Based (Feb 15-17)
- 15 patterns + 5 indicators
- Signal-driven exits
- **Result:** Too complex, premature exits

### Phase 2: Tightened Filters (Feb 20 Afternoon)
- Increased momentum: 1% → 2%
- Increased volume: 2x → 3x
- **Result:** 14% win rate (caught pumps too late)

### Phase 3: Leading Indicators (Feb 20 3:30 PM)
- RSI + MACD filters
- Predict pumps early
- **Result:** 0% win rate (bug - filters never ran)

### Phase 4: Multi-Strategy System (Feb 20 5:30 PM)
- Implemented 4 strategies
- Fixed RSI bug
- **Result:** System ready, defaulted to hybrid

### Phase 5: MOMENTUM (Feb 20 6:44 PM - Current)
- Pivoted from hybrid to momentum
- Catch pumps, not dips
- **Result:** 1 winner (+2.02%), testing ongoing

---

## Improvement Ideas for Momentum Strategy

### Ride Pumps Higher (User Request)

**Current Problem:**
- Fixed TP1 at +2%, TP2 at +4%
- Exits too early if pump continues
- Leaves money on the table

**Potential Solutions:**

#### Option 1: Trailing Stop Loss
```javascript
ENABLE_TRAILING_STOP: true
TRAILING_STOP_ACTIVATION: 2.0%    // Start trailing after +2%
TRAILING_STOP_DISTANCE: 1.0%      // Trail 1% behind peak
```

**How it works:**
- Hit +2% → activate trailing stop at +1%
- Price goes to +5% → trail stop at +4%
- Price drops to +4% → sell (locked in +4%)

#### Option 2: Tiered Exits
```javascript
TIER_1_SELL: 50%      // Sell 50% at +2%
TIER_2_SELL: 30%      // Sell 30% at +4%
TIER_3_SELL: 20%      // Hold 20% for +6%+ with trailing stop
```

**Benefits:**
- Secure early profit
- Still participate in extended pumps
- Reduces risk

#### Option 3: Momentum-Based Exit
```javascript
EXIT_ON_MOMENTUM_FADE: true
MIN_EXIT_MOMENTUM: 0.5%       // Exit if 1m momentum drops below 0.5%
```

**How it works:**
- Don't exit at fixed %
- Exit when pump momentum fades
- Can ride pumps to +10%+ if momentum sustains

#### Option 4: Volume-Based Hold
```javascript
HOLD_ON_VOLUME: true
MIN_VOLUME_RATIO: 2.0         // Keep holding if volume >2x avg
```

**How it works:**
- At +2%, check volume
- If volume still strong (>2x) → hold for +4%
- If volume dying → exit at +2%

---

## Integration Plan

### Short-term (Tonight)
1. ✅ Keep momentum strategy running
2. ✅ Collect 10-15 more trades
3. ✅ Measure how often we exit at +2% vs +4%
4. ⏳ Identify "left on table" opportunities

### Medium-term (Next Session)
1. Implement trailing stop (easiest)
2. Test with 20 trades
3. Compare vs fixed TP

### Long-term (If Needed)
1. Implement other strategies (hybrid, simple, volume)
2. A/B test all strategies
3. Find optimal combination

---

## Current Git Status

**Branch:** main  
**Status:** ✅ Clean (all changes committed)  
**Latest Commits:**
- `da52f1c` - Race condition fix
- `d8df3cb` - Status documentation
- `4bcc571` - Fee optimization
- `9d8c61e` - MOMENTUM strategy pivot

**Remote:** github.com/tekutron/wickbot.git  
**Synced:** ✅ All changes pushed

---

## Files Updated

### Config
- ✅ `config.mjs` - MOMENTUM strategy active
- ✅ Fee: 0.00005 SOL
- ✅ TP/SL: +2%/+4%, -2%
- ✅ Max hold: 60s

### Code
- ✅ `bot-fast.mjs` - Transaction confirmation waits
- ✅ `executor/position-manager.mjs` - Debug logging + retry logic
- ✅ `wickbot_state.json` - Reset to correct balance

### Documentation
- ✅ `BUG-FIX-COMPLETE-2026-02-20.md`
- ✅ `BUG-INVESTIGATION-2026-02-20.md`
- ✅ `CURRENT-STATUS-2026-02-20.md`
- ⏳ `STRATEGY-STATUS-2026-02-20.md` (this file)

### Memory
- ✅ `memory/2026-02-20.md` - Session events logged
- ⏳ Need to update with strategy status

---

## Dashboard Status

**URL:** http://localhost:3000  
**Status:** Running  
**Features:**
- Live signal feed
- Balance display
- Trade history
- Start/Stop controls
- Position tracking

**Config Display:** Shows MOMENTUM strategy settings

---

## Next Actions

1. **Let bot run** - Collect more trade data
2. **Monitor for patterns** - Are we exiting too early?
3. **Identify improvements** - Where did we leave profit?
4. **Implement trailing stop** - If data shows early exits
5. **Test alternatives** - Compare with other strategies

---

**Report Generated:** 2026-02-20 8:16 PM PST  
**Bot Status:** RUNNING (momentum strategy)  
**Capital:** 0.0634 SOL (~$12.69)
