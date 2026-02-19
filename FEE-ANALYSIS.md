# Fee Analysis & Optimization - 2026-02-19

## 📊 Current Fee Structure

### Per Transaction:
```
Priority Fee: 0.001 SOL (~$0.20 at $200/SOL)
Network Fee:  0.000005 SOL (~$0.001)
Jupiter Fee:  0% (no platform fee)
Slippage:     ~0.5-1% (market dependent)
```

### Per Trade (Buy + Sell):
```
Total Fees: 0.00201 SOL (~$0.40)
With Slippage: ~0.5-1% of position
```

---

## 💰 Fee Impact Analysis

### Current Position Size: 0.075 SOL (50% of 0.15 SOL)

**Fees as % of Position:**
```
Direct fees: 0.00201 / 0.075 = 2.68%
With slippage: ~3.2-3.7% total cost
```

**Break-even Requirements:**
```
QUICK_TP1 (1.5%): LOSES MONEY (-1.2% after fees!)
QUICK_TP2 (3.0%): Small profit (~0.3% after fees)
QUICK_SL (-2%): -4.7% actual loss with fees
```

⚠️ **CRITICAL ISSUE: Fees are eating all profits!**

---

## 🔥 Trading Volume Projection

### With 10-second holds (optimized):
```
Trades per hour: 360 (theoretical max)
Realistic: 50-100 trades/hour
Daily (24h): 1,200-2,400 trades
```

### Fee Burn Rate:
```
10 trades/hour:  0.0201 SOL/hour ($4/hr)
50 trades/hour:  0.1005 SOL/hour ($20/hr) 
100 trades/hour: 0.201 SOL/hour ($40/hr)
```

**With 0.15 SOL capital:**
- 10 trades = 13.4% of capital
- 50 trades = 67% of capital
- 100 trades = 134% of capital (BURNED!)

---

## 💡 Optimization Strategies

### 1. REDUCE PRIORITY FEE (Easiest - Immediate)

**Current:** 0.001 SOL (1,000,000 lamports)  
**Options:**

| Priority Fee | Speed | Cost/Trade | Savings |
|--------------|-------|------------|---------|
| 0.001 SOL | Fast (current) | $0.40 | Baseline |
| 0.0005 SOL | Medium | $0.20 | 50% |
| 0.0001 SOL | Slow | $0.04 | 90% |
| 0 SOL | Slowest | $0.001 | 99.9% |

**Recommendation:** Start with **0.0001 SOL (100,000 lamports)**
- Still prioritized (most use 0)
- 90% cost reduction
- 10-15s execution (acceptable for 10s holds)

---

### 2. ADJUST POSITION SIZE (Medium Impact)

**Current:** 50% of capital = 0.075 SOL  
**Problem:** Fees are 2.68% of position

**Larger positions = lower fee %:**

| Position | Fee % | Break-even | TP1 Profit | TP2 Profit |
|----------|-------|------------|------------|------------|
| 0.075 SOL (50%) | 2.68% | 3.2% | -1.2% | +0.3% |
| 0.10 SOL (67%) | 2.01% | 2.5% | -0.5% | +1.0% |
| 0.15 SOL (100%) | 1.34% | 1.8% | +0.2% | +1.7% |

**Trade-off:**
- ✅ Lower fee % = more profit per trade
- ❌ Higher risk = one bad trade hurts more
- ❌ Can't diversify positions

**Recommendation:** Consider **67% (0.10 SOL)** if confident in strategy

---

### 3. INCREASE PROFIT TARGETS (High Impact)

**Problem:** 1.5% target doesn't beat fees

**New targets after fee optimization:**

```javascript
// With 0.0001 SOL priority fee:
QUICK_TP_1: 2.0%   // Net: ~1.5% after fees
QUICK_TP_2: 4.0%   // Net: ~3.5% after fees
QUICK_SL: 2.0%     // Keep same (cut losses fast)
```

**Why higher targets work:**
- Micro-scalp still (5-10s holds)
- But wait for 2-4% moves instead of 1.5-3%
- Fee % stays same, profit % increases
- Net result: Actually profitable trades

---

### 4. TRADE LESS FREQUENTLY (Strategy Change)

**Current:** Trade every opportunity (50-100/hour)  
**Alternative:** Be more selective (10-20/hour)

**How:**
```javascript
MIN_BUY_CONFIDENCE: 67%  // Up from 50% (need 4/6 conditions)
ENTRY_DIP_FROM_HIGH_PCT: 7%  // Up from 5% (wait for bigger dips)
MIN_VOLUME_RATIO: 3.0x   // Up from 2.0x (need stronger signal)
```

**Impact:**
- ✅ Fewer trades = less fees burned
- ✅ Higher confidence = better win rate
- ✅ Bigger moves = more profit per trade
- ❌ Might miss some opportunities

---

### 5. USE DIRECT PROGRAM CALLS (Advanced)

