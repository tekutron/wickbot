#!/usr/bin/env node
/**
 * test-swap.mjs - Test Jupiter Ultra API with new endpoints
 * Uses the updated JupiterSwap class
 */

import { JupiterSwap } from '../executor/jupiter-swap.mjs';
import config from '../config.mjs';

async function testSwap() {
  console.log('🕯️  Testing Jupiter Ultra API (new endpoints)...\n');
  
  try {
    // Initialize Jupiter swap
    const jupiterSwap = new JupiterSwap();
    await jupiterSwap.initialize();
    
    console.log(`📍 Wallet: ${jupiterSwap.wallet.publicKey.toString()}`);
    
    // Check balance
    const balance = await jupiterSwap.connection.getBalance(jupiterSwap.wallet.publicKey);
    const solAmount = balance / 1e9;
    console.log(`💰 Balance: ${solAmount.toFixed(4)} SOL\n`);
    
    if (solAmount < 0.02) {
      console.log('❌ Insufficient SOL (need at least 0.02)');
      return;
    }
    
    // Test amount: 0.01 SOL
    const testAmount = 0.01;
    
    console.log(`🧪 Test swap: ${testAmount} SOL → USDC\n`);
    
    // Execute swap
    const result = await jupiterSwap.swapSolToUsdc(null, testAmount);
    
    if (result.success) {
      console.log('\n🎉 Test swap successful!');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Price: $${result.price.toFixed(2)}/SOL`);
      console.log(`   Received: ${result.amountOut.toFixed(2)} USDC\n`);
      console.log('✅ Jupiter Ultra API is working!');
      console.log('🚀 Ready to start trading!\n');
    } else {
      throw new Error(result.error);
    }
    
  } catch (err) {
    console.error(`\n❌ Test failed: ${err.message}`);
    
    if (err.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  Jupiter API is still down (DNS failure)');
      console.log('   Wait for Jupiter to come back online');
    }
    
    process.exit(1);
  }
}

testSwap();
