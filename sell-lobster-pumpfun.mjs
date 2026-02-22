import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { PumpFunSDK } from '../pump-sniper/pumpfun-sdk.mjs';

(async () => {
  console.log('💰 Selling Lobstefeller via PumpFun SDK...\n');
  
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const pumpFunSDK = new PumpFunSDK(connection, wallet);
  
  const balanceBefore = await connection.getBalance(wallet.publicKey);
  console.log(`SOL before: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);
  
  const result = await pumpFunSDK.sellToken(
    'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump',
    2104296.309106,
    1_000_000 // Priority fee
  );
  
  if (result.success) {
    console.log(`✅ Sell TX: ${result.signature}`);
    await connection.confirmTransaction(result.signature, 'confirmed');
    console.log('   ✅ Confirmed!');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    const balanceAfter = await connection.getBalance(wallet.publicKey);
    const recovered = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;
    console.log(`\n💰 Recovered: ${recovered > 0 ? '+' : ''}${recovered.toFixed(6)} SOL`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
})();
