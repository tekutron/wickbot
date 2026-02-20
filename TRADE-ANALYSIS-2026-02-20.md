# wickbot Trade Analysis - 2026-02-20 Afternoon Session

## Data Summary (Last 15 Trades #48-62)

### Exit Reason Performance
| Reason | Count | Win Rate | Avg P&L |
|--------|-------|----------|---------|
| QUICK_TP1 | 2 | 100% | +2.32% ✅ |
| MAX_HOLD | 6 | 33% | -0.33% ⚠️ |
| SIGNAL | 4 | 0% | -1.17% ❌ |
| QUICK_SL | 2 | 0% | -2.98% ❌ |

### Hold Time Analysis (Last 30 Trades)
| Time Bucket | Count | Win Rate | Avg P&L |
|-------------|-------|----------|---------|
| Under 30s | 19 | **42%** | -0.93% |
| 30-60s | 3 | 33% | -0.18% |
| 60-120s | 7 | 29% | -0.52% |
| Over 120s | 1 | 0% | -28.04% |

---

## Critical Findings

### 1. Shorter Holds Perform Better
**Discovery:** Trades under 30 seconds have the HIGHEST win rate (42%)!
- Under 30s: 42% win rate
- 30-60s: 33% win rate  
- 60-120s: 29% win rate

**Implication:** The current 60-second MAX_HOLD is TOO LONG. By the time we hit 60s timeout, momentum has already faded.

### 2. QUICK_TP1 Works Perfectly (When It Hits)
**Stats:** 2 trades, 100% win rate, +2.32% average
- Trade #56: +2.42% in 4 seconds ✅
- Trade #57: +2.22% in 56 seconds ✅

**Problem:** Only 2 QUICK_TP1 exits vs 6 MAX_HOLD exits
- Bot is hitting timeout more often than profit targets
- Positions aren't moving enough to reach +2% within 60s

### 3. MAX_HOLD = Momentum Died
**Stats:** 6 trades, 33% win rate, -0.33% average
- Trade #54: -1.03% (66s)
- Trade #55: +0.43% (65s)
- Trade #58: -1.89% (67s)
- Trade #59: -0.02% (67s)
- Trade #60: +1.18% (66s)
- Trade #61: -0.61% (65s)

**Pattern:** All MAX_HOLD trades hit exactly 65-67 seconds (the timeout)
- Price barely moved: -1.89% to +1.18% range
- None came close to +2% target
- Bot is holding dead positions hoping for movement that doesn't come

### 4. Entry Timing Issues
**Observation:** Bot enters positions that don't have enough momentum
- QUICK_TP1 trades (winners) moved to +2% in 4-56 seconds
- MAX_HOLD trades (losers) stalled out, never hit target

**Hypothesis:** Bot is entering:
- Too late (pump already peaked)
- Too early (before real momentum starts)
- Wrong signals (weak bounces, not strong pumps)

### 5. Token Switch to Lobstar + 75% Position Size
**Config Change Detected:**
- Token: GROKIUS → **Lobstar**
- Position size: 25% → **75%** ⚠️

**Risk Assessment:** 75% position size is EXTREMELY aggressive
- One bad trade = -2% × 75% = -1.5% capital loss
- Three bad trades = -4.5% capital (would trip circuit breaker)

---

## Price Action Context

### GROKIUS (Previous Token)
- 24h: +71.63% (volatile)
- 6h: -31.25% (big dump)
- 1h: +3.54% (recovering)
- Liquidity: $98K

### Lobstar (Current Token)
- Need to check current performance
- Switched mid-session (reason unknown)

---

## Recommendations

### 1. REDUCE MAX_HOLD_TIME_SEC
**Current:** 60 seconds
**Recommended:** 30 seconds

**Rationale:**
- Data shows under-30s trades have 42% win rate
- 60s trades only 29% win rate
- Momentum fades quickly in micro-scalping
- Shorter holds = faster capital rotation

**Expected Impact:**
- Force exits sooner when momentum dies
- Reduce dead-time holding stalled positions
- Capture quick wins, cut slow losers faster

