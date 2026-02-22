// Real-time coin scanner - find tokens with momentum
import fetch from 'node-fetch';

async function scanForMoonCoins() {
  console.log('🌙 SCANNING FOR MOON COINS...\n');
  console.log('Looking for: Strong 5m/1h momentum + Volume + Buy pressure\n');
  console.log('=' .repeat(80));
  
  // Get trending pairs from DexScreener
  const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana');
  const data = await response.json();
  
  const candidates = [];
  
  for (const pair of data.pairs) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    // Skip wrapped SOL and stables
    if (symbol.includes('SOL') || symbol.includes('USDC') || symbol.includes('USDT')) continue;
    
    const price = parseFloat(pair.priceUsd);
    const liquidity = parseFloat(pair.liquidity.usd);
    const volume_1h = parseFloat(pair.volume.h1 || 0);
    const change_5m = parseFloat(pair.priceChange.m5 || 0);
    const change_1h = parseFloat(pair.priceChange.h1 || 0);
    const change_6h = parseFloat(pair.priceChange.h6 || 0);
    
    const buys = pair.txns.h1.buys;
    const sells = pair.txns.h1.sells;
    const total_txns = buys + sells;
    const buy_pressure = total_txns > 0 ? (buys / total_txns * 100) : 0;
    
    // FILTERS for moon potential:
    // 1. Decent liquidity (not a rug)
    // 2. Volume (people are trading)
    // 3. Positive momentum (trending up)
    // 4. Buy pressure (more buys than sells)
    
    if (liquidity < 3000) continue;
    if (volume_1h < 5000) continue;
    if (total_txns < 20) continue;
    
    // Calculate moon score
    let score = 0;
    
    // Momentum scoring
    if (change_5m > 5) score += 30;
    else if (change_5m > 2) score += 20;
    else if (change_5m > 0) score += 10;
    
    if (change_1h > 10) score += 30;
    else if (change_1h > 5) score += 20;
    else if (change_1h > 0) score += 10;
    
    // Buy pressure
    if (buy_pressure > 60) score += 25;
    else if (buy_pressure > 55) score += 15;
    else if (buy_pressure > 50) score += 5;
    
    // Volume
    if (volume_1h > 50000) score += 15;
    else if (volume_1h > 20000) score += 10;
    else if (volume_1h > 10000) score += 5;
    
    // Liquidity
    if (liquidity > 50000) score += 10;
    else if (liquidity > 20000) score += 5;
    
    if (score < 40) continue; // Only keep promising ones
    
    candidates.push({
      symbol,
      name: pair.baseToken.name,
      address: addr,
      price,
      liquidity,
      volume_1h,
      change_5m,
      change_1h,
      change_6h,
      buy_pressure,
      total_txns,
      score,
      dexUrl: pair.url
    });
  }
  
  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  
  console.log(`\nFound ${candidates.length} moon candidates:\n`);
  
  for (let i = 0; i < Math.min(candidates.length, 8); i++) {
    const c = candidates[i];
    console.log(`${i+1}. ${c.symbol} - ${c.name}`);
    console.log(`   🌙 Moon Score: ${c.score}/100`);
    console.log(`   💰 Price: $${c.price.toFixed(8)} | Liq: $${c.liquidity.toLocaleString()}`);
    console.log(`   📈 5m: ${c.change_5m > 0 ? '+' : ''}${c.change_5m.toFixed(2)}% | 1h: ${c.change_1h > 0 ? '+' : ''}${c.change_1h.toFixed(2)}%`);
    console.log(`   🔥 Buy Pressure: ${c.buy_pressure.toFixed(1)}% | Txns: ${c.total_txns}`);
    console.log(`   📍 ${c.address}`);
    console.log(`   🔗 ${c.dexUrl}\n`);
  }
  
  if (candidates.length === 0) {
    console.log('❌ No strong candidates right now');
    console.log('💡 Market is flat - wait for volatility or hunt manually');
  }
}

scanForMoonCoins();
