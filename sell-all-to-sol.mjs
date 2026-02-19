#!/usr/bin/env node
/**
 * Sell all tokens back to SOL
 */

import { JupiterSwap } from './executor/jupiter-swap.mjs';
import config from './config.mjs';

const tokens = [
  {
    name: 'WAR',
    mint: '8opvqaWysX1oYbXuTL8PHaoaTiXD69VFYAX4smPebonk',
    amount: 38.85,
    decimals: 6
  },
  {
    name: 'fartbutt',
    mint: '9r1U43rsLHYNng9mZQ7jxLXAzdhXfmecwoQzjXhzpump',
    amount: 41138.35,
    decimals: 6
  }
];

async function main() {
  console.log('🔄 Selling all tokens back to SOL\n');
  
  const jupiter = new JupiterSwap();
  await jupiter.initialize();
  
  let totalSolReceived = 0;
  
  for (const token of tokens) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Selling ${token.amount} ${token.name} → SOL`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      // Calculate raw amount
      const rawAmount = Math.floor(token.amount * Math.pow(10, token.decimals));
      
      console.log(`Token: ${token.name}`);
      console.log(`Mint: ${token.mint}`);
      console.log(`Amount: ${token.amount}`);
      console.log(`Raw amount: ${rawAmount}`);
      console.log(`Decimals: ${token.decimals}\n`);
      
      // Swap token → SOL
      const result = await jupiter.swap(
        token.mint,                      // Input: token
        config.TOKEN_ADDRESS_SOL,        // Output: SOL
        rawAmount,                       // Amount in base units
        token.decimals,                  // Input decimals
        9,                               // SOL decimals
        'SELL'                           // Direction
      );
      
      if (result.success) {
        console.log(`✅ Sold ${token.name} successfully!`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   Received: ${result.amountOut} SOL`);
        console.log(`   Price: $${result.price.toFixed(6)} per token\n`);
        
        totalSolReceived += parseFloat(result.amountOut);
      } else {
        console.log(`❌ Failed to sell ${token.name}`);
        console.log(`   Error: ${result.error}\n`);
      }
      
      // Wait 2 seconds between swaps
      if (tokens.indexOf(token) < tokens.length - 1) {
        console.log('⏳ Waiting 2 seconds before next swap...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Error selling ${token.name}:`, error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Total SOL received: ${totalSolReceived.toFixed(6)} SOL`);
  console.log(`Estimated value: $${(totalSolReceived * 86).toFixed(2)}`);
  console.log('\n✅ All sales complete!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
