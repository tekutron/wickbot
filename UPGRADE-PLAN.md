# Wickbot Speed Upgrade Plan - Hexital Integration

## Goal
Transform wickbot from 20s polling bot → real-time streaming bot (10-50x faster)

## Current vs Future Architecture

### BEFORE (Current)
```
Every 20 seconds:
1. HTTP request → Birdeye API (300-500ms)
2. Fetch 100 candles for 5 timeframes (500 candles total)
3. Calculate ALL indicators from scratch (O(n) * 5)
4. Detect ALL patterns from scratch
5. Generate signal
Total: ~1000-1500ms per cycle, 20s intervals = SLOW
```

### AFTER (Hexital)
```
Every 1 second:
1. WebSocket update → 1 new price tick
2. Incremental update RSI/MACD/BB (O(1))
3. Check latest candle pattern
4. Instant signal update
Total: ~10-50ms per update, 1s intervals = 20-40x FASTER
```

## Speed Improvements Breakdown

| Component | Before | After | Speedup |
|-----------|--------|-------|---------|
| Data fetch | 300-500ms HTTP | 5-10ms WS | 50x |
| Indicator calc | 200-300ms (full) | 5-10ms (incremental) | 40x |
| Pattern scan | 100-200ms | 5-10ms | 20x |
| Total latency | 1000-1500ms | 15-30ms | **50x faster** |
| Update frequency | 20s | 1s | **20x more frequent** |

**Overall result:** 50x faster reaction + 20x more data points = **1000x better forecasting**

---

## Implementation Steps

### Step 1: Install Hexital
```bash
cd /home/j/.openclaw/wickbot
pip install hexital
```

### Step 2: Create Hexital Engine Wrapper
**File:** `data/hexital-engine.mjs`
```javascript
import { spawn } from 'child_process';

class HexitalEngine {
  constructor() {
    this.process = null;
    this.indicators = {
      rsi: null,
      bb: { upper: null, middle: null, lower: null },
      macd: { macd: null, signal: null, histogram: null },
      ema20: null,
      ema50: null
    };
  }
  
  async start() {
    // Spawn Python subprocess with Hexital
    this.process = spawn('python3', ['hexital_runner.py']);
    
    this.process.stdout.on('data', (data) => {
      // Parse indicator updates (JSON)
      const update = JSON.parse(data.toString());
      this.indicators = update;
    });
  }
  
  updateCandle(candle) {
    // Send new candle to Python process for O(1) update
    this.process.stdin.write(JSON.stringify(candle) + '\n');
  }
  
  getIndicators() {
    return this.indicators;
  }
}
```

### Step 3: Create Python Hexital Runner
**File:** `hexital_runner.py`
```python
#!/usr/bin/env python3
from hexital import RSI, BBANDS, MACD, EMA, Candle, Hexital
from hexital.analysis import rising, falling, cross
import sys
import json

# Initialize Hexital strategy
candles = []  # Will populate from stdin
strat = Hexital("WickbotRT", candles, [
    RSI(period=14),
    BBANDS(period=20, std_dev=2),
    MACD(fast=12, slow=26, signal=9),
    EMA(period=20),
    EMA(period=50)
])

# Real-time loop
for line in sys.stdin:
    # Receive new candle from Node.js
    candle_data = json.loads(line)
    new_candle = Candle(**candle_data)
    
    # O(1) incremental update
    strat.append(new_candle)
    
    # Get latest readings
    output = {
        "rsi": strat.reading("RSI_14"),
        "bb": {
            "upper": strat.reading("BB_UPPER_20"),
            "middle": strat.reading("BB_MIDDLE_20"),
            "lower": strat.reading("BB_LOWER_20")
        },
        "macd": {
            "macd": strat.reading("MACD_12_26_9"),
            "signal": strat.reading("MACD_SIGNAL_12_26_9"),
            "histogram": strat.reading("MACD_HIST_12_26_9")
        },
        "ema20": strat.reading("EMA_20"),
        "ema50": strat.reading("EMA_50")
    }
    
    # Send back to Node.js
    print(json.dumps(output), flush=True)
```

