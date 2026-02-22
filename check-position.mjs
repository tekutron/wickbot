import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function checkPosition() {
  const mint = '9SKeKXQsPUp9iSUhVbjkfGKGEN7HR26HWjVfbtLUpump';
  
  // Get token accounts
  const accounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  
  let balance = 0;
  for (const account of accounts.value) {
    const mintAddr = account.account.data.parsed.info.mint;
    if (mintAddr === mint) {
      balance = parseFloat(account.account.data.parsed.info.tokenAmount.uiAmount);
      break;
    }
  }
  
  console.log(`XMN Balance: ${balance.toFixed(4)} tokens\n`);
  
  if (balance === 0) {
    console.log('❌ No position found');
    return;
  }
  
  // Get current price
  const priceResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
  const priceData = await priceResponse.json();
  const currentPrice = parseFloat(priceData.pairs[0].priceUsd);
  
  // Calculate value
  const currentValue = balance * currentPrice;
  const entryValue = 0.03; // 0.03 SOL entry
  const entryPrice = 0.00028870; // Entry price from analysis
  
  const pnl = ((currentPrice - entryPrice) / entryPrice * 100);
  
  console.log(`Entry Price: $${entryPrice.toFixed(8)}`);
  console.log(`Current Price: $${currentPrice.toFixed(8)}`);
  console.log(`P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`);
  
  console.log(`Entry Value: ${entryValue} SOL`);
  console.log(`Current Value: ~$${currentValue.toFixed(4)}\n`);
  
  // Decision
  if (pnl <= -8) {
    console.log('🔴 STOP LOSS HIT - SELL NOW');
  } else if (pnl >= 25) {
    console.log('🟢 TAKE PROFIT HIT - SELL NOW');
  } else if (pnl < 0) {
    console.log('🟡 Underwater but holding - monitor closely');
  } else {
    console.log('🟢 Profitable - let it run');
  }
}

checkPosition();
