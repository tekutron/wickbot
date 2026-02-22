import fetch from 'node-fetch';

const positions = [
  { symbol: 'Squish', mint: '4QuiR6Fq7MZkeyoYkCuhpBuGcqV1KYaUwb54FsC3pump', entry: 0.00004222 },
  { symbol: 'JAWZ', mint: 'GJmF68t5HXM1U1j2nE4Trvh7vH5XeXys7MW4UN5Bpump', entry: 0.00013460 }
];

async function check() {
  console.log('📊 Position Status:\n');
  
  for (const pos of positions) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.mint}`);
      const data = await response.json();
      const current = parseFloat(data.pairs[0].priceUsd);
      const pnl = ((current - pos.entry) / pos.entry * 100);
      
      console.log(`${pos.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
      
      if (pnl >= 15) {
        console.log('  🟢 TP HIT - SELL NOW');
      } else if (pnl <= -8) {
        console.log('  🔴 SL HIT - SELL NOW');
      } else if (pnl > 5) {
        console.log('  🟢 Profitable - holding');
      } else if (pnl > 0) {
        console.log('  🟡 Small profit');
      } else if (pnl > -5) {
        console.log('  🟡 Minor loss');
      } else {
        console.log('  🟠 Approaching SL');
      }
    } catch (err) {
      console.log(`${pos.symbol}: Error checking`);
    }
  }
}

check();
