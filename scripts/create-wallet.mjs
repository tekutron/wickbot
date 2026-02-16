#!/usr/bin/env node
/**
 * create-wallet.mjs - Generate a new Solana wallet for wickbot
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';

const walletPath = './wallets/wickbot_wallet.json';

// Check if wallet already exists
if (fs.existsSync(walletPath)) {
  console.log('⚠️  Wallet already exists at:', walletPath);
  console.log('   Delete it first if you want to create a new one.');
  process.exit(1);
}

// Generate new keypair
console.log('🔑 Generating new Solana wallet...\n');
const keypair = Keypair.generate();

// Save to file
const secretKey = Array.from(keypair.secretKey);
fs.writeFileSync(walletPath, JSON.stringify(secretKey));

console.log('✅ Wallet created successfully!');
console.log('   File:', walletPath);
console.log('   Public Key:', keypair.publicKey.toString());
console.log('\n⚠️  IMPORTANT:');
console.log('   - Keep this wallet file secure (never share the JSON)');
console.log('   - Backup the file before funding it');
console.log('   - This wallet is for wickbot trading only\n');

console.log('💰 To fund the wallet:');
console.log(`   1. Send SOL to: ${keypair.publicKey.toString()}`);
console.log('   2. Recommended: 1.1 SOL (1 for trading + 0.1 for fees)\n');
