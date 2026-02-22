import { RaydiumSwap } from './executor/raydium-swap.mjs';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

(async () => {
  console.log('💰 Emergency Raydium sell of Lobstefeller...\n');
  
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const raydium = new RaydiumSwap(connection, wallet);
  
  const balanceBefore = await connection.getBalance(wallet.publicKey);
  console.log(`SOL before: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(6)}\n`);
  
  try {
    await raydium.initialize('B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump');
    
    const result = await raydium.sell(2104296.309106);
    
    if (result.success) {
      console.log(`✅ SOLD via Raydium!`);
      console.log(`   TX: ${result.signature}`);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      const balanceAfter = await connection.getBalance(wallet.publicKey);
      const recovered = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;
      console.log(`\n💰 Recovered: ${recovered > 0 ? '+' : ''}${recovered.toFixed(6)} SOL`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
})();
