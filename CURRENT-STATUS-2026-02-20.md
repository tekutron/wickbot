# wickbot Status Report - 2026-02-20 Evening

**Generated:** 2026-02-20 6:45 PM PST  
**Bot Status:** RUNNING (momentum strategy)  
**Capital:** 0.0637 SOL (~$12.74)  
**All-Time P&L:** -28.0% (from 0.088465 SOL start)

---

## Current Configuration

### Trading Strategy: MOMENTUM MODE 🚀
**Active since:** 6:44 PM (just switched from hybrid)

**Entry Criteria:**
- Price UP ≥1.5% (catching pumps, not dips)
- Volume check: DISABLED (data unreliable)
- Max pump filter: Don't buy if already >15% up
- Trend filter: 15m momentum > -5%, 30m momentum > -10%

**Exit Criteria:**
- TP1: +2% (quick profit)
- TP2: +4% (extended profit)
- SL: -2% (tight stop)
- Max Hold: 60 seconds (force exit)

**Position Sizing:**
- Size: 75% of capital per trade (HIGH RISK - user choice)
- Max positions: 1 (focused trading)

**Fee Optimization (NEW - Feb 20 6:44 PM):**
- Priority fee: **0.00005 SOL** (was 0.0001 SOL)
- 50% reduction for micro-scalp margins
- Est. fee per trade: ~$0.005-0.01 (vs $0.01-0.02 before)

**Token:**
- Address: `AVF9F4C4j8b1Kh4BmNHqybDaHgnZpJ7W7yLvL7hUpump`
- Symbol: UNKNOWN (will be detected)
- Trading Pair: TOKEN/SOL

**Slippage Protection:**
- Flat 5% max slippage (all exits)
- Pre-flight price check: ENABLED
- Max price deviation: 2%
- Retry on bad price: YES (3 attempts)

**Circuit Breakers:**
- Max session drawdown: 15%
- Max consecutive losses: 3
- Cooldown after stop: 30 minutes
- Status: ARMED ✅

---

## Available Strategies

### 1. MOMENTUM (ACTIVE) ⭐
**Source:** Custom - based on observation that dip-buying wasn't working  
**Philosophy:** Ride the wave up, don't catch falling knives  
**Entry:** Price pumping +1.5-15%  
**Expected:** 3-8 trades/hour during volatile periods  
**Risk:** Medium-High (buying into pumps)

### 2. Hybrid Strategy (Previously Active)
**Source:** GitHub research - combination of proven patterns  
**Philosophy:** Dip + volume + trend filter  
**Entry:** -2.5% dip + 2.5x volume + not crashing (5m trend > -10%)  
**Expected:** 4-8 trades/hour  
**Risk:** Medium  
**Status:** Available via `STRATEGY_MODE: 'hybrid'`

### 3. Simple Strategy
**Source:** pump-fun-bot (521 GitHub stars)  
**Philosophy:** Dead simple dip detection  
**Entry:** -2.5% dip + 1.5x volume  
**Expected:** 5-10 trades/hour  
**Risk:** Medium (more false signals)  
**Status:** Available via `STRATEGY_MODE: 'simple'`

### 4. Volume Strategy
**Source:** dexscreener-sniper (312 GitHub stars)  
**Philosophy:** Volume spike confirmation  
**Entry:** -1.0% dip + 3.0x volume spike  
**Expected:** 3-6 trades/hour  
**Risk:** Low (most conservative)  
**Status:** Available via `STRATEGY_MODE: 'volume'`

### 5. RSI Strategy
**Source:** Original wickbot design  
**Philosophy:** Leading indicators (predict before price moves)  
**Entry:** RSI 25-45 + MACD crossover + 0.5% momentum  
**Expected:** 0-2 trades/hour  
**Risk:** Very Low (most selective)  
**Status:** Available via `STRATEGY_MODE: 'rsi'` (bug fixed, ready to test)

---

## Resources & Infrastructure

### Core Components
1. **bot-fast.mjs** - Main trading engine (incremental indicators, O(1) updates)
2. **config.mjs** - All configuration (strategies, fees, limits)
3. **executor/jupiter-swap.mjs** - Generic swap function (any TOKEN/SOL pair)
4. **executor/position-manager.mjs** - Position tracking + circuit breakers
5. **data/incremental-indicators.mjs** - Real-time RSI, MACD, BB, EMA
6. **dashboard/server.mjs** - WebSocket server + HTTP API
7. **dashboard/index.html** - Live monitoring interface

### Data Sources
- **Primary:** DexScreener OHLCV (5-second polling)
- **Wallet:** Helius RPC (balance checks)
- **Swaps:** Jupiter Aggregator v6
- **Price validation:** Pre-flight quote checks

### State Files
- `wickbot_state.json` - Bot runtime state
- `wickbot_trades.json` - Trade history
- `state/position.json` - Current positions
- `state/trade_history.json` - Detailed trade log