**Current:** Jupiter aggregator (1 hop)  
**Alternative:** Direct Raydium/Orca swap

**Pros:**
- Slightly faster (50-100ms)
- Same fees (both are 0 platform fee)
- More control

**Cons:**
- More complex code
- Need to manage pool finding
- Jupiter already optimizes routing

**Verdict:** Not worth the complexity (Jupiter is already optimal)

---

### 6. BATCH TRADES (Not Applicable)

**Concept:** Combine multiple trades into one transaction  
**Problem:** Doesn't work for scalping (each trade is independent)

**Verdict:** Not useful for our strategy

---

## ✅ RECOMMENDED OPTIMIZATIONS

### Tier 1: Immediate (Do Now)

**1. Lower Priority Fee:**
```javascript
PRIORITY_FEE_LAMPORTS: 100000  // Was 1000000 (90% reduction)
```
- Cost: $0.40 → $0.04 per trade
- Impact: Makes 1.5% targets profitable!

**2. Adjust Profit Targets:**
```javascript
QUICK_TP_1: 2.0%   // Was 1.5%
QUICK_TP_2: 4.0%   // Was 3.0%
QUICK_SL: 2.0%     // Keep same
```
- Ensures profits beat fees
- Still micro-scalp (holds 5-10s)

### Tier 2: Test & Evaluate

**3. Increase Position Size:**
```javascript
POSITION_SIZE_PCT: 67  // Was 50
```
- Only if confident after testing
- Reduces fee % from 2.68% to 2.01%

**4. Trade More Selectively:**
```javascript
MIN_BUY_CONFIDENCE: 67  // Was 50
ENTRY_DIP_FROM_HIGH_PCT: 7  // Was 5
```
- Fewer trades but better quality
- Test after fee reduction

---

## 📊 Expected Results After Optimization

### Before (Current):
```
Priority Fee: 0.001 SOL
Position: 0.075 SOL (50%)
TP1: 1.5% → Net: -1.2% ❌
TP2: 3.0% → Net: +0.3% (barely)
Trades/hour: 50-100
Fee burn: 67-134% of capital per 50 trades
```

### After (Optimized):
```
Priority Fee: 0.0001 SOL (10x lower)
Position: 0.075 SOL (50%) or 0.10 SOL (67%)
TP1: 2.0% → Net: +1.5% ✅
TP2: 4.0% → Net: +3.5% ✅
Trades/hour: 20-50 (more selective)
Fee burn: 13-34% of capital per 50 trades
```

**Net improvement:** 
- Profitable at TP1 (was losing money)
- 3x more profit at TP2
- 5-10x less fee burn

---

## 🧪 Testing Plan

### Phase 1: Lower Priority Fee Only
1. Set `PRIORITY_FEE_LAMPORTS: 100000`
2. Keep targets at 1.5% / 3.0%
3. Run 10 trades
4. Measure: execution time, win rate, net P&L

**Expected:** Execution 10-15s (acceptable), fees 90% lower

### Phase 2: Adjust Targets
1. Set `QUICK_TP_1: 2.0%` and `QUICK_TP_2: 4.0%`
2. Run 10 trades
3. Measure: hit rate, net P&L

**Expected:** Lower hit rate but higher profit when hit

### Phase 3: Fine-tune
1. Adjust position size if needed
2. Increase confidence threshold if too many bad trades
3. Find optimal balance

---

## 💭 Key Insights

**The Math is Clear:**
- At 0.001 SOL priority, you LOSE MONEY at 1.5% targets
- Fees must be under 1% of position for micro-scalping to work
- Either reduce fees OR increase targets (or both)

**Priority Fee Reality:**
- Most transactions use 0 (default)
- 100,000 lamports still prioritizes you
- 10x reduction = 10x more profitable

**Slippage is Real:**
- Low liquidity tokens = higher slippage
- GROKIUS has $75K liquidity (decent)
- Expect 0.5-1% slippage on $15 trades

---

## ✅ Action Items

**URGENT (Do before next session):**
1. [ ] Change `PRIORITY_FEE_LAMPORTS: 100000` (90% reduction)
2. [ ] Change `QUICK_TP_1: 2.0%` (from 1.5%)
3. [ ] Change `QUICK_TP_2: 4.0%` (from 3.0%)

**Test after 10 trades:**
4. [ ] Measure execution time (should be 10-15s)
5. [ ] Measure net P&L (should be positive at TP1)
6. [ ] Consider increasing position size to 67%

**Long-term optimization:**
7. [ ] Track fee burn rate
8. [ ] Optimize confidence threshold
9. [ ] Fine-tune targets based on market

---

## 🎯 Bottom Line

**Current setup LOSES MONEY due to fees.**

**With optimizations:**
- 90% lower fees = actually profitable
- Adjust targets = ensures profit after fees
- More selective = fewer wasted trades

**Implement Tier 1 changes NOW before next trading session!**
