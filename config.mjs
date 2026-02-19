#!/usr/bin/env node
/**
 * config.mjs - wickbot Configuration
 */

export const config = {
  // Trading Pair & Capital (OPTIMIZED 2026-02-16)
  // Custom Token Trading (switched back to fartbutt after WAR rug - 2026-02-19)
  CUSTOM_TOKEN_ADDRESS: '67ezHLk8PUkjJCXjmmgPbx85VowA52ghfRXa9A8Tpump',
  CUSTOM_TOKEN_SYMBOL: 'GROKIUS',

  PAIR: 'SOL/USDC',
  TOKEN_ADDRESS_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_ADDRESS_USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  STARTING_CAPITAL_SOL: 0.088465,    // Updated after WAR losses: 0.088465 SOL (2026-02-19 10:49)
  
  // Position Sizing & Risk (SCALPING MODE - 2026-02-16 16:15)
  POSITION_SIZE_PCT: 25,        // 20% per trade (conservative risk management)
  MAX_POSITIONS: 1,             // One position at a time (focused trading)
  
  // Transaction Settings
  PRIORITY_FEE_LAMPORTS: 1000000,  // 0.001 SOL priority fee for faster execution
  
  // Signal-based exits (PRIMARY - signal-driven, not TP/SL)
  USE_SIGNAL_EXITS: true,       // Exit when opposite signal triggers
  SIGNAL_EXIT_SCORE: 50,        // Legacy pattern-based exit score
  
  // Safety stops (BACKUP ONLY - extreme caps, not targets)
  SAFETY_TP_PCT: 20,            // Extreme profit cap (safety net, not target)
  SAFETY_SL_PCT: 20,            // Extreme loss cap (safety net, not target)
  MAX_HOLD_TIME_MIN: null,      // Let signals control timing
  
  MAX_DRAWDOWN_PCT: 30,         // Stop trading if capital drops 30%
  
  // Timeframes
  CANDLE_TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h'],
  PRIMARY_TIMEFRAME: '1m',      // SCALPING MODE: 1m for fast entries (was 5m)
  
  // === FAST SIGNAL MODE (Real-Time Dip/Top Detection) ===
  USE_FAST_SIGNALS: true,       // Use new incremental engine (vs old pattern-based)
  
  // Update frequency
  UPDATE_INTERVAL_MS: 5000,     // Check every 5 seconds (was 20s, 4x faster)
  
  // Signal confidence thresholds (AGGRESSIVE SCALPING MODE - 2026-02-18)
  // Optimized for volatile low-cap tokens (CWIF, etc.)
  MIN_BUY_CONFIDENCE: 50,       // Need 3/6 conditions (50% = 3 out of 6) - catches dips faster
  MIN_SELL_CONFIDENCE: 50,      // Need 3/5 conditions (50% = 3 out of 5) - exits tops faster
  
  // Dip/Top detection thresholds (AGGRESSIVE - catches moves earlier)
  RSI_DIP_THRESHOLD: 45,        // Higher = catch dips before extreme oversold
  RSI_TOP_THRESHOLD: 55,        // Lower = catch tops before extreme overbought
  BB_TOUCH_TOLERANCE: 0.001,    // 0.1% tolerance for "touching" bands
  
  // Exit strategy
  EXIT_ON_OPPOSITE_SIGNAL: true,  // Sell when sell signal triggers (not fixed TP)
  EXIT_CONFIDENCE_MIN: 50,        // Min confidence for signal-driven exit (lowered for aggressive mode)
  
  // Minimum movement filter (TESTING MODE - very sensitive)
  MIN_CANDLE_BODY_PCT: 0.05,    // Skip if candle body < 0.05% (lowered for testing from 0.2%)
  
  // === LEGACY PATTERN MODE (Fallback) ===
  MIN_SIGNAL_SCORE: 65,         // Old pattern-based score threshold
  MULTI_TIMEFRAME_BOOST: 20,
  INDICATOR_WEIGHT: 0.35,
  REQUIRE_TREND_ALIGNMENT: false,
  REQUIRE_PATTERN_DIVERSITY: true,
  PATTERN_DIVERSITY_WINDOW: 5,
  
  // Data Source
  BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '2394a19e6300480289d752fe804ab0c7',
  BIRDEYE_BASE_URL: 'https://public-api.birdeye.so',
  POLL_INTERVAL_MS: 5000,       // FAST MODE: Check every 5s (was 20s, 4x faster)
  
  // RPC
  RPC_URL: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  
  // Wallets
  WALLET_PATH: './wallets/wickbot_wallet.json', // Main wallet (consolidated)
  // USDC_WALLET_PATH: Removed - using single wallet now (2026-02-19)
  ACTIVE_WALLET: 'SOL', // Using main wallet only
  
  // Dashboard
  DASHBOARD_PORT: 3000,
  DASHBOARD_HOST: 'localhost',
  
  // Testing
  
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
    RSI_OVERSOLD: 40,             // SCALPING: Early oversold (catch dips sooner)
    RSI_OVERBOUGHT: 60,           // FIX #1b: Earlier overbought exit (was 65, exit in consolidation)
    
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
  
  // Helper functions
  isCustomTokenMode() {
    return this.CUSTOM_TOKEN_ADDRESS && this.CUSTOM_TOKEN_ADDRESS.length > 0;
  },
  
  getTradingPair() {
    if (this.isCustomTokenMode()) {
      return `${this.CUSTOM_TOKEN_SYMBOL || 'TOKEN'}/SOL`;
    }
    return this.PAIR; // Default: SOL/USDC
  },
  
  getTargetTokenAddress() {
    // Returns the token we want to buy
    if (this.isCustomTokenMode()) {
      return this.CUSTOM_TOKEN_ADDRESS;
    }
    return this.TOKEN_ADDRESS_USDC; // Default: buy USDC with SOL
  },
  
  getBaseTokenAddress() {
    // Returns the token we hold between trades
    if (this.isCustomTokenMode()) {
      return this.TOKEN_ADDRESS_SOL; // Hold SOL for custom tokens
    }
    return this.TOKEN_ADDRESS_USDC; // Hold USDC for SOL/USDC trading
  },
};

export default config;
