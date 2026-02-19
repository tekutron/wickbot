#!/usr/bin/env node
/**
 * swap-usdc-to-sol.mjs - Convert USDC back to SOL
 * Consolidates capital into SOL for token trading
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const JUPITER_BASE_URL = 'https://lite-api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const WALLET_PATH = './wallets/wickbot_usdc_wallet.json';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function swapUsdcToSol() {
  console.log('🕯️  Converting USDC → SOL for token trading...\n');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  
  // Connect to RPC
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Get USDC balance
  const usdcMintPubkey = new PublicKey(USDC_MINT);
  const ata = await getAssociatedTokenAddress(usdcMintPubkey, wallet.publicKey);
  
  let usdcBalance = 0;
  try {
    const tokenAccount = await getAccount(connection, ata);
    usdcBalance = Number(tokenAccount.amount) / 1e6; // USDC has 6 decimals
  } catch (e) {
    console.log('❌ No USDC balance found');
    return;
  }
  
  console.log(`💰 USDC Balance: ${usdcBalance.toFixed(2)} USDC\n`);
  
  if (usdcBalance < 0.1) {
    console.log('❌ Not enough USDC to swap (need >0.1 USDC)');
    return;
  }
  
  // Swap all USDC
  const swapAmount = Math.floor(usdcBalance * 1e6); // Convert to lamports (6 decimals)
  
  console.log(`💱 Swapping ${usdcBalance.toFixed(2)} USDC → SOL...`);
  
  try {
    // Step 1: Get order with transaction (Jupiter Ultra API)
    console.log('📊 Getting order from Jupiter...');
    const params = new URLSearchParams({
      inputMint: USDC_MINT,
      outputMint: SOL_MINT,
      amount: swapAmount.toString(),
      taker: wallet.publicKey.toBase58()
    });
    
    const orderResponse = await fetch(`${JUPITER_BASE_URL}/order?${params}`, {
      headers: JUPITER_API_KEY ? {
        'X-API-KEY': JUPITER_API_KEY,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Jupiter order failed: ${orderResponse.status} - ${errorText}`);
    }
    
    const order = await orderResponse.json();
    
    if (order.errorCode) {
      throw new Error(order.errorMessage || 'Unknown Jupiter error');
    }
    
    const expectedSol = (parseInt(order.outAmount) / 1e9).toFixed(4);
    
    console.log(`   Expected output: ${expectedSol} SOL\n`);
    
    // Step 2: Deserialize and sign
    console.log('✍️  Signing transaction...');
    const transactionBuf = Buffer.from(order.transaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    transaction.sign([wallet]);
    
    // Step 3: Send transaction
    console.log('📤 Sending transaction...');
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      maxRetries: 3
    });
    
    console.log(`\n🔗 Transaction: https://solscan.io/tx/${signature}\n`);
    
    // Step 4: Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log('✅ Swap successful!\n');
    
    // Check new balance
    const newBalance = await connection.getBalance(wallet.publicKey);
    const newSol = (newBalance / 1e9).toFixed(4);
    
    console.log(`💰 New SOL Balance: ${newSol} SOL`);
    console.log(`\n🎉 Ready for token trading!`);
    
  } catch (error) {
    console.error('❌ Swap failed:', error.message);
    process.exit(1);
  }
}

// Run swap
swapUsdcToSol();
