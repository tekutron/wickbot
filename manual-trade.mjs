#!/usr/bin/env node
/**
 * Manual Trading Interface - Real-time Analysis + Quick Execution
 * For smart, manual trading decisions based on live data
 */

import { Connection, Keypair } from '@solana/web3.js';
import { VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const CONFIG = {
  wallet: './wallets/wickbot_wallet.json',
  rpc: 'https://api.mainnet-beta.solana.com',
  jupiterApiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8',
  balance: 0.1458 // SOL
};

class ManualTrader {
  constructor() {
    const walletData = JSON.parse(fs.readFileSync(CONFIG.wallet));
    this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    this.connection = new Connection(CONFIG.rpc, 'confirmed');
  }
  
  async analyzeToken(mint) {
    console.log(`\n📊 ANALYZING: ${mint}\n`);
    console.log('=' .repeat(80));
    
    // Get DexScreener data
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      console.log('❌ No trading pairs found');
      return null;
    }
    
    const pair = data.pairs[0];
    const symbol = pair.baseToken.symbol;
    const name = pair.baseToken.name;
    const price = parseFloat(pair.priceUsd);
    const liquidity = parseFloat(pair.liquidity.usd);
    
    console.log(`Token: ${symbol} - ${name}`);
    console.log(`Price: $${price.toFixed(8)}`);
    console.log(`Liquidity: $${liquidity.toLocaleString()}\n`);
    
    // Momentum
    const m5 = parseFloat(pair.priceChange.m5 || 0);
    const h1 = parseFloat(pair.priceChange.h1 || 0);
    const h6 = parseFloat(pair.priceChange.h6 || 0);
    const h24 = parseFloat(pair.priceChange.h24 || 0);
    
    console.log('MOMENTUM:');
    console.log(`  5min:  ${m5 > 0 ? '+' : ''}${m5.toFixed(2)}%`);
    console.log(`  1hour: ${h1 > 0 ? '+' : ''}${h1.toFixed(2)}%`);
    console.log(`  6hour: ${h6 > 0 ? '+' : ''}${h6.toFixed(2)}%`);
    console.log(`  24hour: ${h24 > 0 ? '+' : ''}${h24.toFixed(2)}%\n`);
    
    // Volume
    const vol_h1 = parseFloat(pair.volume.h1 || 0);
    const vol_h6 = parseFloat(pair.volume.h6 || 0);
    const vol_h24 = parseFloat(pair.volume.h24 || 0);
    
    console.log('VOLUME:');
    console.log(`  1hour:  $${vol_h1.toLocaleString()}`);
    console.log(`  6hour:  $${vol_h6.toLocaleString()}`);
    console.log(`  24hour: $${vol_h24.toLocaleString()}\n`);
    
    // Activity
    const buys = pair.txns.h1.buys;
    const sells = pair.txns.h1.sells;
    const total = buys + sells;
    const buyPressure = total > 0 ? (buys / total * 100) : 0;
    
    console.log('ACTIVITY (Last Hour):');
    console.log(`  Buys: ${buys} | Sells: ${sells}`);
    console.log(`  Buy Pressure: ${buyPressure.toFixed(1)}%\n`);
    
    // DECISION
    console.log('🎯 TRADE RECOMMENDATION:\n');
    
    let signal = 'WAIT';
    let reasoning = [];
    
    // Check for strong uptrend
    if (m5 > 3 && h1 > 5 && buyPressure > 55) {
      signal = 'BUY';
      reasoning.push('✅ Strong uptrend with buy pressure');
    }
    // Check for reversal setup
    else if (h1 < -10 && m5 > 2 && buyPressure > 60) {
      signal = 'BUY DIP';
      reasoning.push('✅ Oversold with reversal signs');
    }
    // Check for downtrend
    else if (m5 < -3 && h1 < 0 && buyPressure < 45) {
      signal = 'AVOID';
      reasoning.push('❌ Downtrend with sell pressure');
    }
    // Flat/choppy
    else {
      signal = 'WAIT';
      reasoning.push('⏸️ No clear signal - wait for setup');
    }
    
    console.log(`Signal: ${signal}`);
    reasoning.forEach(r => console.log(`  ${r}`));
    
    return {
      symbol,
      name,
      mint,
      price,
      liquidity,
      momentum: { m5, h1, h6, h24 },
      volume: { h1: vol_h1, h6: vol_h6, h24: vol_h24 },
      buyPressure,
      signal,
      reasoning
    };
  }
  
  async getQuote(inputMint, outputMint, amount) {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      taker: this.wallet.publicKey.toBase58(),
      priorityFee: '50000'
    });
    
    const response = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONFIG.jupiterApiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Quote failed: ${response.status}`);
    }
    
    const order = await response.json();
    
    if (order.errorCode) {
      throw new Error(order.errorMessage);
    }
    
    return order;
  }
  
  async executeBuy(mint, solAmount) {
    console.log(`\n💰 BUYING ${solAmount} SOL → ${mint}\n`);
    
    const amountLamports = Math.floor(solAmount * 1e9);
    
    try {
      const order = await this.getQuote(
        'So11111111111111111111111111111111111111112',
        mint,
        amountLamports
      );
      
      const outAmount = parseInt(order.outAmount);
      console.log(`Quote: ${(outAmount / 1e9).toFixed(4)} tokens`);
      console.log(`Price Impact: ${order.priceImpactPct}%\n`);
      
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
      
      if (result.status !== 'Success') {
        throw new Error(result.error || 'Execute failed');
      }
      
      console.log(`✅ BUY COMPLETE: ${result.signature}\n`);
      
      return {
        success: true,
        signature: result.signature,
        tokenAmount: outAmount / 1e9
      };
      
    } catch (err) {
      console.log(`❌ Buy failed: ${err.message}\n`);
      return { success: false, error: err.message };
    }
  }
  
  async executeSell(mint, tokenAmount) {
    console.log(`\n💰 SELLING ${tokenAmount.toLocaleString()} tokens → SOL\n`);
    
    const amountRaw = Math.floor(tokenAmount * 1e9);
    
    try {
      const order = await this.getQuote(
        mint,
        'So11111111111111111111111111111111111111112',
        amountRaw
      );
      
      const solOut = parseInt(order.outAmount) / 1e9;
      console.log(`Quote: ${solOut.toFixed(6)} SOL`);
      console.log(`Price Impact: ${order.priceImpactPct}%\n`);
      
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
      
      if (result.status !== 'Success') {
        throw new Error(result.error || 'Execute failed');
      }
      
      console.log(`✅ SELL COMPLETE: ${result.signature}\n`);
      
      return {
        success: true,
        signature: result.signature,
        solReceived: solOut
      };
      
    } catch (err) {
      console.log(`❌ Sell failed: ${err.message}\n`);
      return { success: false, error: err.message };
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];
const trader = new ManualTrader();

(async () => {
  if (command === 'analyze') {
    const mint = args[1];
    if (!mint) {
      console.log('Usage: node manual-trade.mjs analyze <mint_address>');
      process.exit(1);
    }
    await trader.analyzeToken(mint);
  }
  else if (command === 'buy') {
    const mint = args[1];
    const amount = parseFloat(args[2]);
    if (!mint || !amount) {
      console.log('Usage: node manual-trade.mjs buy <mint_address> <sol_amount>');
      process.exit(1);
    }
    await trader.executeBuy(mint, amount);
  }
  else if (command === 'sell') {
    const mint = args[1];
    const amount = parseFloat(args[2]);
    if (!mint || !amount) {
      console.log('Usage: node manual-trade.mjs sell <mint_address> <token_amount>');
      process.exit(1);
    }
    await trader.executeSell(mint, amount);
  }
  else {
    console.log(`
🎯 MANUAL TRADING INTERFACE

Commands:
  analyze <mint>              - Real-time analysis of any token
  buy <mint> <sol_amount>     - Execute buy order
  sell <mint> <token_amount>  - Execute sell order

Examples:
  node manual-trade.mjs analyze B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump
  node manual-trade.mjs buy B1Aeqi...pump 0.05
  node manual-trade.mjs sell B1Aeqi...pump 1000000

💰 Current Balance: ${CONFIG.balance} SOL
🎯 Target: 1.0 SOL (6.9x needed)
⏰ Time: ~4.5 hours remaining
    `);
  }
})();
