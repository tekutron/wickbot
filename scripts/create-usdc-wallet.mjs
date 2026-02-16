#!/usr/bin/env node
/**
 * create-usdc-wallet.mjs - Create a fresh wallet pre-funded with USDC
 * This wallet will be dedicated to USDC-first trading strategy
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createUsdcWallet() {
  console.log('🕯️  Creating new USDC trading wallet...\n');
  
  // Generate new keypair
  const wallet = Keypair.generate();
  const publicKey = wallet.publicKey.toString();
  const secretKey = Array.from(wallet.secretKey);
  
  // Save to file
  const walletsDir = path.join(__dirname, '../wallets');
  if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true });
  }
  
  const walletPath = path.join(walletsDir, 'wickbot_usdc_wallet.json');
  fs.writeFileSync(walletPath, JSON.stringify(secretKey, null, 2));
  
  console.log('✅ New wallet created!\n');
  console.log(`📍 Address: ${publicKey}`);
  console.log(`💾 Saved to: ${walletPath}\n`);
  console.log('📝 Next steps:');
  console.log('   1. Send SOL to this address for fees (~0.01 SOL)');
  console.log('   2. Send USDC to this address (~$40)');
  console.log('   3. Update config.mjs to use this wallet');
  console.log('   4. Start trading with USDC-first strategy!\n');
  
  return { publicKey, walletPath };
}

createUsdcWallet();
