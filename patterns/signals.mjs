#!/usr/bin/env node
/**
 * signals.mjs - Signal Generator
 * Combines pattern detection + indicators to generate BUY/SELL signals
 */

import config from '../config.mjs';

export class SignalGenerator {
  /**
   * Generate trading signal from patterns and indicators
   * @param {Object} patterns - Map of timeframe → detected patterns
   * @param {Object} indicators - Map of timeframe → calculated indicators
   * @param {Object} candles - Map of timeframe → candle arrays
   * @returns {Object} Signal {action, score, reason, patterns, indicators}
   */
  generate(patterns, indicators, candles) {
    const primaryTF = config.PRIMARY_TIMEFRAME;
    
    // Get primary timeframe data
    const primaryPatterns = patterns[primaryTF] || [];
    const primaryIndicators = indicators[primaryTF] || {};
    const primaryCandles = candles[primaryTF] || [];
    
    if (primaryCandles.length === 0) {
      return this.noSignal('No candle data');
    }
    
    // Score patterns
    const patternScore = this.scorePatterns(patterns);
    
    // Score indicators
    const indicatorScore = this.scoreIndicators(indicators, candles);
    
    // Check trend alignment (MA crossover)
    const trendCheck = this.checkTrend(indicators[primaryTF], candles[primaryTF]);
    
    // Combine scores (60% patterns, 40% indicators - OPTIMIZED)
    const patternWeight = 1 - config.INDICATOR_WEIGHT;
    const totalScore = (patternScore.score * patternWeight) + (indicatorScore.score * config.INDICATOR_WEIGHT);
    
    // Determine action (buy, sell, hold) - MORE SELECTIVE
    let action = 'hold';
    let reason = '';
    
    // BUY: Bullish patterns + bullish indicators + uptrend (if required)
    if (patternScore.bullish && indicatorScore.bullish) {
      if (!config.REQUIRE_TREND_ALIGNMENT || trendCheck.uptrend) {
        action = 'buy';
        reason = this.buildReason(patternScore.patterns, indicatorScore.signals);
        if (trendCheck.uptrend) reason += ' | Confirmed uptrend ✅';
      } else {
        reason = 'Bullish signals rejected: downtrend (MA filter)';
      }
    }
    // SELL: Bearish patterns + bearish indicators + downtrend (if required)
    else if (patternScore.bearish && indicatorScore.bearish) {
      if (!config.REQUIRE_TREND_ALIGNMENT || trendCheck.downtrend) {
        action = 'sell';
        reason = this.buildReason(patternScore.patterns, indicatorScore.signals);
        if (trendCheck.downtrend) reason += ' | Confirmed downtrend ✅';
      } else {
        reason = 'Bearish signals rejected: uptrend (MA filter)';
      }
    }
    // Pattern-driven (only if trend allows)
    else if (patternScore.bullish && !indicatorScore.bearish) {
      if (!config.REQUIRE_TREND_ALIGNMENT || trendCheck.uptrend) {
        action = 'buy';
        reason = `Strong patterns: ${patternScore.patterns.join(', ')}`;
      }
    } else if (patternScore.bearish && !indicatorScore.bullish) {
      if (!config.REQUIRE_TREND_ALIGNMENT || trendCheck.downtrend) {
        action = 'sell';
        reason = `Strong patterns: ${patternScore.patterns.join(', ')}`;
      }
    } else {
      reason = 'Mixed signals or insufficient strength';
    }
    
    return {
      action: action,
      score: Math.min(100, Math.round(totalScore)), // Clamp to 100 max
      reason: reason,
      patterns: patternScore.patterns,
      indicators: indicatorScore.signals,
      breakdown: {
        patternScore: Math.round(patternScore.score),
        indicatorScore: Math.round(indicatorScore.score),
        multiTimeframeBonus: patternScore.multiTimeframeBonus
      }
    };
  }
  
  /**
   * Score all detected patterns across timeframes
   */
  scorePatterns(patterns) {
    let bullishScore = 0;
    let bearishScore = 0;
    let bullishPatterns = [];
    let bearishPatterns = [];
    
    const timeframeCount = {};
    
    // Collect all patterns
    for (const [timeframe, tfPatterns] of Object.entries(patterns)) {
      for (const pattern of tfPatterns) {
        const patternName = pattern.name;
        
        // Track timeframes where this pattern appears
        if (!timeframeCount[patternName]) {
          timeframeCount[patternName] = 0;
        }
        timeframeCount[patternName]++;
        
        if (pattern.type === 'bullish') {
          bullishScore += pattern.strength;
          if (!bullishPatterns.includes(patternName)) {
            bullishPatterns.push(patternName);
          }
        } else if (pattern.type === 'bearish') {
          bearishScore += pattern.strength;
          if (!bearishPatterns.includes(patternName)) {
            bearishPatterns.push(patternName);
          }
        }
      }
    }
    
    // Multi-timeframe bonus: add extra points if pattern appears on multiple timeframes
    let multiTimeframeBonus = 0;
    for (const count of Object.values(timeframeCount)) {
      if (count >= 2) {
        multiTimeframeBonus += config.MULTI_TIMEFRAME_BOOST;
      }
    }
    
    const totalScore = Math.max(bullishScore, bearishScore) + multiTimeframeBonus;
    
    return {
      score: Math.min(100, totalScore), // Clamp to 100 max
      bullish: bullishScore > bearishScore,
      bearish: bearishScore > bullishScore,
      patterns: bullishScore > bearishScore ? bullishPatterns : bearishPatterns,
      multiTimeframeBonus: multiTimeframeBonus
    };
  }
  