### 2. LOWER POSITION SIZE IMMEDIATELY
**Current:** 75% (DANGEROUS!)
**Recommended:** 25% (original)

**Rationale:**
- 75% is 3x normal risk
- One -2% loss = -1.5% capital
- Circuit breaker threshold: 3 losses = -4.5% (approaching 15% session limit)
- NO proven edge yet (win rate still under 50%)

**Expected Impact:**
- Reduce risk per trade by 66%
- Allow more trades before circuit breaker
- Protect capital during testing phase

### 3. Tighten Entry Criteria
**Problem:** Too many entries that stall out (6 MAX_HOLD vs 2 QUICK_TP1)

**Options:**
- **Option A:** Increase MIN_MOMENTUM_1M from 1.0% → 2.0% (require stronger momentum)
- **Option B:** Increase MIN_VOLUME_RATIO from 2.0x → 3.0x (require bigger volume spikes)
- **Option C:** Add minimum 5m momentum requirement (trend must be strengthening)

**Goal:** Enter ONLY when strong momentum is confirmed, not weak bounces

### 4. Consider Lower TP1 Target (Optional)
**Current:** QUICK_TP1 = 2.0%
**Alternative:** 1.5%

**Rationale:**
- Many MAX_HOLD trades ended at +1.18%, +0.43% (under 2% target)
- Lowering to 1.5% would capture these as wins
- Trade-off: Smaller wins, but more wins

**Risk:** May exit too early on real pumps

### 5. Add Price Momentum Check During Hold
**New Idea:** Exit early if momentum dies mid-hold

**Implementation:**
```javascript
// Check every 10 seconds during hold
if (holdTime > 10s && 10s_momentum < 0.5%) {
  // Momentum died, exit now
  executeSell(position, currentPrice, 'MOMENTUM_FADE');
}
```

**Expected Impact:**
- Exit faster when price stalls
- Don't wait full 60s for guaranteed timeout
- Capture small gains before they reverse

---

## Proposed Changes Priority

### Immediate (Do Now):
1. ✅ **REDUCE MAX_HOLD_TIME_SEC: 60 → 30**
2. ✅ **REDUCE POSITION_SIZE_PCT: 75 → 25**

### Short-term (Test Next):
3. ⚠️ **Increase MIN_MOMENTUM_1M: 1.0 → 2.0**
4. ⚠️ **Test with different token (back to GROKIUS or find better)**

### Optional (If Still Struggling):
5. 🔄 **Lower QUICK_TP1: 2.0 → 1.5**
6. 🔄 **Add momentum fade detection**

---

## Expected Outcomes

### With 30s Max Hold + 25% Position:
- **Win rate target:** 45-50% (up from 42%)
- **Avg winner:** +2% (unchanged)
- **Avg loser:** -1.5% (better than -2%)
- **Session P&L:** +2-5% (vs current -10%)

### Success Criteria (Next 20 Trades):
- ✅ More QUICK_TP exits than MAX_HOLD exits
- ✅ Win rate above 45%
- ✅ No circuit breaker trips
- ✅ Capital growing (not shrinking)

### Failure Criteria (Stop Trading):
- ❌ Win rate stays under 40%
- ❌ Capital drops below 0.08 SOL
- ❌ Circuit breaker trips 2+ times
- ❌ No improvement after 20 trades

---

## Bottom Line

**The Data Says:**
1. Fast trades (<30s) win more often (42% vs 29%)
2. 60-second holds are too long (momentum dies)
3. Bot is entering weak signals (6 timeouts vs 2 profit hits)
4. 75% position size is recklessly aggressive

**The Fix:**
- Cut max hold time in half (60s → 30s)
- Cut position size back to normal (75% → 25%)
- Tighten entry (require stronger momentum)
- Test for 20 more trades, then re-evaluate

**The Risk:**
If we don't fix this, we'll keep bleeding capital via:
- Dead positions hitting timeout
- Oversized losses wiping out small wins
- Circuit breaker tripping (then 30min downtime)

**The Opportunity:**
QUICK_TP1 trades are working perfectly (100% win, +2.32% avg). We just need MORE of them and fewer MAX_HOLD stalls.

