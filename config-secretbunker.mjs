/**
 * SecretBunker Config - EXTREME MODE Strategy Applied to Tradeable Tokens
 * Feb 21, 2026 - 5:53 PM
 * 
 * Lessons from EXTREME MODE research + wickbot infrastructure
 */

export default {
  // EXTREME MODE Lessons Applied
  STRATEGY: 'SIMPLE', // Proven dip-buying
  
  // Entry - AGGRESSIVE  
  STARTING_CAPITAL_SOL: 0.172556, // Consolidated from all wallets
  POSITION_SIZE_PCT: 70, // 70% of capital per trade
  QUICK_DIP_MIN: -2.5,
  QUICK_DIP_MAX: -15, // Wider range for volatile tokens
  VOLUME_SPIKE_MIN: 1.5,
  MIN_WICK_LOWER: 25, // Reduced threshold for more entries
  
  // Exit - TIERED (TreeCityWes strategy)
  ENABLE_TIERED_EXITS: true,
  QUICK_TP1: 15, // +15% = sell 40%
  QUICK_TP1_SELL_PCT: 40,
  QUICK_TP2: 30, // +30% = sell 50% of remaining
  QUICK_TP2_SELL_PCT: 50,
  MOON_BAG_PCT: 30, // Keep 30% if it moons
  QUICK_SL: -8, // -8% SL (wider, less false stops)
  
  // Trailing Stop - AGGRESSIVE
  ENABLE_TRAILING_STOP: true,
  TRAILING_ACTIVATION: 15.0, // Start at +15%
  TRAILING_DISTANCE: 3.0, // Trail 3% behind (wider for volatility)
  
  // Speed - EXTREME
  PRIORITY_FEE_LAMPORTS: 800000, // 0.0008 SOL (16x normal, conserve vs 0.001)
  POLL_INTERVAL_MS: 3000, // 3s (faster reaction)
  
  // Risk - YOLO MODE
  MAX_HOLD_TIME_SEC: 600, // 10 min max (not infinite)
  CIRCUIT_BREAKER_LOSS_PCT: 40, // Stop at -40% total (wider tolerance)
  
  // Token Selection - AGGRESSIVE
  MIN_LIQUIDITY: 5000, // Lower threshold = more opportunities
  MIN_VOLUME_1H: 5000, // Lower = catch early movers
  MAX_TOKEN_AGE_HOURS: 24, // Up to 24h old (vs 12h)
  
  // Wallet
  WALLET_PATH: '/home/j/.openclaw/wickbot/wallets/wickbot_wallet.json',
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Token (can override via dashboard)
  TOKEN_ADDRESS: 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump', // Lobstefeller
  
  // Misc
  DRY_RUN: false,
  LOG_LEVEL: 'info',
};
