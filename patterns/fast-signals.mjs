#!/usr/bin/env node
/**
 * fast-signals.mjs - Real-Time Dip/Top Detection
 * Inspired by algo-trade confidence scoring
 * 
 * GOAL: Buy dips fast, sell tops fast
 * METHOD: Multi-signal confirmation with confidence scoring
 */

import config from '../config.mjs';

export class FastSignalGenerator {
  constructor() {
    this.signalHistory = [];
    this.lastSignal = null;
  }
  
  /**
   * Generate BUY DIP or SELL TOP signal
   * @param {Object} indicators - From IncrementalEngine
   * @param {Object} candle - Current candle
   * @returns {Object} Signal with action, confidence, reason
   */
  generate(indicators, candle) {
    if (!indicators.ready) {
      return this.holdSignal('Indicators not ready');
    }
    
    const { rsi, bb, macd, ema20, ema50, price } = indicators;
    const currentPrice = candle.close;
    
    // Check candle body (filter flat markets)
    const candleBody = Math.abs(candle.close - candle.open);
    const bodyPct = (candleBody / candle.open) * 100;
    
    if (bodyPct < config.MIN_CANDLE_BODY_PCT) {
      return this.holdSignal(`Flat market: ${bodyPct.toFixed(2)}% body < ${config.MIN_CANDLE_BODY_PCT}%`);
    }
    
    // === BUY DIP DETECTION (algo-trade inspired) ===
    const buyConditions = {
      // 1. RSI Oversold (dip condition)
      rsiOversold: rsi < config.RSI_DIP_THRESHOLD,
      
      // 2. Price touching lower Bollinger Band (dip confirmation)
      lowerBandTouch: currentPrice <= bb.lower * (1 + config.BB_TOUCH_TOLERANCE),
      
      // 3. Bullish candle (buyers stepping in)
      bullishCandle: candle.close > candle.open,
      
      // 4. MACD histogram rising (momentum turning up)
      macdRising: macd.histogram > 0,
      
      // 5. Price above EMA50 (uptrend filter - only buy dips in uptrends)
      uptrend: currentPrice > ema50,
      
      // 6. EMA20 above EMA50 (golden cross confirmation)
      goldenCross: ema20 > ema50,
    };
    
    const buyScore = Object.values(buyConditions).filter(Boolean).length;
    const buyConfidence = (buyScore / Object.keys(buyConditions).length) * 100;
    
    // BUY signal: Check if confidence meets threshold (dynamically configured)
    const minBuyConditions = Math.ceil((Object.keys(buyConditions).length * config.MIN_BUY_CONFIDENCE) / 100);
    if (buyScore >= minBuyConditions && buyConfidence >= config.MIN_BUY_CONFIDENCE) {
      const reasons = Object.keys(buyConditions)
        .filter(k => buyConditions[k])
        .map(k => this.formatCondition(k));
      
      return this.buySignal(
        buyConfidence,
        `DIP DETECTED: ${reasons.join(' + ')}`,
        {
          rsi: rsi.toFixed(2),
          bbLower: bb.lower.toFixed(2),
          price: currentPrice.toFixed(2),
          macdHist: macd.histogram.toFixed(4),
          ema20: ema20.toFixed(2),
          ema50: ema50.toFixed(2),
          conditions: buyConditions
        }
      );
    }
    
    // === SELL TOP DETECTION ===
    const sellConditions = {
      // 1. RSI Overbought (top condition)
      rsiOverbought: rsi > config.RSI_TOP_THRESHOLD,
      
      // 2. Price touching upper Bollinger Band (top confirmation)
      upperBandTouch: currentPrice >= bb.upper * (1 - config.BB_TOUCH_TOLERANCE),
      
      // 3. Bearish candle (sellers stepping in)
      bearishCandle: candle.close < candle.open,
      
      // 4. MACD histogram falling (momentum turning down)
      macdFalling: macd.histogram < 0,
      
      // 5. Price showing weakness (failed to break higher)
      weakPrice: candle.high < (candle.high + candle.low) / 2 + (bb.std * 0.5),
    };
    
    const sellScore = Object.values(sellConditions).filter(Boolean).length;
    const sellConfidence = (sellScore / Object.keys(sellConditions).length) * 100;
    
    // SELL signal: Check if confidence meets threshold (dynamically configured)
    const minSellConditions = Math.ceil((Object.keys(sellConditions).length * config.MIN_SELL_CONFIDENCE) / 100);
    if (sellScore >= minSellConditions && sellConfidence >= config.MIN_SELL_CONFIDENCE) {
      const reasons = Object.keys(sellConditions)
        .filter(k => sellConditions[k])
        .map(k => this.formatCondition(k));
      
      return this.sellSignal(
        sellConfidence,
        `TOP DETECTED: ${reasons.join(' + ')}`,
        {
          rsi: rsi.toFixed(2),
          bbUpper: bb.upper.toFixed(2),
          price: currentPrice.toFixed(2),
          macdHist: macd.histogram.toFixed(4),
          conditions: sellConditions
        }
      );
    }
    
    // === HOLD (waiting for clear signal) ===
    return this.holdSignal(
      `Waiting for stronger signal (Buy: ${buyConfidence.toFixed(0)}%, Sell: ${sellConfidence.toFixed(0)}%)`,
      {
        rsi: rsi.toFixed(2),
        bbPosition: this.getBBPosition(currentPrice, bb),
        macdTrend: macd.histogram > 0 ? 'rising' : 'falling',
        trendQuality: ema20 > ema50 ? 'uptrend' : 'downtrend'
      }
    );
  }
  
