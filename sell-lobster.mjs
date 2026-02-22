import JupiterSwap from './executor/jupiter-swap.mjs';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

(async () => {
  console.log('💰 Selling Lobstefeller via Jupiter...\n');
  
  const jupiter = new JupiterSwap();
  await jupiter.initialize('./wallets/wickbot_wallet.json', 'https://api.mainnet-beta.solana.com');
  
  const result = await jupiter.swap(
    'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump', // Lobstefeller
    'So11111111111111111111111111111111111111112', // SOL
    '2104296309106', // Raw amount
    9,
    9,
    'SWAP',
    1000 // 10% slippage
  );
  
  if (result.success) {
    console.log(`✅ SOLD! Signature: ${result.signature}`);
    console.log(`   SOL received: ${result.amountOut}`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
})();
