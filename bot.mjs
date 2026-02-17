#!/usr/bin/env node
/**
 * bot.mjs - wickbot Main Loop
 * Automated candle pattern trading bot for Solana
 */

import config from './config.mjs';
import { BirdeyeAPI } from './data/birdeye-api.mjs';
import { CandleBuilder } from './data/candle-builder.mjs';
import { PatternDetector } from './patterns/detectors.mjs';
import { IndicatorCalculator } from './patterns/indicators.mjs';
import { SignalGenerator } from './patterns/signals.mjs';
import { PositionManager } from './executor/position-manager.mjs';
import { JupiterSwap } from './executor/jupiter-swap.mjs';
import fs from 'fs';

class WickBot {
  constructor() {
    this.birdeyeAPI = new BirdeyeAPI();
    this.candleBuilder = new CandleBuilder();
    this.patternDetector = new PatternDetector();
    this.indicatorCalculator = new IndicatorCalculator();
    this.signalGenerator = new SignalGenerator();
    this.positionManager = new PositionManager();
    this.jupiterSwap = new JupiterSwap();
    
    this.isRunning = false;
    this.loopInterval = null;
  }
  
  async start() {
    console.log('🕯️  wickbot starting...\n');
    
    // Check config
    if (!config.BIRDEYE_API_KEY) {
      console.error('❌ BIRDEYE_API_KEY not set in config or environment');
      process.exit(1);
    }
    
    // Check wallet
    if (!fs.existsSync(config.WALLET_PATH)) {
      console.error(`❌ Wallet not found: ${config.WALLET_PATH}`);
      console.error('   Create one with: solana-keygen new --outfile wallets/wickbot_wallet.json');
      process.exit(1);
    }
    
    // Initialize components
    await this.positionManager.initialize();
    await this.jupiterSwap.initialize();
    
    const balance = await this.positionManager.getBalance();
    console.log(`💰 Starting Capital: ${balance.sol.toFixed(4)} SOL (~$${balance.usd.toFixed(2)})`);
    console.log(`📊 Trading Pair: ${config.PAIR}`);
    console.log(`⚙️  Strategy: Buy lows, Sell highs (Pattern-based)`);
    console.log(`📈 Timeframes: ${config.CANDLE_TIMEFRAMES.join(', ')}`);
    console.log(`🎯 Position Size: ${config.POSITION_SIZE_PCT}% (~${(balance.sol * config.POSITION_SIZE_PCT / 100).toFixed(4)} SOL)`);
    console.log(`✅ Max Profit: +${config.MAX_PROFIT_PCT}%`);
    console.log(`🛑 Safety Stop: -${config.SAFETY_STOP_LOSS_PCT}%`);
    
    if (config.DRY_RUN) {
      console.log(`\n🧪 DRY-RUN MODE: No real trades will be executed\n`);
    }
    
    console.log(`\n🚀 Bot active - watching for signals...\n`);
    
    this.isRunning = true;
    
    // Run first iteration immediately
    await this.loop();
    
    // Then run on interval
    this.loopInterval = setInterval(() => this.loop(), config.POLL_INTERVAL_MS);
    
    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
  
  async loop() {
    try {
      // 1. Fetch latest candles
      const candles = await this.birdeyeAPI.fetchCandles(
        config.TOKEN_ADDRESS_SOL,
        '1m',
        100 // Last 100 1-minute candles
      );
      
      if (!candles || candles.length === 0) {
        console.warn('⚠️  No candle data received');
        return;
      }
      
      // 2. Build multi-timeframe candles
      const multiTimeframeCandles = this.candleBuilder.buildAllTimeframes(candles);
      
      // 3. Detect patterns on all timeframes
      const patterns = {};
      for (const [timeframe, tfCandles] of Object.entries(multiTimeframeCandles)) {
        patterns[timeframe] = this.patternDetector.detectAll(tfCandles);
      }
      
      // 4. Calculate indicators
      const indicators = {};
      for (const [timeframe, tfCandles] of Object.entries(multiTimeframeCandles)) {
        indicators[timeframe] = this.indicatorCalculator.calculateAll(tfCandles);
      }
      
      // 5. Generate signal
      const signal = this.signalGenerator.generate(patterns, indicators, multiTimeframeCandles);
      
      // 6. Log current state
      this.logState(signal, patterns, indicators);
      
      // 7. Check if we should act on signal
      await this.handleSignal(signal);
      
      // 8. Monitor existing positions
      await this.positionManager.monitorPositions(
        multiTimeframeCandles[config.PRIMARY_TIMEFRAME],
        signal,
        (position, price, reason) => this.executeSell(position, price, reason)
      );
      
    } catch (err) {
      console.error(`❌ Loop error: ${err.message}`);
    }
  }
  
  logState(signal, patterns, indicators) {
    const timestamp = new Date().toISOString();
    const primaryTimeframe = config.PRIMARY_TIMEFRAME;
    
    console.log(`[${timestamp}]`);
    console.log(`Signal: ${signal.action.toUpperCase()} (Score: ${signal.score}/100)`);
    
    if (signal.reason) {
      console.log(`Reason: ${signal.reason}`);
    }
    
    if (signal.patterns.length > 0) {
      console.log(`Patterns: ${signal.patterns.join(', ')}`);
    }
    
    const rsi = indicators[primaryTimeframe]?.rsi;
    if (rsi) {
      console.log(`RSI (${primaryTimeframe}): ${rsi.toFixed(2)}`);
    }
    
    console.log('');
  }
  
  async handleSignal(signal) {
    // Check if we should trade
    if (signal.score < config.MIN_SIGNAL_SCORE) {
      return; // Signal too weak
    }
    
    // Check max positions
    if (this.positionManager.hasMaxPositions()) {
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
    } else if (signal.action === 'sell') {
      // Sell signal handled by position monitor
      // (only sells if we have an open position)
    }
  }
  
  async executeBuy(signal) {
    console.log(`\n💰 BUY SIGNAL TRIGGERED (Score: ${signal.score})`);
    console.log(`   Reason: ${signal.reason}`);
    console.log(`   Patterns: ${signal.patterns.join(', ')}`);
    
    const positionSize = this.positionManager.getPositionSize();
    
    if (config.DRY_RUN) {
      console.log(`   🧪 DRY-RUN: Skipping actual trade\n`);
      return;
    }
    
    try {
      // USDC-first mode: BUY = swap USDC → SOL (buy SOL with USDC)
      const usdcAmount = positionSize * 86; // Rough estimate: SOL price ~$86
      console.log(`   Position size: ${usdcAmount.toFixed(2)} USDC (~${positionSize.toFixed(4)} SOL)`);
      
      const result = await this.jupiterSwap.swapUsdcToSol(signal, usdcAmount);
      
      if (result.success) {
        this.positionManager.openPosition(result);
        console.log(`   ✅ Position opened: ${result.amountOut.toFixed(4)} SOL`);
        console.log(`   Entry price: $${result.price.toFixed(2)}/SOL`);
        console.log(`   Signature: ${result.signature}\n`);
      } else {
        console.log(`   ❌ Trade failed: ${result.error}\n`);
      }
    } catch (err) {
      console.error(`   ❌ Execute error: ${err.message}\n`);
    }
  }
  
  async executeSell(position, currentPrice, reason) {
    console.log(`\n💸 SELL SIGNAL - ${reason}`);
    console.log(`   Position: ${position.id}`);
    console.log(`   Entry: $${position.entryPrice.toFixed(2)}/SOL`);
    console.log(`   Current: $${currentPrice.toFixed(2)}/SOL`);
    
    if (config.DRY_RUN) {
      console.log(`   🧪 DRY-RUN: Skipping actual trade\n`);
      return;
    }
    
    try {
      // USDC-first mode: SELL = swap SOL → USDC (sell SOL back to USDC)
      const result = await this.jupiterSwap.swapSolToUsdc(position, position.amountSol);
      
      if (result.success) {
        this.positionManager.closePosition(position, result.price, result.signature, reason);
        console.log(`   ✅ Position closed: ${result.amountOut.toFixed(2)} USDC`);
        console.log(`   Exit price: $${result.price.toFixed(2)}/SOL\n`);
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

// Run bot
const bot = new WickBot();
bot.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
