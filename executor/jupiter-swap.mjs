#!/usr/bin/env node
/**
 * jupiter-swap.mjs - Jupiter Aggregator Integration
 * Swaps SOL ↔ USDC for automated trading
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';
import config from '../config.mjs';

export class JupiterSwap {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.jupiterApiUrl = 'https://quote-api.jup.ag/v6';
  }
  
  async initialize() {
    this.connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Load wallet
    if (!fs.existsSync(config.WALLET_PATH)) {
      throw new Error(`Wallet not found: ${config.WALLET_PATH}`);
    }
    
    const walletData = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    console.log('✅ Jupiter swap initialized');
  }
  
  /**
   * Swap SOL → USDC (buy signal)
   * @param {Object} signal - Trading signal that triggered this
   * @param {number} amountSol - Amount of SOL to swap
   * @returns {Object} Trade result {success, signature, price, amountOut, amountSol}
   */
  async swapSolToUsdc(signal, amountSol = null) {
    try {
      // Use configured position size if not specified
      const swapAmount = amountSol || config.STARTING_CAPITAL_SOL * (config.POSITION_SIZE_PCT / 100);
      const amountLamports = Math.floor(swapAmount * 1e9);
      
      console.log(`\n💱 Swapping ${swapAmount.toFixed(4)} SOL → USDC...`);
      
      // 1. Get quote from Jupiter
      const quote = await this.getQuote(
        config.TOKEN_ADDRESS_SOL,
        config.TOKEN_ADDRESS_USDC,
        amountLamports
      );
      
      if (!quote) {
        return { success: false, error: 'Failed to get quote from Jupiter' };
      }
      
      const expectedUsdc = parseInt(quote.outAmount) / 1e6; // USDC has 6 decimals
      const price = expectedUsdc / swapAmount; // Price in USDC per SOL
      
      console.log(`   Quote: ${expectedUsdc.toFixed(2)} USDC`);
      console.log(`   Price: $${price.toFixed(2)}/SOL`);
      console.log(`   Route: ${quote.routePlan?.length || 0} hop(s)`);
      
      // 2. Get swap transaction
      const swapTx = await this.getSwapTransaction(quote);
      
      if (!swapTx) {
        return { success: false, error: 'Failed to build swap transaction' };
      }
      
      // 3. Sign and send transaction
      const signature = await this.executeTransaction(swapTx);
      
      if (!signature) {
        return { success: false, error: 'Failed to execute transaction' };
      }
      
      console.log(`   ✅ Swap complete: ${signature}`);
      
      return {
        success: true,
        signature: signature,
        price: price,
        amountOut: expectedUsdc,
        amountSol: swapAmount,
        signal: signal
      };
      
    } catch (err) {
      console.error(`   ❌ Swap error: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * Swap USDC → SOL (sell signal)
   * @param {Object} position - Position to close
   * @param {number} amountUsdc - Amount of USDC to swap back
   * @returns {Object} Trade result
   */
  async swapUsdcToSol(position, amountUsdc = null) {
    try {
      // Use position's USDC amount if not specified
      const swapAmount = amountUsdc || position.amountUsdc;
      const amountMicroUsdc = Math.floor(swapAmount * 1e6); // USDC has 6 decimals
      
      console.log(`\n💱 Swapping ${swapAmount.toFixed(2)} USDC → SOL...`);
      
      // 1. Get quote from Jupiter
      const quote = await this.getQuote(
        config.TOKEN_ADDRESS_USDC,
        config.TOKEN_ADDRESS_SOL,
        amountMicroUsdc
      );
      
      if (!quote) {
        return { success: false, error: 'Failed to get quote from Jupiter' };
      }
      
      const expectedSol = parseInt(quote.outAmount) / 1e9;
      const price = swapAmount / expectedSol; // Price in USDC per SOL
      
      console.log(`   Quote: ${expectedSol.toFixed(4)} SOL`);
      console.log(`   Price: $${price.toFixed(2)}/SOL`);
      
      // 2. Get swap transaction
      const swapTx = await this.getSwapTransaction(quote);
      
      if (!swapTx) {
        return { success: false, error: 'Failed to build swap transaction' };
      }
      
      // 3. Sign and send transaction
      const signature = await this.executeTransaction(swapTx);
      
      if (!signature) {
        return { success: false, error: 'Failed to execute transaction' };
      }
      
      console.log(`   ✅ Swap complete: ${signature}`);
      
      return {
        success: true,
        signature: signature,
        price: price,
        amountOut: expectedSol,
        amountUsdc: swapAmount,
        position: position
      };
      
    } catch (err) {
      console.error(`   ❌ Swap error: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * Get quote from Jupiter API
   * @param {string} inputMint - Input token address
   * @param {string} outputMint - Output token address
   * @param {number} amount - Amount in smallest unit (lamports/micro-usdc)
   * @returns {Object} Quote object
   */
  async getQuote(inputMint, outputMint, amount) {
    try {
      const params = new URLSearchParams({
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amount.toString(),
        slippageBps: '50', // 0.5% slippage (conservative)
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });
      
      const url = `${this.jupiterApiUrl}/quote?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter API error: ${response.status} - ${errorText}`);
      }
      
      const quote = await response.json();
      return quote;
      
    } catch (err) {
      console.error(`Get quote error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Get swap transaction from Jupiter
   * @param {Object} quote - Quote from getQuote()
   * @returns {string} Base64 encoded transaction
   */
  async getSwapTransaction(quote) {
    try {
      const response = await fetch(`${this.jupiterApiUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter swap API error: ${response.status} - ${errorText}`);
      }
      
      const { swapTransaction } = await response.json();
      return swapTransaction;
      
    } catch (err) {
      console.error(`Get swap transaction error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Execute transaction on-chain
   * @param {string} swapTransaction - Base64 encoded transaction
   * @returns {string} Transaction signature
   */
  async executeTransaction(swapTransaction) {
    try {
      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      // Sign the transaction
      transaction.sign([this.wallet]);
      
      // Send and confirm
      const rawTransaction = transaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return signature;
      
    } catch (err) {
      console.error(`Execute transaction error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Get current SOL/USDC price from Jupiter
   * @returns {number} Price in USDC per SOL
   */
  async getCurrentPrice() {
    try {
      // Get quote for 1 SOL
      const quote = await this.getQuote(
        config.TOKEN_ADDRESS_SOL,
        config.TOKEN_ADDRESS_USDC,
        1e9 // 1 SOL
      );
      
      if (!quote) return null;
      
      const usdcAmount = parseInt(quote.outAmount) / 1e6;
      return usdcAmount; // Price per SOL
      
    } catch (err) {
      console.error(`Get price error: ${err.message}`);
      return null;
    }
  }
}

export default JupiterSwap;
