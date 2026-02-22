import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

(async () => {
  console.log('💰 Selling pepper via Jupiter Ultra API\n');
  
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const balanceBefore = await connection.getBalance(wallet.publicKey);
  console.log(`SOL before: ${(balanceBefore / 1e9).toFixed(6)}\n`);
  
  const params = new URLSearchParams({
    inputMint: '9rn7HN8onzNUiHp6HevQBKC4qQmzAuaBo8u4uKJjpump',
    outputMint: 'So11111111111111111111111111111111111111112',
    amount: '641535047302',
    taker: wallet.publicKey.toBase58(),
    priorityFee: '50000'
  });
  
  console.log('📊 Getting quote...');
  const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
    }
  });
  
  const order = await orderResponse.json();
  
  if (order.errorCode) {
    console.log(`❌ Failed: ${order.errorMessage}`);
    process.exit(1);
  }
  
  console.log(`✅ Quote: ${(parseInt(order.outAmount) / 1e9).toFixed(6)} SOL`);
  console.log(`   Price impact: ${order.priceImpactPct}%\n`);
  
  console.log('🔏 Signing transaction...');
  const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
  tx.sign([wallet]);
  const signedTx = Buffer.from(tx.serialize()).toString('base64');
  
  console.log('📤 Executing swap...');
  const executeResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
    },
    body: JSON.stringify({
      signedTransaction: signedTx,
      requestId: order.requestId
    })
  });
  
  const result = await executeResponse.json();
  
  if (result.status !== 'Success') {
    console.log(`❌ Execute failed: ${result.error || 'Unknown error'}`);
    process.exit(1);
  }
  
  console.log(`✅ SOLD! TX: ${result.signature}\n`);
  
  await connection.confirmTransaction(result.signature, 'confirmed');
  console.log('✅ Confirmed!\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  const balanceAfter = await connection.getBalance(wallet.publicKey);
  const recovered = (balanceAfter - balanceBefore) / 1e9;
  
  console.log(`💰 SOL after: ${(balanceAfter / 1e9).toFixed(6)}`);
  console.log(`📊 Recovered: +${recovered.toFixed(6)} SOL`);
  console.log(`\n🎯 TOTAL CAPITAL RECOVERED!`);
})();
