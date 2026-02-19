#!/usr/bin/env node
/**
 * jupiter-swap-new.mjs - Jupiter Ultra API v1 Integration (2026)
 * NEW endpoints: https://lite-api.jup.ag/ultra/v1/
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';
import config from '../config.mjs';

export class JupiterSwap {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.jupiterBaseUrl = 'https://lite-api.jup.ag/ultra/v1';
    this.jupiterApiKey = process.env.JUPITER_API_KEY || '';
  }
  
  async initialize() {
    this.connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Load wallet (check for USDC wallet first, fallback to SOL wallet)
    const walletPath = config.ACTIVE_WALLET === 'USDC' && fs.existsSync(config.USDC_WALLET_PATH)
      ? config.USDC_WALLET_PATH
      : config.WALLET_PATH;
    
    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet not found: ${walletPath}`);
    }
    
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    console.log(`✅ Jupiter swap initialized (${config.ACTIVE_WALLET} wallet)`);
  }
  
  /**
   * Swap SOL → USDC (buy signal)
   */
  async swapSolToUsdc(signal, amountSol = null) {
    const swapAmount = amountSol || config.STARTING_CAPITAL_SOL * (config.POSITION_SIZE_PCT / 100);
    const amountLamports = Math.floor(swapAmount * 1e9);
    
    console.log(`\n💱 Swapping ${swapAmount.toFixed(4)} SOL → USDC...`);
    
    try {
      // Step 1: Get order with transaction (includes taker)
      const params = new URLSearchParams({
        inputMint: config.TOKEN_ADDRESS_SOL,
        outputMint: config.TOKEN_ADDRESS_USDC,
        amount: amountLamports.toString(),
        taker: this.wallet.publicKey.toBase58(),
        priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
      });
      
      console.log(`   📊 Getting quote from Jupiter...`);
      const orderResponse = await fetch(`${this.jupiterBaseUrl}/order?${params}`, {
        headers: this.jupiterApiKey ? {
          'X-API-KEY': this.jupiterApiKey,
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
      
      const expectedUsdc = parseInt(order.outAmount) / 1e6;
      const price = expectedUsdc / swapAmount;
      
      console.log(`   ✅ Quote: ${expectedUsdc.toFixed(2)} USDC`);
      console.log(`   Price: $${price.toFixed(2)}/SOL`);
      
      // Step 2: Sign transaction
      console.log(`   🔏 Signing transaction...`);
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
      tx.sign([this.wallet]);
      const signedTx = Buffer.from(tx.serialize()).toString('base64');
      
      // Step 3: Execute
      console.log(`   📤 Submitting to Jupiter...`);
      const executeResponse = await fetch(`${this.jupiterBaseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.jupiterApiKey ? { 'X-API-KEY': this.jupiterApiKey } : {})
        },
        body: JSON.stringify({
          signedTransaction: signedTx,
          requestId: order.requestId
        })
      });
      
      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(`Jupiter execute failed: ${executeResponse.status} - ${errorText}`);
      }
      
      const result = await executeResponse.json();
      
      if (result.status !== 'Success') {
        throw new Error(result.error || 'Swap execution failed');
      }
      
      console.log(`   ✅ Swap complete: ${result.signature}`);
      
      return {
        success: true,
        signature: result.signature,
        price: price,
        amountOut: expectedUsdc,
        amountSol: swapAmount,
        signal: signal,
        source: 'jupiter'
      };
      
    } catch (err) {
      console.error(`   ❌ Swap failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * Swap USDC → SOL (sell signal)
   */
  async swapUsdcToSol(position, amountUsdc = null) {
    const swapAmount = amountUsdc || position.amountUsdc;
    const amountMicroUsdc = Math.floor(swapAmount * 1e6);
    
    console.log(`\n💱 Swapping ${swapAmount.toFixed(2)} USDC → SOL...`);
    
    try {
      // Step 1: Get order with transaction
      const params = new URLSearchParams({
        inputMint: config.TOKEN_ADDRESS_USDC,
        outputMint: config.TOKEN_ADDRESS_SOL,
        amount: amountMicroUsdc.toString(),
        taker: this.wallet.publicKey.toBase58(),
        priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
      });
      
      console.log(`   📊 Getting quote from Jupiter...`);
      const orderResponse = await fetch(`${this.jupiterBaseUrl}/order?${params}`, {
        headers: this.jupiterApiKey ? {
          'X-API-KEY': this.jupiterApiKey,
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
      
      const expectedSol = parseInt(order.outAmount) / 1e9;
      const price = swapAmount / expectedSol;
      
      console.log(`   ✅ Quote: ${expectedSol.toFixed(4)} SOL`);
      console.log(`   Price: $${price.toFixed(2)}/SOL`);
      
      // Step 2: Sign transaction
      console.log(`   🔏 Signing transaction...`);
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
      tx.sign([this.wallet]);
      const signedTx = Buffer.from(tx.serialize()).toString('base64');
      
      // Step 3: Execute
      console.log(`   📤 Submitting to Jupiter...`);
      const executeResponse = await fetch(`${this.jupiterBaseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.jupiterApiKey ? { 'X-API-KEY': this.jupiterApiKey } : {})
        },
        body: JSON.stringify({
          signedTransaction: signedTx,
          requestId: order.requestId
        })
      });
      
      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(`Jupiter execute failed: ${executeResponse.status} - ${errorText}`);
      }
      
      const result = await executeResponse.json();
      
      if (result.status !== 'Success') {
        throw new Error(result.error || 'Swap execution failed');
      }
      
      console.log(`   ✅ Swap complete: ${result.signature}`);
      
      return {
        success: true,
        signature: result.signature,
        price: price,
        amountOut: expectedSol,
        amountUsdc: swapAmount,
        position: position,
        source: 'jupiter'
      };
      
    } catch (err) {
      console.error(`   ❌ Swap failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * Get current SOL price
   */
  async getCurrentPrice() {
    try {
      const response = await fetch(
        `https://lite-api.jup.ag/price/v3?ids=${config.TOKEN_ADDRESS_SOL}`
      );
      
      if (!response.ok) {
        throw new Error(`Price API failed: ${response.status}`);
      }
      
      const data = await response.json();
      const solData = data[config.TOKEN_ADDRESS_SOL];
      
      if (!solData) {
        throw new Error('SOL price not found');
      }
      
      return solData.usdPrice;
    } catch (err) {
      console.error(`Failed to get SOL price: ${err.message}`);
      return 200; // Fallback estimate
    }
  }
  
  /**
   * Generic swap function for any token pair
   * @param {string} inputMint - Input token address
   * @param {string} outputMint - Output token address
   * @param {number} amountIn - Amount to swap (in token's base units, e.g., lamports for SOL)
   * @param {number} inputDecimals - Decimals for input token (9 for SOL, 6 for USDC)
   * @param {number} outputDecimals - Decimals for output token
   * @param {string} direction - 'BUY' or 'SELL' for logging
   */
  async swap(inputMint, outputMint, amountIn, inputDecimals = 9, outputDecimals = 9, direction = 'SWAP') {
    const displayAmount = (amountIn / Math.pow(10, inputDecimals)).toFixed(inputDecimals === 9 ? 4 : 2);
    
    console.log(`\n💱 ${direction}: ${displayAmount} tokens...`);
    
    try {
      // Step 1: Get order
      const params = new URLSearchParams({
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amountIn.toString(),
        taker: this.wallet.publicKey.toBase58(),
        priorityFee: config.PRIORITY_FEE_LAMPORTS.toString()
      });
      
      console.log(`   📊 Getting quote from Jupiter...`);
      const orderResponse = await fetch(`${this.jupiterBaseUrl}/order?${params}`, {
        headers: this.jupiterApiKey ? {
          'X-API-KEY': this.jupiterApiKey,
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
      
      const amountOut = parseInt(order.outAmount);
      const displayAmountOut = (amountOut / Math.pow(10, outputDecimals)).toFixed(outputDecimals === 9 ? 4 : 2);
      
      console.log(`   ✅ Quote: ${displayAmountOut} tokens out`);
      
      if (config.DRY_RUN) {
        console.log(`   🧪 DRY RUN - Skipping execution`);
        return {
          success: true,
          signature: 'DRY_RUN',
          amountIn: displayAmount,
          amountOut: displayAmountOut,
          dryRun: true
        };
      }
      
      // Step 2: Sign transaction
      console.log(`   🔏 Signing transaction...`);
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
      tx.sign([this.wallet]);
      const signedTx = Buffer.from(tx.serialize()).toString('base64');
      
      // Step 3: Execute
      console.log(`   📤 Submitting to Jupiter...`);
      const executeResponse = await fetch(`${this.jupiterBaseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.jupiterApiKey ? { 'X-API-KEY': this.jupiterApiKey } : {})
        },
        body: JSON.stringify({
          signedTransaction: signedTx,
          requestId: order.requestId
        })
      });
      
      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(`Jupiter execute failed: ${executeResponse.status} - ${errorText}`);
      }
      
      const result = await executeResponse.json();
      
      if (result.status !== 'Success') {
        throw new Error(result.error || 'Swap execution failed');
      }
      
      console.log(`   ✅ Swap complete: ${result.signature}`);
      
      return {
        success: true,
        signature: result.signature,
        amountIn: displayAmount,
        amountOut: displayAmountOut,
        source: 'jupiter'
      };
      
    } catch (err) {
      console.error(`   ❌ Swap failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

export default JupiterSwap;
