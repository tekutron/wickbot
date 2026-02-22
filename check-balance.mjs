import { Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function check() {
  const balance = await connection.getBalance(wallet.publicKey);
  const sol = balance / 1e9;
  
  console.log(`\n💰 Current Balance: ${sol.toFixed(6)} SOL\n`);
  console.log(`Target: 1.0 SOL`);
  console.log(`Needed: ${(1.0 / sol).toFixed(2)}x\n`);
}

check();