  /**
   * Format condition name to human-readable
   */
  formatCondition(key) {
    const map = {
      rsiOversold: 'RSI oversold',
      rsiOverbought: 'RSI overbought',
      lowerBandTouch: 'Lower BB touch',
      upperBandTouch: 'Upper BB touch',
      bullishCandle: 'Bullish candle',
      bearishCandle: 'Bearish candle',
      macdRising: 'MACD rising',
      macdFalling: 'MACD falling',
      uptrend: 'In uptrend',
      goldenCross: 'Golden cross',
      weakPrice: 'Weak price action'
    };
    return map[key] || key;
  }
  
  /**
   * Get Bollinger Band position (for logging)
   */
  getBBPosition(price, bb) {
    const pctInBand = (price - bb.lower) / (bb.upper - bb.lower) * 100;
    if (pctInBand < 10) return 'at lower band';
    if (pctInBand > 90) return 'at upper band';
    if (pctInBand < 30) return 'near lower band';
    if (pctInBand > 70) return 'near upper band';
    return 'middle';
  }
  
  /**
   * Create BUY signal
   */
  buySignal(confidence, reason, details) {
    const signal = {
      action: 'buy',
      confidence: Math.round(confidence),
      reason: reason,
      details: details,
      timestamp: Date.now()
    };
    
    this.lastSignal = signal;
    this.signalHistory.push(signal);
    if (this.signalHistory.length > 10) this.signalHistory.shift();
    
    return signal;
  }
  
  /**
   * Create SELL signal
   */
  sellSignal(confidence, reason, details) {
    const signal = {
      action: 'sell',
      confidence: Math.round(confidence),
      reason: reason,
      details: details,
      timestamp: Date.now()
    };
    
    this.lastSignal = signal;
    this.signalHistory.push(signal);
    if (this.signalHistory.length > 10) this.signalHistory.shift();
    
    return signal;
  }
  
  /**
   * Create HOLD signal
   */
  holdSignal(reason, details = {}) {
    const signal = {
      action: 'hold',
      confidence: 0,
      reason: reason,
      details: details,
      timestamp: Date.now()
    };
    
    this.lastSignal = signal;
    return signal;
  }
  
  /**
   * Get recent signal history (for debugging/analysis)
   */
  getHistory() {
    return this.signalHistory;
  }
  
  /**
   * Check if we should exit an open position
   * @param {Object} position - Current open position
   * @param {Object} currentSignal - Latest signal
   * @returns {Boolean} Should exit?
   */
  shouldExit(position, currentSignal) {
    if (!config.EXIT_ON_OPPOSITE_SIGNAL) return false;
    
    // Exit on opposite signal with sufficient confidence
    if (position.side === 'long' && 
        currentSignal.action === 'sell' && 
        currentSignal.confidence >= config.EXIT_CONFIDENCE_MIN) {
      return true;
    }
    
    return false;
  }
}
