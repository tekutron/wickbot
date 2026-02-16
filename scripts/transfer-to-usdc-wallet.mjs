#!/usr/bin/env node
/**
 * transfer-to-usdc-wallet.mjs - Transfer SOL from old wallet to new USDC wallet
 * Sends SOL for fees, then we can manually add USDC
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import config from '../config.mjs';

async function transferToUsdcWallet() {
  console.log('🕯️  Transferring SOL to new USDC wallet...\n');
  
  try {
    // Load source wallet (original)
    const sourceWalletData = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
    const sourceWallet = Keypair.fromSecretKey(Uint8Array.from(sourceWalletData));
    
    // Load destination wallet (new USDC wallet)
    const destWalletData = JSON.parse(fs.readFileSync(config.USDC_WALLET_PATH, 'utf8'));
    const destWallet = Keypair.fromSecretKey(Uint8Array.from(destWalletData));
    
    const connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Check source balance
    const sourceBalance = await connection.getBalance(sourceWallet.publicKey);
    const sourceSol = sourceBalance / LAMPORTS_PER_SOL;
    
    console.log(`📊 Source wallet: ${sourceWallet.publicKey.toString()}`);
    console.log(`   Balance: ${sourceSol.toFixed(4)} SOL\n`);
    
    if (sourceSol < 0.02) {
      console.log('❌ Source wallet has insufficient SOL (need at least 0.02 SOL for transfer + fees)');
      return;
    }
    
    // Transfer amount: keep 0.01 SOL in source, send rest to dest
    const transferAmount = sourceSol - 0.01;
    const transferLamports = Math.floor(transferAmount * LAMPORTS_PER_SOL);
    
    console.log(`💸 Transferring ${transferAmount.toFixed(4)} SOL to new wallet...`);
    console.log(`📍 Destination: ${destWallet.publicKey.toString()}\n`);
    
    // Build transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sourceWallet.publicKey,
        toPubkey: destWallet.publicKey,
        lamports: transferLamports
      })
    );
    
    // Send transaction
    const signature = await connection.sendTransaction(transaction, [sourceWallet]);
    console.log(`📤 Transaction sent: ${signature}`);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('✅ Transfer complete!\n');
    
    // Check new balances
    const newSourceBalance = await connection.getBalance(sourceWallet.publicKey);
    const newDestBalance = await connection.getBalance(destWallet.publicKey);
    
    console.log('📊 Final balances:');
    console.log(`   Source: ${(newSourceBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Dest: ${(newDestBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);
    
    console.log('📝 Next steps:');
    console.log('   1. New wallet now has SOL for fees ✅');
    console.log('   2. Send USDC to new wallet (~$40)');
    console.log('   3. Set ACTIVE_WALLET=USDC in config');
    console.log('   4. Start bot with USDC-first strategy!\n');
    
  } catch (err) {
    console.error(`\n❌ Transfer failed: ${err.message}`);
    process.exit(1);
  }
}

transferToUsdcWallet();
