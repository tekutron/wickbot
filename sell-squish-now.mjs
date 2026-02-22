import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const mint = '4QuiR6Fq7MZkeyoYkCuhpBuGcqV1KYaUwb54FsC3pump';

async function sell() {
  console.log('🔴 SELLING Squish (SL hit at -16.86%)\n');
  
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let balance = 0;
    for (const account of accounts.value) {
      if (account.account.data.parsed.info.mint === mint) {
        balance = parseInt(account.account.data.parsed.info.tokenAmount.amount);
        break;
      }
    }
    
    if (balance === 0) {
      console.log('No tokens\n');
      return;
    }
    
    console.log(`Balance: ${balance} raw tokens\n`);
    
    const params = new URLSearchParams({
      inputMint: mint,
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: balance.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '150000'
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
    const loss = solOut - 0.05;
    
    console.log(`Selling for: ${solOut.toFixed(6)} SOL`);
    console.log(`Loss: ${loss.toFixed(6)} SOL (${(loss / 0.05 * 100).toFixed(2)}%)\n`);
    
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
      console.log(`✅ SOLD: ${result.signature}\n`);
      console.log(`New liquid balance: ~${(0.046 + solOut).toFixed(6)} SOL\n`);
    }
    
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
  }
}

sell();