### Step 4: Upgrade Signal Generator
**File:** `patterns/hexital-signals.mjs`
```javascript
export class HexitalSignalGenerator {
  constructor(hexitalEngine) {
    this.engine = hexitalEngine;
  }
  
  generate(currentPrice, candle) {
    const ind = this.engine.getIndicators();
    
    // BUY DIP CONDITIONS (algo-trade inspired)
    const buyConditions = {
      oversold: ind.rsi < 35,
      lowerBandTouch: currentPrice <= ind.bb.lower * 1.001, // within 0.1%
      bullishCandle: candle.close > candle.open,
      macdRising: ind.macd.histogram > 0,
      priceAboveEMA50: currentPrice > ind.ema50 // trend filter
    };
    
    const buyScore = Object.values(buyConditions).filter(Boolean).length;
    const buyConfidence = (buyScore / 5) * 100;
    
    if (buyScore >= 4 && buyConfidence >= 80) {
      return {
        action: 'buy',
        confidence: buyConfidence,
        reason: `Dip detected: ${Object.keys(buyConditions).filter(k => buyConditions[k]).join(', ')}`,
        indicators: ind
      };
    }
    
    // SELL TOP CONDITIONS
    const sellConditions = {
      overbought: ind.rsi > 65,
      upperBandTouch: currentPrice >= ind.bb.upper * 0.999,
      bearishCandle: candle.close < candle.open,
      macdFalling: ind.macd.histogram < 0
    };
    
    const sellScore = Object.values(sellConditions).filter(Boolean).length;
    const sellConfidence = (sellScore / 4) * 100;
    
    if (sellScore >= 3 && sellConfidence >= 75) {
      return {
        action: 'sell',
        confidence: sellConfidence,
        reason: `Top detected: ${Object.keys(sellConditions).filter(k => sellConditions[k]).join(', ')}`,
        indicators: ind
      };
    }
    
    return {
      action: 'hold',
      confidence: Math.max(buyConfidence, sellConfidence),
      reason: 'Waiting for stronger signal',
      indicators: ind
    };
  }
}
```

### Step 5: Replace Polling with WebSocket (Future)
**File:** `data/birdeye-websocket.mjs`
```javascript
// TODO: Birdeye doesn't have public WS yet
// Alternative: Poll every 1 second instead of 20
// Or use: CoinGecko/Binance WS for SOL price → build candles
```

---

## Configuration Changes

### New Config Values
```javascript
// config.mjs updates
export const config = {
  // ... existing config ...
  
  // HEXITAL REAL-TIME MODE
  USE_HEXITAL: true,              // Enable Hexital engine
  UPDATE_INTERVAL_MS: 1000,       // 1s updates (was 20s)
  
  // SIGNAL CONFIDENCE (algo-trade inspired)
  MIN_BUY_CONFIDENCE: 80,         // Need 4/5 conditions (80%)
  MIN_SELL_CONFIDENCE: 75,        // Need 3/4 conditions (75%)
  
  // DIP/TOP THRESHOLDS
  RSI_DIP_THRESHOLD: 35,          // Lower = deeper dips (was 40)
  RSI_TOP_THRESHOLD: 65,          // Same, but more selective
  BB_TOUCH_TOLERANCE: 0.001,      // 0.1% tolerance for "touching" bands
  
  // EXIT STRATEGY (signal-driven)
  EXIT_ON_OPPOSITE_SIGNAL: true,  // Sell when sell signal triggers
  EXIT_CONFIDENCE_MIN: 75,        // Min confidence for exit
  
  // SAFETY NETS (backup only)
  SAFETY_TP_PCT: 20,              // Extreme profit cap (not target)
  SAFETY_SL_PCT: 20,              // Extreme loss cap (not target)
};
```

---

## Testing Plan

### Phase 1: Unit Test Hexital Integration (30 min)
1. Install Hexital
2. Test Python runner with sample candle stream
3. Verify O(1) updates working
4. Confirm indicator values match current system

### Phase 2: Signal Logic Test (1 hour)
1. Feed historical data through new signal generator
2. Compare vs old signals (should be similar but faster)
3. Backtest on Feb 16 flat market (should reject more)
4. Backtest on volatile period (should catch more dips)

### Phase 3: Live Dry-Run (2 hours)
1. Run bot with Hexital but DRY_RUN=true
2. Log all signals with timestamps
3. Measure: signal latency, entry quality, exit timing
4. Compare: # of signals, confidence distribution

### Phase 4: Small Live Test (1 hour)
1. Reduce position: 40% → 10% (very safe)
2. Run during active hours (next weekday)
3. Monitor: 5-10 trades
4. Validate: Speed improvement, P&L improvement

---

## Expected Results

### Speed Metrics
- Signal latency: 1000ms → 20ms (**50x faster**)
- Update frequency: Every 20s → Every 1s (**20x more data**)
- Reaction time to dip: ~20s delay → <1s (**instant**)

### Performance Metrics
- Entry quality: Better (catch dips as they happen, not 20s later)
- Exit timing: Better (sell tops immediately, not after reversal)
- Win rate: 0% → target 60%+ (proper entry/exit timing)
- Avg P&L: -0.1% → target +2-5% per trade

### Capital Efficiency
- Fewer missed opportunities (catch more dips in same timeframe)
- Better exits (sell before full reversal)
- Higher trade frequency (more opportunities per hour)

---

## Rollback Plan

If Hexital doesn't work:
1. Keep current system as fallback in `patterns/signals-legacy.mjs`
2. Toggle via config: `USE_HEXITAL: false`
3. Python process issues → fallback to pure JS indicators

---

## Timeline

- **Today (2 hours):** Install + basic integration
- **Tomorrow (2 hours):** Signal logic + backtesting  
- **Day 3 (2 hours):** Live testing + optimization
- **Day 4:** Full deployment or iterate

---

**Ready to start?** We can begin with Phase 1 (install + test Hexital) right now.
