#!/usr/bin/env node
/**
 * config.mjs - wickbot Configuration
 */

export const config = {
  // Trading Pair & Capital
  PAIR: 'SOL/USDC',
  TOKEN_ADDRESS_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_ADDRESS_USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  STARTING_CAPITAL_SOL: 0.2,
  
  // Position Sizing & Risk
  POSITION_SIZE_PCT: 20,        // 20% of capital per trade (0.2 SOL)
  MAX_POSITIONS: 1,             // One position at a time
  
  // Signal-based exits (PRIMARY - Feb 15 v6)
  USE_SIGNAL_EXITS: true,       // Exit when opposite signal triggers
  SIGNAL_EXIT_SCORE: 70,        // Min score for exit signal (same as entry)
  
  // Safety stops only (BACKUP - prevent disasters)
  MAX_PROFIT_PCT: 25,           // Auto-exit at +25% (prevent greed)
  SAFETY_STOP_LOSS_PCT: 20,     // Hard stop at -20% (catastrophic loss prevention)
  
  MAX_DRAWDOWN_PCT: 30,         // Stop trading if capital drops 30%
  
  // Timeframes
  CANDLE_TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h'],
  PRIMARY_TIMEFRAME: '5m',      // Main timeframe for decisions
  
  // Signal Scoring
  MIN_SIGNAL_SCORE: 70,         // 0-100 scale (70+ = execute trade)
  MULTI_TIMEFRAME_BOOST: 20,    // Bonus points for patterns on multiple timeframes
  INDICATOR_WEIGHT: 0.3,        // 30% weight for indicators, 70% for patterns
  
  // Data Source
  BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '2394a19e6300480289d752fe804ab0c7',
  BIRDEYE_BASE_URL: 'https://public-api.birdeye.so',
  POLL_INTERVAL_MS: 60000,      // Fetch new candles every 60 seconds
  
  // RPC
  RPC_URL: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  
  // Wallet
  WALLET_PATH: './wallets/wickbot_wallet.json',
  
  // Dashboard
  DASHBOARD_PORT: 3000,
  DASHBOARD_HOST: 'localhost',
  
  // Logging
  LOG_LEVEL: 'info',            // debug, info, warn, error
  LOG_FILE: './logs/wickbot.log',
  
  // Pattern Weights (0-100, higher = stronger signal)
  PATTERN_WEIGHTS: {
    // Bullish patterns (buy signals)
    'hammer': 80,
    'inverted_hammer': 75,
    'bullish_engulfing': 90,
    'bullish_harami': 70,
    'morning_star': 85,
    'three_white_soldiers': 95,
    'piercing_pattern': 80,
    'dragonfly_doji': 65,
    
    // Bearish patterns (sell signals)
    'shooting_star': 80,
    'hanging_man': 75,
    'bearish_engulfing': 90,
    'bearish_harami': 70,
    'evening_star': 85,
    'three_black_crows': 95,
    'dark_cloud_cover': 80,
    'gravestone_doji': 65,
    
    // Neutral (confirmation)
    'doji': 50,
    'spinning_top': 45,
    'long_legged_doji': 55,
  },
  
  // Indicator Thresholds
  INDICATORS: {
    RSI_PERIOD: 14,
    RSI_OVERSOLD: 40,             // Buy zone
    RSI_OVERBOUGHT: 60,           // Sell zone
    
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
