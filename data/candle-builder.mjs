#!/usr/bin/env node
/**
 * candle-builder.mjs - Multi-Timeframe Candle Builder
 * Aggregates 1-minute candles into 5m, 15m, 30m, 1h timeframes
 */

import config from '../config.mjs';

export class CandleBuilder {
  constructor() {
    this.timeframeMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60
    };
  }
  
  /**
   * Build all configured timeframes from 1m candles
   * @param {Array} oneMinuteCandles - Array of 1m candles
   * @returns {Object} Map of timeframe → candles
   */
  buildAllTimeframes(oneMinuteCandles) {
    const result = {
      '1m': oneMinuteCandles
    };
    
    // Build each configured timeframe
    for (const timeframe of config.CANDLE_TIMEFRAMES) {
      if (timeframe === '1m') continue; // Already have it
      
      result[timeframe] = this.aggregate(oneMinuteCandles, timeframe);
    }
    
    return result;
  }
  
  /**
   * Aggregate 1m candles into a larger timeframe
   * @param {Array} oneMinuteCandles - Source candles
   * @param {string} targetTimeframe - Target timeframe (5m, 15m, etc.)
   * @returns {Array} Aggregated candles
   */
  aggregate(oneMinuteCandles, targetTimeframe) {
    const minutes = this.timeframeMinutes[targetTimeframe];
    if (!minutes) {
      throw new Error(`Unknown timeframe: ${targetTimeframe}`);
    }
    
    const aggregated = [];
    const msPerCandle = minutes * 60 * 1000;
    
    // Group candles by time bucket
    const buckets = new Map();
    
    for (const candle of oneMinuteCandles) {
      // Calculate which bucket this candle belongs to
      const bucketTime = Math.floor(candle.time / msPerCandle) * msPerCandle;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      
      buckets.get(bucketTime).push(candle);
    }
    
    // Aggregate each bucket into a single candle
    for (const [bucketTime, candles] of buckets.entries()) {
      if (candles.length === 0) continue;
      
      aggregated.push(this.mergeCandles(candles, bucketTime));
    }
    
    // Sort by time (ascending)
    aggregated.sort((a, b) => a.time - b.time);
    
    return aggregated;
  }
  
  /**
   * Merge multiple 1m candles into a single candle
   * @param {Array} candles - Candles to merge
   * @param {number} time - Bucket time (start of period)
   * @returns {Object} Merged candle
   */
  mergeCandles(candles, time) {
    // Sort by time to ensure correct order
    const sorted = candles.sort((a, b) => a.time - b.time);
    
    return {
      time: time,
      open: sorted[0].open,                           // First candle's open
      high: Math.max(...sorted.map(c => c.high)),     // Highest high
      low: Math.min(...sorted.map(c => c.low)),       // Lowest low
      close: sorted[sorted.length - 1].close,         // Last candle's close
      volume: sorted.reduce((sum, c) => sum + c.volume, 0) // Total volume
    };
  }
  
  /**
   * Calculate percentage change for a candle
   * @param {Object} candle
   * @returns {number} Percentage change (e.g., 2.5 for +2.5%)
   */
  getChange(candle) {
    if (!candle || !candle.open || candle.open === 0) return 0;
    return ((candle.close - candle.open) / candle.open) * 100;
  }
  
  /**
   * Check if candle is bullish (close > open)
   */
  isBullish(candle) {
    return candle.close > candle.open;
  }
  
  /**
   * Check if candle is bearish (close < open)
   */
  isBearish(candle) {
    return candle.close < candle.open;
  }
  
  /**
   * Get candle body size (absolute difference between open and close)
   */
  getBodySize(candle) {
    return Math.abs(candle.close - candle.open);
  }
  
  /**
   * Get candle range (high - low)
   */
  getRange(candle) {
    return candle.high - candle.low;
  }
  
  /**
   * Get upper wick size
   */
  getUpperWick(candle) {
    const top = Math.max(candle.open, candle.close);
    return candle.high - top;
  }
  
  /**
   * Get lower wick size
   */
  getLowerWick(candle) {
    const bottom = Math.min(candle.open, candle.close);
    return bottom - candle.low;
  }
  
  /**
   * Get body as percentage of total range
   */
  getBodyRatio(candle) {
    const range = this.getRange(candle);
    if (range === 0) return 0;
    return (this.getBodySize(candle) / range) * 100;
  }
  
  /**
   * Calculate average volume for a timeframe
   */
  getAverageVolume(candles, periods = 20) {
    if (!candles || candles.length === 0) return 0;
    
    const recent = candles.slice(-periods);
    const sum = recent.reduce((acc, c) => acc + c.volume, 0);
    return sum / recent.length;
  }
  
  /**
   * Get latest N candles
   */
  getLatest(candles, count = 1) {
    if (!candles || candles.length === 0) return [];
    return candles.slice(-count);
  }
  
  /**
   * Validate candle data
   */
  isValidCandle(candle) {
    return candle &&
           typeof candle.time === 'number' &&
           typeof candle.open === 'number' &&
           typeof candle.high === 'number' &&
           typeof candle.low === 'number' &&
           typeof candle.close === 'number' &&
           typeof candle.volume === 'number' &&
           candle.high >= candle.low &&
           candle.high >= candle.open &&
           candle.high >= candle.close &&
           candle.low <= candle.open &&
           candle.low <= candle.close;
  }
}

export default CandleBuilder;
