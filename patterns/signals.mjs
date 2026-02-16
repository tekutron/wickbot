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
    const indicatorScore = this.scoreIndicators(indicators);
    
    // Combine scores (70% patterns, 30% indicators)
    const totalScore = (patternScore.score * 0.7) + (indicatorScore.score * 0.3);
    
    // Determine action (buy, sell, hold)
    let action = 'hold';
    let reason = '';
    
    if (patternScore.bullish && indicatorScore.bullish) {
      action = 'buy';
      reason = this.buildReason(patternScore.patterns, indicatorScore.signals);
    } else if (patternScore.bearish && indicatorScore.bearish) {
      action = 'sell';
      reason = this.buildReason(patternScore.patterns, indicatorScore.signals);
    } else if (patternScore.bullish && !indicatorScore.bearish) {
      action = 'buy';
      reason = `Pattern-driven: ${patternScore.patterns.join(', ')}`;
    } else if (patternScore.bearish && !indicatorScore.bullish) {
      action = 'sell';
      reason = `Pattern-driven: ${patternScore.patterns.join(', ')}`;
    } else {
      reason = 'Mixed signals or insufficient strength';
    }
    
    return {
      action: action,
      score: Math.round(totalScore),
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
      score: totalScore,
      bullish: bullishScore > bearishScore,
      bearish: bearishScore > bullishScore,
      patterns: bullishScore > bearishScore ? bullishPatterns : bearishPatterns,
      multiTimeframeBonus: multiTimeframeBonus
    };
  }
  
  /**
   * Score indicators across timeframes
   */
  scoreIndicators(indicators) {
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
