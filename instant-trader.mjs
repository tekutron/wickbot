#!/usr/bin/env node
// INSTANT TRADER - Trade the FIRST thing that moves 1%+
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import fs from 'fs';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const CONFIG = {
  positionSize: 0.05, // 0.05 SOL - bigger
  minMove: 1, // ANY 1% move
  takeProfit: 10, // Lower TP to 10%
  stopLoss: 5, // Tighter SL 5%
  maxHold: 120, // 2 min
  apiKey: '1f76dcbd-dc35-4766-a29e-d81e2b31a7a8'
};

async function findFirst() {
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
  const data = await response.json();
  
  for (const pair of data.pairs.slice(0, 150)) {
    const symbol = pair.baseToken.symbol;
    const addr = pair.baseToken.address;
    
    if (symbol.includes('SOL') || symbol.includes('USDC') || symbol.includes('USDT')) continue;
    
    const liq = parseFloat(pair.liquidity?.usd || 0);
    const vol = parseFloat(pair.volume?.h1 || 0);
    const m1 = parseFloat(pair.priceChange?.m1 || 0);
    const m5 = parseFloat(pair.priceChange?.m5 || 0);
    
    if (liq < 2000 || vol < 500) continue;
    
    if (Math.abs(m5) >= CONFIG.minMove || Math.abs(m1) >= CONFIG.minMove) {
      const txns = pair.txns?.h1 || {};
      const total = (txns.buys || 0) + (txns.sells || 0);
      if (total < 3) continue;
      
      return {
        mint: addr,
        symbol,
        price: parseFloat(pair.priceUsd),
        m1,
        m5,
        liq,
        vol
      };
    }
  }
  
  return null;
}

async function trade(token) {
  console.log(`\n🚀 ${token.symbol}`);
  console.log(`   1m: ${token.m1 > 0 ? '+' : ''}${token.m1.toFixed(2)}% | 5m: ${token.m5 > 0 ? '+' : ''}${token.m5.toFixed(2)}%`);
  console.log(`   Liq: $${token.liq.toLocaleString()}\n`);
  
  try {
    const amountLamports = Math.floor(CONFIG.positionSize * 1e9);
    
    const params = new URLSearchParams({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: token.mint,
      amount: amountLamports.toString(),
      taker: wallet.publicKey.toBase58(),
      priorityFee: '150000'
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
    
    if (result.status !== 'Success') {
      console.log(`❌ Failed: ${result.error || 'Unknown'}\n`);
      return null;
    }
    
    console.log(`✅ BOUGHT: ${result.signature}\n`);
    
    // Monitor
    const startTime = Date.now();
    
    while (true) {
      try {
        const priceResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`);
        const priceData = await priceResponse.json();
        const currentPrice = parseFloat(priceData.pairs[0].priceUsd);
        
        const pnl = ((currentPrice - token.price) / token.price * 100);
        const holdTime = (Date.now() - startTime) / 1000;
        
        process.stdout.write(`\r${token.symbol}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% (${Math.floor(holdTime)}s)  `);
        
        if (pnl >= CONFIG.takeProfit || pnl <= -CONFIG.stopLoss || holdTime > CONFIG.maxHold) {
          console.log(`\n\n${pnl >= CONFIG.takeProfit ? '🟢 TP' : pnl <= -CONFIG.stopLoss ? '🔴 SL' : '⏰ TIME'}\n`);
          
          // Sell
          const accounts2022 = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            { programId: TOKEN_2022_PROGRAM_ID }
          );
          
          const accountsStandard = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            { programId: TOKEN_PROGRAM_ID }
          );
          
          const allAccounts = [...accounts2022.value, ...accountsStandard.value];
          
          let balance = 0;
          for (const account of allAccounts) {
            if (account.account.data.parsed.info.mint === token.mint) {
              balance = parseInt(account.account.data.parsed.info.tokenAmount.amount);
              break;
            }
          }
          
          if (balance === 0) {
            console.log('No tokens\n');
            return pnl;
          }
          
          const sellParams = new URLSearchParams({
            inputMint: token.mint,
            outputMint: 'So11111111111111111111111111111111111111112',
            amount: balance.toString(),
            taker: wallet.publicKey.toBase58(),
            priorityFee: '150000'
          });
          
          const sellOrder = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${sellParams}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': CONFIG.apiKey
            }
          });
          
          const sellData = await sellOrder.json();
          if (sellData.errorCode) throw new Error(sellData.errorMessage);
          
          const sellTx = VersionedTransaction.deserialize(Buffer.from(sellData.transaction, 'base64'));
          sellTx.sign([wallet]);
          
          const sellExecute = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': CONFIG.apiKey
            },
            body: JSON.stringify({
              signedTransaction: Buffer.from(sellTx.serialize()).toString('base64'),
              requestId: sellData.requestId
            })
          });
          
          const sellResult = await sellExecute.json();
          
          if (sellResult.status === 'Success') {
            const solOut = parseInt(sellData.outAmount) / 1e9;
            const finalPnl = ((solOut - CONFIG.positionSize) / CONFIG.positionSize * 100);
            console.log(`✅ SOLD: ${finalPnl > 0 ? '+' : ''}${finalPnl.toFixed(2)}%\n`);
            return finalPnl;
          }
          
          return pnl;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
    return null;
  }
}

async function run() {
  console.log('⚡ INSTANT TRADER\n');
  console.log('Trading: FIRST 1%+ move I find');
  console.log('Position: 0.05 SOL (40% capital)');
  console.log('Exit: +10% TP / -5% SL / 2min\n');
  console.log('='.repeat(60) + '\n');
  
  for (let i = 0; i < 10; i++) {
    console.log(`Hunt #${i + 1}...`);
    
    const token = await findFirst();
    
    if (token) {
      const pnl = await trade(token);
      if (pnl !== null) {
        console.log(`Trade complete: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`);
      }
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('No 1%+ moves\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

run();
