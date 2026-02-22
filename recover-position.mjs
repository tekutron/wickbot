#!/usr/bin/env node
/**
 * Recover open position - Sell pepper tokens
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { PumpFunSDK } from '../pump-sniper/pumpfun-sdk.mjs';

const WALLET_PATH = './wallets/wickbot_wallet.json';
const TOKEN_MINT = '9rn7HN8onzNUiHp6HevQBKC4qQmzAuaBo8u4uKJjpump';
const TOKEN_AMOUNT = 641535.047302;

(async () => {
  console.log('💰 RECOVERING POSITION...\n');
  console.log(`Token: pepper (${TOKEN_MINT})`);
  console.log(`Amount: ${TOKEN_AMOUNT.toLocaleString()} tokens\n`);
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  // Connect
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const pumpFunSDK = new PumpFunSDK(connection, wallet);
  
  // Get balance before
  const balanceBefore = await connection.getBalance(wallet.publicKey);
  console.log(`SOL before: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);
  
  // Sell
  console.log('💸 Executing SELL...');
  const result = await pumpFunSDK.sellToken(
    TOKEN_MINT,
    TOKEN_AMOUNT,
    2_000_000 // High priority fee
  );
  
  if (!result.success) {
    console.log(`❌ Sell failed: ${result.error}`);
    process.exit(1);
  }
  
  console.log(`✅ Sell TX: ${result.signature}`);
  console.log(`   Speed: ${result.executionTimeMs}ms`);
  
  // Wait for confirmation
  console.log('   ⏳ Waiting for confirmation...');
  await connection.confirmTransaction(result.signature, 'confirmed');
  console.log('   ✅ Confirmed!\n');
  
  // Get balance after
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
  const balanceAfter = await connection.getBalance(wallet.publicKey);
  const solAfter = balanceAfter / LAMPORTS_PER_SOL;
  const recovered = solAfter - (balanceBefore / LAMPORTS_PER_SOL);
  
  console.log(`💰 SOL after: ${solAfter.toFixed(6)} SOL`);
  console.log(`📊 Recovered: ${recovered > 0 ? '+' : ''}${recovered.toFixed(6)} SOL\n`);
  
  if (recovered > 0) {
    console.log('✅ POSITION RECOVERED! Capital available for trading.');
  } else {
    console.log('⚠️ No SOL recovered - tx may have failed');
  }
})();
