#!/usr/bin/env node
/**
 * Manually close BUDI position and sell back to SOL
 */

import { JupiterSwap } from './executor/jupiter-swap.mjs';
import fs from 'fs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';

async function closeBudiPosition() {
  console.log('🔍 Checking BUDI position...\n');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_usdc_wallet.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Check BUDI balance
  try {
    const budiMint = new PublicKey(BUDI_MINT);
    const ata = await getAssociatedTokenAddress(budiMint, wallet.publicKey);
    const account = await getAccount(connection, ata);
    const budiBalance = Number(account.amount) / 1e9;
    
    console.log(`✅ BUDI balance: ${budiBalance.toFixed(4)} tokens\n`);
    
    if (budiBalance === 0) {
      console.log('No BUDI to sell!');
      process.exit(0);
    }
    
    // Sell BUDI → SOL
    console.log(`💱 Selling ${budiBalance.toFixed(4)} BUDI → SOL...\n`);
    
    const jupiterSwap = new JupiterSwap();
    await jupiterSwap.initialize();
    
    const budiLamports = Math.floor(budiBalance * 1e9);
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    const result = await jupiterSwap.swap(
      BUDI_MINT,
      SOL_MINT,
      budiLamports,
      9,  // BUDI decimals
      9,  // SOL decimals
      'SELL'
    );
    
    if (result.success) {
      console.log(`\n✅ Position closed!`);
      console.log(`   Sold: ${budiBalance.toFixed(4)} BUDI`);
      console.log(`   Got: ${result.amountOut} SOL`);
      console.log(`   Tx: ${result.signature}`);
      
      // Clear state file
      const state = {
        positions: [],
        currentCapital: 0.197350385,
        startingCapital: 0.207,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
      console.log(`\n✅ State file cleared`);
    } else {
      console.log(`\n❌ Sell failed: ${result.error}`);
      process.exit(1);
    }
    
  } catch (err) {
    if (err.message.includes('could not find account')) {
      console.log('✅ No BUDI tokens in wallet (position already closed)');
      
      // Still clear state
      const state = {
        positions: [],
        currentCapital: 0.197350385,
        startingCapital: 0.207,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
      console.log('✅ State file cleared');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
}

closeBudiPosition();
