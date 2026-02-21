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
    
    // Check circuit breaker first (NEW 2026-02-19)
    if (this.positionManager.isCircuitBreakerActive()) {
      return; // Silently skip (circuit breaker logs itself)
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
    
    // CRITICAL: Double-check MAX_POSITIONS (prevent race condition)
    if (this.positionManager.positions.length >= config.MAX_POSITIONS) {
      console.log(`   ⏸️  Already at MAX_POSITIONS (${this.positionManager.positions.length}/${config.MAX_POSITIONS}) - skipping entry\n`);
      return;
    }
    
    // ENTRY CONFIRMATION (2026-02-19 MOMENTUM-BASED)
    if (config.REQUIRE_ENTRY_CONFIRMATION) {
      // Use candle data from incremental engine
      const candles = this.incrementalEngine?.candles || [];
      
      if (candles.length < 3) {
        console.log(`   ⚠️  Not enough candle history (${candles.length}) - skipping confirmation\n`);
        return;
      }
      
      // 1. RED CANDLE FILTER - Don't catch falling knives
      const lastCandle = candles[candles.length - 1];
      const candleBody = ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100;
      
      if (candleBody < -2.0) {
        console.log(`   🔴 Recent candle RED ${candleBody.toFixed(2)}% - avoiding dump`);
        console.log(`   ⏸️  Waiting for green candle...\n`);
        return;
      }
      
      // 2. MOMENTUM CHECK - Calculate from recent candles
      // Use last 3 candles to determine momentum (current vs 2 candles ago)
      const currentPrice = lastCandle.close;
      const priceAgo = candles[candles.length - 3].close;
      const momentum = ((currentPrice - priceAgo) / priceAgo) * 100;
      
      if (momentum <= config.MIN_MOMENTUM_1M) {
        console.log(`   📉 Momentum ${momentum.toFixed(2)}% - not bullish (need >${config.MIN_MOMENTUM_1M}%)`);
        console.log(`   ⏸️  Waiting for positive momentum...\n`);
        return;
      }
      console.log(`   ✅ Momentum confirmed: ${momentum.toFixed(2)}%`);
      
      // 3. VOLUME SPIKE - Confirm buying pressure
      if (signal.volume5m && signal.volume1hAvg) {
        const volumeRatio = signal.volume5m / signal.volume1hAvg;
        if (volumeRatio < config.MIN_VOLUME_RATIO) {
          console.log(`   📊 Volume ratio ${volumeRatio.toFixed(2)}x too low (need ${config.MIN_VOLUME_RATIO}x)`);
          console.log(`   ⏸️  Waiting for volume spike...\n`);
          return;
        }
        console.log(`   ✅ Volume confirmed: ${volumeRatio.toFixed(2)}x average`);
      }
      
      // 4. RSI ENTRY FILTER (NEW 2026-02-20) - Enter on dips/oversold
      if (config.REQUIRE_RSI_ENTRY) {
        const indicators = this.incrementalEngine?.getIndicators();
        if (indicators && indicators.ready) {
          const rsi = indicators.rsi;
          
          if (rsi > config.RSI_ENTRY_MAX) {
            console.log(`   📈 RSI ${rsi.toFixed(1)} too high (need <${config.RSI_ENTRY_MAX}) - not oversold`);
            console.log(`   ⏸️  Waiting for RSI dip...\n`);
            return;
          }
          
          if (rsi < config.RSI_ENTRY_MIN) {
            console.log(`   📉 RSI ${rsi.toFixed(1)} too low (<${config.RSI_ENTRY_MIN}) - might dump more`);
            console.log(`   ⏸️  Waiting for RSI stabilization...\n`);
            return;
          }
          
          console.log(`   ✅ RSI confirmed: ${rsi.toFixed(1)} (oversold/neutral)`);
        }
      }
      
      // 5. MACD ENTRY FILTER (NEW 2026-02-20) - Detect momentum building
      if (config.REQUIRE_MACD_ENTRY) {
        const indicators = this.incrementalEngine?.getIndicators();
        if (indicators && indicators.ready) {
          const macd = indicators.macd;
          
          if (config.MACD_CROSSOVER_REQUIRED && macd.histogram <= 0) {
            console.log(`   📉 MACD histogram ${macd.histogram.toFixed(4)} negative - momentum not building`);
            console.log(`   ⏸️  Waiting for MACD crossover...\n`);
            return;
          }
          
          console.log(`   ✅ MACD confirmed: histogram ${macd.histogram.toFixed(4)} (bullish)`);
        }
      }
      
      console.log(`   ✅ Entry confirmed: ${candleBody >= 0 ? 'GREEN' : 'RED'} candle (${candleBody.toFixed(2)}%)`);
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
      
      // FIXED TP/SL EXIT LOGIC (2026-02-19 18:35)
      // Priority: TP2 → TP1 → Max Hold → SL → Emergency
      
      // 1. TAKE PROFIT 2 - Quick exit at +4%
      if (pnl >= config.QUICK_TP_2) {
        console.log(`\n🎯 QUICK TP2! +${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_TP2');
      }
      // 2. TAKE PROFIT 1 - Quick exit at +2%
      else if (pnl >= config.QUICK_TP_1) {
        console.log(`\n💚 QUICK TP1! +${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_TP1');
      }
      // 3. MAX HOLD TIME - Force exit after 60 seconds
      else if (holdTimeSec >= config.MAX_HOLD_TIME_SEC) {
        console.log(`\n⏱️  MAX HOLD TIME (${holdTimeSec.toFixed(0)}s) - Force exit at ${pnl.toFixed(2)}%`);
        await this.executeSell(position, currentPrice, 'MAX_HOLD');
      }
      // 4. QUICK STOP LOSS - Safety stop at -2%
      else if (pnl <= -config.QUICK_SL) {
        console.log(`\n🛑 QUICK STOP LOSS! ${pnl.toFixed(2)}% in ${holdTimeSec.toFixed(0)}s`);
        await this.executeSell(position, currentPrice, 'QUICK_SL');
      }
      // 3b. EMERGENCY EXIT - Circuit breaker for runaway losses (NEW 2026-02-19)
      else if (pnl <= -config.MAX_LOSS_PER_TRADE_PCT) {
        console.log(`\n🚨 EMERGENCY EXIT! Loss ${pnl.toFixed(2)}% exceeds ${config.MAX_LOSS_PER_TRADE_PCT}%`);
        console.log(`   Runaway loss detected - exiting immediately!`);
        await this.executeSell(position, currentPrice, 'EMERGENCY');
      }
      // 4. SAFETY CAPS (extreme backup only)
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
    
    // Calculate current P&L for adaptive slippage
    const currentPnL = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    
    // ADAPTIVE SLIPPAGE (2026-02-19)
    let slippageBps;
    if (currentPnL > 0) {
      slippageBps = config.SLIPPAGE_PROFIT_BPS;  // 2% on wins (protect gains)
      console.log(`   💰 Profit mode: ${(slippageBps / 100).toFixed(1)}% max slippage (protect gains)`);
    } else if (currentPnL > config.SLIPPAGE_THRESHOLD_PCT) {
      slippageBps = config.SLIPPAGE_SMALL_LOSS_BPS;  // 3% on small losses
      console.log(`   ⚠️  Small loss mode: ${(slippageBps / 100).toFixed(1)}% max slippage (minimize loss)`);
    } else {
      slippageBps = config.SLIPPAGE_BIG_LOSS_BPS;  // 10% on big losses (emergency)
      console.log(`   🚨 Emergency mode: ${(slippageBps / 100).toFixed(1)}% max slippage (exit at any price)`);
    }
    
    if (config.DRY_RUN) {
      console.log(`   🧪 DRY-RUN: Would sell position\n`);
      this.positionManager.closePosition(position, currentPrice, 'DRY_RUN_SIG', reason);
      return;
    }
    
    try {
      // Setup for custom token mode or default
      let inputMint, outputMint, amountIn, inputDecimals, outputDecimals;
      
      if (config.isCustomTokenMode()) {
        // Custom token mode: TOKEN → SOL
        const tokenBaseUnits = position.amountTokenRaw || Math.floor(parseFloat(position.amountUsdc) * Math.pow(10, position.tokenDecimals));
        const tokenDecimals = position.tokenDecimals || 6;
        const tokenDisplay = tokenBaseUnits / Math.pow(10, tokenDecimals);
        
        console.log(`   Selling: ${tokenDisplay.toFixed(4)} ${config.CUSTOM_TOKEN_SYMBOL} → SOL`);
        console.log(`   Token decimals: ${tokenDecimals}, Base units: ${tokenBaseUnits}`);
        
        inputMint = config.CUSTOM_TOKEN_ADDRESS;
        outputMint = config.TOKEN_ADDRESS_SOL;
        amountIn = tokenBaseUnits;
        inputDecimals = tokenDecimals;
        outputDecimals = 9;
      } else {
        // Default mode: USDC → SOL (not used in current config but keep for compatibility)
        inputMint = config.TOKEN_ADDRESS_USDC;
        outputMint = config.TOKEN_ADDRESS_SOL;
        amountIn = Math.floor(position.amountUsdc * 1e6);
        inputDecimals = 6;
        outputDecimals = 9;
      }
      
      // PRE-FLIGHT PRICE CHECK (2026-02-19 EXECUTION PROTECTION)
      let attempts = 0;
      let result = null;
      
      while (attempts < config.MAX_EXECUTION_RETRIES && !result) {
        attempts++;
        
        if (config.PRE_FLIGHT_CHECK && attempts === 1) {
          console.log(`\n   🔍 Pre-flight check: Getting Jupiter quote...`);
          
          const quote = await this.jupiterSwap.getQuote(
            inputMint,
            outputMint,
            amountIn,
            inputDecimals,
            outputDecimals
          );
          
          if (quote.error) {
            console.log(`   ⚠️  Quote failed: ${quote.error}`);
            // Continue anyway, but without pre-flight protection
          } else {
            const quotedPnL = ((quote.price - position.entryPrice) / position.entryPrice) * 100;
            const pnlDeviation = Math.abs(quotedPnL - currentPnL);
            
            console.log(`   📊 Expected P&L: ${currentPnL.toFixed(2)}%`);
            console.log(`   📊 Jupiter quote: ${quotedPnL.toFixed(2)}%`);
            console.log(`   📊 Deviation: ${pnlDeviation.toFixed(2)}%`);
            
            // Check if Jupiter price is much worse than expected
            if (pnlDeviation > config.MAX_PRICE_DEVIATION_PCT) {
              console.log(`   ⚠️  Jupiter price ${pnlDeviation.toFixed(2)}% worse than expected!`);
              
              if (config.RETRY_ON_BAD_PRICE && attempts < config.MAX_EXECUTION_RETRIES) {
                console.log(`   ⏸️  Waiting ${config.RETRY_DELAY_MS / 1000}s for better price... (Attempt ${attempts}/${config.MAX_EXECUTION_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY_MS));
                continue; // Retry
              } else {
                console.log(`   ⚠️  Proceeding anyway (no retries left or disabled)`);
              }
            } else {
              console.log(`   ✅ Pre-flight passed: Price within ${config.MAX_PRICE_DEVIATION_PCT}% tolerance`);
            }
          }
        }
        
        // Execute swap with adaptive slippage
        console.log(`\n   💱 Executing swap (attempt ${attempts})...`);
        result = await this.jupiterSwap.swap(
          inputMint,
          outputMint,
          amountIn,
          inputDecimals,
          outputDecimals,
          'SELL',
          slippageBps
        );
        
        // Check if swap failed due to slippage
        if (!result.success && result.error?.includes('slippage')) {
          console.log(`   ⚠️  Swap failed: Slippage too high`);
          
          if (config.RETRY_ON_BAD_PRICE && attempts < config.MAX_EXECUTION_RETRIES) {
            console.log(`   ⏸️  Waiting ${config.RETRY_DELAY_MS / 1000}s and retrying... (Attempt ${attempts}/${config.MAX_EXECUTION_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY_MS));
            result = null; // Reset to retry
            continue;
          } else {
            console.log(`   ❌ Giving up after ${attempts} attempts\n`);
            break;
          }
        }
        
        // If we get here, either success or non-slippage error
        break;
      }
      
      if (result && result.success) {
        this.positionManager.closePosition(position, currentPrice, result.signature, reason);
        
        // CRITICAL: Refresh capital from blockchain after sell
        await this.positionManager.updateCapitalFromChain();
        const newBalance = this.positionManager.currentCapital;
        
        const finalPnL = ((result.price - position.entryPrice) / position.entryPrice) * 100;
        console.log(`   ✅ Position closed: ${result.amountOut} SOL`);
        console.log(`   📊 Final P&L: ${finalPnL > 0 ? '+' : ''}${finalPnL.toFixed(2)}%`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   💰 New balance: ${newBalance.toFixed(6)} SOL\n`);
      } else {
        const errorMsg = result?.error || 'Unknown error';
        console.log(`   ❌ Sell failed after ${attempts} attempts: ${errorMsg}\n`);
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
