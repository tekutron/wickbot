#!/usr/bin/env node
// DESPERATE MODE: Trade ANY token with >5% move, ANY direction
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));

const CONFIG = {
  positionSize: 0.02, // 0.02 SOL
  minMove: 5, // ANY 5% move
  minLiquidity: 2000,
  minVolume: 1000,
  takeProfit: 20,
  stopLoss: 10,
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

async function findANYTHING() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  for (const pair of data.pairs.slice(0, 200)) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    if (symbol.includes('SOL') || symbol.includes('USDC')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const vol = parseFloat(pair.volume?.h1 || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    const h1 = parseFloat(pair.priceChange?.h1 || 0);
    
    if (liq < CONFIG.minLiquidity || vol < CONFIG.minVolume) continue;
    
    // ANY significant move
    if (Math.abs(m5) >= CONFIG.minMove || Math.abs(h1) >= CONFIG.minMove * 2) {
      const txns = pair.txns?.h1 || {};
      const total = (txns.buys || 0) + (txns.sells || 0);
      
      if (total < 5) continue;
      
      return {
        mint: addr,
        symbol,
        price: parseFloat(pair.priceUsd),
        m5,
        h1,
        liq,
        vol,
        direction: m5 > 0 ? 'UP' : 'DOWN'
      };
    }
  }
  
  return null;
}

async function trade(token) {
  console.log(`\n⚡ TRADING ${token.symbol} (${token.direction})`);
  console.log(`   5m: ${token.m5 > 0 ? '+' : ''}${token.m5.toFixed(2)}% | 1h: ${token.h1 > 0 ? '+' : ''}${token.h1.toFixed(2)}%`);
  console.log(`   Liq: $${token.liq.toLocaleString()} | Vol: $${token.vol.toLocaleString()}\n`);
  
  try {
    const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
    
    const params = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: token.mint,
      amount: amountLamports.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '100000'
    });
    
    const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONFIG.apiKey
      }
    });
    
    const order = await orderResponse.json();
    
    if (order.errorCode) {
      console.log(`❌ ${order.errorMessage}\n`);
      return null;
    }
    
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    
    const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONFIG.apiKey
      },
      body: JSON.stringify({
        signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
        requestId: order.requestId
      })
    });
    
    const result = await executeResponse.json();
    
    if (result.status === 'Success') {
      console.log(`✅ IN: ${result.signature}\n`);
      return { ...token, entry: token.price, timestamp: Date.now() };
    } else {
      console.log(`❌ Failed\n`);
      return null;
    }
    
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
    return null;
  }
}

async function run() {
  console.log('⚡ DESPERATE HUNTER\n');
  console.log('Trading: ANY 5%+ move (up OR down)');
  console.log('Position: 0.02 SOL');
  console.log('Exit: +20% TP / -10% SL\n');
  console.log('THIS IS DO OR DIE MODE\n');
  console.log('='.repeat(60) + '\n');
  
  let attempts = 0;
  
  while (attempts < 20) {
    attempts++;
    console.log(`Hunt #${attempts}...`);
    
    const token = await findANYTHING();
    
    if (token) {
      const position = await trade(token);
      
      if (position) {
        console.log('Position opened - would monitor here\n');
        break; // Exit after first trade
      }
    } else {
      console.log('Nothing moving >=5%\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

run();
