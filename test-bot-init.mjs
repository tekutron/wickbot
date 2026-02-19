#!/usr/bin/env node
/**
 * test-bot-init.mjs - Test bot initialization with BUDI
 */

import config from './config.mjs';
import { BirdeyeAPI } from './data/birdeye-api.mjs';
import { DexScreenerCandles } from './data/dexscreener-candles.mjs';
import { IncrementalEngine } from './data/incremental-indicators.mjs';

async function test() {
  console.log('🧪 Testing bot initialization with BUDI (extreme +249% change)\n');
  
  const targetToken = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
  const birdeyeAPI = new BirdeyeAPI();
  const dexscreenerAPI = new DexScreenerCandles();
  
  const incrementalEngine = new IncrementalEngine({
    rsiPeriod: 14,
    bbPeriod: 20,
    bbStdDev: 2,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9
  });
  
  // Try Birdeye first
  console.log('🔄 Trying Birdeye API...');
  let candles = await birdeyeAPI.fetchCandles(targetToken, '1m', 100);
  
  if (!candles || candles.length === 0) {
    console.log('⚠️  Birdeye failed, trying DexScreener...');
    candles = await dexscreenerAPI.fetchCandles(targetToken, '1m', 100);
    
    if (candles && candles.length > 0) {
      console.log(`✅ DexScreener: ${candles.length} synthetic candles built\n`);
    } else {
      console.log('❌ Both APIs failed');
      process.exit(1);
    }
  } else {
    console.log(`✅ Birdeye: ${candles.length} candles fetched\n`);
  }
  
  // Feed to engine
  console.log('Initializing indicators...');
  for (const candle of candles) {
    incrementalEngine.update(candle);
  }
  
  const ind = incrementalEngine.getIndicators();
  
  console.log('\n📊 Final Indicators:');
  console.log(`   RSI: ${ind.rsi?.toFixed(2) || 'N/A'}`);
  console.log(`   BB: ${ind.bb?.lower.toFixed(8)} - ${ind.bb?.upper.toFixed(8)}`);
  console.log(`   MACD: ${ind.macd?.histogram.toFixed(8) || 'N/A'}`);
  
  // Check for NaN
  if (isNaN(ind.rsi) || isNaN(ind.bb?.lower) || isNaN(ind.macd?.histogram)) {
    console.log('\n❌ FAILED: NaN values detected!');
    process.exit(1);
  }
  
  console.log('\n✅ SUCCESS: All indicators valid!');
  console.log('🎯 Bot ready for testing');
}

test().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
