#!/usr/bin/env node
import { JupiterSwap } from './executor/jupiter-swap.mjs';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function sellBudi() {
  console.log('💱 Selling BUDI (Token-2022) → SOL...\n');
  
  // Initialize Jupiter swap
  const jupiterSwap = new JupiterSwap();
  await jupiterSwap.initialize();
  
  // Get current BUDI balance
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
      console.log(`Raw amount: ${budiBalance}\n`);
      break;
    }
  }
  
  if (budiBalance === 0) {
    console.log('No BUDI tokens to sell!');
    return;
  }
  
  // Sell via Jupiter
  console.log('🔄 Executing swap via Jupiter...\n');
  const result = await jupiterSwap.swap(
    BUDI_MINT,
    SOL_MINT,
    budiBalance,
    6,  // BUDI decimals
    9,  // SOL decimals
    'SELL'
  );
  
  if (result.success) {
    console.log(`\n✅ SELL COMPLETE!`);
    console.log(`   Sold: ${result.amountIn} BUDI`);
    console.log(`   Got: ${result.amountOut} SOL`);
    console.log(`   Tx: ${result.signature}`);
    console.log(`   Solscan: https://solscan.io/tx/${result.signature}\n`);
    
    // Update state
    const newBalance = 0.094733779 + parseFloat(result.amountOut);
    const state = {
      positions: [],
      currentCapital: newBalance,
      startingCapital: 0.207,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
    console.log(`✅ State updated - new balance: ${newBalance.toFixed(6)} SOL`);
    
  } else {
    console.log(`\n❌ Sell failed: ${result.error}`);
  }
}

sellBudi().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
