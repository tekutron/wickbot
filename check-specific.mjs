// Check specific tokens user might be seeing
import fetch from 'node-fetch';

const TOKENS = [
  'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump', // Lobstefeller
  'D1hmg8DP6qP514Lxpy85kMNXKJhg7Cm8KkHM2Q7rpump', // IMG
  'GJmF68t5HXM1U1j2nE4Trvh7vH5XeXys7MW4UN5Bpump', // JAWZ
  '4QuiR6Fq7MZkeyoYkCuhpBuGcqV1KYaUwb54FsC3pump', // Squish
];

async function check() {
  console.log('📊 Checking previous tokens:\n');
  
  for (const mint of TOKENS) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) continue;
      
      const pair = data.pairs[0];
      const symbol = pair.baseToken.symbol;
      const m5 = parseFloat(pair.priceChange?.m5 || 0);
      const h1 = parseFloat(pair.priceChange?.h1 || 0);
      const vol = parseFloat(pair.volume?.h1 || 0);
      
      console.log(`${symbol}: 5m: ${m5 > 0 ? '+' : ''}${m5.toFixed(2)}% | 1h: ${h1 > 0 ? '+' : ''}${h1.toFixed(2)}%`);
      console.log(`   Vol: $${vol.toLocaleString()}\n`);
      
    } catch (err) {
      // Skip
    }
  }
}

check();
