#!/usr/bin/env node
/**
 * Manual sell BUDI → SOL
 */

import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function sellBudi() {
  console.log('🔍 Checking BUDI balance...\n');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_usdc_wallet.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const connection = new Connection(RPC_URL);
  
  console.log(`Wallet: ${wallet.publicKey.toString()}\n`);
  
  // Check BUDI balance
  try {
    const budiMint = new PublicKey(BUDI_MINT);
    const ata = await getAssociatedTokenAddress(budiMint, wallet.publicKey);
    const account = await getAccount(connection, ata);
    const budiBalance = Number(account.amount);
    const budiDisplay = budiBalance / 1e9;
    
    console.log(`✅ BUDI balance: ${budiDisplay.toFixed(4)} tokens`);
    console.log(`   Raw amount: ${budiBalance}\n`);
    
    if (budiBalance === 0) {
      console.log('No BUDI to sell!');
      return;
    }
    
    // Get Jupiter quote
    console.log('💱 Getting quote from Jupiter...');
    const params = new URLSearchParams({
      inputMint: BUDI_MINT,
      outputMint: SOL_MINT,
      amount: budiBalance.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '1000000'
    });
    
    const orderResponse = await fetch(`https://api.jup.ag/order?${params}`);
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Jupiter order failed: ${orderResponse.status} - ${errorText}`);
    }
    
    const order = await orderResponse.json();
    
    if (order.errorCode) {
      throw new Error(order.errorMessage || 'Jupiter error');
    }
    
    const solOut = parseInt(order.outAmount) / 1e9;
    console.log(`   ✅ Quote: ${solOut.toFixed(4)} SOL\n`);
    
    // Sign transaction
    console.log('🔏 Signing transaction...');
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    const signedTx = Buffer.from(tx.serialize()).toString('base64');
    
    // Execute
    console.log('📤 Submitting to Jupiter...');
    const executeResponse = await fetch('https://api.jup.ag/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedTransaction: signedTx,
        requestId: order.requestId
      })
    });
    
    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      throw new Error(`Execute failed: ${executeResponse.status} - ${errorText}`);
    }
    
    const result = await executeResponse.json();
    
    if (result.status !== 'Success') {
      throw new Error(result.error || 'Swap failed');
    }
    
    console.log(`\n✅ SELL COMPLETE!`);
    console.log(`   Sold: ${budiDisplay.toFixed(4)} BUDI`);
    console.log(`   Got: ${solOut.toFixed(4)} SOL`);
    console.log(`   Tx: ${result.signature}\n`);
    console.log(`   Solscan: https://solscan.io/tx/${result.signature}\n`);
    
    // Clear state
    console.log('🧹 Clearing state file...');
    const state = {
      positions: [],
      currentCapital: 0.197350385,
      startingCapital: 0.207,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
    console.log('✅ State cleared - ready for next trade!\n');
    
  } catch (err) {
    if (err.message.includes('could not find account')) {
      console.log('\n✅ No BUDI tokens found (already sold or never bought)');
      
      // Still clear state
      const state = {
        positions: [],
        currentCapital: 0.197350385,
        startingCapital: 0.207,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
      console.log('✅ State cleared\n');
    } else {
      console.error('\n❌ Error:', err.message);
      throw err;
    }
  }
}

sellBudi().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
