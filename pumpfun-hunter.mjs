#!/usr/bin/env node
/**
 * PUMPFUN HUNTER - Direct Bonding Curve Trading
 * Uses direct pump.fun program interaction (NO JUPITER!)
 * Feb 21, 2026 - 6:15 PM - SecretBunker Emergency Pivot
 */

import WebSocket from 'ws';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

// Import working pump.fun SDK from pump-sniper
import { PumpFunSDK } from '../pump-sniper/pumpfun-sdk.mjs';

// ==================== CONFIG ====================
const CONFIG = {
  // Capital
  WALLET_PATH: './wallets/wickbot_wallet.json',
  RPC_URL: 'https://api.mainnet-beta.solana.com',
  STARTING_CAPITAL: 0.172556,
  POSITION_SIZE_SOL: 0.04, // ~23% per trade (conservative for speed)
  
  // Entry - ULTRA AGGRESSIVE
  MIN_INITIAL_BUY: 0.001, // Creator must buy ≥0.001 SOL (very low)
  MAX_TOKEN_AGE_SEC: 60, // Up to 60s old (Jupiter may work by then)
  
  // Exit - FAST SCALP
  TP_PERCENT: 20, // +20% = quick exit
  SL_PERCENT: -15, // -15% = wide tolerance
  MAX_HOLD_SEC: 45, // 45s max
  
  // Speed
  PRIORITY_FEE_SOL: 0.002, // 0.002 SOL = ULTRA HIGH for speed
  SLIPPAGE_BPS: 5000, // 50% slippage (pump.fun needs HIGH)
  
  // PumpPortal
  PUMPPORTAL_WS: 'wss://pumpportal.fun/api/data',
};

// ==================== STATE ====================
const state = {
  connection: null,
  wallet: null,
  pumpFunSDK: null,
  position: null,
  startCapital: 0,
  currentCapital: 0,
  tradesExecuted: 0,
  wins: 0,
  losses: 0,
};

const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ==================== UTILITIES ====================
function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
  fs.appendFileSync('./pumpfun-hunter.log', `[${timestamp}] ${msg}\n`);
}

