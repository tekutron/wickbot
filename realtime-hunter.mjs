#!/usr/bin/env node
// REAL-TIME HUNTER - Monitor + Trade continuously until 1 SOL or deadline
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  targetBalance: 1.0,
  deadline: new Date('2026-02-21T22:45:00-08:00'), // 10:45 PM PST
  positionSize: 0.05, // 40% capital per trade
  minMove: 1, // 1%+ moves
  takeProfit: 12,
  stopLoss: 6,
  maxHold: 120,
  scanInterval: 3000, // 3 seconds
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

let position = null;
let totalTrades = 0;
let wins = 0;

async function getBalance() {
  const bal = await connection.getBalance(wallet.publicKey);
  return bal / 1e9;
}

async function scan() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  for (const pair of data.pairs.slice(0, 200)) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    if (symbol.includes('SOL') || symbol.includes('USDC') || symbol.includes('USDT')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const vol = parseFloat(pair.volume?.h1 || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    const m1 = parseFloat(pair.priceChange?.m1 || 0);
    
    if (liq < 2000 || vol < 500) continue;
    
    const txns = pair.txns?.h1 || {};
    const total = (txns.buys || 0) + (txns.sells || 0);
    if (total < 3) continue;
    
    if (Math.abs(m5) >= CONFIG.minMove || Math.abs(m1) >= 1.5) {
      const bp = total > 0 ? ((txns.buys || 0) / total * 100) : 0;
      
      return {
        mint: addr,
        symbol,
        price: parseFloat(pair.priceUsd),
        m1,
        m5,
        liq,
        vol,
        bp
      };
    }
  }
  
  return null;
}

async function trade(token) {
  try {
    const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
    
    const params = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: token.mint,
      amount: amountLamports.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '200000'
    });
    
    const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey }
    });
    
    const order = await orderResponse.json();
    if (order.errorCode) return null;
    
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    
    const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey },
      body: JSON.stringify({
        signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
        requestId: order.requestId
      })
    });
    
    const result = await executeResponse.json();
    
    if (result.status === 'Success') {
      console.log(`\n✅ ${token.symbol} IN: ${token.m5 > 0 ? '+' : ''}${token.m5.toFixed(2)}%`);
      return { ...token, timestamp: Date.now() };
    }
    
  } catch (err) {
    // Silent fail, keep hunting
  }
  
  return null;
}

async function monitor(pos) {
  const startTime = Date.now();
  
  while (true) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.mint}`);
      const data = await response.json();
      const currentPrice = parseFloat(data.pairs[0].priceUsd);
      
      const pnl = ((currentPrice - pos.price) / pos.price * 100);
      const holdTime = (Date.now() - startTime) / 1000;
      
      const balance = await getBalance();
      const timeLeft = Math.max(0, (CONFIG.deadline - new Date()) / 1000 / 60);
      
      process.stdout.write(`\r${pos.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% | ${Math.floor(holdTime)}s | Bal: ${balance.toFixed(4)} SOL | ${timeLeft.toFixed(0)}min left  `);
      
      if (pnl >= CONFIG.takeProfit || pnl <= -CONFIG.stopLoss || holdTime > CONFIG.maxHold) {
        console.log('\n');
        const exitPnl = await exit(pos);
        
        totalTrades++;
        if (exitPnl > 0) wins++;
        
        console.log(`Trade #${totalTrades}: ${exitPnl > 0 ? '+' : ''}${exitPnl.toFixed(2)}% | W/L: ${wins}/${totalTrades - wins}\n`);
        
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function exit(pos) {
  try {
    const accounts2022 = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_2022_PROGRAM_ID });
    const accountsStandard = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID });
    const allAccounts = [...accounts2022.value, ...accountsStandard.value];
    
    let balance = 0;
    for (const account of allAccounts) {
      if (account.account.data.parsed.info.mint === pos.mint) {
        balance = parseInt(account.account.data.parsed.info.tokenAmount.amount);
        break;
      }
    }
    
    if (balance === 0) return -100;
    
    const params = new URLSearchParams({
      inputMint: pos.mint,
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: balance.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '200000'
    });
    
    const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey }
    });
    
    const order = await orderResponse.json();
    if (order.errorCode) return -100;
    
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
    tx.sign([wallet]);
    
    const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': CONFIG.apiKey },
      body: JSON.stringify({
        signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
        requestId: order.requestId
      })
    });
    
    const result = await executeResponse.json();
    
    if (result.status === 'Success') {
      const solOut = parseInt(order.outAmount) / 1e9;
      return ((solOut - CONFIG.positionSize) / CONFIG.positionSize * 100);
    }
    
  } catch (err) {
    // Silent
  }
  
  return -100;
}

async function run() {
  console.log('⚡ REAL-TIME HUNTER - LIVE\n');
  
  const balance = await getBalance();
  const timeLeft = (CONFIG.deadline - new Date()) / 1000 / 60;
  
  console.log(`Balance: ${balance.toFixed(4)} SOL`);
  console.log(`Target: ${CONFIG.targetBalance} SOL (${(CONFIG.targetBalance / balance).toFixed(2)}x)`);
  console.log(`Time: ${timeLeft.toFixed(0)} minutes`);
  console.log(`Strategy: +${CONFIG.takeProfit}% TP / -${CONFIG.stopLoss}% SL / ${CONFIG.maxHold}s max\n`);
  console.log('🎯 HUNTING UNTIL TARGET OR DEADLINE\n');
  console.log('='.repeat(60) + '\n');
  
  while (true) {
    const currentBalance = await getBalance();
    const remaining = Math.max(0, (CONFIG.deadline - new Date()) / 1000 / 60);
    
    if (currentBalance >= CONFIG.targetBalance) {
      console.log(`\n\n🎉 TARGET HIT! ${currentBalance.toFixed(4)} SOL\n`);
      break;
    }
    
    if (remaining <= 0) {
      console.log(`\n\n⏰ DEADLINE REACHED. Final: ${currentBalance.toFixed(4)} SOL\n`);
      break;
    }
    
    if (!position) {
      process.stdout.write(`\rScanning... Bal: ${currentBalance.toFixed(4)} | ${remaining.toFixed(0)}min | Trades: ${totalTrades} (${wins}W)  `);
      
      const token = await scan();
      
      if (token) {
        position = await trade(token);
        
        if (position) {
          await monitor(position);
          position = null;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.scanInterval));
  }
}

run();
