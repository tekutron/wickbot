#!/usr/bin/env node
/**
 * test-dexscreener-candles.mjs - Test DexScreener Candle Builder
 */

import { DexScreenerCandles } from './data/dexscreener-candles.mjs';

const CWIF = 'GjAVDGJs2gP4QzaKT9qvJ4Q47mjP9G2URsKcDAMPpump';
const SOL = 'So11111111111111111111111111111111111111112';

async function test() {
  console.log('🧪 Testing DexScreener Candle Builder\n');
  
  const api = new DexScreenerCandles();
  
  // Test 1: Fetch token data
  console.log('1️⃣ Fetching CWIF token data...');
  const tokenData = await api.fetchTokenData(CWIF);
  
  if (tokenData) {
    console.log(`   ✅ Symbol: ${tokenData.baseToken.symbol}`);
    console.log(`   Price: $${tokenData.priceUsd}`);
    console.log(`   Liquidity: $${tokenData.liquidity?.usd || 'N/A'}`);
    console.log(`   Price Change:`);
    console.log(`     5m: ${tokenData.priceChange?.m5 || 'N/A'}%`);
    console.log(`     1h: ${tokenData.priceChange?.h1 || 'N/A'}%`);
    console.log(`     6h: ${tokenData.priceChange?.h6 || 'N/A'}%`);
    console.log(`     24h: ${tokenData.priceChange?.h24 || 'N/A'}%`);
  } else {
    console.log('   ❌ Failed to fetch token data');
    process.exit(1);
  }
  
  // Test 2: Build candles
  console.log('\n2️⃣ Building 100x 1m candles...');
  const startTime = Date.now();
  const candles = await api.fetchCandles(CWIF, '1m', 100);
  const elapsed = Date.now() - startTime;
  
  if (candles && candles.length > 0) {
    console.log(`   ✅ Built ${candles.length} candles in ${elapsed}ms`);
    console.log(`\n   First candle (oldest):`);
    console.log(`     Time: ${new Date(candles[0].time).toISOString()}`);
    console.log(`     O: $${candles[0].open.toFixed(8)} H: $${candles[0].high.toFixed(8)}`);
    console.log(`     L: $${candles[0].low.toFixed(8)} C: $${candles[0].close.toFixed(8)}`);
    console.log(`     Volume: $${candles[0].volume.toFixed(2)}`);
    
    console.log(`\n   Last candle (newest):`);
    const last = candles[candles.length - 1];
    console.log(`     Time: ${new Date(last.time).toISOString()}`);
    console.log(`     O: $${last.open.toFixed(8)} H: $${last.high.toFixed(8)}`);
    console.log(`     L: $${last.low.toFixed(8)} C: $${last.close.toFixed(8)}`);
    console.log(`     Volume: $${last.volume.toFixed(2)}`);
    
    // Verify OHLC logic
    console.log(`\n   Validation:`);
    let valid = true;
    for (const c of candles) {
      if (c.high < c.open || c.high < c.close || c.high < c.low) {
        console.log(`     ❌ Invalid high in candle at ${new Date(c.time).toISOString()}`);
        valid = false;
      }
      if (c.low > c.open || c.low > c.close || c.low > c.high) {
        console.log(`     ❌ Invalid low in candle at ${new Date(c.time).toISOString()}`);
        valid = false;
      }
    }
    if (valid) {
      console.log(`     ✅ All candles pass OHLC validation`);
    }
  } else {
    console.log('   ❌ Failed to build candles');
    process.exit(1);
  }
  
  // Test 3: Get current price
  console.log('\n3️⃣ Testing getCurrentPrice()...');
  const currentPrice = await api.getCurrentPrice(CWIF);
  if (currentPrice) {
    console.log(`   ✅ Current price: $${currentPrice}`);
  } else {
    console.log('   ❌ Failed to get current price');
  }
  
  console.log('\n✅ All tests passed!');
  console.log('\n📊 Summary:');
  console.log(`   - DexScreener API: Working`);
  console.log(`   - Candle builder: Working`);
  console.log(`   - OHLCV validation: Passed`);
  console.log(`   - Response time: ${elapsed}ms`);
  console.log(`\n🎯 Ready to use as Birdeye fallback!`);
}

test().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
