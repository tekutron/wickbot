#!/usr/bin/env node
/**
 * swap-sol-to-usdc.mjs - One-time conversion of SOL → USDC
 * Converts all SOL to USDC for stable base trading
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';
import config from './config.mjs';

const JUPITER_QUOTE_URL = 'https://ultra.jup.ag/quote';
const JUPITER_SWAP_URL = 'https://ultra.jup.ag/swap';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8';

import { RaydiumSwap } from './executor/raydium-swap.mjs';

async function swapSolToUsdc() {
  console.log('🕯️  Converting SOL → USDC for stable base trading...\n');
  
  // Load wallet (outside try so it's accessible in catch)
  const walletData = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  // Connect to RPC
  const connection = new Connection(config.RPC_URL, 'confirmed');
  
  // Get SOL balance
  const balance = await connection.getBalance(wallet.publicKey);
  const solAmount = balance / 1e9;
  
  console.log(`💰 Current balance: ${solAmount.toFixed(4)} SOL`);
  
  // Keep 0.01 SOL for fees
  const swapAmount = solAmount - 0.01;
  const swapLamports = Math.floor(swapAmount * 1e9);
  
  if (swapAmount <= 0) {
    console.log('❌ Not enough SOL to swap (need >0.01 SOL for fees)');
    return;
  }
  
  console.log(`💱 Swapping ${swapAmount.toFixed(4)} SOL → USDC...`);
  console.log(`   Keeping 0.01 SOL for transaction fees\n`);
  
  try {
    
    // Step 1: Get quote
    console.log('📊 Getting quote from Jupiter Ultra...');
    const quoteUrl = `${JUPITER_QUOTE_URL}?` +
      `inputMint=${config.TOKEN_ADDRESS_SOL}&` +
      `outputMint=${config.TOKEN_ADDRESS_USDC}&` +
      `amount=${swapLamports}&` +
      `slippageBps=50`;
    
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        'X-API-KEY': JUPITER_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quoteResponse.status}`);
    }
    
    const quote = await quoteResponse.json();
    const expectedUsdc = parseInt(quote.outAmount) / 1e6;
    
    console.log(`✅ Quote received: ${expectedUsdc.toFixed(2)} USDC`);
    console.log(`   Price: $${(expectedUsdc / swapAmount).toFixed(2)}/SOL\n`);
    
    // Step 2: Get swap transaction
    console.log('🔨 Building swap transaction...');
    const swapResponse = await fetch(JUPITER_SWAP_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': JUPITER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapResponse.status}`);
    }
    
    const { swapTransaction } = await swapResponse.json();
    console.log('✅ Transaction built\n');
    
    // Step 3: Sign and send
    console.log('📤 Signing and sending transaction...');
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    transaction.sign([wallet]);
    
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      maxRetries: 3
    });
    
    console.log(`✅ Transaction sent!`);
    console.log(`🔗 Signature: ${signature}\n`);
    
    // Step 4: Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log('✅ Transaction confirmed!\n');
    
    // Step 5: Check new balances
    const newSolBalance = await connection.getBalance(wallet.publicKey);
    const newSolAmount = newSolBalance / 1e9;
    
    console.log('🎉 Swap complete!');
    console.log(`   SOL: ${newSolAmount.toFixed(4)} SOL (kept for fees)`);
    console.log(`   USDC: ~${expectedUsdc.toFixed(2)} USDC (stable base)`);
    console.log(`\n🕯️  Ready to trade! Bot will now:`);
    console.log(`   - BUY SOL on bullish signals`);
    console.log(`   - SELL SOL back to USDC on bearish signals`);
    console.log(`   - Stay in stable USDC between trades\n`);
    
  } catch (jupiterErr) {
    console.error(`\n❌ Jupiter swap failed: ${jupiterErr.message}`);
    console.log(`\n🔄 Trying Raydium backup...\n`);
    
    try {
      // Fallback to Raydium
      const raydiumSwap = new RaydiumSwap(connection, wallet);
      const result = await raydiumSwap.swapSolToUsdc(swapAmount);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('\n🎉 Swap complete via Raydium!');
      console.log(`🔗 Signature: ${result.signature}`);
      console.log(`\n🕯️  Ready to trade!`);
      
    } catch (raydiumErr) {
      console.error(`\n❌ Both Jupiter and Raydium failed`);
      console.error(`   Jupiter: ${jupiterErr.message}`);
      console.error(`   Raydium: ${raydiumErr.message}`);
      process.exit(1);
    }
  }
}

swapSolToUsdc();
