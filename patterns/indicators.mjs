#!/usr/bin/env node
/**
 * indicators.mjs - Technical Indicator Calculator
 * RSI, MACD, Volume, Moving Averages, Bollinger Bands
 */

import config from '../config.mjs';

export class IndicatorCalculator {
  /**
   * Calculate all indicators for a candle array
   * @param {Array} candles - Array of candles
   * @returns {Object} All calculated indicators
   */
  calculateAll(candles) {
    if (!candles || candles.length < 14) {
      return {};
    }
    
    return {
      rsi: this.calculateRSI(candles),
      macd: this.calculateMACD(candles),
      volume: this.analyzeVolume(candles),
      ma: this.calculateMovingAverages(candles),
      bollinger: this.calculateBollingerBands(candles)
    };
  }
  
  /**
   * Calculate RSI (Relative Strength Index)
   * @param {Array} candles
   * @param {number} period - Default 14
   * @returns {number} RSI value (0-100)
   */
  calculateRSI(candles, period = config.INDICATORS.RSI_PERIOD) {
    if (candles.length < period + 1) return null;
    
    const changes = [];
    for (let i = 1; i < candles.length; i++) {
      changes.push(candles[i].close - candles[i - 1].close);
    }
    
    // Get last 'period' changes
    const recentChanges = changes.slice(-period);
    
    const gains = recentChanges.map(c => c > 0 ? c : 0);
    const losses = recentChanges.map(c => c < 0 ? Math.abs(c) : 0);
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @returns {Object} {macd, signal, histogram}
   */
  calculateMACD(candles) {
    const fastPeriod = config.INDICATORS.MACD_FAST;
    const slowPeriod = config.INDICATORS.MACD_SLOW;
    const signalPeriod = config.INDICATORS.MACD_SIGNAL;
    
    if (candles.length < slowPeriod + signalPeriod) {
      return null;
    }
    
    const closes = candles.map(c => c.close);
    
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    
    const macdLine = emaFast - emaSlow;
    
    // Calculate signal line (EMA of MACD line)
    // For simplicity, we'll use a simple moving average here
    const signalLine = this.calculateSMA(candles.slice(-signalPeriod).map(c => c.close), signalPeriod);
    
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }
  
  /**
   * Analyze volume
   * @returns {Object} Volume metrics
   */
  analyzeVolume(candles, lookback = 20) {
    if (candles.length < lookback) return null;
    
    const recent = candles.slice(-lookback);
    const current = candles[candles.length - 1];
    
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / lookback;
    const volumeRatio = current.volume / avgVolume;
    
    const isSpike = volumeRatio >= config.INDICATORS.VOLUME_SPIKE_THRESHOLD;
    
    return {
      current: current.volume,
      average: avgVolume,
      ratio: volumeRatio,
      isSpike: isSpike
    };
  }
  
  /**
   * Calculate Moving Averages
   * @returns {Object} {short, long}
   */
  calculateMovingAverages(candles) {
    const shortPeriod = config.INDICATORS.MA_SHORT;
    const longPeriod = config.INDICATORS.MA_LONG;
    
    if (candles.length < longPeriod) return null;
    
    const closes = candles.map(c => c.close);
    
    return {
      short: this.calculateSMA(closes, shortPeriod),
      long: this.calculateSMA(closes, longPeriod),
      crossover: this.calculateSMA(closes, shortPeriod) > this.calculateSMA(closes, longPeriod)
    };
  }
  
  /**
   * Calculate Bollinger Bands
   * @returns {Object} {upper, middle, lower, bandwidth}
   */
  calculateBollingerBands(candles) {
    const period = config.INDICATORS.BOLLINGER_PERIOD;
    const stdDev = config.INDICATORS.BOLLINGER_STD;
    
    if (candles.length < period) return null;
    
    const closes = candles.map(c => c.close);
    const recentCloses = closes.slice(-period);
    
    const middle = this.calculateSMA(recentCloses, period);
    const std = this.calculateStdDev(recentCloses);
    
    const upper = middle + (std * stdDev);
    const lower = middle - (std * stdDev);
    
    const bandwidth = ((upper - lower) / middle) * 100;
    
    const current = candles[candles.length - 1].close;
    const position = (current - lower) / (upper - lower); // 0 = lower band, 1 = upper band
    
    return {
      upper: upper,
      middle: middle,
      lower: lower,
      bandwidth: bandwidth,
      position: position // Where price is relative to bands
    };
  }
  
  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(values, period) {
    if (values.length < period) return null;
    
    const recent = values.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / period;
  }
  
  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(values, period) {
    if (values.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  /**
   * Calculate Standard Deviation
   */
  calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }
  
  /**
   * Check if RSI is oversold
   */
  isOversold(rsi) {
    return rsi !== null && rsi < config.INDICATORS.RSI_OVERSOLD;
  }
  
  /**
   * Check if RSI is overbought
   */
  isOverbought(rsi) {
    return rsi !== null && rsi > config.INDICATORS.RSI_OVERBOUGHT;
  }
  
  /**
   * Check if MACD is bullish (positive histogram)
   */
  isMACDBullish(macd) {
    return macd && macd.histogram > 0;
  }
  
  /**
   * Check if MACD is bearish (negative histogram)
   */
  isMACDBearish(macd) {
    return macd && macd.histogram < 0;
  }
}

export default IndicatorCalculator;
