#!/usr/bin/env node
/**
 * config.mjs - wickbot Configuration
 */

export const config = {
  // Trading Pair & Capital (OPTIMIZED 2026-02-16)
  // Custom Token Trading (User selected token - 2026-02-20 PM)
  CUSTOM_TOKEN_ADDRESS: 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump',
  CUSTOM_TOKEN_SYMBOL: 'Lobstefeller',  // Will be detected

  PAIR: 'SOL/USDC',
  TOKEN_ADDRESS_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_ADDRESS_USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  STARTING_CAPITAL_SOL: 0.048350,    // Reset 2026-02-21 4:45PM (after testing, -12.5% session before trailing stop)
  
  // Position Sizing & Risk (SCALPING MODE - 2026-02-16 16:15)
  POSITION_SIZE_PCT: 60,        // 25% per trade (conservative risk management)
  MAX_POSITIONS: 1,             // One position at a time (focused trading)
  
  // Circuit Breakers (NEW 2026-02-19 17:11) - Stop the bleeding!
  MAX_SESSION_DRAWDOWN_PCT: 15,       // Stop bot if session loses >15%
  MAX_CONSECUTIVE_LOSSES: 3,          // Stop bot after 3 losses in a row
  MAX_LOSS_PER_TRADE_PCT: 5,          // Emergency exit if loss >5% (safety net)
  COOLDOWN_AFTER_STOP_MIN: 30,        // Wait 30min before allowing restart
  
  // Transaction Settings (2026-02-20 FEE OPTIMIZATION v2)
  PRIORITY_FEE_LAMPORTS: 50000,  // 0.00005 SOL priority fee (50% further reduction - micro-scalp optimization)
  
  // Slippage Protection (2026-02-19 FLAT 5% SLIPPAGE)
  SLIPPAGE_PROFIT_BPS: 500,       // 5% max slippage on profitable exits
  SLIPPAGE_SMALL_LOSS_BPS: 500,   // 5% max slippage on small losses
  SLIPPAGE_BIG_LOSS_BPS: 500,     // 5% max slippage on big losses
  SLIPPAGE_THRESHOLD_PCT: -5,     // Threshold for "big loss" vs "small loss"
  
  // Pre-Flight Price Check (2026-02-19 EXECUTION PROTECTION)
  PRE_FLIGHT_CHECK: true,         // Verify Jupiter quote before executing
  MAX_PRICE_DEVIATION_PCT: 2.0,   // Abort if Jupiter price >2% worse than expected
  RETRY_ON_BAD_PRICE: true,       // Wait and retry if price too bad
  MAX_EXECUTION_RETRIES: 3,       // Max attempts before giving up
  RETRY_DELAY_MS: 2000,           // Wait 2s between retries
  
  // Signal-based exits (DISABLED 2026-02-19 18:35 - premature exits)
  USE_SIGNAL_EXITS: false,      // Disabled - use fixed TP/SL instead
  SIGNAL_EXIT_SCORE: 50,        // Legacy pattern-based exit score
  
  // MICRO-SCALP MODE (2026-02-21 4:45PM) - Trailing stop + wider SL
  QUICK_TP_1: 2.0,              // First profit target (triggers trailing stop)
  QUICK_TP_2: 4.0,              // Second profit target (if no trailing)
  QUICK_SL: 3.0,                // Wider stop loss (was 2%, increased for volatile tokens)
  MAX_HOLD_TIME_SEC: 300,       // 5min max hold (testing sell signals)
  
  // Trailing Stop (NEW - 2026-02-21)
  ENABLE_TRAILING_STOP: true,   // Activate trailing stop to ride trends
  TRAILING_ACTIVATION: 2.0,     // Start trailing at +2% profit
  TRAILING_DISTANCE: 1.0,       // Trail 1% behind peak price
  
  // Safety stops (BACKUP ONLY - extreme caps, not targets)
  SAFETY_TP_PCT: 20,            // Extreme profit cap (safety net, not target)
  SAFETY_SL_PCT: 20,            // Extreme loss cap (safety net, not target)
  MAX_HOLD_TIME_MIN: null,      // Deprecated (using MAX_HOLD_TIME_SEC now)
  
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
  
  // Entry confirmation (2026-02-20 LEADING INDICATORS) - Predict pumps EARLY
  REQUIRE_ENTRY_CONFIRMATION: true,   // Momentum + volume confirmation
  MIN_CANDLE_BODY_POSITIVE: -2.0,     // Reject if recent candle red <-2% (avoid dumps)
  MIN_MOMENTUM_1M: 0.5,               // Require +0.5% 1m momentum (EARLY entry - was 2.0)
  MIN_MOMENTUM_5M: 0.3,               // Require +0.3% 5m momentum (trend starting - was 1.0)
  MIN_VOLUME_RATIO: 1.5,              // Require 1.5x average volume (earlier detection - was 3.0)
  
  // === ENTRY STRATEGY (2026-02-21) ===
  // SIMPLE MODE: Dip-buying with wick detection (GitHub proven)
  STRATEGY_MODE: 'simple',            // Simple dip detection + wicks
  
  // Simple Strategy (Dip + Volume + Wicks)
  DIP_THRESHOLD: -2.5,                // Buy on -2.5% dip
  VOLUME_THRESHOLD: 1.5,              // Require 1.5x volume spike
  CRASH_FILTER: -10.0,                // Reject if >-10% crash
  
  // Wick Detection (wickbot signature feature)
  REQUIRE_BULLISH_WICK: true,         // Require long lower wick (buying pressure)
  MIN_LOWER_WICK_RATIO: 0.3,          // Lower wick ≥30% of total range
  MAX_UPPER_WICK_RATIO: 0.5,          // Upper wick ≤50% of total range
  
  // Momentum Strategy (backup - disabled)
  PUMP_THRESHOLD: 1.5,                // (backup)
  VOLUME_THRESHOLD_MIN: 0.5,          // (backup)
  MAX_PUMP: 15.0,                     // (backup)
  
  // Trend Filter (NEW 2026-02-19 17:11) - Don't fight the trend
  REQUIRE_TREND_FILTER: true,         // Check 15m/30m trend before entry
  MIN_TREND_MOMENTUM_15M: -5,         // Allow entry if 15m momentum > -5% (not in free-fall)
  MIN_TREND_MOMENTUM_30M: -10,        // Allow entry if 30m momentum > -10% (major trend check)
  
  // Dip/Top detection thresholds (AGGRESSIVE - catches moves earlier)
  RSI_DIP_THRESHOLD: 45,        // Higher = catch dips before extreme oversold
  RSI_TOP_THRESHOLD: 55,        // Lower = catch tops before extreme overbought
  BB_TOUCH_TOLERANCE: 0.001,    // 0.1% tolerance for "touching" bands
  
  // Exit strategy
  EXIT_ON_OPPOSITE_SIGNAL: false, // Disabled - use fixed TP/SL (2026-02-19 18:35)
  EXIT_CONFIDENCE_MIN: 50,        // Min confidence for signal-driven exit (not used when disabled)
  
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
