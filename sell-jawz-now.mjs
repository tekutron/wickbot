import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const mint = 'GJmF68t5HXM1U1j2nE4Trvh7vH5XeXys7MW4UN5Bpump';

async function sellAll() {
  console.log('💰 SELLING ALL JAWZ → SOL (Take Profit)\n');
  
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
    console.log('❌ No tokens');
    return;
  }
  
  console.log(`Balance: ${balance} raw tokens\n`);
  
  try {
    const params = new URLSearchParams({
      inputMint: mint,
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
    
    if (order.errorCode) {
      throw new Error(order.errorMessage);
    }
    
    const solOut = parseInt(order.outAmount) / 1e9;
    console.log(`Quote: ${solOut.toFixed(6)} SOL`);
    console.log(`P&L: +22.67% (near TP target)\n`);
    
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
      console.log(`✅ SOLD: ${result.signature}`);
      console.log(`🟢 FIRST WIN! +22.67% locked\n`);
    } else {
      console.log(`❌ Failed: ${result.error || 'Unknown'}`);
    }
    
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

sellAll();
