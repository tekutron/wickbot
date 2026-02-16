#!/usr/bin/env node
/**
 * test-bot.mjs - Test bot in dry-run mode
 * Verifies signal generation without executing trades
 */

import config from '../config.mjs';

// Force dry-run mode
process.env.DRY_RUN = 'true';

console.log('🧪 Testing wickbot in DRY-RUN mode\n');
console.log('This will:');
console.log('  ✅ Fetch real candle data from Birdeye');
console.log('  ✅ Build multi-timeframe candles');
console.log('  ✅ Detect patterns');
console.log('  ✅ Calculate indicators');
console.log('  ✅ Generate signals');
console.log('  ❌ NOT execute actual trades\n');

// Check if Birdeye API key is set
if (!config.BIRDEYE_API_KEY || config.BIRDEYE_API_KEY === '') {
  console.error('❌ BIRDEYE_API_KEY not set!');
  console.error('   Add it to config.mjs or set environment variable:');
  console.error('   export BIRDEYE_API_KEY="your-key-here"');
  process.exit(1);
}

// Check if wallet exists (even for dry-run, we need it for position manager)
const fs = await import('fs');
if (!fs.existsSync(config.WALLET_PATH)) {
  console.error(`❌ Wallet not found: ${config.WALLET_PATH}`);
  console.error('   Create one with:');
  console.error('   solana-keygen new --outfile wallets/wickbot_wallet.json');
  console.error('\n   (Wallet is needed for position tracking, but no trades will execute)');
  process.exit(1);
}

console.log('✅ Configuration validated');
console.log(`   Birdeye API key: ${config.BIRDEYE_API_KEY.slice(0, 10)}...`);
console.log(`   Wallet: ${config.WALLET_PATH}`);
console.log(`   RPC: ${config.RPC_URL.slice(0, 50)}...`);
console.log(`   Timeframes: ${config.CANDLE_TIMEFRAMES.join(', ')}`);
console.log(`   Min signal score: ${config.MIN_SIGNAL_SCORE}\n`);

console.log('🚀 Starting bot (press Ctrl+C to stop)...\n');

// Import and run bot
const { default: bot } = await import('../bot.mjs');
