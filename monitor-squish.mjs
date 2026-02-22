import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const mint = '4QuiR6Fq7MZkeyoYkCuhpBuGcqV1KYaUwb54FsC3pump';
const entryPrice = 0.00004222; // Approximate from quote

async function monitor() {
  const startTime = Date.now();
  
  while (true) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await response.json();
      const currentPrice = parseFloat(data.pairs[0].priceUsd);
      
      const pnl = ((currentPrice - entryPrice) / entryPrice * 100);
      const holdTime = (Date.now() - startTime) / 1000;
      
      process.stdout.write(`\rSquish: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% (${Math.floor(holdTime)}s) | 5m: ${parseFloat(data.pairs[0].priceChange.m5):+.2f}%  `);
      
      if (pnl >= 15) {
        console.log('\n\n🟢 TP HIT - SELL NOW!\n');
        break;
      } else if (pnl <= -8) {
        console.log('\n\n🔴 SL HIT - SELL NOW!\n');
        break;
      } else if (holdTime > 180) {
        console.log('\n\n⏰ MAX HOLD - SELL NOW!\n');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

monitor();
