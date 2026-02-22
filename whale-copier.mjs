#!/usr/bin/env node
/**
 * Whale Copy Trading Bot
 * Monitors successful wallets and copies their trades in real-time
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const CONFIG = {
  wallet: './wallets/wickbot_wallet.json',
  rpc: 'https://api.mainnet-beta.solana.com',
  heliusApiKey: '83dd74fa-ade3-48b9-a6c9-ac8c9f871135',
  jupiterApiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8',
  
  // Whale wallets to copy (known successful traders)
  whales: [
    // Add whale addresses here as we find them
  ],
  
  // Copy trading params
  copyAmount: 0.02, // SOL per copy trade
  minWhaleSize: 0.1, // Minimum whale trade size (SOL)
  maxCopies: 3, // Max simultaneous copy positions
  
  pollInterval: 5000 // Check every 5s
};

class WhaleCopier {
  constructor() {
    const walletData = JSON.parse(fs.readFileSync(CONFIG.wallet));
    this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    this.connection = new Connection(CONFIG.rpc, 'confirmed');
    this.positions = [];
    this.lastChecked = {};
  }
  
  async findWhales() {
    console.log('🔍 Finding successful traders...\n');
    
    // Get top traders from recent popular tokens
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
    const data = await response.json();
    
    const hotTokens = data.pairs
      .filter(p => {
        const vol = parseFloat(p.volume.h6 || 0);
        const change = parseFloat(p.priceChange.h6 || 0);
        return vol > 10000 && change > 50;
      })
      .slice(0, 5);
    
    console.log(`Found ${hotTokens.length} hot tokens\n`);
    
    const whales = new Set();
    
    for (const token of hotTokens) {
      const mint = token.baseToken.address;
      console.log(`Analyzing ${token.baseToken.symbol}...`);
      
      try {
        // Get token holders
        const holderResponse = await fetch(
          `https://api.helius.xyz/v0/token-metadata?api-key=${CONFIG.heliusApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mintAccounts: [mint],
              includeOffChain: false
            })
          }
        );
        
        // Would need proper holder/transaction analysis here
        // For now, placeholder
        
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }
    
    return Array.from(whales);
  }
  
  async monitorWhale(whaleAddress) {
    console.log(`👀 Monitoring whale: ${whaleAddress.slice(0, 8)}...`);
    
    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${whaleAddress}/transactions?api-key=${CONFIG.heliusApiKey}&limit=5`
      );
      
      const txs = await response.json();
      
      for (const tx of txs) {
        // Check if this is a new swap transaction
        if (tx.timestamp <= this.lastChecked[whaleAddress]) {
          continue;
        }
        
        // Look for token swaps
        if (tx.type === 'SWAP' && tx.tokenTransfers) {
          const swapInfo = this.parseSwap(tx);
          
          if (swapInfo && swapInfo.amountIn > CONFIG.minWhaleSize) {
            console.log(`\n🐋 WHALE TRADE DETECTED!`);
            console.log(`   ${swapInfo.tokenIn} → ${swapInfo.tokenOut}`);
            console.log(`   Amount: ${swapInfo.amountIn} SOL\n`);
            
            // Copy the trade
            await this.copyTrade(swapInfo);
          }
        }
      }
      
      this.lastChecked[whaleAddress] = Date.now() / 1000;
      
    } catch (err) {
      console.log(`❌ Monitor error: ${err.message}`);
    }
  }
  
  parseSwap(tx) {
    // Parse transaction to extract swap details
    // This is simplified - would need proper parsing
    
    const transfers = tx.tokenTransfers || [];
    let tokenIn = null;
    let tokenOut = null;
    let amountIn = 0;
    
    for (const transfer of transfers) {
      if (transfer.mint === 'So11111111111111111111111111111111111111112') {
        tokenIn = 'SOL';
        amountIn = transfer.tokenAmount / 1e9;
      } else {
        tokenOut = transfer.mint;
      }
    }
    
    if (tokenIn && tokenOut && amountIn > 0) {
      return { tokenIn, tokenOut, amountIn };
    }
    
    return null;
  }
  
  async copyTrade(swapInfo) {
    if (this.positions.length >= CONFIG.maxCopies) {
      console.log('⚠️ Max positions reached, skipping copy');
      return;
    }
    
    console.log(`💰 Copying trade: ${CONFIG.copyAmount} SOL → ${swapInfo.tokenOut.slice(0, 8)}...`);
    
    try {
      const amountLamports = Math.floor(CONFIG.copyAmount * 1e9);
      
      const params = new URLSearchParams({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: swapInfo.tokenOut,
        amount: amountLamports.toString(),
        taker: this.wallet.publicKey.toBase58(),
        priorityFee: '50000'
      });
      
      const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': CONFIG.jupiterApiKey
        }
      });
      
      const order = await orderResponse.json();
      
      if (order.errorCode) {
        throw new Error(order.errorMessage);
      }
      
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
      tx.sign([this.wallet]);
      
      const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': CONFIG.jupiterApiKey
        },
        body: JSON.stringify({
          signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
          requestId: order.requestId
        })
      });
      
      const result = await executeResponse.json();
      
      if (result.status === 'Success') {
        console.log(`✅ COPY TRADE SUCCESS: ${result.signature}\n`);
        
        this.positions.push({
          token: swapInfo.tokenOut,
          entry: CONFIG.copyAmount,
          timestamp: Date.now(),
          signature: result.signature
        });
      } else {
        console.log(`❌ Copy trade failed: ${result.error}\n`);
      }
      
    } catch (err) {
      console.log(`❌ Copy trade error: ${err.message}\n`);
    }
  }
  
  async run() {
    console.log('🐋 WHALE COPY TRADER STARTING\n');
    console.log(`Wallet: ${this.wallet.publicKey.toBase58()}`);
    console.log(`Copy amount: ${CONFIG.copyAmount} SOL`);
    console.log(`Max positions: ${CONFIG.maxCopies}\n`);
    
    // Find whales if list is empty
    if (CONFIG.whales.length === 0) {
      console.log('No whales configured. Finding successful traders...\n');
      const foundWhales = await this.findWhales();
      CONFIG.whales.push(...foundWhales);
    }
    
    if (CONFIG.whales.length === 0) {
      console.log('❌ No whales found. Add wallet addresses to CONFIG.whales');
      return;
    }
    
    console.log(`Monitoring ${CONFIG.whales.length} whale wallets:\n`);
    CONFIG.whales.forEach((w, i) => console.log(`${i + 1}. ${w.slice(0, 8)}...`));
    console.log();
    
    // Monitor loop
    while (true) {
      for (const whale of CONFIG.whales) {
        await this.monitorWhale(whale);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    }
  }
}

const copier = new WhaleCopier();
copier.run();
