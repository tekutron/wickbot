#!/usr/bin/env node
/**
 * detectors.mjs - Candlestick Pattern Detectors
 * Detects 20+ bullish, bearish, and neutral patterns
 */

import config from '../config.mjs';
import { CandleBuilder } from '../data/candle-builder.mjs';

export class PatternDetector {
  constructor() {
    this.candleBuilder = new CandleBuilder();
  }
  
  /**
   * Detect all patterns on a candle array
   * @param {Array} candles - Array of candles (needs at least 3-5 candles)
   * @returns {Array} Array of detected patterns {name, type, strength, index}
   */
  detectAll(candles) {
    if (!candles || candles.length < 3) {
      return [];
    }
    
    const patterns = [];
    
    // We need at least 3 candles for most patterns
    // Scan from index 2 onwards (so we have current + 2 previous)
    for (let i = 2; i < candles.length; i++) {
      const detected = this.detectAtIndex(candles, i);
      if (detected.length > 0) {
        patterns.push(...detected.map(p => ({ ...p, index: i })));
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect patterns at a specific candle index
   */
  detectAtIndex(candles, index) {
    const patterns = [];
    
    const current = candles[index];
    const prev1 = candles[index - 1];
    const prev2 = candles[index - 2];
    
    // Bullish patterns (buy signals)
    if (this.isHammer(current, prev1)) {
      patterns.push({ name: 'hammer', type: 'bullish', strength: config.PATTERN_WEIGHTS.hammer });
    }
    
    if (this.isInvertedHammer(current, prev1)) {
      patterns.push({ name: 'inverted_hammer', type: 'bullish', strength: config.PATTERN_WEIGHTS.inverted_hammer });
    }
    
    if (this.isBullishEngulfing(current, prev1)) {
      patterns.push({ name: 'bullish_engulfing', type: 'bullish', strength: config.PATTERN_WEIGHTS.bullish_engulfing });
    }
    
    if (this.isBullishHarami(current, prev1)) {
      patterns.push({ name: 'bullish_harami', type: 'bullish', strength: config.PATTERN_WEIGHTS.bullish_harami });
    }
    
    if (this.isMorningStar(current, prev1, prev2)) {
      patterns.push({ name: 'morning_star', type: 'bullish', strength: config.PATTERN_WEIGHTS.morning_star });
    }
    
    if (this.isPiercingPattern(current, prev1)) {
      patterns.push({ name: 'piercing_pattern', type: 'bullish', strength: config.PATTERN_WEIGHTS.piercing_pattern });
    }
    
    if (this.isDragonflyDoji(current)) {
      patterns.push({ name: 'dragonfly_doji', type: 'bullish', strength: config.PATTERN_WEIGHTS.dragonfly_doji });
    }
    
    // Bearish patterns (sell signals)
    if (this.isShootingStar(current, prev1)) {
      patterns.push({ name: 'shooting_star', type: 'bearish', strength: config.PATTERN_WEIGHTS.shooting_star });
    }
    
    if (this.isHangingMan(current, prev1)) {
      patterns.push({ name: 'hanging_man', type: 'bearish', strength: config.PATTERN_WEIGHTS.hanging_man });
    }
    
    if (this.isBearishEngulfing(current, prev1)) {
      patterns.push({ name: 'bearish_engulfing', type: 'bearish', strength: config.PATTERN_WEIGHTS.bearish_engulfing });
    }
    
    if (this.isBearishHarami(current, prev1)) {
      patterns.push({ name: 'bearish_harami', type: 'bearish', strength: config.PATTERN_WEIGHTS.bearish_harami });
    }
    
    if (this.isEveningStar(current, prev1, prev2)) {
      patterns.push({ name: 'evening_star', type: 'bearish', strength: config.PATTERN_WEIGHTS.evening_star });
    }
    
    if (this.isDarkCloudCover(current, prev1)) {
      patterns.push({ name: 'dark_cloud_cover', type: 'bearish', strength: config.PATTERN_WEIGHTS.dark_cloud_cover });
    }
    
    if (this.isGravestoneDoji(current)) {
      patterns.push({ name: 'gravestone_doji', type: 'bearish', strength: config.PATTERN_WEIGHTS.gravestone_doji });
    }
    
    // Neutral patterns (confirmation/indecision)
    if (this.isDoji(current)) {
      patterns.push({ name: 'doji', type: 'neutral', strength: config.PATTERN_WEIGHTS.doji });
    }
    
    if (this.isSpinningTop(current)) {
      patterns.push({ name: 'spinning_top', type: 'neutral', strength: config.PATTERN_WEIGHTS.spinning_top });
    }
    
    return patterns;
  }
  
  // ==================== BULLISH PATTERNS ====================
  
  /**
   * Hammer: Small body at top, long lower wick (2x body)
   * Bullish reversal after downtrend
   */
  isHammer(candle, prevCandle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    
    return body / range < 0.3 &&          // Small body
           lowerWick > body * 2 &&        // Long lower wick
           upperWick < body * 0.5 &&      // Small/no upper wick
           this.candleBuilder.isBearish(prevCandle); // After bearish candle
  }
  
  /**
   * Inverted Hammer: Small body at bottom, long upper wick
   */
  isInvertedHammer(candle, prevCandle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    
    return body / range < 0.3 &&
           upperWick > body * 2 &&
           lowerWick < body * 0.5 &&
           this.candleBuilder.isBearish(prevCandle);
  }
  
  /**
   * Bullish Engulfing: Large bullish candle engulfs previous bearish candle
   */
  isBullishEngulfing(candle, prevCandle) {
    return this.candleBuilder.isBullish(candle) &&
           this.candleBuilder.isBearish(prevCandle) &&
           candle.open < prevCandle.close &&
           candle.close > prevCandle.open;
  }
  
  /**
   * Bullish Harami: Small bullish candle within previous large bearish candle
   */
  isBullishHarami(candle, prevCandle) {
    return this.candleBuilder.isBullish(candle) &&
           this.candleBuilder.isBearish(prevCandle) &&
           candle.open > prevCandle.close &&
           candle.close < prevCandle.open;
  }
  
  /**
   * Morning Star: 3-candle pattern - bearish, doji, bullish
   */
  isMorningStar(current, prev1, prev2) {
    const isDoji = this.isDoji(prev1);
    const isSmallBody = this.candleBuilder.getBodyRatio(prev1) < 30;
    
    return this.candleBuilder.isBearish(prev2) &&
           (isDoji || isSmallBody) &&
           this.candleBuilder.isBullish(current) &&
           current.close > (prev2.open + prev2.close) / 2; // Closes above midpoint
  }
  
  /**
   * Piercing Pattern: Bullish candle closes above midpoint of prev bearish candle
   */
  isPiercingPattern(candle, prevCandle) {
    const midpoint = (prevCandle.open + prevCandle.close) / 2;
    
    return this.candleBuilder.isBullish(candle) &&
           this.candleBuilder.isBearish(prevCandle) &&
           candle.open < prevCandle.low &&
           candle.close > midpoint &&
           candle.close < prevCandle.open;
  }
  
  /**
   * Dragonfly Doji: Open/close at high, long lower wick
   */
  isDragonflyDoji(candle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    
    return body / range < 0.1 &&          // Very small body
           lowerWick > range * 0.6 &&     // Long lower wick
           upperWick < range * 0.1;       // No upper wick
  }
  
  // ==================== BEARISH PATTERNS ====================
  
  /**
   * Shooting Star: Small body at bottom, long upper wick
   * Bearish reversal after uptrend
   */
  isShootingStar(candle, prevCandle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    
    return body / range < 0.3 &&
           upperWick > body * 2 &&
           lowerWick < body * 0.5 &&
           this.candleBuilder.isBullish(prevCandle);
  }
  
  /**
   * Hanging Man: Like hammer but appears after uptrend (bearish)
   */
  isHangingMan(candle, prevCandle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    
    return body / range < 0.3 &&
           lowerWick > body * 2 &&
           upperWick < body * 0.5 &&
           this.candleBuilder.isBullish(prevCandle); // After bullish candle
  }
  
  /**
   * Bearish Engulfing: Large bearish candle engulfs previous bullish candle
   */
  isBearishEngulfing(candle, prevCandle) {
    return this.candleBuilder.isBearish(candle) &&
           this.candleBuilder.isBullish(prevCandle) &&
           candle.open > prevCandle.close &&
           candle.close < prevCandle.open;
  }
  
  /**
   * Bearish Harami: Small bearish candle within previous large bullish candle
   */
  isBearishHarami(candle, prevCandle) {
    return this.candleBuilder.isBearish(candle) &&
           this.candleBuilder.isBullish(prevCandle) &&
           candle.open < prevCandle.close &&
           candle.close > prevCandle.open;
  }
  
  /**
   * Evening Star: 3-candle pattern - bullish, doji, bearish
   */
  isEveningStar(current, prev1, prev2) {
    const isDoji = this.isDoji(prev1);
    const isSmallBody = this.candleBuilder.getBodyRatio(prev1) < 30;
    
    return this.candleBuilder.isBullish(prev2) &&
           (isDoji || isSmallBody) &&
           this.candleBuilder.isBearish(current) &&
           current.close < (prev2.open + prev2.close) / 2;
  }
  
  /**
   * Dark Cloud Cover: Bearish candle closes below midpoint of prev bullish candle
   */
  isDarkCloudCover(candle, prevCandle) {
    const midpoint = (prevCandle.open + prevCandle.close) / 2;
    
    return this.candleBuilder.isBearish(candle) &&
           this.candleBuilder.isBullish(prevCandle) &&
           candle.open > prevCandle.high &&
           candle.close < midpoint &&
           candle.close > prevCandle.open;
  }
  
  /**
   * Gravestone Doji: Open/close at low, long upper wick
   */
  isGravestoneDoji(candle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    
    return body / range < 0.1 &&
           upperWick > range * 0.6 &&
           lowerWick < range * 0.1;
  }
  
  // ==================== NEUTRAL PATTERNS ====================
  
  /**
   * Doji: Open ≈ Close (indecision)
   */
  isDoji(candle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    
    return body / range < 0.1; // Body is <10% of range
  }
  
  /**
   * Spinning Top: Small body, long wicks on both sides
   */
  isSpinningTop(candle) {
    const body = this.candleBuilder.getBodySize(candle);
    const range = this.candleBuilder.getRange(candle);
    const upperWick = this.candleBuilder.getUpperWick(candle);
    const lowerWick = this.candleBuilder.getLowerWick(candle);
    
    return body / range < 0.3 &&
           upperWick > body &&
           lowerWick > body;
  }
}

export default PatternDetector;
