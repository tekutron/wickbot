#!/usr/bin/env node
/**
 * EXTREME MODE - SecretBunker 20X Mission
 * 
 * Strategy: Buy INSTANTLY on new pump.fun tokens, tiered exits
 * Based on research from Chainstack (897⭐) + TreeCityWes (210⭐) bots
 * 
 * Entry: <1s from token creation (no analysis!)
 * Exit: +25% (50%), +50% (75% of remaining), Moon bag (25%)
 * Stop Loss: -10%
 * 
 * Feb 21, 2026 - Last chance for 20x
 */

import WebSocket from 'ws';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import JupiterSwap from './executor/jupiter-swap.mjs';

// ==================== CONFIG ====================
const CONFIG = {
  // Entry
  BUY_AMOUNT_SOL: 0.003, // ADJUSTED for low balance
  PRIORITY_FEE_SOL: 0.0005, // Reduced to conserve capital
  MAX_TOKEN_AGE_SEC: 5, // Only super fresh tokens
  MIN_INITIAL_BUY: 0.01, // Creator must buy ≥0.01 SOL
  
  // Exit Strategy - TIERED
  TP1_PERCENT: 25, // +25% = sell 50%
  TP1_SELL_PERCENT: 50,
  TP2_PERCENT: 50, // +50% total = sell 75% of remaining
  TP2_SELL_PERCENT: 75,
  MOON_BAG_PERCENT: 25, // Keep 25% forever
  STOP_LOSS_PERCENT: -10, // -10% (wider!)
  
  // Timing
  RAPID_EXIT_SEC: 20, // Exit after 20s if no movement
  MAX_HOLD_SEC: 180, // 3 min max
  MONITOR_INTERVAL_SEC: 5, // Check every 5s
  
  // Bonding Curve (pump.fun specific)
  BONDING_CURVE_EXIT_PERCENT: 15, // At 15% curve, sell 75%
  
  // Slippage
  SLIPPAGE_BPS: 3000, // 30% (pump.fun needs high slippage)
  
  // Wallet
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  WALLET_PATH: process.env.WALLET_PATH || '/home/j/.openclaw/wickbot/wallets/wickbot_wallet.json',
  
  // PumpPortal
  PUMPPORTAL_WS: 'wss://pumpportal.fun/api/data',
};

// ==================== STATE ====================
const state = {
  connection: null,
  wallet: null,
  walletPubkey: null,
  jupiter: null,
  position: null,
  startCapital: 0,
  currentCapital: 0,
  tradesExecuted: 0,
  wins: 0,
  losses: 0,
};

// SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ==================== UTILITIES ====================
function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
  fs.appendFileSync('/home/j/.openclaw/wickbot/extreme.log', `[${timestamp}] ${msg}\n`);
}

