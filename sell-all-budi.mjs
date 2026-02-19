#!/usr/bin/env node
import { JupiterSwap } from './executor/jupiter-swap.mjs';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function sellAllBudi() {
  console.log('💱 Selling ALL BUDI → SOL...\n');
  
  const jupiterSwap = new JupiterSwap();
  await jupiterSwap.initialize();
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = new PublicKey('82oKLf85huJXdAUrzdQnkns8pJwBxbPQFWKdTEGs45gu');
  
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
    programId: TOKEN_2022_PROGRAM_ID
  });
  
  let budiBalance = 0;
  for (const account of tokenAccounts.value) {
    const data = account.account.data.parsed.info;
    if (data.mint === BUDI_MINT) {
      budiBalance = parseInt(data.tokenAmount.amount);
      console.log(`Found: ${data.tokenAmount.uiAmount} BUDI`);
      break;
    }
  }
  
  if (budiBalance === 0) {
    console.log('No BUDI to sell!');
    return;
  }
  
  const result = await jupiterSwap.swap(
    BUDI_MINT,
    SOL_MINT,
    budiBalance,
    6,
    9,
    'SELL'
  );
  
  if (result.success) {
    console.log(`\n✅ SELL COMPLETE!`);
    console.log(`   Tx: ${result.signature}\n`);
    
    // Get fresh SOL balance
    const solBalance = await connection.getBalance(wallet);
    const newBalance = solBalance / 1e9;
    
    const state = {
      positions: [],
      currentCapital: newBalance,
      startingCapital: 0.207,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
    console.log(`✅ Final balance: ${newBalance.toFixed(6)} SOL`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
}

sellAllBudi();
