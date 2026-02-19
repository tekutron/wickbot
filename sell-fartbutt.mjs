#!/usr/bin/env node
import { JupiterSwap } from './executor/jupiter-swap.mjs';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const FARTBUTT_MINT = '9r1U43rsLHYNng9mZQ7jxLXAzdhXfmecwoQzjXhzpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function sellFartbutt() {
  console.log('💱 Selling fartbutt → SOL...\n');
  
  const jupiterSwap = new JupiterSwap();
  await jupiterSwap.initialize();
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = new PublicKey('82oKLf85huJXdAUrzdQnkns8pJwBxbPQFWKdTEGs45gu');
  
  // Check both programs
  const token2022 = await connection.getParsedTokenAccountsByOwner(wallet, {
    programId: TOKEN_2022_PROGRAM_ID
  });
  const standard = await connection.getParsedTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID
  });
  
  let fartbuttBalance = 0;
  let decimals = 6;
  
  for (const account of [...token2022.value, ...standard.value]) {
    const data = account.account.data.parsed.info;
    if (data.mint === FARTBUTT_MINT) {
      fartbuttBalance = parseInt(data.tokenAmount.amount);
      decimals = data.tokenAmount.decimals;
      console.log(`Found: ${data.tokenAmount.uiAmount} fartbutt`);
      break;
    }
  }
  
  if (fartbuttBalance === 0) {
    console.log('No fartbutt to sell!');
    return;
  }
  
  const result = await jupiterSwap.swap(
    FARTBUTT_MINT,
    SOL_MINT,
    fartbuttBalance,
    decimals,
    9,
    'SELL'
  );
  
  if (result.success) {
    console.log(`\\n✅ SELL COMPLETE!`);
    console.log(`   Tx: ${result.signature}\\n`);
    
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

sellFartbutt();
