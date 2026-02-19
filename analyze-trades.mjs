#!/usr/bin/env node
/**
 * Analyze recent trades and compare to actual price action
 */

import fs from 'fs';

const trades = JSON.parse(fs.readFileSync('wickbot_trades.json', 'utf8'));

// Get last 8 trades (after price fix)
const recent = trades.slice(-8);

console.log('\n' + '='.repeat(80));
console.log('TRADE ANALYSIS - Recent Session (After Price Fix)');
console.log('='.repeat(80));

let totalPnL = 0;
let winners = 0;
let losers = 0;
let totalHoldTime = 0;
let quickWins = [];
let quickLosses = [];
let slowLosses = [];

recent.forEach(t => {
  totalPnL += t.pnl;
  totalHoldTime += t.holdTime;
  
  const holdSec = t.holdTime / 1000;
  
  if (t.pnl > 0) {
    winners++;
    if (holdSec < 10) {
      quickWins.push({ id: t.id, pnl: t.pnl, hold: holdSec, entry: t.entryPrice, exit: t.exitPrice });
    }
  } else {
    losers++;
    if (holdSec < 10) {
      quickLosses.push({ id: t.id, pnl: t.pnl, hold: holdSec, entry: t.entryPrice, exit: t.exitPrice });
    } else {
      slowLosses.push({ id: t.id, pnl: t.pnl, hold: holdSec, entry: t.entryPrice, exit: t.exitPrice });
    }
  }
});

console.log('\n📊 OVERALL STATS:');
console.log('─'.repeat(80));
console.log(`Total Trades: ${recent.length}`);
console.log(`Winners: ${winners} (${(winners/recent.length*100).toFixed(1)}%)`);
console.log(`Losers: ${losers} (${(losers/recent.length*100).toFixed(1)}%)`);
console.log(`Total P&L: ${totalPnL.toFixed(2)}%`);
console.log(`Avg P&L per trade: ${(totalPnL/recent.length).toFixed(2)}%`);
console.log(`Avg hold time: ${(totalHoldTime/recent.length/1000).toFixed(0)}s`);

console.log('\n✅ QUICK WINNERS (<10s holds):');
console.log('─'.repeat(80));
if (quickWins.length > 0) {
  quickWins.forEach(w => {
    console.log(`  Trade #${w.id}: +${w.pnl.toFixed(2)}% in ${w.hold.toFixed(0)}s`);
    console.log(`    Entry: $${w.entry.toFixed(6)} → Exit: $${w.exit.toFixed(6)}`);
  });
  const avgQuickWin = quickWins.reduce((sum, w) => sum + w.pnl, 0) / quickWins.length;
  console.log(`  → Avg quick win: +${avgQuickWin.toFixed(2)}%`);
} else {
  console.log('  None');
}

console.log('\n❌ QUICK LOSSES (<10s holds):');
console.log('─'.repeat(80));
if (quickLosses.length > 0) {
  quickLosses.forEach(l => {
    console.log(`  Trade #${l.id}: ${l.pnl.toFixed(2)}% in ${l.hold.toFixed(0)}s`);
    console.log(`    Entry: $${l.entry.toFixed(6)} → Exit: $${l.exit.toFixed(6)}`);
  });
} else {
  console.log('  None');
}

console.log('\n⏱️  SLOW LOSSES (>10s holds):');
console.log('─'.repeat(80));
if (slowLosses.length > 0) {
  slowLosses.forEach(l => {
    console.log(`  Trade #${l.id}: ${l.pnl.toFixed(2)}% in ${l.hold.toFixed(0)}s`);
    console.log(`    Entry: $${l.entry.toFixed(6)} → Exit: $${l.exit.toFixed(6)}`);
  });
  const avgSlowLoss = slowLosses.reduce((sum, l) => sum + l.pnl, 0) / slowLosses.length;
  console.log(`  → Avg slow loss: ${avgSlowLoss.toFixed(2)}%`);
} else {
  console.log('  None');
}

// Price movement analysis
console.log('\n\n📈 PRICE MOVEMENT PATTERNS:');
console.log('─'.repeat(80));

// Calculate price ranges from trades
const prices = recent.flatMap(t => [t.entryPrice, t.exitPrice]);
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);
const priceRange = ((maxPrice - minPrice) / minPrice * 100);

console.log(`Price range during session: $${minPrice.toFixed(6)} - $${maxPrice.toFixed(6)}`);
console.log(`Total range: ${priceRange.toFixed(2)}%`);

// Identify entry timing issues
console.log('\n\n🎯 ENTRY TIMING ANALYSIS:');
console.log('─'.repeat(80));

const entryPrices = recent.map(t => t.entryPrice);
const avgEntry = entryPrices.reduce((a,b) => a+b) / entryPrices.length;

console.log(`Average entry price: $${avgEntry.toFixed(6)}`);
console.log(`Lowest price seen: $${minPrice.toFixed(6)}`);
console.log(`Highest price seen: $${maxPrice.toFixed(6)}`);

// Check if we're buying near tops
const topEntries = recent.filter(t => t.entryPrice > avgEntry * 1.1);
const bottomEntries = recent.filter(t => t.entryPrice < avgEntry * 0.9);

console.log(`\nBought near TOP (>10% above avg): ${topEntries.length} trades`);
console.log(`Bought near BOTTOM (<10% below avg): ${bottomEntries.length} trades`);

if (topEntries.length > 0) {
  console.log('\n⚠️  BUYING TOO HIGH:');
  topEntries.forEach(t => {
    const aboveAvg = ((t.entryPrice - avgEntry) / avgEntry * 100);
    console.log(`  Trade #${t.id}: Entered ${aboveAvg.toFixed(1)}% above avg → P&L: ${t.pnl.toFixed(2)}%`);
  });
}

// Pattern summary
console.log('\n\n💡 KEY INSIGHTS:');
console.log('─'.repeat(80));

if (quickWins.length > 0 && slowLosses.length > 0) {
  console.log('✓ Quick exits (<10s) are profitable');
  console.log('✗ Holding longer (>10s) leads to losses');
  console.log('→ RECOMMENDATION: Tighter profit targets, faster exits');
}

if (topEntries.length > losers * 0.5) {
  console.log('✗ Many entries are near local tops');
  console.log('→ RECOMMENDATION: Wait for deeper dips, stricter entry criteria');
}

const winRate = winners / recent.length;
if (winRate < 0.5) {
  console.log('✗ Win rate below 50%');
  console.log('→ RECOMMENDATION: More selective entries or better exit timing');
}

console.log('\n' + '='.repeat(80));