### Monitoring
- **Dashboard:** http://localhost:3000
- **Logs:** `bot-fast.log` (tail -f for live)
- **WebSocket:** Real-time signal feed
- **Balance tracking:** Live SOL balance display

### Git Repository
- **Remote:** github.com/tekutron/wickbot.git
- **Latest commit:** `9d8c61e` - MOMENTUM strategy pivot
- **Branch:** main
- **Status:** Clean (all changes committed)

---

## Session History (Feb 20)

### Morning (1:23 PM)
- Started with 0.0978 SOL (+13.8% all-time)
- Bot running momentum-only strategy
- 2 processes active

### Afternoon (1:53-3:30 PM)
**Trade Analysis Session:**
- Analyzed last 30 trades (#33-62)
- Discovered: Shorter holds = better performance
- QUICK_TP1 trades: 100% win rate
- Tightened entry filters: 1% → 2% momentum, 2x → 3x volume
- **RESULT:** Filters too tight, caught pumps at PEAK (14% win rate)

**Strategy Pivot #1 (3:30 PM):**
- Pivoted to RSI + MACD leading indicators
- Lowered thresholds to catch pumps EARLIER
- **RESULT:** 0% win rate (7 trades)

### Evening (4:13-6:00 PM)
**Bug Discovery (4:13 PM):**
- Found RSI/MACD filters NEVER EXECUTED
- Missing `.ready` property in `getIndicators()`
- All 7 "RSI" trades were actually old momentum-only logic

**Bug Fix (4:48 PM):**
- Added `.ready` property to indicator object
- Git commit: `4cfd62b`

**GitHub Research (5:00 PM):**
- Analyzed 5 top Solana bots
- Found: SIMPLE strategies dominate (dip detection, not complex indicators)
- Most common: -2% to -5% dip + volume confirmation

**Multi-Strategy Implementation (5:30 PM):**
- Implemented 4 strategy modes (simple/volume/hybrid/rsi)
- Default: hybrid (balanced)
- Git commit: `7524cd6`

**Strategy Testing (5:58-6:44 PM):**
- Tested hybrid strategy
- Tested simplified hybrid (lower thresholds)
- **OBSERVATION:** Bot not entering trades = filters too conservative
- **PIVOT:** Switched to MOMENTUM strategy (catch pumps, not dips)
- Git commit: `9d8c61e`

**Fee Optimization (6:44 PM):**
- Reduced priority fee: 0.0001 → 0.00005 SOL (50% reduction)
- Rationale: Tighter margins on 2% TP/SL need lower fees
- Git commit: (this one)

### Capital Journey Today
- Start: 0.0978 SOL (+13.8%)
- After analysis session: 0.0793 SOL (-10.4%)
- After RSI bug session: 0.0637 SOL (-28.0%)
- **Total decline today:** -34.9% (-0.0341 SOL)
- **Trades today:** 40 (56% of all-time 72 trades)

---

## Key Learnings (Feb 20)

1. **Tighter filters = Later entries** - Paradox: stronger signals arrive when pump is peaking
2. **Verify code executes** - 0% improvement after "fix" = investigate immediately
3. **Simple > Complex** - GitHub research proves dip detection works better than indicators
4. **Test incrementally** - Should have checked after 2-3 trades, not 7
5. **Capital is expensive teacher** - Lost 25.78% testing broken strategies
6. **Multi-strategy enables learning** - Can A/B test approaches systematically
7. **Fee optimization matters** - On 2% margins, every 0.00005 SOL counts

---

## Next Steps

### Immediate (Tonight)
1. ✅ Lower priority fee (done)
2. ⏳ Test MOMENTUM strategy (10-15 trades)
3. ⏳ Measure win rate (target: >40%)
4. ⏳ Document results

### If Momentum Fails
- Try 'simple' mode (most aggressive dip detection)
- Try 'volume' mode (most conservative)
- Consider switching tokens (find better quality)

### If All Strategies Fail
- Stop trading
- Comprehensive post-mortem
- Decide: Rebuild vs. Abandon

### Long-term
- Need 50+ trades to validate edge
- Target: 50%+ win rate sustained
- Goal: Recover to breakeven (0.088 SOL)
- Stretch goal: Return to peak (0.124 SOL)

---

## Risk Assessment

**Current Risk Level:** 🔴 CRITICAL
- Down 48.6% from peak
- 75% position sizing = aggressive
- Testing unproven strategy (momentum)
- Capital: $12.74 (can only afford 8-10 more -2% losses)

**Circuit Breaker Distance:**
- 3 consecutive losses = STOP
- 15% session drawdown = STOP (only 2.8% buffer remaining from daily peak)
- Currently at -25.78% from session start (would have stopped if started fresh)

**Recommendation:**
- Lower position size to 25% (safer testing)
- Set mental stop: If capital < 0.06 SOL, pause and review
- Don't let sunk cost fallacy drive decisions

---

**Report End**
