#!/usr/bin/env node
// ULTRA AGGRESSIVE V2 - Trade ANYTHING with 2%+ move
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  positionSize: 0.04, // 0.04 SOL per trade (30% capital)
  minMove: 2, // Lower to 2%
  takeProfit: 15,
  stopLoss: 8,
  maxHold: 180, // 3 min max hold
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

let position = null;

async function scan() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  for (const pair of data.pairs.slice(0, 100)) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    if (symbol.includes('SOL') || symbol.includes('USDC') || symbol.includes('USDT')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const vol = parseFloat(pair.volume?.h1 || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    
    if (liq < 3000 || vol < 1000) continue;
    
    const txns = pair.txns?.h1 || {};
    const total = (txns.buys || 0) + (txns.sells || 0);
    if (total < 5) continue;
    
    if (Math.abs(m5) >= CONFIG.minMove) {
      return {
        mint: addr,
        symbol,
        price: parseFloat(pair.priceUsd),
        m5,
        liq,
        vol
      };
    }
  }
  
  return null;
}

async function buy(token) {
  console.log(`\n🚀 ${token.symbol}: ${token.m5 > 0 ? '+' : ''}${token.m5.toFixed(2)}%`);
  
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
    if (order.errorCode) throw new Error(order.errorMessage);
    
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
      console.log(`✅ IN\n`);
      return { ...token, timestamp: Date.now() };
    }
    
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }
  
  return null;
}

async function monitor(pos) {
  while (true) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.mint}`);
      const data = await response.json();
      const currentPrice = parseFloat(data.pairs[0].priceUsd);
      
      const pnl = ((currentPrice - pos.price) / pos.price * 100);
      const holdTime = (Date.now() - pos.timestamp) / 1000;
      
      process.stdout.write(`\r${pos.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% (${Math.floor(holdTime)}s)  `);
      
      if (pnl >= CONFIG.takeProfit || pnl <= -CONFIG.stopLoss || holdTime > CONFIG.maxHold) {
        console.log(`\n\n${pnl >= CONFIG.takeProfit ? '🟢 TP' : pnl <= -CONFIG.stopLoss ? '🔴 SL' : '⏰ TIME'} - Exiting\n`);
        await sell(pos);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function sell(pos) {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let balance = 0;
    for (const account of accounts.value) {
      if (account.account.data.parsed.info.mint === pos.mint) {
        balance = parseInt(account.account.data.parsed.info.tokenAmount.amount);
        break;
      }
    }
    
    if (balance === 0) {
      console.log('No tokens\n');
      return;
    }
    
    const params = new URLSearchParams({
      inputMint: pos.mint,
      outputMint: 'So11111111111111111111111111111111111111112',
      amount: balance.toString(),
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
    if (order.errorCode) throw new Error(order.errorMessage);
    
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
      const solOut = parseInt(order.outAmount) / 1e9;
      const pnl = ((solOut - CONFIG.positionSize) / CONFIG.positionSize * 100);
      console.log(`✅ OUT: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`);
    }
    
  } catch (err) {
    console.log(`❌ Sell failed: ${err.message}\n`);
  }
}

async function run() {
  console.log('⚡ ULTRA AGGRESSIVE V2\n');
  console.log('Entry: ANY 2%+ move');
  console.log('Position: 0.04 SOL (30% capital)');
  console.log('Exit: +15% TP / -8% SL / 3min max\n');
  console.log('DO OR DIE MODE\n');
  console.log('='.repeat(60) + '\n');
  
  let trades = 0;
  
  while (trades < 20) {
    if (!position) {
      const token = await scan();
      
      if (token) {
        position = await buy(token);
        if (position) {
          trades++;
          await monitor(position);
          position = null;
        }
      } else {
        process.stdout.write(`\rScanning... (${trades} trades)  `);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

run();
