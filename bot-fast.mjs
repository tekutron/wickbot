#!/usr/bin/env node
/**
 * bot-fast.mjs - wickbot Fast Mode (Real-Time Dip/Top Detection)
 * Uses incremental indicators for 50x faster signal generation
 */

import config from './config.mjs';
import { BirdeyeAPI } from './data/birdeye-api.mjs';
import { DexScreenerCandles } from './data/dexscreener-candles.mjs';
import { IncrementalEngine } from './data/incremental-indicators.mjs';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import { FastSignalGenerator } from './patterns/fast-signals.mjs';
import { PositionManager } from './executor/position-manager.mjs';
import { JupiterSwap } from './executor/jupiter-swap.mjs';
import tokenValidator from './executor/token-validator.mjs';
import fs from 'fs';

class WickBotFast {
  constructor() {
    this.birdeyeAPI = new BirdeyeAPI();
    this.dexscreenerAPI = new DexScreenerCandles();
    this.incrementalEngine = new IncrementalEngine({
      rsiPeriod: 14,
      bbPeriod: 20,
      bbStdDev: 2,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9
    });
    this.signalGenerator = new FastSignalGenerator();
    this.positionManager = new PositionManager();
    this.jupiterSwap = new JupiterSwap();
    
    this.isRunning = false;
    this.loopInterval = null;
    this.initialized = false;
    this.priceAPI = null; // Will be set to 'birdeye' or 'dexscreener'
    this.connection = new Connection(config.RPC_URL, 'confirmed');
  }
  
