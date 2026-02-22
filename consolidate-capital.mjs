#!/usr/bin/env node
/**
 * Capital Consolidation - Transfer all SOL to wickbot wallet
 * Feb 21, 2026 - SecretBunker Mission
 */

import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const WICKBOT_ADDRESS = 'DqfDgvcGMhHczhAeQp6nUNFGNkhQSbGPGjKLEn4QGihf';
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const sourceWallets = [
  { name: 'jupbot', path: '/home/j/.openclaw/workspace/jupbot/wallets/generated_keypair.json' },
  { name: 'doge_trader', path: '/home/j/.openclaw/workspace/wallets/doge_trader_keypair.json' },
  { name: 'pump_sniper', path: '/home/j/.openclaw/pump-sniper/wallets/pump_sniper_wallet.json' },
];

async function transferAll(source, targetAddress) {
  try {
    console.log(`\n💸 Transferring from ${source.name}...`);
    
    const data = JSON.parse(fs.readFileSync(source.path));
    const fromWallet = Keypair.fromSecretKey(new Uint8Array(data));
    
    // Get balance
    const balance = await connection.getBalance(fromWallet.publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    
    console.log(`   Balance: ${sol.toFixed(6)} SOL`);
    
    if (balance < 5000) { // Less than 0.000005 SOL
      console.log(`   ⏭️  Skip (too low)`);
      return { success: false, reason: 'too_low' };
    }
    
    // Reserve for transaction fee (5000 lamports = 0.000005 SOL)
    const fee = 5000;
    const amountToSend = balance - fee;
    
    if (amountToSend <= 0) {
      console.log(`   ⏭️  Skip (insufficient after fee)`);
      return { success: false, reason: 'insufficient' };
    }
    
    console.log(`   Sending: ${(amountToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: WICKBOT_ADDRESS,
        lamports: amountToSend,
      })
    );
    
    // Send
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet],
      { commitment: 'confirmed' }
    );
    
    console.log(`   ✅ Sent: ${signature}`);
    console.log(`   📊 Amount: ${(amountToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    
    return { success: true, amount: amountToSend / LAMPORTS_PER_SOL, signature };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('💰 CAPITAL CONSOLIDATION - SecretBunker Mission');
  console.log('═══════════════════════════════════════════════');
  console.log(`Target wallet: ${WICKBOT_ADDRESS}`);
  
  let totalTransferred = 0;
  let successCount = 0;
  
  for (const source of sourceWallets) {
    const result = await transferAll(source, WICKBOT_ADDRESS);
    if (result.success) {
      totalTransferred += result.amount;
      successCount++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ Transferred: ${totalTransferred.toFixed(6)} SOL from ${successCount} wallets`);
  console.log('═══════════════════════════════════════════════');
  
  // Check final balance
  const finalBalance = await connection.getBalance(WICKBOT_ADDRESS);
  const finalSOL = finalBalance / LAMPORTS_PER_SOL;
  console.log(`\n💰 wickbot final balance: ${finalSOL.toFixed(6)} SOL`);
  console.log(`🎯 20x target: ${(finalSOL * 20).toFixed(6)} SOL\n`);
}

main().catch(console.error);
