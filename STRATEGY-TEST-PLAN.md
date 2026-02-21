# Strategy A/B/C Testing Plan

**Date:** 2026-02-20 Evening  
**Token:** AVF9F4C4j8b1Kh4BmNHqybDaHgnZpJ7W7yLvL7hUpump  
**Capital:** 0.0637 SOL (~$12.74)

---

## Test Protocol

### Phase 1: Hybrid Strategy (ACTIVE)
**Config:** `STRATEGY_MODE: 'hybrid'`  
**Target:** Collect 10 trades  
**Entry:** Dip ≤-2.5% + Volume ≥2.5x + 5m >-10%

### Phase 2: Simple Strategy  
**Config:** `STRATEGY_MODE: 'simple'`  
**Target:** Collect 10 trades  
**Entry:** Dip ≤-2.5% + Volume ≥1.5x

### Phase 3: Volume Strategy
**Config:** `STRATEGY_MODE: 'volume'`  
**Target:** Collect 10 trades  
**Entry:** Volume ≥3x + Dip <-1%

---

## Metrics to Track

**Per Strategy:**
- Win rate (wins / total)
- Avg P&L (total P&L / total trades)
- Best trade
- Worst trade
- Avg hold time
- QUICK_TP vs QUICK_SL vs MAX_HOLD distribution

**Success Criteria:**
- Win rate ≥40%
- Avg P&L ≥-0.5%
- Capital not declining
- QUICK_SL <40% of trades

---

## Comparison Template

| Metric | Hybrid | Simple | Volume | Winner |
|--------|--------|--------|--------|--------|
| Trades | 10 | 10 | 10 | - |
| Wins | ? | ? | ? | ? |
| Win Rate | ?% | ?% | ?% | ? |
| Avg P&L | ?% | ?% | ?% | ? |
| Best Trade | ?% | ?% | ?% | ? |
| Worst Trade | ?% | ?% | ?% | ? |
| Avg Hold | ?s | ?s | ?s | ? |
| QUICK_TP | ? | ? | ? | ? |
| QUICK_SL | ? | ? | ? | ? |
| MAX_HOLD | ? | ? | ? | ? |

---

## Expected Behavior

**Hybrid:**
- Most selective (3 conditions)
- Fewest trades per hour
- Hopefully best win rate
- Safest

**Simple:**
- Less selective (dip only)
- Most trades per hour
- May have more losses
- Fastest to test

**Volume:**
- Focus on accumulation
- Medium trades per hour
- Should catch momentum
- Middle ground

---

## Workflow

1. **Start Phase 1 (Hybrid):**
   - Run bot
   - Wait for 10 trades
   - Stop bot
   - Record results

2. **Switch to Phase 2 (Simple):**
   - Edit config: `STRATEGY_MODE: 'simple'`
   - Restart bot
   - Wait for 10 trades
   - Stop bot
   - Record results

3. **Switch to Phase 3 (Volume):**
   - Edit config: `STRATEGY_MODE: 'volume'`
   - Restart bot
   - Wait for 10 trades
   - Stop bot
   - Record results

4. **Analyze & Pick Winner:**
   - Compare all metrics
   - Choose best strategy
   - Optimize parameters
   - Run production with winner

---

## Quick Commands

**Check trades collected:**
```bash
cd /home/j/.openclaw/wickbot
node -e "const trades = require('./wickbot_trades.json'); console.log('Total:', trades.length);"
```

**Analyze last N trades:**
```bash
node analyze-trades.mjs --last 10
```

**Switch strategy:**
```javascript
// Edit config.mjs
STRATEGY_MODE: 'simple',  // or 'hybrid' or 'volume'
```

---

## Notes

- Keep position size same (75%) across all tests
- Keep exit logic same (+2%/+4% TP, -2% SL, 60s max)
- Test on same token for fair comparison
- Record start/end capital for each phase
- Note any circuit breaker triggers

---

**Status:** Phase 1 starting... 🚀