  /**
   * Score indicators across timeframes
   */
  scoreIndicators(indicators, candles = null) {
    const primaryTF = config.PRIMARY_TIMEFRAME;
    const primary = indicators[primaryTF];
    
    if (!primary) {
      return { score: 0, bullish: false, bearish: false, signals: [] };
    }
    
    let score = 50; // Neutral baseline
    const signals = [];
    
    // RSI scoring
    if (primary.rsi !== null) {
      if (primary.rsi < config.INDICATORS.RSI_OVERSOLD) {
        score += 20;
        signals.push(`RSI oversold (${primary.rsi.toFixed(1)})`);
      } else if (primary.rsi > config.INDICATORS.RSI_OVERBOUGHT) {
        score -= 20;
        signals.push(`RSI overbought (${primary.rsi.toFixed(1)})`);
      }
    }
    
    // Volume scoring
    if (primary.volume && primary.volume.isSpike) {
      score += 15;
      signals.push(`Volume spike (${primary.volume.ratio.toFixed(1)}x)`);
    }
    
    // MACD scoring
    if (primary.macd) {
      if (primary.macd.histogram > 0) {
        score += 10;
        signals.push('MACD bullish');
      } else if (primary.macd.histogram < 0) {
        score -= 10;
        signals.push('MACD bearish');
      }
    }
    
    // Moving Average crossover
    if (primary.ma && primary.ma.crossover !== undefined) {
      if (primary.ma.crossover) {
        score += 10;
        signals.push('MA golden cross');
      } else {
        score -= 10;
        signals.push('MA death cross');
      }
    }
    
    // Bollinger Band position
    if (primary.bollinger) {
      if (primary.bollinger.position < 0.2) {
        score += 10;
        signals.push('Price at lower BB');
      } else if (primary.bollinger.position > 0.8) {
        score -= 10;
        signals.push('Price at upper BB');
      }
    }
    
    return {
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      bullish: score > 50,
      bearish: score < 50,
      signals: signals
    };
  }
  
  /**
   * Check trend direction using Moving Average crossover
   * @param {Object} indicators - Primary timeframe indicators
   * @param {Array} candles - Primary timeframe candles
   * @returns {Object} {uptrend, downtrend, neutral, reason}
   */
  checkTrend(indicators, candles) {
    if (!indicators || !indicators.ma || !candles || candles.length === 0) {
      return { uptrend: false, downtrend: false, neutral: true, reason: 'No MA data' };
    }
    
    const currentPrice = candles[candles.length - 1].close;
    const ma20 = indicators.ma.sma20;
    const ma50 = indicators.ma.sma50;
    
    // Strong uptrend: Price > MA20 > MA50
    if (currentPrice > ma20 && ma20 > ma50) {
      return { 
        uptrend: true, 
        downtrend: false, 
        neutral: false, 
        reason: `Uptrend (Price: ${currentPrice.toFixed(2)} > MA20: ${ma20.toFixed(2)} > MA50: ${ma50.toFixed(2)})` 
      };
    }
    
    // Strong downtrend: Price < MA20 < MA50
    if (currentPrice < ma20 && ma20 < ma50) {
      return { 
        uptrend: false, 
        downtrend: true, 
        neutral: false, 
        reason: `Downtrend (Price: ${currentPrice.toFixed(2)} < MA20: ${ma20.toFixed(2)} < MA50: ${ma50.toFixed(2)})` 
      };
    }
    
    // Golden cross: MA20 just crossed above MA50 (bullish)
    if (ma20 > ma50 && indicators.ma.crossover) {
      return { 
        uptrend: true, 
        downtrend: false, 
        neutral: false, 
        reason: 'Golden cross (MA20 > MA50)' 
      };
    }
    
    // Death cross: MA20 just crossed below MA50 (bearish)
    if (ma20 < ma50 && !indicators.ma.crossover) {
      return { 
        uptrend: false, 
        downtrend: true, 
        neutral: false, 
        reason: 'Death cross (MA20 < MA50)' 
      };
    }
    
    // Weak uptrend: Price > MA20 but MA20 < MA50
    if (currentPrice > ma20 && ma20 < ma50) {
      return { 
        uptrend: true, 
        downtrend: false, 
        neutral: false, 
        reason: 'Weak uptrend (counter-trend bounce)' 
      };
    }
    
    // Weak downtrend: Price < MA20 but MA20 > MA50
    if (currentPrice < ma20 && ma20 > ma50) {
      return { 
        uptrend: false, 
        downtrend: true, 
        neutral: false, 
        reason: 'Weak downtrend (pullback in uptrend)' 
      };
    }
    
    // Neutral/consolidation
    return { 
      uptrend: false, 
      downtrend: false, 
      neutral: true, 
      reason: 'Neutral (consolidation)' 
    };
  }
  
  /**
   * Build human-readable reason for signal
   */
  buildReason(patterns, indicators) {
    const parts = [];
    
    if (patterns.length > 0) {
      parts.push(`Patterns: ${patterns.join(', ')}`);
    }
    
    if (indicators.length > 0) {
      parts.push(`Indicators: ${indicators.join(', ')}`);
    }
    
    return parts.join(' | ');
  }
  
  /**
   * No signal helper
   */
  noSignal(reason) {
    return {
      action: 'hold',
      score: 0,
      reason: reason,
      patterns: [],
      indicators: [],
      breakdown: {
        patternScore: 0,
        indicatorScore: 0,
        multiTimeframeBonus: 0
      }
    };
  }
}

export default SignalGenerator;
