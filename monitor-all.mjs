#!/usr/bin/env node
/**
 * Monitor All Positions - Real-time P&L tracking
 */

import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'))));
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const POSITIONS = [
  { mint: 'D1hmg8DP6qP514Lxpy85kMNXKJhg7Cm8KkHM2Q7rpump', symbol: 'IMG', entry: 0.00007558, sol: 0.025 },
  { mint: 'GJmF68t5HXM1U1j2nE4Trvh7vH5XeXys7MW4UN5Bpump', symbol: 'JAWZ', entry: 0.00014380, sol: 0.02 }
];

async function checkAll() {
  console.clear();
  console.log('📊 POSITION MONITOR\n');
  console.log('='.repeat(80));
  
  let totalValue = 0;
  const alerts = [];
  
  for (const pos of POSITIONS) {
    try {
      // Get balance
      const accounts = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { programId: TOKEN_2022_PROGRAM_ID }
      );
      
      let balance = 0;
      for (const account of accounts.value) {
        if (account.account.data.parsed.info.mint === pos.mint) {
          balance = parseFloat(account.account.data.parsed.info.tokenAmount.uiAmount);
          break;
        }
      }
      
      if (balance === 0) {
        console.log(`\n${pos.symbol}: ❌ NO POSITION\n`);
        continue;
      }
      
      // Get current price
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.mint}`);
      const data = await response.json();
      const pair = data.pairs[0];
      
      const currentPrice = parseFloat(pair.priceUsd);
      const pnl = ((currentPrice - pos.entry) / pos.entry * 100);
      const m5 = parseFloat(pair.priceChange.m5 || 0);
      const h1 = parseFloat(pair.priceChange.h1 || 0);
      
      const value = balance * currentPrice;
      totalValue += pos.sol * (1 + pnl / 100);
      
      console.log(`\n${pos.symbol}:`);
      console.log(`  Balance: ${balance.toFixed(2)} tokens`);
      console.log(`  Entry: $${pos.entry.toFixed(8)} | Current: $${currentPrice.toFixed(8)}`);
      console.log(`  P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% | Value: ~$${value.toFixed(4)}`);
      console.log(`  Momentum: 5m: ${m5 > 0 ? '+' : ''}${m5.toFixed(2)}% | 1h: ${h1 > 0 ? '+' : ''}${h1.toFixed(2)}%`);
      
      // Alerts
      if (pnl >= 25) {
        console.log(`  🟢 TAKE PROFIT HIT - SELL NOW!`);
        alerts.push(`${pos.symbol}: TP hit at +${pnl.toFixed(2)}%`);
      } else if (pnl <= -8) {
        console.log(`  🔴 STOP LOSS HIT - SELL NOW!`);
        alerts.push(`${pos.symbol}: SL hit at ${pnl.toFixed(2)}%`);
      } else if (pnl >= 15) {
        console.log(`  🟢 Strong profit - consider taking partial or trailing`);
      } else if (pnl >= 5) {
        console.log(`  🟡 Decent profit - let it run`);
      } else if (pnl > 0) {
        console.log(`  🟢 Small profit - monitor`);
      } else if (pnl >= -5) {
        console.log(`  🟡 Minor loss - hold`);
      } else {
        console.log(`  🟠 Approaching SL - watch closely`);
      }
      
    } catch (err) {
      console.log(`\n${pos.symbol}: ❌ Error: ${err.message}\n`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal Portfolio Value: ~${totalValue.toFixed(4)} SOL`);
  console.log(`Target: 1.0 SOL (${(1 / totalValue).toFixed(2)}x needed)\n`);
  
  if (alerts.length > 0) {
    console.log('🚨 ALERTS:');
    alerts.forEach(a => console.log(`  ${a}`));
    console.log();
  }
}

async function run() {
  while (true) {
    await checkAll();
    await new Promise(resolve => setTimeout(resolve, 15000)); // Check every 15s
  }
}

run();
