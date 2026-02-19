#!/usr/bin/env node
/**
 * Sell BUDI (Token-2022) back to SOL
 */

import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function sellBudi() {
  console.log('💱 Selling BUDI → SOL...\n');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_usdc_wallet.json', 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  const budiAmount = 86270296286; // Raw amount (6 decimals)
  const budiDisplay = budiAmount / 1e6;
  
  console.log(`Selling: ${budiDisplay.toFixed(4)} BUDI tokens`);
  console.log(`Wallet: ${wallet.publicKey.toString()}\n`);
  
  try {
    // Get Jupiter quote
    console.log('📊 Getting quote from Jupiter...');
    const params = new URLSearchParams({
      inputMint: BUDI_MINT,
      outputMint: SOL_MINT,
      amount: budiAmount.toString(),
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
    console.log(`   ✅ Quote: ${solOut.toFixed(4)} SOL out\n`);
    
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
    console.log(`   Tx: ${result.signature}`);
    console.log(`   Solscan: https://solscan.io/tx/${result.signature}\n`);
    
    // Update state
    console.log('🧹 Clearing position state...');
    const newBalance = 0.094733779 + solOut; // Add recovered SOL
    const state = {
      positions: [],
      currentCapital: newBalance,
      startingCapital: 0.207,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync('./wickbot_state.json', JSON.stringify(state, null, 2));
    console.log(`✅ State updated - new balance: ${newBalance.toFixed(6)} SOL\n`);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    throw err;
  }
}

sellBudi();
