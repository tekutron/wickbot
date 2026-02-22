#!/usr/bin/env node
/**
 * ARBITRAGE EXECUTOR
 * Execute profitable arbitrage trades on BONK/WIF
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  tokens: [
    { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', minSpread: 0.8 },
    { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', minSpread: 0.3 },
  ],
  positionSize: 0.03, // 0.03 SOL per arb
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

async function checkSpread(token) {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`);
  const data = await response.json();
  
  if (!data.pairs || data.pairs.length < 2) return null;
  
  let highest = null;
  let lowest = null;
  
  for (const pair of data.pairs.slice(0, 10)) {
    const price = parseFloat(pair.priceUsd);
    const liq = parseFloat(pair.liquidity.usd);
    
    if (liq < 10000) continue;
    
    if (!highest || price > highest.price) {
      highest = { price, dex: pair.dexId };
    }
    if (!lowest || price < lowest.price) {
      lowest = { price, dex: pair.dexId };
    }
  }
  
  if (highest && lowest && highest.price !== lowest.price) {
    const spread = ((highest.price - lowest.price) / lowest.price * 100);
    const netSpread = spread - 0.6; // After fees
    
    if (netSpread >= token.minSpread) {
      return { token, spread, netSpread, buyPrice: lowest.price, sellPrice: highest.price };
    }
  }
  
  return null;
}

async function executeArbitrage(opp) {
  console.log(`\n💰 ARBITRAGE: ${opp.token.symbol}`);
  console.log(`   Spread: ${opp.spread.toFixed(2)}% | Net: ${opp.netSpread.toFixed(2)}%`);
  console.log(`   Buy: $${opp.buyPrice.toFixed(8)} → Sell: $${opp.sellPrice.toFixed(8)}\n`);
  
  try {
    // Step 1: Buy on cheap DEX via Jupiter
    console.log('1️⃣ Buying...');
    
    const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
    
    const buyParams = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: opp.token.mint,
      amount: amountLamports.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '50000'
    });
    
    const buyOrder = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${buyParams}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey }
    });
    
    const buyData = await buyOrder.json();
    if (buyData.errorCode) throw new Error(buyData.errorMessage);
    
    const buyTx = VersionedTransaction.deserialize(Buffer.from(buyData.transaction, 'base64'));
    buyTx.sign([wallet]);
    
    const buyExecute = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey },
      body: JSON.stringify({
        signedTransaction: Buffer.from(buyTx.serialize()).toString('base64'),
        requestId: buyData.requestId
      })
    });
    
    const buyResult = await buyExecute.json();
    
    if (buyResult.status !== 'Success') {
      throw new Error('Buy failed');
    }
    
    console.log(`   ✅ Bought: ${buyResult.signature}`);
    
    // Step 2: Immediately sell back to SOL
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    
    console.log('2️⃣ Selling...');
    
    // Get token balance
    const accounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { mint: new PublicKey(opp.token.mint) }
    );
    
    if (accounts.value.length === 0) {
      throw new Error('No token balance');
    }
    
    const tokenBalance = parseInt(accounts.value[0].account.data.parsed.info.tokenAmount.amount);
    
    const sellParams = new URLSearchParams({
      inputMint: opp.token.mint,
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: tokenBalance.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '50000'
    });
    
    const sellOrder = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${sellParams}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey }
    });
    
    const sellData = await sellOrder.json();
    if (sellData.errorCode) throw new Error(sellData.errorMessage);
    
    const sellTx = VersionedTransaction.deserialize(Buffer.from(sellData.transaction, 'base64'));
    sellTx.sign([wallet]);
    
    const sellExecute = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey },
      body: JSON.stringify({
        signedTransaction: Buffer.from(sellTx.serialize()).toString('base64'),
        requestId: sellData.requestId
      })
    });
    
    const sellResult = await sellExecute.json();
    
    if (sellResult.status !== 'Success') {
      throw new Error('Sell failed');
    }
    
    const solOut = parseInt(sellData.outAmount) / 1e9;
    const profit = solOut - CONFIG.positionSize;
    const profitPct = (profit / CONFIG.positionSize * 100);
    
    console.log(`   ✅ Sold: ${sellResult.signature}`);
    console.log(`   💰 Profit: ${profit > 0 ? '+' : ''}${profit.toFixed(6)} SOL (${profitPct > 0 ? '+' : ''}${profitPct.toFixed(2)}%)\n`);
    
    return profit;
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
    return 0;
  }
}

async function run() {
  console.log('⚡ ARBITRAGE EXECUTOR\n');
  console.log('Executing BONK + WIF arbitrage opportunities');
  console.log(`Position: ${CONFIG.positionSize} SOL per trade\n`);
  console.log('='.repeat(60) + '\n');
  
  let totalProfit = 0;
  let trades = 0;
  
  for (let i = 0; i < 10; i++) {
    console.log(`\nRound ${i + 1}/10...`);
    
    for (const token of CONFIG.tokens) {
      const opp = await checkSpread(token);
      
      if (opp) {
        const profit = await executeArbitrage(opp);
        totalProfit += profit;
        if (profit > 0) trades++;
      } else {
        console.log(`${token.symbol}: No opportunity (spread < ${token.minSpread}%)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n💰 Session: ${trades} profitable trades, ${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(6)} SOL total\n`);
    
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log(`\n🏁 FINAL: ${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(6)} SOL from arbitrage\n`);
}

run();
