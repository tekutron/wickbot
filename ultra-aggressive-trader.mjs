#!/usr/bin/env node
/**
 * ULTRA AGGRESSIVE TRADER
 * Trades ANYTHING with 3%+ movement
 * 50% capital per trade, quick exits
 */

import { Connection, Keypair } from '@solana/web3.js';
import { VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  positionSize: 0.07, // 50% of 0.141 SOL
  minMomentum: 3, // 3% 5m minimum
  takeProfit: 15, // 15% TP
  stopLoss: 8, // 8% SL
  scanInterval: 15000, // Check every 15s
  jupiterApiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

let currentPosition = null;

async function scan() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  for (const pair of data.pairs.slice(0, 50)) {
    const symbol = pair.baseToken.symbol;
    if (symbol.includes('SOL') || symbol.includes('USDC')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    const vol = parseFloat(pair.volume?.h1 || 0);
    
    if (liq < 5000 || vol < 2000) continue;
    
    const txns = pair.txns?.h1 || {};
    const buys = txns.buys || 0;
    const sells = txns.sells || 0;
    const bp = (buys + sells) > 0 ? (buys / (buys + sells) * 100) : 0;
    
    if (Math.abs(m5) >= CONFIG.minMomentum && bp > 50) {
      return {
        symbol,
        mint: pair.baseToken.address,
        price: parseFloat(pair.priceUsd),
        m5,
        bp,
        liq,
        vol
      };
    }
  }
  
  return null;
}

async function buy(token) {
  console.log(`\n🟢 BUYING ${token.symbol}`);
  console.log(`   5m: ${token.m5 > 0 ? '+' : ''}${token.m5.toFixed(2)}% | BP: ${token.bp.toFixed(1)}%\n`);
  
  const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
  
  try {
    const params = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: token.mint,
      amount: amountLamports.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '50000'
    });
    
    const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONFIG.jupiterApiKey
      }
    });
    
    const order = await orderResponse.json();
    if (order.errorCode) throw new Error(order.errorMessage);
    
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    
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
      console.log(`✅ BOUGHT: ${result.signature}\n`);
      
      currentPosition = {
        symbol: token.symbol,
        mint: token.mint,
        entry: token.price,
        solIn: CONFIG.positionSize,
        timestamp: Date.now()
      };
      
      return true;
    }
  } catch (err) {
    console.log(`❌ Buy failed: ${err.message}\n`);
  }
  
  return false;
}

async function checkPosition() {
  if (!currentPosition) return;
  
  // Get current price
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${currentPosition.mint}`);
  const data = await response.json();
  const pair = data.pairs[0];
  
  const currentPrice = parseFloat(pair.priceUsd);
  const pnl = ((currentPrice - currentPosition.entry) / currentPosition.entry * 100);
  
  const holdTime = (Date.now() - currentPosition.timestamp) / 1000;
  
  console.log(`📊 ${currentPosition.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% (${Math.floor(holdTime)}s)`);
  
  // Exit conditions
  if (pnl >= CONFIG.takeProfit) {
    console.log(`🟢 TP HIT - SELLING`);
    await sell('TP');
  } else if (pnl <= -CONFIG.stopLoss) {
    console.log(`🔴 SL HIT - SELLING`);
    await sell('SL');
  } else if (holdTime > 300) { // 5 min max
    console.log(`⏰ MAX HOLD - SELLING`);
    await sell('TIME');
  }
}

async function sell(reason) {
  if (!currentPosition) return;
  
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let balance = 0;
    for (const account of accounts.value) {
      if (account.account.data.parsed.info.mint === currentPosition.mint) {
        balance = parseInt(account.account.data.parsed.info.tokenAmount.amount);
        break;
      }
    }
    
    if (balance === 0) {
      console.log('No tokens to sell\n');
      currentPosition = null;
      return;
    }
    
    const params = new URLSearchParams({
      inputMint: currentPosition.mint,
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: balance.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '50000'
    });
    
    const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONFIG.jupiterApiKey
      }
    });
    
    const order = await orderResponse.json();
    if (order.errorCode) throw new Error(order.errorMessage);
    
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    
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
      const solOut = parseInt(order.outAmount) / 1e9;
      const pnl = ((solOut - currentPosition.solIn) / currentPosition.solIn * 100);
      
      console.log(`✅ SOLD (${reason}): ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
      console.log(`   ${result.signature}\n`);
      
      currentPosition = null;
    }
  } catch (err) {
    console.log(`❌ Sell failed: ${err.message}\n`);
  }
}

async function run() {
  console.log('⚡ ULTRA AGGRESSIVE TRADER\n');
  console.log(`Position: ${CONFIG.positionSize} SOL (50% capital)`);
  console.log(`Entry: ≥${CONFIG.minMomentum}% 5m momentum`);
  console.log(`Exit: +${CONFIG.takeProfit}% TP / -${CONFIG.stopLoss}% SL`);
  console.log(`Scan: Every ${CONFIG.scanInterval / 1000}s\n`);
  console.log('🎯 Target: 7x in 3 hours - HUNTING NOW\n');
  console.log('='.repeat(60) + '\n');
  
  let scanCount = 0;
  
  while (true) {
    scanCount++;
    
    if (currentPosition) {
      await checkPosition();
    } else {
      process.stdout.write(`Scan #${scanCount}...`);
      
      const opportunity = await scan();
      
      if (opportunity) {
        console.log(` FOUND!\n`);
        await buy(opportunity);
      } else {
        console.log(` no setup\n`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, currentPosition ? 5000 : CONFIG.scanInterval));
  }
}

run();
