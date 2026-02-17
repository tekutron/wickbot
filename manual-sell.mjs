#!/usr/bin/env node
/**
 * Manual sell script - Close open SOL position back to USDC
 */

import { JupiterSwap } from './executor/jupiter-swap.mjs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import config from './config.mjs';

async function manualSell() {
  try {
    console.log('🔧 Manual position close...\n');
    
    // Initialize Jupiter
    const jupiterSwap = new JupiterSwap();
    await jupiterSwap.initialize();
    
    // Get current SOL balance
    const walletPath = config.USDC_WALLET_PATH;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    const connection = new Connection(config.RPC_URL, 'confirmed');
    const solBalance = await connection.getBalance(wallet.publicKey);
    const solAmount = solBalance / 1e9;
    
    console.log(`📊 Current SOL balance: ${solAmount.toFixed(4)} SOL`);
    
    // Reserve 0.01 SOL for fees
    const sellAmount = Math.max(0, solAmount - 0.01);
    
    if (sellAmount < 0.001) {
      console.log('❌ Insufficient SOL to sell (need at least 0.001 after fees)');
      process.exit(1);
    }
    
    console.log(`💱 Selling ${sellAmount.toFixed(4)} SOL → USDC...\n`);
    
    // Execute swap
    const position = {
      amountSol: sellAmount,
      entryPrice: 86.69 // Approximate
    };
    
    const result = await jupiterSwap.swapSolToUsdc(position, sellAmount);
    
    if (result.success) {
      console.log(`\n✅ Swap successful!`);
      console.log(`   Received: ${result.amountOut.toFixed(2)} USDC`);
      console.log(`   Price: $${result.price.toFixed(2)}/SOL`);
      console.log(`   Signature: ${result.signature}\n`);
      
      // Clear position from state
      const state = {
        positions: [],
        currentCapital: 0.179,
        startingCapital: 0.18,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
      console.log('✅ State file updated\n');
      
    } else {
      console.log(`\n❌ Swap failed: ${result.error}\n`);
      process.exit(1);
    }
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

manualSell();