  /**
   * Get actual token balance from blockchain (critical for avoiding slippage errors)
   */
  async getActualTokenBalance(tokenMint) {
    try {
      const walletPubkey = this.positionManager.wallet.publicKey;
      
      // Check both token programs
      const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { programId: TOKEN_2022_PROGRAM_ID }
      );
      
      const standardAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      for (const account of [...token2022Accounts.value, ...standardAccounts.value]) {
        const data = account.account.data.parsed.info;
        if (data.mint === tokenMint) {
          return {
            raw: parseInt(data.tokenAmount.amount),
            display: data.tokenAmount.uiAmount.toString(),
            decimals: data.tokenAmount.decimals
          };
        }
      }
      
      return null;
    } catch (err) {
      console.error(`   ⚠️  Failed to fetch actual balance: ${err.message}`);
      return null;
    }
  }
  
  async start() {
    console.log('⚡ wickbot FAST MODE starting...\n');
    
    // Check config
    if (!config.BIRDEYE_API_KEY) {
      console.error('❌ BIRDEYE_API_KEY not set in config or environment');
      process.exit(1);
    }
    
    // Initialize components
    await this.positionManager.initialize();
    await this.jupiterSwap.initialize();
    
    const balance = await this.positionManager.getBalance();
    console.log(`💰 Starting Capital: ${balance.sol.toFixed(4)} SOL (~$${balance.usd.toFixed(2)})`);
    console.log(`📊 Trading Pair: ${config.getTradingPair()}`);
    console.log(`⚡ Strategy: ${config.isCustomTokenMode() ? 'Custom Token' : 'SOL/USDC'} - Real-Time Dip/Top Detection`);
    console.log(`📈 Update Frequency: Every ${config.POLL_INTERVAL_MS / 1000}s`);
    console.log(`🎯 Position Size: ${config.POSITION_SIZE_PCT}% (~${(balance.sol * config.POSITION_SIZE_PCT / 100).toFixed(4)} SOL)`);
    console.log(`⚡ Quick Exit: +${config.QUICK_TP_1}%/+${config.QUICK_TP_2}% | -${config.QUICK_SL}% | ${config.MAX_HOLD_TIME_SEC}s max`);
    console.log(`💸 Priority Fee: ${(config.PRIORITY_FEE_LAMPORTS / 1000000).toFixed(4)} SOL (optimized for micro-scalp)`);
    console.log(`📊 Signal Mode: Incremental (50x faster than old mode)`);
    
    if (config.DRY_RUN) {
      console.log(`\n🧪 DRY-RUN MODE: No real trades will be executed\n`);
    }
    
    // Initialize incremental engine with historical data
    console.log(`\n🔄 Initializing indicators with historical data...`);
    await this.initializeEngine();
    
    console.log(`\n🚀 Bot active - watching for dips and tops...\n`);
    
    this.isRunning = true;
    
    // Run first iteration immediately
    await this.loop();
    
    // Then run on interval
    this.loopInterval = setInterval(() => this.loop(), config.POLL_INTERVAL_MS);
    
    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
  
  /**
   * Initialize incremental engine with historical candles
   */
  async initializeEngine() {
    try {
      const targetToken = config.getTargetTokenAddress();
      console.log(`   Fetching data for: ${config.isCustomTokenMode() ? config.CUSTOM_TOKEN_SYMBOL : 'SOL'}`);
      
      let candles = null;
      
      // Try Birdeye first
      console.log(`   🔄 Trying Birdeye API...`);
      candles = await this.birdeyeAPI.fetchCandles(targetToken, '1m', 100);
      
      if (candles && candles.length > 0) {
        console.log(`   ✅ Birdeye: ${candles.length} candles fetched`);
        this.priceAPI = 'birdeye';
      } else {
        // Fallback to DexScreener
        console.log(`   ⚠️  Birdeye failed, trying DexScreener (synthetic candles)...`);
        candles = await this.dexscreenerAPI.fetchCandles(targetToken, '1m', 100);
        
        if (candles && candles.length > 0) {
          console.log(`   ✅ DexScreener: ${candles.length} synthetic candles built`);
          this.priceAPI = 'dexscreener';
        } else {
          console.error('   ❌ Both Birdeye and DexScreener failed');
          process.exit(1);
        }
      }
      
      if (!candles || candles.length === 0) {
        console.error('❌ Failed to fetch initialization candles from any source');
        process.exit(1);
      }
      
      // Feed historical candles to engine
      for (const candle of candles) {
        this.incrementalEngine.update(candle);
      }
      
      this.initialized = this.incrementalEngine.isReady();
      
      if (this.initialized) {
        console.log(`✅ Indicators initialized (${candles.length} candles processed)`);
        const ind = this.incrementalEngine.getIndicators();
        console.log(`   RSI: ${ind.rsi?.toFixed(2) || 'N/A'}`);
        console.log(`   BB: ${ind.bb?.lower.toFixed(2)} - ${ind.bb?.upper.toFixed(2)}`);
        console.log(`   MACD: ${ind.macd?.histogram.toFixed(4) || 'N/A'}`);
      } else {
        console.warn('⚠️  Indicators not fully ready, will update as data comes in');
      }
    } catch (err) {
      console.error(`❌ Initialization error: ${err.message}`);
      process.exit(1);
    }
  }
  
  async loop() {
    try {
      const targetToken = config.getTargetTokenAddress();
      
      // 1. Fetch latest 1-minute candle (use established API)
      let candles = null;
      
      if (this.priceAPI === 'birdeye') {
        candles = await this.birdeyeAPI.fetchCandles(targetToken, '1m', 1);
        
        // If Birdeye fails, fallback to DexScreener
        if (!candles || candles.length === 0) {
          console.warn('⚠️  Birdeye failed, switching to DexScreener');
          this.priceAPI = 'dexscreener';
          candles = await this.dexscreenerAPI.fetchCandles(targetToken, '1m', 1);
        }
      } else {
        candles = await this.dexscreenerAPI.fetchCandles(targetToken, '1m', 1);
      }
      
      if (!candles || candles.length === 0) {
        console.warn('⚠️  No candle data received from any source');
        return;
      }
      
      const latestCandle = candles[0];
      
      // 2. O(1) incremental update (FAST!)
      const indicators = this.incrementalEngine.update(latestCandle);
      
      if (!indicators.ready) {
        console.log('⏳ Indicators initializing...');
        return;
      }
      
      // 3. Generate fast signal (10-50ms vs 1000ms old method)
      const signal = this.signalGenerator.generate(indicators, latestCandle);
      
      // 4. Log current state
      this.logState(signal, indicators, latestCandle);
      
      // 5. Check if we should act on signal
      await this.handleSignal(signal);
      
      // 6. Monitor existing positions
      await this.monitorPositions(signal, latestCandle);
      
    } catch (err) {
      console.error(`❌ Loop error: ${err.message}`);
    }
  }
  
  logState(signal, indicators, candle) {
    const timestamp = new Date().toISOString();
    const hasPosition = this.positionManager.positions.length > 0;
    
    console.log(`[${timestamp}]`);
    console.log(`Signal: ${signal.action.toUpperCase()} (Confidence: ${signal.confidence}%)`);
    console.log(`Reason: ${signal.reason}`);
    
    // Show key indicators
    if (signal.details.rsi) {
      console.log(`RSI: ${signal.details.rsi} | Price: $${signal.details.price || candle.close.toFixed(2)}`);
    }
    
    // Show position status
    if (hasPosition) {
      console.log(`📊 Holding ${this.positionManager.positions.length} position(s) - waiting for SELL signal`);
    }
    
    console.log('');
  }
  
  async handleSignal(signal) {
    // Check if we should trade
    if (signal.action === 'hold') {
      return; // No action needed
    }
    
    // Check max positions
    const currentPositions = this.positionManager.positions.length;
    const maxPositions = config.MAX_POSITIONS;
    
    if (this.positionManager.hasMaxPositions()) {
      console.log(`⏸️  Already holding max positions (${currentPositions}/${maxPositions}) - ignoring ${signal.action.toUpperCase()} signal`);
      return;
    }
    
    // Check max drawdown
    if (this.positionManager.isMaxDrawdownReached()) {
      console.warn('⚠️  Max drawdown reached - stopping trading');
      this.stop();
      return;
    }
    
    // Execute trade based on signal
    if (signal.action === 'buy') {
      await this.executeBuy(signal);
    }
    // Sell signals handled by position monitor
  }
  
  async executeBuy(signal) {
    console.log(`\n🎯 DIP DETECTED! (Confidence: ${signal.confidence}%)`);
    console.log(`   ${signal.reason}`);
    
    // ENTRY CONFIRMATION (2026-02-19 optimization)
    if (config.REQUIRE_ENTRY_CONFIRMATION) {
      // Use candle data from incremental engine
      const candles = this.incrementalEngine?.candles || [];
      
      if (candles.length < 5) {
        console.log(`   ⚠️  Not enough candle history (${candles.length}) - skipping confirmation\n`);
        return;
      }
      
      // 1. Check if price is far enough from recent high
      const recentCandles = candles.slice(-5);
      const recentHigh = Math.max(...recentCandles.map(c => c.high));
      const currentPrice = candles[candles.length - 1].close;
      const priceFromHigh = ((currentPrice - recentHigh) / recentHigh) * 100;
      
      if (priceFromHigh > -config.ENTRY_DIP_FROM_HIGH_PCT) {
        console.log(`   ⚠️  Price only ${priceFromHigh.toFixed(2)}% from recent high (need ${-config.ENTRY_DIP_FROM_HIGH_PCT}%)`);
        console.log(`   ⏸️  Waiting for deeper dip...\n`);
        return;
      }
      
      // 2. Check volume confirmation
      if (signal.volume5m && signal.volume1hAvg) {
        const volumeRatio = signal.volume5m / signal.volume1hAvg;
        if (volumeRatio < config.MIN_VOLUME_RATIO) {
          console.log(`   📊 Volume ratio ${volumeRatio.toFixed(2)}x too low (need ${config.MIN_VOLUME_RATIO}x)`);
          console.log(`   ⏸️  Waiting for volume spike...\n`);
          return;
        }
        console.log(`   ✅ Volume confirmed: ${volumeRatio.toFixed(2)}x average`);
      }
      
      console.log(`   ✅ Entry confirmed: ${priceFromHigh.toFixed(2)}% below recent high`);
    }
    
    const positionSize = this.positionManager.getPositionSize();
    
    if (config.DRY_RUN) {
      const pair = config.getTradingPair();
      console.log(`   🧪 DRY-RUN: Would buy ${positionSize.toFixed(4)} ${pair}\n`);
      return;
    }
    
    try {
      let result;
      
      if (config.isCustomTokenMode()) {
        // Custom token mode: SOL → TOKEN
        const solAmount = positionSize;
        const solLamports = Math.floor(solAmount * 1e9);
        console.log(`   Position size: ${solAmount.toFixed(4)} SOL → ${config.CUSTOM_TOKEN_SYMBOL}`);
        
        // VALIDATE TOKEN BEFORE TRADING (critical for multi-token support)
        let tokenInfo;
        try {
          tokenInfo = await tokenValidator.validateToken(config.CUSTOM_TOKEN_ADDRESS);
          
          if (!tokenInfo.validated) {
            throw new Error('Token validation failed');
          }
          
          if (!tokenInfo.jupiterSupported) {
            console.log('   ⚠️  WARNING: Token may have low liquidity');
          }
          
          console.log(`   ✅ Token: ${tokenInfo.marketData?.symbol || 'Unknown'}`);
          console.log(`   ✅ Decimals: ${tokenInfo.decimals}`);
          console.log(`   ✅ Program: ${tokenInfo.isToken2022 ? 'Token-2022' : 'Standard SPL'}`);
          
        } catch (err) {
          console.error(`   ❌ Token validation failed: ${err.message}`);
          console.error(`   ⚠️  SKIPPING BUY - Cannot trade unvalidated token`);
          return;
        }
        
        result = await this.jupiterSwap.swap(
          config.TOKEN_ADDRESS_SOL,
          config.CUSTOM_TOKEN_ADDRESS,
          solLamports,
          9,  // SOL decimals
          tokenInfo.decimals,  // Validated token decimals
          'BUY'
        );
        
        // Store decimals for later sell
        if (result.success) {
          result.tokenDecimals = tokenInfo.decimals;
        }
      } else {
        // Default mode: USDC → SOL
        const usdcAmount = positionSize * 86; // Rough SOL price estimate
        console.log(`   Position size: ${usdcAmount.toFixed(2)} USDC`);
        
        result = await this.jupiterSwap.swapUsdcToSol(signal, usdcAmount);
      }
      
      if (result.success) {
        // CRITICAL: Fetch ACTUAL token balance from blockchain (not Jupiter quote)
        // Jupiter quotes can differ from actual due to slippage
        if (config.isCustomTokenMode()) {
          const actualBalance = await this.getActualTokenBalance(config.CUSTOM_TOKEN_ADDRESS);
          if (actualBalance) {
            result.amountOutRaw = actualBalance.raw;
            result.amountOut = actualBalance.display;
            console.log(`   🔍 Actual tokens received: ${actualBalance.display} (verified on-chain)`);
          }
        }
        
        this.positionManager.openPosition(result);
        console.log(`   ✅ Position opened: ${result.amountOut}`);
        console.log(`   Signature: ${result.signature}\n`);
      } else {
        console.log(`   ❌ Trade failed: ${result.error}\n`);
      }
    } catch (err) {
      console.error(`   ❌ Execute error: ${err.message}\n`);
    }
  }
  
  async monitorPositions(signal, candle) {
    const positions = this.positionManager.positions;
    
    if (positions.length === 0) {
      // No positions to monitor
      return;
    }
    
    const currentPrice = candle.close;
    
    for (const position of positions) {
      const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      const holdTime = Date.now() - position.entryTime;
      const holdTimeSec = holdTime / 1000;
      
      // MICRO-SCALP EXIT LOGIC (2026-02-19 optimization)
      // Priority: Hold time → Profit targets → Stop loss → Signal
      
      // 1. MAX HOLD TIME - Force exit after 10 seconds
      if (holdTimeSec >= config.MAX_HOLD_TIME_SEC) {
        console.log(`\n⏱️  MAX HOLD TIME (${holdTimeSec.toFixed(0)}s) - Force exit at ${pnl.toFixed(2)}%`);
        await this.executeSell(position, currentPrice, 'MAX_HOLD');
      }
      // 2. QUICK PROFIT TARGET 2 - Take profit at +3%
      else if (pnl >= config.QUICK_TP_2) {
        console.log(`\n🎯 QUICK PROFIT TARGET 2! +${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_TP2');
      }
      // 3. QUICK PROFIT TARGET 1 - Take profit at +1.5%
      else if (pnl >= config.QUICK_TP_1) {
        console.log(`\n💰 QUICK PROFIT TARGET 1! +${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_TP1');
      }
      // 4. QUICK STOP LOSS - Cut losses at -2%
      else if (pnl <= -config.QUICK_SL) {
        console.log(`\n🛑 QUICK STOP LOSS! ${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_SL');
      }
      // 5. SIGNAL EXIT - Exit on opposite signal
      else if (this.signalGenerator.shouldExit(position, signal)) {
        console.log(`\n🏁 TOP DETECTED! Exiting position (${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%)`);
        console.log(`   ${signal.reason}`);
        await this.executeSell(position, currentPrice, 'SIGNAL');
      }
      // 6. SAFETY CAPS (backup only, should rarely trigger)
      else if (pnl >= config.SAFETY_TP_PCT) {
        console.log(`\n🎯 SAFETY PROFIT CAP! +${pnl.toFixed(2)}%`);
        await this.executeSell(position, currentPrice, 'SAFETY_TP');
      }
      else if (pnl <= -config.SAFETY_SL_PCT) {
        console.log(`\n🛑 SAFETY STOP LOSS! ${pnl.toFixed(2)}%`);
        await this.executeSell(position, currentPrice, 'SAFETY_SL');
      }
      else {
        // Log position status
        const holdSec = Math.floor(holdTimeSec);
        const pnlColor = pnl > 0 ? '🟢' : '🔴';
        console.log(`💎 ${pnlColor} Position #${position.id}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% | Hold: ${holdSec}s | Entry: $${position.entryPrice.toFixed(6)}`);
      }
    }
  }
  
  async executeSell(position, currentPrice, reason) {
    console.log(`   Position: ${position.id}`);
    console.log(`   Entry price: ${position.entryPrice}`);
    console.log(`   Current price: ${currentPrice.toFixed(6)}`);
    
    if (config.DRY_RUN) {
      console.log(`   🧪 DRY-RUN: Would sell position\n`);
      this.positionManager.closePosition(position, currentPrice, 'DRY_RUN_SIG', reason);
      return;
    }
    
    try {
      let result;
      
      if (config.isCustomTokenMode()) {
        // Custom token mode: TOKEN → SOL
        // Use RAW base units stored from buy (avoids rounding errors)
        const tokenBaseUnits = position.amountTokenRaw || Math.floor(parseFloat(position.amountUsdc) * Math.pow(10, position.tokenDecimals));
        const tokenDecimals = position.tokenDecimals || 6;
        const tokenDisplay = tokenBaseUnits / Math.pow(10, tokenDecimals);
        
        console.log(`   Selling: ${tokenDisplay.toFixed(4)} ${config.CUSTOM_TOKEN_SYMBOL} → SOL`);
        console.log(`   Token decimals: ${tokenDecimals}, Base units: ${tokenBaseUnits}`);
        
        result = await this.jupiterSwap.swap(
          config.CUSTOM_TOKEN_ADDRESS,
          config.TOKEN_ADDRESS_SOL,
          tokenBaseUnits,
          tokenDecimals,
          9,  // SOL decimals
          'SELL'
        );
      } else {
        // Default mode: SOL → USDC
        result = await this.jupiterSwap.swapSolToUsdc(position, position.amountSol);
      }
      
      if (result.success) {
        this.positionManager.closePosition(position, currentPrice, result.signature, reason);
        
        // CRITICAL: Refresh capital from blockchain after sell
        await this.positionManager.updateCapitalFromChain();
        const newBalance = this.positionManager.currentCapital;
        
        console.log(`   ✅ Position closed: ${result.amountOut}`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   💰 New balance: ${newBalance.toFixed(6)} SOL\n`);
      } else {
        console.log(`   ❌ Sell failed: ${result.error}\n`);
      }
    } catch (err) {
      console.error(`   ❌ Execute error: ${err.message}\n`);
    }
  }
  
  async stop() {
    console.log('\n🛑 Stopping wickbot...');
    
    this.isRunning = false;
    
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }
    
    await this.positionManager.saveState();
    
    console.log('✅ wickbot stopped\n');
    process.exit(0);
  }
}

// Start the bot
const bot = new WickBotFast();
bot.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
