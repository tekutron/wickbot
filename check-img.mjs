import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const mint = 'D1hmg8DP6qP514Lxpy85kMNXKJhg7Cm8KkHM2Q7rpump';

async function check() {
  const accounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  
  let balance = 0;
  for (const account of accounts.value) {
    if (account.account.data.parsed.info.mint === mint) {
      balance = parseFloat(account.account.data.parsed.info.tokenAmount.uiAmount);
      break;
    }
  }
  
  if (balance === 0) {
    console.log('❌ No IMG position');
    return;
  }
  
  const priceResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
  const data = await priceResponse.json();
  const pair = data.pairs[0];
  const currentPrice = parseFloat(pair.priceUsd);
  const entryPrice = 0.00007558; // From entry analysis
  
  const pnl = ((currentPrice - entryPrice) / entryPrice * 100);
  const m5 = parseFloat(pair.priceChange.m5);
  const h1 = parseFloat(pair.priceChange.h1);
  
  console.log(`IMG Position:`);
  console.log(`  Balance: ${balance.toFixed(2)} tokens`);
  console.log(`  Entry: $${entryPrice.toFixed(8)}`);
  console.log(`  Current: $${currentPrice.toFixed(8)}`);
  console.log(`  P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`);
  console.log(`  Momentum: 5m: ${m5 > 0 ? '+' : ''}${m5.toFixed(2)}% | 1h: ${h1 > 0 ? '+' : ''}${h1.toFixed(2)}%\n`);
  
  if (pnl >= 25) {
    console.log('🟢 TAKE PROFIT - SELL NOW');
  } else if (pnl <= -8) {
    console.log('🔴 STOP LOSS - SELL NOW');
  } else if (pnl > 10) {
    console.log('🟢 Strong profit - let it run or take partial');
  } else if (pnl > 0) {
    console.log('🟡 Small profit - monitor');
  } else {
    console.log('🟡 Underwater - hold or cut');
  }
}

check();
