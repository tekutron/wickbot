import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const TOKENS = [
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
];

async function sellAll() {
  console.log('💰 Selling accumulated BONK + WIF\n');
  
  for (const token of TOKENS) {
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { mint: new PublicKey(token.mint) }
      );
      
      if (accounts.value.length === 0) {
        console.log(`${token.symbol}: No balance\n`);
        continue;
      }
      
      const balance = parseInt(accounts.value[0].account.data.parsed.info.tokenAmount.amount);
      const uiBalance = parseFloat(accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount);
      
      console.log(`${token.symbol}: ${uiBalance.toLocaleString()} tokens`);
      
      const params = new URLSearchParams({
        inputMint: token.mint,
        outputMint: 'So11111111111111111111111111111111111111112',
        amount: balance.toString(),
        taker: wallet.publicKey.toBase58(),
        priorityFee: '50000'
      });
      
      const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
        }
      });
      
      const order = await orderResponse.json();
      if (order.errorCode) throw new Error(order.errorMessage);
      
      const solOut = parseInt(order.outAmount) / 1e9;
      console.log(`Selling for ${solOut.toFixed(6)} SOL...`);
      
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
      tx.sign([wallet]);
      
      const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
        },
        body: JSON.stringify({
          signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
          requestId: order.requestId
        })
      });
      
      const result = await executeResponse.json();
      
      if (result.status === 'Success') {
        console.log(`✅ Sold: ${result.signature}\n`);
      }
      
    } catch (err) {
      console.log(`❌ ${token.symbol} sell failed: ${err.message}\n`);
    }
  }
}

sellAll();
