#!/usr/bin/env node
/**
 * Volume Spike Scanner - Real-time momentum detector
 * Catches tokens when volume suddenly spikes (early pump detection)
 */

import fetch from 'node-fetch';

const CONFIG = {
  scanInterval: 10000, // Scan every 10s
  minLiquidity: 5000,
  minVolumeSpike: 5, // 5x increase = spike
  topN: 50 // Scan top 50 pairs
};

class VolumeScanner {
  constructor() {
    this.baseline = new Map(); // Store previous volume for comparison
  }
  
  async scan() {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
      const data = await response.json();
      
      const pairs = data.pairs.slice(0, CONFIG.topN);
      const spikes = [];
      
      for (const pair of pairs) {
        const addr = pair.baseToken.address;
        const symbol = pair.baseToken.symbol;
        
        // Skip SOL pairs
        if (symbol.includes('SOL') || symbol.includes('WSOL')) continue;
        
        const liquidity = parseFloat(pair.liquidity.usd);
        const vol_5m = parseFloat(pair.txns.m5?.buys || 0) + parseFloat(pair.txns.m5?.sells || 0);
        const vol_1h = parseFloat(pair.txns.h1?.buys || 0) + parseFloat(pair.txns.h1?.sells || 0);
        const volume_usd = parseFloat(pair.volume.h1 || 0);
        
        // Must meet minimum criteria
        if (liquidity < CONFIG.minLiquidity) continue;
        if (vol_5m < 5) continue; // Need recent activity
        
        // Check if we have baseline data
        if (this.baseline.has(addr)) {
          const prevVol = this.baseline.get(addr);
          
          // Calculate spike ratio
          if (prevVol > 0 && vol_5m > prevVol * CONFIG.minVolumeSpike) {
            const spikeRatio = vol_5m / prevVol;
            
            const m5 = parseFloat(pair.priceChange.m5 || 0);
            const h1 = parseFloat(pair.priceChange.h1 || 0);
            const buys = pair.txns.h1.buys;
            const sells = pair.txns.h1.sells;
            const buyPressure = (buys / (buys + sells) * 100);
            
            spikes.push({
              symbol,
              addr,
              spikeRatio: spikeRatio.toFixed(1),
              vol_5m,
              prevVol,
              m5,
              h1,
              volume_usd,
              liquidity,
              buyPressure: buyPressure.toFixed(1),
              price: parseFloat(pair.priceUsd)
            });
          }
        }
        
        // Update baseline
        this.baseline.set(addr, vol_5m);
      }
      
      // Display spikes
      if (spikes.length > 0) {
        console.log('\n🚨 VOLUME SPIKES DETECTED:\n');
        console.log('='.repeat(80));
        
        spikes.sort((a, b) => parseFloat(b.spikeRatio) - parseFloat(a.spikeRatio));
        
        for (const spike of spikes.slice(0, 5)) {
          console.log(`\n🔥 ${spike.symbol}`);
          console.log(`   Spike: ${spike.spikeRatio}x (${spike.prevVol} → ${spike.vol_5m} txns/5m)`);
          console.log(`   Price: $${spike.price.toFixed(8)}`);
          console.log(`   Momentum: 5m: ${spike.m5 > 0 ? '+' : ''}${spike.m5.toFixed(2)}% | 1h: ${spike.h1 > 0 ? '+' : ''}${spike.h1.toFixed(2)}%`);
          console.log(`   Volume: $${spike.volume_usd.toLocaleString()} | Liq: $${spike.liquidity.toLocaleString()}`);
          console.log(`   Buy Pressure: ${spike.buyPressure}%`);
          console.log(`   ${spike.addr}`);
          
          // Trade recommendation
          if (spike.m5 > 5 && spike.buyPressure > 55) {
            console.log(`   ✅ STRONG BUY SIGNAL - Volume spike + momentum + buy pressure`);
          } else if (spike.m5 > 2) {
            console.log(`   🟡 MODERATE - Volume spike but check momentum`);
          } else {
            console.log(`   ⚠️ CAUTION - Volume spike but price not moving yet`);
          }
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
      }
      
    } catch (err) {
      console.log(`❌ Scan error: ${err.message}`);
    }
  }
  
  async run() {
    console.log('📊 VOLUME SPIKE SCANNER STARTING\n');
    console.log(`Scan interval: ${CONFIG.scanInterval / 1000}s`);
    console.log(`Min spike ratio: ${CONFIG.minVolumeSpike}x`);
    console.log(`Top pairs monitored: ${CONFIG.topN}\n`);
    console.log('Building baseline (first scan won\'t detect spikes)...\n');
    
    // Initial scan to build baseline
    await this.scan();
    console.log('✅ Baseline established. Monitoring for spikes...\n');
    
    // Continuous monitoring
    while (true) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.scanInterval));
      await this.scan();
    }
  }
}

const scanner = new VolumeScanner();
scanner.run();
