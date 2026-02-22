#!/usr/bin/env node
// Watch balance and compound ANY gains into next trade
import { Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

let lastBalance = 0.128;

async function check() {
  const balance = await connection.getBalance(wallet.publicKey);
  const sol = balance / 1e9;
  
  if (sol > lastBalance) {
    const gain = sol - lastBalance;
    const gainPct = (gain / lastBalance * 100);
    
    console.log(`\n💰 GAIN DETECTED: +${gain.toFixed(6)} SOL (+${gainPct.toFixed(2)}%)`);
    console.log(`New balance: ${sol.toFixed(6)} SOL`);
    console.log(`Target: ${(1.0 / sol).toFixed(2)}x remaining\n`);
    
    lastBalance = sol;
  }
  
  process.stdout.write(`\rBalance: ${sol.toFixed(6)} SOL | Need: ${(1.0 / sol).toFixed(2)}x  `);
}

async function run() {
  console.log('💰 COMPOUND TRACKER\n');
  console.log('Watching for ANY gains to compound\n');
  
  while (true) {
    await check();
    await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10s
  }
}

run();