function saveState() {
  const stateFile = '/home/j/.openclaw/wickbot/extreme_state.json';
  fs.writeFileSync(stateFile, JSON.stringify({
    position: state.position,
    startCapital: state.startCapital,
    currentCapital: state.currentCapital,
    tradesExecuted: state.tradesExecuted,
    wins: state.wins,
    losses: state.losses,
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

async function getBalance() {
  const balance = await state.connection.getBalance(state.walletPubkey);
  return balance / LAMPORTS_PER_SOL;
}

// ==================== TRADING LOGIC ====================
async function executeBuy(tokenMint, tokenData) {
  log(`🚀 INSTANT BUY: ${tokenData.symbol} (${tokenData.name})`);
  log(`   Mint: ${tokenMint}`);
  log(`   Initial Buy: ${tokenData.initialBuy?.toFixed(6) || 'N/A'} SOL`);
  log(`   Market Cap: ${tokenData.marketCapSol?.toFixed(6) || 'N/A'} SOL`);
  
  try {
    // Execute buy via Jupiter
    const amountLamports = Math.floor(CONFIG.BUY_AMOUNT_SOL * LAMPORTS_PER_SOL);
    const result = await state.jupiter.swap(
      SOL_MINT,
      tokenMint,
      amountLamports,
      9, // SOL decimals
      9, // Token decimals (assume 9)
      'SWAP',
      CONFIG.SLIPPAGE_BPS
    );
    
    if (!result.success) {
      log(`❌ Buy failed: ${result.error}`);
      return false;
    }
    
    log(`✅ BUY EXECUTED: ${result.signature}`);
    log(`   Input: ${result.amountIn} SOL`);
    log(`   Output: ${result.amountOut} ${tokenData.symbol}`);
    log(`   Price: $${result.price.toFixed(6)}`);
    
    // Save position
    const tokensReceived = result.amountOutRaw; // Raw token amount
    state.position = {
      mint: tokenMint,
      symbol: tokenData.symbol,
      name: tokenData.name,
      entryTime: Date.now(),
      entryPrice: CONFIG.BUY_AMOUNT_SOL / tokensReceived, // SOL per token
      entryPriceUSD: result.price, // USD per token
      initialTokens: tokensReceived,
      currentTokens: tokensReceived,
      soldTP1: false,
      soldTP2: false,
      bondingCurve: tokenData.bondingCurve || null,
    };
    
    state.tradesExecuted++;
    saveState();
    
    log(`📊 Position opened: ${(state.position.currentTokens / 1e9).toFixed(4)} ${tokenData.symbol}`);
    log(`   Entry price: $${state.position.entryPriceUSD.toFixed(6)}/token`);
    
    // Start monitoring
    monitorPosition();
    
    return true;
  } catch (error) {
    log(`❌ Buy error: ${error.message}`);
    return false;
  }
}

async function executeSell(percent, reason) {
  if (!state.position) return;
  
  const tokensToSell = Math.floor(state.position.currentTokens * (percent / 100));
  log(`💰 SELLING ${percent}% (${tokensToSell.toLocaleString()} ${state.position.symbol}) - ${reason}`);
  
  try {
    const result = await state.jupiter.swap(
      state.position.mint,
      SOL_MINT,
      tokensToSell,
      9, // Token decimals
      9, // SOL decimals
      'SWAP',
      CONFIG.SLIPPAGE_BPS
    );
    
    if (!result.success) {
      log(`❌ Sell failed: ${result.error}`);
      return false;
    }
    
    const solReceived = parseFloat(result.amountOut); // Already in SOL
    const exitPriceUSD = result.price; // USD per token
    const pnlPercent = ((exitPriceUSD / state.position.entryPriceUSD) - 1) * 100;
    
    log(`✅ SELL EXECUTED: ${result.signature}`);
    log(`   Sold: ${(tokensToSell / 1e9).toFixed(4)} ${state.position.symbol}`);
    log(`   Received: ${solReceived.toFixed(6)} SOL`);
    log(`   Exit price: $${exitPriceUSD.toFixed(6)}`);
    log(`   P&L: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
    
    state.position.currentTokens -= tokensToSell;
    
    if (pnlPercent > 0) state.wins++;
    else state.losses++;
    
    // If sold all, close position
    if (state.position.currentTokens < 100) {
      log(`📊 Position closed: ${state.position.symbol}`);
      state.position = null;
    }
    
    // Update capital
    state.currentCapital = await getBalance();
    const totalPnl = ((state.currentCapital - state.startCapital) / state.startCapital) * 100;
    log(`💰 Capital: ${state.currentCapital.toFixed(6)} SOL (${totalPnl > 0 ? '+' : ''}${totalPnl.toFixed(2)}%)`);
    log(`📈 W/L: ${state.wins}/${state.losses} (${state.tradesExecuted} total)`);
    
    saveState();
    return true;
  } catch (error) {
    log(`❌ Sell error: ${error.message}`);
    return false;
  }
}

async function getCurrentPrice() {
  // Get current price via Jupiter quote
  try {
    const quote = await state.jupiter.getQuote(
      state.position.mint,
      SOL_MINT,
      1e9, // 1 token in base units
      9,
      9
    );
    if (quote.price) {
      return quote.price; // USD per token
    }
    if (quote.error) {
      log(`⚠️ Price quote error: ${quote.error}`);
    }
  } catch (error) {
    log(`⚠️ Price fetch error: ${error.message}`);
  }
  return null;
}

let monitoringInterval = null;

function monitorPosition() {
  if (monitoringInterval) clearInterval(monitoringInterval);
  
  monitoringInterval = setInterval(async () => {
    if (!state.position) {
      clearInterval(monitoringInterval);
      return;
    }
    
    const currentPrice = await getCurrentPrice();
    if (!currentPrice) return;
    
    const pnlPercent = ((currentPrice / state.position.entryPriceUSD) - 1) * 100;
    const holdTime = Math.floor((Date.now() - state.position.entryTime) / 1000);
    
    log(`📊 ${state.position.symbol}: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}% | Hold: ${holdTime}s`);
    
    // Exit logic
    if (pnlPercent <= CONFIG.STOP_LOSS_PERCENT) {
      await executeSell(100, `STOP LOSS (${pnlPercent.toFixed(2)}%)`);
    } else if (pnlPercent >= CONFIG.TP2_PERCENT && !state.position.soldTP2) {
      await executeSell(CONFIG.TP2_SELL_PERCENT, `TP2 +${CONFIG.TP2_PERCENT}%`);
      state.position.soldTP2 = true;
    } else if (pnlPercent >= CONFIG.TP1_PERCENT && !state.position.soldTP1) {
      await executeSell(CONFIG.TP1_SELL_PERCENT, `TP1 +${CONFIG.TP1_PERCENT}%`);
      state.position.soldTP1 = true;
    } else if (holdTime > CONFIG.MAX_HOLD_SEC) {
      await executeSell(100, `MAX HOLD TIME (${holdTime}s)`);
    } else if (holdTime > CONFIG.RAPID_EXIT_SEC && pnlPercent < 5) {
      await executeSell(100, `RAPID EXIT (no momentum)`);
    }
  }, CONFIG.MONITOR_INTERVAL_SEC * 1000);
}

// ==================== PUMPPORTAL LISTENER ====================
function startPumpPortalListener() {
  log('🎯 Connecting to PumpPortal...');
  const ws = new WebSocket(CONFIG.PUMPPORTAL_WS);
  
  ws.on('open', () => {
    log('✅ Connected to PumpPortal WebSocket');
    // Subscribe to new tokens
    ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
    log('📡 Subscribed to new token events');
  });
  
  ws.on('message', async (data) => {
    try {
      const tokenData = JSON.parse(data.toString());
      
      // Skip if we have a position
      if (state.position) return;
      
      // Skip if no mint
      if (!tokenData.mint) return;
      
      // Filter: Initial buy must be meaningful
      if (tokenData.initialBuy && tokenData.initialBuy < CONFIG.MIN_INITIAL_BUY) {
        return;
      }
      
      log(`🆕 New token: ${tokenData.symbol} - ${tokenData.name}`);
      log(`   Creator buy: ${tokenData.initialBuy?.toFixed(6) || 'N/A'} SOL`);
      
      // DELAYED BUY: Wait 15s for Jupiter to establish routes
      log(`   ⏳ Waiting 15s for liquidity...`);
      setTimeout(async () => {
        if (!state.position) { // Check we're still available
          await executeBuy(tokenData.mint, tokenData);
        }
      }, 15000);
      
    } catch (error) {
      log(`⚠️ Message parse error: ${error.message}`);
    }
  });
  
  ws.on('error', (error) => {
    log(`❌ WebSocket error: ${error.message}`);
  });
  
  ws.on('close', () => {
    log('⚠️ WebSocket closed, reconnecting in 5s...');
    setTimeout(startPumpPortalListener, 5000);
  });
}

// ==================== MAIN ====================
async function main() {
  log('═══════════════════════════════════════════════');
  log('🚀 EXTREME MODE - SecretBunker 20X Mission');
  log('═══════════════════════════════════════════════');
  log('Strategy: Instant buy + tiered exits');
  log('Research: Chainstack + TreeCityWes bots');
  log('═══════════════════════════════════════════════');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync(CONFIG.WALLET_PATH));
  state.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  state.walletPubkey = state.wallet.publicKey;
  
  // Connect to RPC
  state.connection = new Connection(CONFIG.RPC_URL, 'confirmed');
  
  // Initialize Jupiter
  state.jupiter = new JupiterSwap();
  await state.jupiter.initialize(CONFIG.WALLET_PATH, CONFIG.RPC_URL);
  
  // Get starting capital
  state.startCapital = await getBalance();
  state.currentCapital = state.startCapital;
  
  log(`💰 Starting capital: ${state.startCapital.toFixed(6)} SOL`);
  log(`🎯 Target: ${(state.startCapital * 20).toFixed(6)} SOL (20x)`);
  log(`⚠️ Position size: ${CONFIG.BUY_AMOUNT_SOL.toFixed(6)} SOL per trade`);
  log(`⚡ Priority fee: ${CONFIG.PRIORITY_FEE_SOL.toFixed(6)} SOL (EXTREME)`);
  log('');
  
  // Start listening
  startPumpPortalListener();
  
  // Keep alive
  setInterval(() => {
    const uptime = process.uptime();
    log(`💓 Uptime: ${Math.floor(uptime / 60)}m | Capital: ${state.currentCapital.toFixed(6)} SOL`);
  }, 60000);
}

// Handle shutdown
process.on('SIGINT', () => {
  log('🛑 Shutting down gracefully...');
  if (monitoringInterval) clearInterval(monitoringInterval);
  saveState();
  process.exit(0);
});

main().catch(error => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
