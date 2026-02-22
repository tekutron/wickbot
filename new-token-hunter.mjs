#!/usr/bin/env node
// Hunt BRAND NEW tokens on DexScreener and trade FAST
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  positionSize: 0.015, // 0.015 SOL per trade
  takeProfit: 40, // 40% TP
  stopLoss: 25, // 25% SL
  maxAgeMinutes: 5, // <5 min old
  minLiquidity: 2000,
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

const traded = new Set(); // Track what we've traded

async function findNew() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/search/?q=solana');
  const data = await response.json();
  
  const now = Date.now();
  
  for (const pair of data.pairs || []) {
    const addr = pair.baseToken.address;
    
    if (traded.has(addr)) continue;
    if (!addr.endsWith('pump')) continue; // pump.fun tokens
    
    const createdAt = pair.pairCreatedAt;
    if (!createdAt) continue;
    
    const ageMinutes = (now - createdAt) / 60000;
    
    if (ageMinutes > CONFIG.maxAgeMinutes) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    if (liq < CONFIG.minLiquidity) continue;
    
    const vol = parseFloat(pair.volume?.h1 || 0);
    if (vol < 500) continue; // Need some volume
    
    return {
      mint: addr,
      symbol: pair.baseToken.symbol,
      price: parseFloat(pair.priceUsd),
      liq,
      vol,
      age: ageMinutes.toFixed(1)
    };
  }
  
  return null;
}

async function buy(token) {
  console.log(`\n🚀 BUYING ${token.symbol}`);
  console.log(`   Age: ${token.age} min | Liq: $${token.liq.toLocaleString()}`);
  console.log(`   ${token.mint}\n`);
  
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
      console.log(`❌ Quote failed: ${order.errorMessage}\n`);
      return false;
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
      console.log(`✅ BOUGHT: ${result.signature}`);
      console.log(`📊 Entry: $${token.price.toFixed(8)}\n`);
      
      traded.add(token.mint);
      
      return {
        mint: token.mint,
        symbol: token.symbol,
        entry: token.price,
        timestamp: Date.now()
      };
    } else {
      console.log(`❌ Execute failed\n`);
      return false;
    }
    
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function monitor(position) {
  console.log(`\n👀 Monitoring ${position.symbol}...\n`);
  
  while (true) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${position.mint}`);
      const data = await response.json();
      const pair = data.pairs[0];
      
      const currentPrice = parseFloat(pair.priceUsd);
      const pnl = ((currentPrice - position.entry) / position.entry * 100);
      
      const holdTime = Math.floor((Date.now() - position.timestamp) / 1000);
      
      process.stdout.write(`\r📊 ${position.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% (${holdTime}s)  `);
      
      if (pnl >= CONFIG.takeProfit) {
        console.log(`\n\n🟢 TP HIT! Exiting...\n`);
        return 'TP';
      } else if (pnl <= -CONFIG.stopLoss) {
        console.log(`\n\n🔴 SL HIT! Exiting...\n`);
        return 'SL';
      } else if (holdTime > 600) {
        console.log(`\n\n⏰ MAX HOLD! Exiting...\n`);
        return 'TIME';
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3s
      
    } catch (err) {
      console.log(`\n\n❌ Monitor error: ${err.message}\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function run() {
  console.log('🎯 NEW TOKEN HUNTER\n');
  console.log('Target: <5min old pump.fun tokens');
  console.log('Position: 0.015 SOL');
  console.log('Exit: +40% TP / -25% SL / 10min max\n');
  console.log('='.repeat(60) + '\n');
  
  let trades = 0;
  
  while (trades < 10) {
    console.log(`Scan #${trades + 1}...`);
    
    const token = await findNew();
    
    if (token) {
      const position = await buy(token);
      
      if (position) {
        trades++;
        const exitReason = await monitor(position);
        console.log(`Exit reason: ${exitReason}\n`);
        console.log('='.repeat(60) + '\n');
      }
    } else {
      console.log('No new tokens found\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15s between scans
  }
  
  console.log('\n🏁 Completed 10 trades!\n');
}

run();
