#!/usr/bin/env node
/**
 * test-custom-token.mjs - Test custom token configuration
 */

import config from './config.mjs';

console.log('🧪 Testing Custom Token Configuration\n');

console.log('Current Config:');
console.log('  Custom Token Address:', config.CUSTOM_TOKEN_ADDRESS || '(none)');
console.log('  Custom Token Symbol:', config.CUSTOM_TOKEN_SYMBOL || '(none)');
console.log('  Is Custom Mode:', config.isCustomTokenMode());
console.log('  Trading Pair:', config.getTradingPair());
console.log('  Target Token:', config.getTargetTokenAddress());
console.log('  Base Token:', config.getBaseTokenAddress());

console.log('\n✅ Config functions working correctly!');

// Test with a sample token
console.log('\n📝 Example: If you set FARTCOIN...');
console.log('  Address: 9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump');
console.log('  Symbol: FARTCOIN');
console.log('  Trading Pair: FARTCOIN/SOL');
console.log('  Strategy: Hold SOL → Buy FARTCOIN → Sell to SOL');
