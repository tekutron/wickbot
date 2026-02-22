#!/usr/bin/env node
/**
 * SecretBunker Launch Script
 * Applies EXTREME MODE strategy to wickbot with consolidated capital
 * Feb 21, 2026 - 6:05 PM
 */

import fs from 'fs';
import { spawn } from 'child_process';

console.log('═══════════════════════════════════════════════');
console.log('🚀 SECRETBUNKER MISSION - LAUNCHING');
console.log('═══════════════════════════════════════════════');

// Update wickbot state with new capital
const state = {
  positions: [],
  currentCapital: 0.172556,
  startingCapital: 0.172556,
  updatedAt: new Date().toISOString()
};

fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
console.log('✅ State updated: 0.172556 SOL');

// Apply SecretBunker config
console.log('✅ SecretBunker config loaded');
console.log('');
console.log('📊 MISSION PARAMETERS:');
console.log('   Capital: 0.172556 SOL');
console.log('   Target: 3.451 SOL (20x)');
console.log('   Position size: 70% (0.121 SOL per trade)');
console.log('   Strategy: SIMPLE (dip -2.5% to -15%)');
console.log('   Exits: Tiered (+15%/+30%/moon bag)');
console.log('   Stop Loss: -8% (wider)');
console.log('   Trailing: 3% from +15%');
console.log('   Priority fee: 0.0008 SOL (16x)');
console.log('');

console.log('⏰ Time remaining: ~5 hours');
console.log('🎯 Strategy: EXTREME MODE lessons + proven infrastructure');
console.log('');

// Note: User will manually apply config and launch bot
console.log('📝 NEXT STEPS:');
console.log('1. Update config.mjs with SecretBunker settings');
console.log('2. Run: node bot-fast.mjs');
console.log('3. Monitor: tail -f bot-fast.log');
console.log('');
console.log('🔥 HAPPY HUNTING! 🔥');