function saveState() {
  fs.writeFileSync('./pumpfun_hunter_state.json', JSON.stringify({
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
  const balance = await state.connection.getBalance(state.wallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

// ==================== PUMP.FUN TRADING ====================
async function executeBuy(tokenMint, tokenData) {
  log(`🚀 BUYING: ${tokenData.symbol} (${tokenData.name})`);
  log(`   Mint: ${tokenMint}`);
  log(`   Creator buy: ${tokenData.initialBuy?.toFixed(6) || 'N/A'} SOL`);
  log(`   Market Cap: ${tokenData.marketCapSol?.toFixed(6) || 'N/A'} SOL`);
  
  try {
    const result = await state.pumpFunSDK.buyToken(
      tokenMint,
      CONFIG.POSITION_SIZE_SOL,
      CONFIG.SLIPPAGE_BPS,
      CONFIG.PRIORITY_FEE_SOL * LAMPORTS_PER_SOL
    );
    
    if (!result.success) {
      log(`❌ Buy failed: ${result.error}`);
      return false;
    }
    
    log(`✅ BUY TX: ${result.signature}`);
    log(`   Speed: ${result.executionTimeMs}ms`);
    log(`   Spent: ${CONFIG.POSITION_SIZE_SOL} SOL`);
    
    // Wait for confirmation
    log(`   ⏳ Waiting for confirmation...`);
    await state.connection.confirmTransaction(result.signature, 'confirmed');
    log(`   ✅ Confirmed!`);
    
    // Get actual token balance
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for balance update
    const tokenBalance = await getTokenBalance(tokenMint);
    
    log(`   📊 Tokens received: ${tokenBalance.toLocaleString()}`);
    
    if (tokenBalance === 0) {
      log(`   ⚠️ WARNING: 0 tokens received - may have failed`);
      return false;
    }
    
    // Save position
    state.position = {
      mint: tokenMint,
      symbol: tokenData.symbol,
      name: tokenData.name,
      entryTime: Date.now(),
      tokenAmount: tokenBalance,
      entrySOL: CONFIG.POSITION_SIZE_SOL,
      signature: result.signature,
    };
    
    state.tradesExecuted++;
    saveState();
    
    log(`📊 Position opened: ${tokenBalance.toLocaleString()} ${tokenData.symbol}`);
    
    // Start monitoring
    monitorPosition();
    
    return true;
  } catch (error) {
    log(`❌ Buy error: ${error.message}`);
    return false;
  }
}

async function executeSell(reason) {
  if (!state.position) return;
  
  log(`💰 SELLING ${state.position.symbol} - ${reason}`);
  
  try {
    const result = await state.pumpFunSDK.sellToken(
      state.position.mint,
      state.position.tokenAmount,
      CONFIG.PRIORITY_FEE_SOL * LAMPORTS_PER_SOL
    );
    
    if (!result.success) {
      log(`❌ Sell failed: ${result.error}`);
      return false;
    }
    
    log(`✅ SELL TX: ${result.signature}`);
    log(`   Speed: ${result.executionTimeMs}ms`);
    
    // Wait for confirmation
    await state.connection.confirmTransaction(result.signature, 'confirmed');
    log(`   ✅ Confirmed!`);
    
    // Calculate P&L (rough estimate)
    const currentBalance = await getBalance();
    const solReceived = currentBalance - (state.startCapital - CONFIG.POSITION_SIZE_SOL);
    const pnl = ((solReceived / CONFIG.POSITION_SIZE_SOL) - 1) * 100;
    
    log(`📊 P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
    log(`   SOL received: ${solReceived.toFixed(6)} SOL`);
    
    if (pnl > 0) state.wins++;
    else state.losses++;
    
    state.position = null;
    state.currentCapital = currentBalance;
    
    const totalPnl = ((state.currentCapital - state.startCapital) / state.startCapital) * 100;
    log(`💰 Capital: ${state.currentCapital.toFixed(6)} SOL (${totalPnl > 0 ? '+' : ''}${totalPnl.toFixed(2)}%)`);
    log(`📈 W/L: ${state.wins}/${state.losses}`);
    
    saveState();
    return true;
  } catch (error) {
    log(`❌ Sell error: ${error.message}`);
    return false;
  }
}

async function getTokenBalance(mint) {
  try {
    const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const { PublicKey } = await import('@solana/web3.js');
    
    const mintPubkey = new PublicKey(mint);
    const ata = await getAssociatedTokenAddress(
      mintPubkey,
      state.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    const balance = await state.connection.getTokenAccountBalance(ata);
    return parseFloat(balance.value.uiAmount || 0);
  } catch (err) {
    return 0;
  }
}

let monitoringInterval = null;

function monitorPosition() {
  if (monitoringInterval) clearInterval(monitoringInterval);
  
  let lastPrice = null;
  
  monitoringInterval = setInterval(async () => {
    if (!state.position) {
      clearInterval(monitoringInterval);
      return;
    }
    
    const holdTime = Math.floor((Date.now() - state.position.entryTime) / 1000);
    
    log(`📊 Monitoring ${state.position.symbol} | Hold: ${holdTime}s`);
    
    // Timeout exit
    if (holdTime >= CONFIG.MAX_HOLD_SEC) {
      await executeSell(`MAX HOLD (${holdTime}s)`);
      return;
    }
    
    // Try to get price (may not be available for bonding curve tokens)
    try {
      const price = await state.pumpFunSDK.getBondingCurvePrice(state.position.mint);
      if (price && lastPrice) {
        const pnl = ((price / lastPrice) - 1) * 100;
        log(`   Price change: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
        
        if (pnl >= CONFIG.TP_PERCENT) {
          await executeSell(`TP ${pnl.toFixed(2)}%`);
        } else if (pnl <= CONFIG.SL_PERCENT) {
          await executeSell(`SL ${pnl.toFixed(2)}%`);
        }
      }
      
      if (price && !lastPrice) {
        lastPrice = price;
      }
    } catch (err) {
      // Price unavailable, rely on timeout
    }
  }, 5000); // Check every 5s
}

// ==================== PUMPPORTAL LISTENER ====================
function startPumpPortalListener() {
  log('🎯 Connecting to PumpPortal...');
  const ws = new WebSocket(CONFIG.PUMPPORTAL_WS);
  
  ws.on('open', () => {
    log('✅ Connected to PumpPortal WebSocket');
    ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
    log('📡 Subscribed to new token events');
  });
  
  ws.on('message', async (data) => {
    try {
      const tokenData = JSON.parse(data.toString());
      
      if (!tokenData.mint) return;
      if (state.position) return; // Already trading
      
      // Filter: Creator must buy meaningful amount
      if (tokenData.initialBuy && tokenData.initialBuy < CONFIG.MIN_INITIAL_BUY) {
        return;
      }
      
      log(`🆕 New token: ${tokenData.symbol} - ${tokenData.name}`);
      log(`   Creator buy: ${tokenData.initialBuy?.toFixed(6) || 'N/A'} SOL`);
      
      // INSTANT BUY (direct bonding curve - NO JUPITER!)
      await executeBuy(tokenData.mint, tokenData);
      
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
  log('💥 PUMPFUN HUNTER - Direct Bonding Curve Trading');
  log('═══════════════════════════════════════════════');
  log('Using pump-sniper proven infrastructure');
  log('═══════════════════════════════════════════════');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync(CONFIG.WALLET_PATH));
  state.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  // Connect to RPC
  state.connection = new Connection(CONFIG.RPC_URL, 'confirmed');
  
  // Initialize PumpFunSDK
  state.pumpFunSDK = new PumpFunSDK(state.connection, state.wallet);
  
  // Get starting capital
  state.startCapital = await getBalance();
  state.currentCapital = state.startCapital;
  
  log(`💰 Starting capital: ${state.startCapital.toFixed(6)} SOL`);
  log(`🎯 Target: ${(state.startCapital * 20).toFixed(6)} SOL (20x)`);
  log(`⚠️ Position size: ${CONFIG.POSITION_SIZE_SOL.toFixed(6)} SOL per trade`);
  log(`⚡ Priority fee: ${CONFIG.PRIORITY_FEE_SOL.toFixed(6)} SOL (ULTRA HIGH)`);
  log(`💎 Slippage: ${CONFIG.SLIPPAGE_BPS / 100}% (HIGH for pump.fun)`);
  log('');
  
  // Start listening
  startPumpPortalListener();
  
  // Keep alive
  setInterval(() => {
    const uptime = process.uptime();
    log(`💓 Uptime: ${Math.floor(uptime / 60)}m | Capital: ${state.currentCapital.toFixed(6)} SOL | W/L: ${state.wins}/${state.losses}`);
  }, 120000); // Every 2 min
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
