#!/usr/bin/env node
/**
 * incremental-indicators.mjs - O(1) Incremental Technical Indicators
 * Inspired by Hexital - only updates latest values instead of recalculating everything
 * 
 * This is FASTER than Python Hexital because:
 * - No subprocess overhead
 * - No JSON serialization
 * - Native JavaScript execution
 */

export class IncrementalRSI {
  constructor(period = 14) {
    this.period = period;
    this.gains = [];
    this.losses = [];
    this.avgGain = 0;
    this.avgLoss = 0;
    this.lastPrice = null;
    this.initialized = false;
  }
  
  /**
   * O(1) update with new price
   * Uses Wilder's smoothing method (exponential)
   */
  update(price) {
    if (this.lastPrice === null) {
      this.lastPrice = price;
      return null;
    }
    
    const change = price - this.lastPrice;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    if (!this.initialized) {
      // Build initial period
      this.gains.push(gain);
      this.losses.push(loss);
      
      if (this.gains.length === this.period) {
        this.avgGain = this.gains.reduce((a, b) => a + b) / this.period;
        this.avgLoss = this.losses.reduce((a, b) => a + b) / this.period;
        this.initialized = true;
      }
    } else {
      // Wilder's smoothing (O(1) update)
      this.avgGain = ((this.avgGain * (this.period - 1)) + gain) / this.period;
      this.avgLoss = ((this.avgLoss * (this.period - 1)) + loss) / this.period;
    }
    
    this.lastPrice = price;
    
    if (!this.initialized) return null;
    
    if (this.avgLoss === 0) return 100;
    const rs = this.avgGain / this.avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  getValue() {
    if (!this.initialized) return null;
    if (this.avgLoss === 0) return 100;
    const rs = this.avgGain / this.avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

export class IncrementalBollingerBands {
  constructor(period = 20, stdDev = 2) {
    this.period = period;
    this.stdDev = stdDev;
    this.prices = [];
    this.sum = 0;
    this.sumSq = 0;
  }
  
  /**
   * O(1) update using rolling window
   */
  update(price) {
    this.prices.push(price);
    this.sum += price;
    this.sumSq += price * price;
    
    if (this.prices.length > this.period) {
      const removed = this.prices.shift();
      this.sum -= removed;
      this.sumSq -= removed * removed;
    }
    
    if (this.prices.length < this.period) return null;
    
    const mean = this.sum / this.period;
    const variance = (this.sumSq / this.period) - (mean * mean);
    const std = Math.sqrt(Math.max(0, variance));
    
    return {
      upper: mean + (this.stdDev * std),
      middle: mean,
      lower: mean - (this.stdDev * std),
      std: std
    };
  }
  
  getValue() {
    if (this.prices.length < this.period) return null;
    
    const mean = this.sum / this.period;
    const variance = (this.sumSq / this.period) - (mean * mean);
    const std = Math.sqrt(Math.max(0, variance));
    
    return {
      upper: mean + (this.stdDev * std),
      middle: mean,
      lower: mean - (this.stdDev * std),
      std: std
    };
  }
}

export class IncrementalEMA {
  constructor(period) {
    this.period = period;
    this.multiplier = 2 / (period + 1);
    this.ema = null;
    this.initialized = false;
    this.prices = [];
  }
  
  /**
   * O(1) exponential moving average update
   */
  update(price) {
    if (!this.initialized) {
      this.prices.push(price);
      
      if (this.prices.length === this.period) {
        // Initialize with SMA
        this.ema = this.prices.reduce((a, b) => a + b) / this.period;
        this.initialized = true;
        this.prices = []; // Free memory
      }
      return this.ema;
    }
    
    // EMA formula: (Close - EMA(previous)) × multiplier + EMA(previous)
    this.ema = (price - this.ema) * this.multiplier + this.ema;
    return this.ema;
  }
  
  getValue() {
    return this.ema;
  }
}

export class IncrementalMACD {
  constructor(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    this.fastEMA = new IncrementalEMA(fastPeriod);
    this.slowEMA = new IncrementalEMA(slowPeriod);
    this.signalEMA = new IncrementalEMA(signalPeriod);
    this.macdLine = null;
  }
  
  /**
   * O(1) MACD update
   */
  update(price) {
    this.fastEMA.update(price);
    this.slowEMA.update(price);
    
    const fast = this.fastEMA.getValue();
    const slow = this.slowEMA.getValue();
    
    if (fast === null || slow === null) return null;
    
    this.macdLine = fast - slow;
    const signal = this.signalEMA.update(this.macdLine);
    
    if (signal === null) return null;
    
    return {
      macd: this.macdLine,
      signal: signal,
      histogram: this.macdLine - signal
    };
  }
  
  getValue() {
    if (this.macdLine === null) return null;
    const signal = this.signalEMA.getValue();
    if (signal === null) return null;
    
    return {
      macd: this.macdLine,
      signal: signal,
      histogram: this.macdLine - signal
    };
  }
}

/**
 * Main Incremental Engine
 * Combines all indicators with O(1) updates
 */
export class IncrementalEngine {
  constructor(config = {}) {
    this.rsi = new IncrementalRSI(config.rsiPeriod || 14);
    this.bb = new IncrementalBollingerBands(config.bbPeriod || 20, config.bbStdDev || 2);
    this.macd = new IncrementalMACD(
      config.macdFast || 12,
      config.macdSlow || 26,
      config.macdSignal || 9
    );
    this.ema20 = new IncrementalEMA(20);
    this.ema50 = new IncrementalEMA(50);
    
    this.lastCandle = null;
    this.updateCount = 0;
  }
  
  /**
   * Update all indicators with new candle (O(1) time)
   * @param {Object} candle - {open, high, low, close, timestamp}
   * @returns {Object} All indicator values
   */
  update(candle) {
    const price = candle.close;
    
    // Update all indicators (each is O(1))
    const rsi = this.rsi.update(price);
    const bb = this.bb.update(price);
    const macd = this.macd.update(price);
    const ema20 = this.ema20.update(price);
    const ema50 = this.ema50.update(price);
    
    this.lastCandle = candle;
    this.updateCount++;
    
    return {
      rsi: rsi,
      bb: bb,
      macd: macd,
      ema20: ema20,
      ema50: ema50,
      price: price,
      candle: candle,
      ready: rsi !== null && bb !== null && macd !== null && ema20 !== null && ema50 !== null
    };
  }
  
  /**
   * Get current indicator values without updating
   */
  getIndicators() {
    return {
      rsi: this.rsi.getValue(),
      bb: this.bb.getValue(),
      macd: this.macd.getValue(),
      ema20: this.ema20.getValue(),
      ema50: this.ema50.getValue(),
      candle: this.lastCandle,
      updateCount: this.updateCount
    };
  }
  
  /**
   * Batch initialize with historical data
   * @param {Array} candles - Historical candles
   */
  initializeWithHistory(candles) {
    for (const candle of candles) {
      this.update(candle);
    }
  }
  
  /**
   * Check if ready for trading (all indicators initialized)
   */
  isReady() {
    const ind = this.getIndicators();
    return ind.rsi !== null && 
           ind.bb !== null && 
           ind.macd !== null && 
           ind.ema20 !== null && 
           ind.ema50 !== null;
  }
}
