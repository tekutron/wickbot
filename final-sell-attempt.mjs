import JupiterSwap from './executor/jupiter-swap.mjs';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

(async () => {
  console.log('🎯 FINAL SELL ATTEMPT - Using wickbot Jupiter code\n');
  
  const jupiter = new JupiterSwap();
  await jupiter.initialize('./wallets/wickbot_wallet.json', 'https://api.mainnet-beta.solana.com');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const walletPubkey = new PublicKey('DqfDgvcGMhHczhAeQp6nUNFGNkhQSbGPGjKLEn4QGihf');
  
  const balanceBefore = await connection.getBalance(walletPubkey);
  console.log(`SOL before: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(6)}\n`);
  
  // Try with correct decimals and lower slippage
  const result = await jupiter.swap(
    'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump', // Lobstefeller
    'So11111111111111111111111111111111111111112', // SOL
    2104296309106, // Raw amount
    9, // Token decimals
    9, // SOL decimals
    'SWAP',
    500 // 5% slippage (lower)
  );
  
  if (result.success) {
    console.log(`✅ SUCCESS!`);
    console.log(`   TX: ${result.signature}`);
    console.log(`   Output: ${result.amountOut} SOL`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    const balanceAfter = await connection.getBalance(walletPubkey);
    const recovered = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;
    console.log(`\n💰 Balance change: ${recovered > 0 ? '+' : ''}${recovered.toFixed(6)} SOL`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
    console.log('\n🔄 Trying pepper token instead...\n');
    
    const pepper = await jupiter.swap(
      '9rn7HN8onzNUiHp6HevQBKC4qQmzAuaBo8u4uKJjpump',
      'So11111111111111111111111111111111111111112',
      641535047302,
      9,
      9,
      'SWAP',
      500
    );
    
    if (pepper.success) {
      console.log(`✅ Sold pepper!`);
      console.log(`   TX: ${pepper.signature}`);
    } else {
      console.log(`❌ Pepper also failed: ${pepper.error}`);
    }
  }
})();
