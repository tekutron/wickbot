#!/usr/bin/env node
/**
 * ARBITRAGE SCANNER - Find price differences between DEXes
 * Buy on DEX A, sell on DEX B, profit spread
 */

import fetch from 'node-fetch';

const POPULAR_TOKENS = [
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'POPCAT', mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
];

async function scanArbitrage() {
  console.log('🔍 SCANNING FOR ARBITRAGE...\n');
  
  for (const token of POPULAR_TOKENS) {
    try {
      // Get prices from DexScreener (aggregates multiple DEXes)
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`);
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length < 2) continue;
      
      // Find highest and lowest price
      let highest = null;
      let lowest = null;
      
      for (const pair of data.pairs.slice(0, 10)) {
        const price = parseFloat(pair.priceUsd);
        const liq = parseFloat(pair.liquidity.usd);
        
        if (liq < 10000) continue; // Need liquidity
        
        if (!highest || price > highest.price) {
          highest = { price, dex: pair.dexId, liq };
        }
        if (!lowest || price < lowest.price) {
          lowest = { price, dex: pair.dexId, liq };
        }
      }
      
      if (highest && lowest && highest.price !== lowest.price) {
        const spread = ((highest.price - lowest.price) / lowest.price * 100);
        
        if (spread > 0.5) { // 0.5%+ spread
          console.log(`💰 ${token.symbol}:`);
          console.log(`   Buy:  $${lowest.price.toFixed(8)} on ${lowest.dex}`);
          console.log(`   Sell: $${highest.price.toFixed(8)} on ${highest.dex}`);
          console.log(`   Spread: ${spread.toFixed(2)}%`);
          console.log(`   Net after fees: ~${(spread - 0.6).toFixed(2)}%\n`);
        }
      }
      
    } catch (err) {
      // Skip
    }
  }
}

async function run() {
  console.log('⚡ ARBITRAGE SCANNER\n');
  console.log('Looking for price differences between DEXes\n');
  console.log('='.repeat(60) + '\n');
  
  for (let i = 0; i < 10; i++) {
    await scanArbitrage();
    
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log('Arbitrage opportunities are rare in efficient markets.');
  console.log('Would need to execute instantly to capture.\n');
}

run();
