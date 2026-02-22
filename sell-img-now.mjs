import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { VersionedTransaction } from '@solana/web3.js';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const mint = 'D1hmg8DP6qP514Lxpy85kMNXKJhg7Cm8KkHM2Q7rpump';

async function sellAll() {
  console.log('💰 Selling IMG - consolidating capital\n');
  
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
    console.log('No position');
    return;
  }
  
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
    if (order.errorCode) throw new Error(order.errorMessage);
    
    const solOut = parseInt(order.outAmount) / 1e9;
    console.log(`Exit: ${solOut.toFixed(6)} SOL\n`);
    
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
      console.log(`Sold: ${result.signature}`);
      console.log(`Full capital liquid: ~${(0.1408 + solOut - 0.025).toFixed(4)} SOL\n`);
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

sellAll();
