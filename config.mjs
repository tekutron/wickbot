#!/usr/bin/env node
/**
 * config.mjs - wickbot Configuration
 */

export const config = {
  // Trading Pair & Capital (OPTIMIZED 2026-02-16)
  PAIR: 'SOL/USDC',
  TOKEN_ADDRESS_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_ADDRESS_USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  STARTING_CAPITAL_SOL: 0.18,   // 15.31 USDC ≈ 0.18 SOL @ $86/SOL
  
  // Position Sizing & Risk (OPTIMIZED 2026-02-16)
  POSITION_SIZE_PCT: 30,        // 30% per trade (~$4.60, better fee efficiency)
  MAX_POSITIONS: 1,             // One position at a time (focused trading)
  
  // Signal-based exits (PRIMARY - pattern/indicator driven)
  USE_SIGNAL_EXITS: true,       // Exit when opposite signal triggers
  SIGNAL_EXIT_SCORE: 75,        // Min score for exit (matches entry threshold)
  
  // Safety stops (BACKUP - prevent disasters, OPTIMIZED)
  MAX_PROFIT_PCT: 20,           // Auto-exit at +20% (take profit, prevent reversal)
  SAFETY_STOP_LOSS_PCT: 15,     // Hard stop at -15% (tighter risk control)
  
  MAX_DRAWDOWN_PCT: 30,         // Stop trading if capital drops 30%
  
  // Timeframes
  CANDLE_TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h'],
  PRIMARY_TIMEFRAME: '5m',      // Main timeframe for decisions
  
  // Signal Scoring (OPTIMIZED 2026-02-16)
  MIN_SIGNAL_SCORE: 75,         // 0-100 scale (75+ = execute trade, more selective)
  MULTI_TIMEFRAME_BOOST: 25,    // Bonus points for patterns on multiple timeframes (increased)
  INDICATOR_WEIGHT: 0.4,        // 40% weight for indicators, 60% for patterns (trend matters!)
  REQUIRE_TREND_ALIGNMENT: true, // Require MA crossover confirmation
  
  // Data Source (OPTIMIZED 2026-02-16)
  BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '2394a19e6300480289d752fe804ab0c7',
  BIRDEYE_BASE_URL: 'https://public-api.birdeye.so',
  POLL_INTERVAL_MS: 45000,      // Fetch candles every 45s (more responsive, balanced API usage)
  
  // RPC
  RPC_URL: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  
  // Wallets
  WALLET_PATH: './wallets/wickbot_wallet.json', // Original SOL wallet
  USDC_WALLET_PATH: './wallets/wickbot_usdc_wallet.json', // USDC trading wallet
  ACTIVE_WALLET: process.env.ACTIVE_WALLET || 'USDC', // 'SOL' or 'USDC'
  
  // Dashboard
  DASHBOARD_PORT: 3000,
  DASHBOARD_HOST: 'localhost',
  
  // Logging
  LOG_LEVEL: 'info',            // debug, info, warn, error
  LOG_FILE: './logs/wickbot.log',
  
  // Pattern Weights (OPTIMIZED 2026-02-16)
  // 0-100 scale, higher = stronger signal, based on TA reliability
  PATTERN_WEIGHTS: {
    // Bullish patterns (buy signals) - Ranked by reliability
    'three_white_soldiers': 95,    // Strongest multi-candle pattern
    'bullish_engulfing': 90,        // Strong reversal at support
    'morning_star': 88,             // Reliable bottom reversal
    'piercing_pattern': 82,         // Strong bullish reversal
    'hammer': 78,                   // Classic bottom pattern
    'inverted_hammer': 72,          // Moderate bottom signal
    'bullish_harami': 68,           // Weak reversal (needs confirmation)
    'dragonfly_doji': 65,           // Indecision with bullish bias
    
    // Bearish patterns (sell signals) - Ranked by reliability
    'three_black_crows': 95,        // Strongest multi-candle pattern
    'bearish_engulfing': 90,        // Strong reversal at resistance
    'evening_star': 88,             // Reliable top reversal
    'dark_cloud_cover': 82,         // Strong bearish reversal
    'shooting_star': 78,            // Classic top pattern
    'hanging_man': 72,              // Moderate top signal
    'bearish_harami': 68,           // Weak reversal (needs confirmation)
    'gravestone_doji': 65,          // Indecision with bearish bias
    
    // Neutral (confirmation/filter only - reduced weight)
    'doji': 40,                     // Indecision (reduced from 50)
    'spinning_top': 35,             // Weak indecision (reduced from 45)
    'long_legged_doji': 45,         // Strong indecision (reduced from 55)
  },
  
  // Indicator Thresholds (OPTIMIZED 2026-02-16)
  INDICATORS: {
    RSI_PERIOD: 14,
    RSI_OVERSOLD: 30,             // Buy zone (classic TA level, more extreme)
    RSI_OVERBOUGHT: 70,           // Sell zone (classic TA level, more extreme)
    
    MACD_FAST: 12,
    MACD_SLOW: 26,
    MACD_SIGNAL: 9,
    
    MA_SHORT: 20,                 // 20-period MA
    MA_LONG: 50,                  // 50-period MA
    
    VOLUME_SPIKE_THRESHOLD: 1.5,  // 1.5x average volume
    
    BOLLINGER_PERIOD: 20,
    BOLLINGER_STD: 2,
  },
  
  // State Files
  STATE_FILE: './wickbot_state.json',
  TRADES_FILE: './wickbot_trades.json',
  
  // Testing
  DRY_RUN: process.env.DRY_RUN === 'true' || false,
};

export default config;
