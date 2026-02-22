#!/usr/bin/env node
// AGGRESSIVE HUNTER - Find ANY movement and trade it
import fetch from 'node-fetch';

async function hunt() {
  console.log('🎯 AGGRESSIVE HUNT - Finding ANY tradeable setup\n');
  
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  const candidates = [];
  
  for (const pair of data.pairs.slice(0, 100)) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    if (symbol.includes('SOL') || symbol.includes('USDC') || symbol.includes('USDT')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const vol_h1 = parseFloat(pair.volume?.h1 || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    const h1 = parseFloat(pair.priceChange?.h1 || 0);
    
    if (liq < 5000 || vol_h1 < 2000) continue;
    
    const txns = pair.txns?.h1 || {};
    const buys = txns.buys || 0;
    const sells = txns.sells || 0;
    const total = buys + sells;
    
    if (total < 10) continue;
    
    const bp = total > 0 ? (buys / total * 100) : 0;
    
    // ANY positive momentum with activity
    if (Math.abs(m5) > 2 || Math.abs(h1) > 5) {
      const score = Math.abs(m5) * 2 + Math.abs(h1) + (bp - 50) / 5;
      
      candidates.push({
        symbol,
        addr,
        m5,
        h1,
        bp,
        liq,
        vol: vol_h1,
        price: parseFloat(pair.priceUsd),
        score
      });
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  
  console.log(`Found ${candidates.length} opportunities:\n`);
  
  for (let i = 0; i < Math.min(candidates.length, 5); i++) {
    const c = candidates[i];
    console.log(`${i+1}. ${c.symbol} (Score: ${c.score.toFixed(1)})`);
    console.log(`   5m: ${c.m5 > 0 ? '+' : ''}${c.m5.toFixed(2)}% | 1h: ${c.h1 > 0 ? '+' : ''}${c.h1.toFixed(2)}%`);
    console.log(`   BP: ${c.bp.toFixed(1)}% | Vol: $${c.vol.toLocaleString()}`);
    console.log(`   Price: $${c.price.toFixed(8)}`);
    console.log(`   ${c.addr}`);
    
    if (c.m5 > 3 && c.bp > 55) {
      console.log(`   ✅ BUY SIGNAL - Positive momentum + buy pressure`);
    } else if (c.m5 > 0 && c.bp > 50) {
      console.log(`   🟡 MODERATE - Watch for entry`);
    } else if (Math.abs(c.m5) > 5) {
      console.log(`   ⚡ VOLATILE - High risk/reward`);
    }
    console.log();
  }
  
  if (candidates.length === 0) {
    console.log('❌ DEAD MARKET - Will retry in 30s');
  } else {
    console.log(`\n🎯 TOP PICK: ${candidates[0].symbol} at ${candidates[0].addr}`);
  }
}

hunt();
