#!/usr/bin/env node
/**
 * swap-all-sol-to-usdc.mjs - Swap remaining SOL to USDC
 * Keeps 0.01 SOL for transaction fees
 */

import { JupiterSwap } from '../executor/jupiter-swap.mjs';

async function swapAllSolToUsdc() {
  console.log('🕯️  Swapping remaining SOL → USDC...\n');
  
  try {
    // Initialize Jupiter swap
    const jupiterSwap = new JupiterSwap();
    await jupiterSwap.initialize();
    
    console.log(`📍 Wallet: ${jupiterSwap.wallet.publicKey.toString()}`);
    
    // Check balance
    const balance = await jupiterSwap.connection.getBalance(jupiterSwap.wallet.publicKey);
    const solAmount = balance / 1e9;
    console.log(`💰 Current balance: ${solAmount.toFixed(4)} SOL\n`);
    
    if (solAmount < 0.02) {
      console.log('❌ Insufficient SOL (need at least 0.02 for swap + fees)');
      return;
    }
    
    // Keep 0.01 SOL for fees, swap the rest
    const swapAmount = solAmount - 0.01;
    
    console.log(`💱 Swapping ${swapAmount.toFixed(4)} SOL → USDC`);
    console.log(`   Keeping 0.01 SOL for transaction fees\n`);
    
    // Execute swap
    const result = await jupiterSwap.swapSolToUsdc(null, swapAmount);
    
    if (result.success) {
      console.log('\n🎉 Swap complete!');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Price: $${result.price.toFixed(2)}/SOL`);
      console.log(`   Received: ~${result.amountOut.toFixed(2)} USDC\n`);
      
      // Check new balance
      const newBalance = await jupiterSwap.connection.getBalance(jupiterSwap.wallet.publicKey);
      const newSol = newBalance / 1e9;
      
      console.log('📊 New balance:');
      console.log(`   SOL: ${newSol.toFixed(4)} SOL (kept for fees)`);
      console.log(`   USDC: ~${(0.86 + result.amountOut).toFixed(2)} USDC (estimated total)\n`);
      console.log('✅ Ready to trade with USDC-first strategy!');
      console.log('🕯️  Check dashboard to see updated balances\n');
    } else {
      throw new Error(result.error);
    }
    
  } catch (err) {
    console.error(`\n❌ Swap failed: ${err.message}`);
    process.exit(1);
  }
}

swapAllSolToUsdc();
