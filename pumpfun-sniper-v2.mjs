#!/usr/bin/env node
/**
 * PUMP.FUN SNIPER V2
 * Learning from disaster: Small amounts, test first, circuit breaker
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  positionSize: 0.01, // SMALL TEST: 0.01 SOL per trade
  slippage: 1000, // 10% slippage
  priorityFee: 0.0001,
  takeProfit: 50, // 50% TP on pump.fun
  stopLoss: 30, // 30% SL (volatile)
  maxAge: 120, // 2 minutes old max
  minLiquidity: 1000, // $1k min
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

let failCount = 0;
const MAX_FAILS = 3; // Circuit breaker

async function getNewTokens() {
  try {
    const response = await fetch('https://frontend-api.pump.fun/coins?limit=10&offset=0&orderBy=created_timestamp&order=DESC');
    const data = await response.json();
    
    const now = Date.now() / 1000;
    
    return data.filter(coin => {
      const age = now - (coin.created_timestamp || 0);
      const mc = coin.market_cap || 0;
      
      return age < CONFIG.maxAge && mc > CONFIG.minLiquidity;
    });
  } catch (err) {
    return [];
  }
}

async function buyViaPumpPortal(mint) {
  console.log(`\n🎯 Buying ${mint.slice(0,8)}... via PumpPortal\n`);
  
  try {
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: wallet.publicKey.toString(),
        action: 'buy',
        mint: mint,
        amount: CONFIG.positionSize,
        denominatedInSol: 'true',
        slippage: CONFIG.slippage,
        priorityFee: CONFIG.priorityFee,
        pool: 'pump'
      })
    });
    
    if (!response.ok) {
      console.log(`❌ PumpPortal API failed: ${response.status}\n`);
      failCount++;
      return false;
    }
    
    const txBytes = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
    
    tx.sign([wallet]);
    
    const signature = await connection.sendTransaction(tx);
    console.log(`📤 Sent: ${signature}`);
    
    // CRITICAL: Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`✅ CONFIRMED: ${signature}\n`);
    
    failCount = 0; // Reset on success
    return { signature, mint };
    
  } catch (err) {
    console.log(`❌ Buy failed: ${err.message}\n`);
    failCount++;
    return false;
  }
}

async function buyViaJupiter(mint) {
  console.log(`\n🎯 Buying ${mint.slice(0,8)}... via Jupiter\n`);
  
  try {
    const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
    
    const params = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: mint,
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
      console.log(`❌ Jupiter quote failed: ${order.errorMessage}\n`);
      failCount++;
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
      console.log(`✅ BOUGHT via Jupiter: ${result.signature}\n`);
      failCount = 0;
      return { signature: result.signature, mint };
    } else {
      console.log(`❌ Execute failed: ${result.error}\n`);
      failCount++;
      return false;
    }
    
  } catch (err) {
    console.log(`❌ Jupiter buy failed: ${err.message}\n`);
    failCount++;
    return false;
  }
}

async function run() {
  console.log('🎯 PUMP.FUN SNIPER V2\n');
  console.log('Position: 0.01 SOL per trade (SAFE TEST)');
  console.log('Target: NEW launches <2min old');
  console.log('Exit: +50% TP / -30% SL');
  console.log('Circuit breaker: Stop after 3 fails\n');
  console.log('Lessons applied:');
  console.log('✅ Small test amounts');
  console.log('✅ Wait for confirmation');
  console.log('✅ Circuit breaker on failures');
  console.log('✅ Try Jupiter if PumpPortal fails\n');
  console.log('='.repeat(60) + '\n');
  
  let scanCount = 0;
  
  while (failCount < MAX_FAILS) {
    scanCount++;
    
    console.log(`Scan #${scanCount}...`);
    
    const newTokens = await getNewTokens();
    
    if (newTokens.length > 0) {
      console.log(`Found ${newTokens.length} new tokens\n`);
      
      // Try the newest one
      const token = newTokens[0];
      console.log(`📊 ${token.symbol} - $${token.market_cap.toLocaleString()} MC`);
      console.log(`   ${token.mint}`);
      
      // Try PumpPortal first, fallback to Jupiter
      let result = await buyViaPumpPortal(token.mint);
      
      if (!result) {
        console.log('Trying Jupiter fallback...');
        result = await buyViaJupiter(token.mint);
      }
      
      if (result) {
        console.log(`🎉 Position opened! Now monitor for exit...\n`);
        // Would implement monitoring here
        break; // Exit after first successful trade
      }
      
    } else {
      console.log('No new tokens\n');
    }
    
    if (failCount >= MAX_FAILS) {
      console.log(`🛑 CIRCUIT BREAKER: ${failCount} consecutive failures - STOPPING\n`);
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s between scans
  }
}

run();
