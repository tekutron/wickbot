#!/usr/bin/env node
/**
 * position-manager.mjs - Position & Capital Management
 * Tracks open positions, P&L, capital, and enforces risk limits
 */

import fs from 'fs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import config from '../config.mjs';

export class PositionManager {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.positions = [];
    this.trades = [];
    this.startingCapital = config.STARTING_CAPITAL_SOL;
    this.currentCapital = config.STARTING_CAPITAL_SOL;
    
    // Circuit Breaker State (NEW 2026-02-19)
    this.sessionStartCapital = config.STARTING_CAPITAL_SOL; // Capital at session start
    this.consecutiveLosses = 0;
    this.circuitBreakerTripped = false;
    this.circuitBreakerTime = null;
  }
  
  async initialize() {
    // Load main wallet (single wallet mode)
    const walletPath = config.WALLET_PATH;
    
    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet not found: ${walletPath}`);
    }
    
    console.log(`💳 Using main wallet: ${walletPath}`);
    
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    // Connect to RPC
    this.connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Load state from disk
    this.loadState();
    
    // Update capital from blockchain
    await this.updateCapitalFromChain();
  }
  
  async getBalance() {
    // Get SOL balance
    const solBalance = await this.connection.getBalance(this.wallet.publicKey);
    const solAmount = solBalance / 1e9;
    
    // Get USDC balance
    let usdcAmount = 0;
    try {
      const usdcMint = new PublicKey(config.TOKEN_ADDRESS_USDC);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        this.wallet.publicKey
      );
      
      const accountInfo = await getAccount(this.connection, usdcTokenAccount);
      usdcAmount = Number(accountInfo.amount) / 1e6; // USDC has 6 decimals
    } catch (err) {
      // USDC account doesn't exist yet (no trades yet)
      usdcAmount = 0;
    }
    
    // Estimate total USD value
    const usdValue = (solAmount * 200) + usdcAmount; // Assuming ~$200/SOL
    
    return {
      sol: solAmount,
      usdc: usdcAmount,
      usd: usdValue
    };
  }
  
  async updateCapitalFromChain(retries = 3) {
    try {
      // DEBUG: Log before fetching balance
      const beforeCapital = this.currentCapital;
      
      const balance = await this.getBalance();
      
      // DEBUG: Log raw balance returned
      console.log(`[DEBUG] getBalance() returned:`, {
        sol: balance.sol,
        usdc: balance.usdc,
        customTokenMode: config.isCustomTokenMode(),
        activeWallet: config.ACTIVE_WALLET
      });
      
      // ALWAYS use SOL balance for custom token mode (TOKEN/SOL pairs)
      // We hold SOL between trades, not USDC or custom tokens
      if (config.isCustomTokenMode()) {
        this.currentCapital = balance.sol;
        console.log(`[DEBUG] Custom token mode: Using SOL balance ${balance.sol}`);
      } else if (config.ACTIVE_WALLET === 'USDC') {
        // Legacy SOL/USDC mode: Track USDC
        this.currentCapital = balance.usdc / 86; // Convert USDC to SOL equivalent
        console.log(`[DEBUG] USDC mode: Using USDC balance ${balance.usdc} → ${this.currentCapital} SOL equiv`);
      } else {
        // SOL wallet mode: Track SOL
        this.currentCapital = balance.sol;
        console.log(`[DEBUG] SOL mode: Using SOL balance ${balance.sol}`);
      }
      
      // Validation: Ensure balance is reasonable
      if (this.currentCapital === null || this.currentCapital === undefined || isNaN(this.currentCapital)) {
        console.error('⚠️  CRITICAL: currentCapital is invalid:', this.currentCapital);
        console.error('   Raw balance:', balance);
        console.error('   Mode:', config.isCustomTokenMode() ? 'custom' : config.ACTIVE_WALLET);
        
        // Fallback: use SOL balance directly
        this.currentCapital = balance.sol || this.startingCapital;
        console.error('   Using fallback:', this.currentCapital);
      }
      
      // Sanity check: Detect massive unexpected changes (>50% in one update)
      if (beforeCapital > 0) {
        const change = Math.abs((this.currentCapital - beforeCapital) / beforeCapital) * 100;
        if (change > 50) {
          console.error(`🚨 SUSPICIOUS: Capital changed ${change.toFixed(1)}% in one update!`);
          console.error(`   Before: ${beforeCapital.toFixed(6)} SOL`);
          console.error(`   After: ${this.currentCapital.toFixed(6)} SOL`);
          console.error(`   Raw balance:`, balance);
          
          // If change is suspicious, retry after delay
          if (retries > 0) {
            console.error(`   Retrying balance check... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.updateCapitalFromChain(retries - 1);
          } else {
            console.error(`   ⚠️  WARNING: Using potentially incorrect balance after retries`);
          }
        }
      }
      
      console.log(`[DEBUG] Final currentCapital: ${this.currentCapital.toFixed(6)} SOL (was ${beforeCapital.toFixed(6)})`);
      
      this.saveState();
    } catch (err) {
      console.error('❌ updateCapitalFromChain failed:', err.message);
      console.error('   Stack:', err.stack);
      // Keep existing capital value on error
    }
  }
  
  /**
   * Open a new position
   */
  openPosition(tradeResult) {
    const position = {
      id: this.positions.length + 1,
      entryTime: Date.now(),
      entryPrice: tradeResult.price,
      amountSol: tradeResult.amountSol,
      amountUsdc: tradeResult.amountOut,  // Display amount (string)
      amountTokenRaw: tradeResult.amountOutRaw,  // RAW base units (precise for selling)
      tokenDecimals: tradeResult.tokenDecimals || 9,  // Store decimals for sell
      signature: tradeResult.signature,
      signal: tradeResult.signal,
      side: 'long'  // All our trades are long positions (buy token, sell later)
    };
    
    this.positions.push(position);
    this.saveState();
    
    return position;
  }
  
  /**
   * Close a position
   */
  closePosition(position, exitPrice, exitSignature, reason) {
    const holdTime = Date.now() - position.entryTime;
    const pnl = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    
    const trade = {
      id: this.trades.length + 1,
      entryTime: position.entryTime,
      exitTime: Date.now(),
      holdTime: holdTime,
      entryPrice: position.entryPrice,
      exitPrice: exitPrice,
      pnl: pnl,
      amountSol: position.amountSol,
      entrySignature: position.signature,
      exitSignature: exitSignature,
      reason: reason,
      signal: position.signal
    };
    
    this.trades.push(trade);
    
    // Remove from active positions
    this.positions = this.positions.filter(p => p.id !== position.id);
    
    // Update capital
    const netChange = position.amountSol * (pnl / 100);
    this.currentCapital += netChange;
    
    // Record trade result for circuit breaker (NEW 2026-02-19)
    this.recordTradeResult(pnl);
    
    this.saveState();
    
    console.log(`\n💰 Position closed:`);
    console.log(`   P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
    console.log(`   Hold time: ${Math.floor(holdTime / 1000)}s`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Exit tx: ${exitSignature}\n`);
    
    return trade;
  }
  
  /**
   * Monitor open positions for TP/SL
   * @param {Array} candles - Current candles
   * @param {Object} currentSignal - Current trading signal
   * @param {Function} executeSellCallback - Callback to execute sell (async function)
   */
  async monitorPositions(candles, currentSignal, executeSellCallback = null) {
    if (this.positions.length === 0) return;
    
    const currentPrice = candles[candles.length - 1].close;
    
    for (const position of this.positions) {
      const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      const holdTime = Date.now() - position.entryTime;
      
      // Primary exit: SELL signal (pattern-driven)
      if (config.USE_SIGNAL_EXITS && currentSignal && currentSignal.action === 'sell' && currentSignal.score >= config.SIGNAL_EXIT_SCORE) {
        console.log(`\n📉 SELL SIGNAL - Exiting position (${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%)`);
        console.log(`   Signal: ${currentSignal.score}/100`);
        console.log(`   Patterns: ${currentSignal.patterns.join(', ')}`);
        console.log(`   Reason: ${currentSignal.reason}`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'SIGNAL');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'SIGNAL');
        }
      }
      
      // Safety: Max profit cap (extreme backup, not target)
      else if (pnl >= config.SAFETY_TP_PCT) {
        console.log(`\n🎯 SAFETY PROFIT CAP! +${pnl.toFixed(2)}%`);
        console.log(`   Extreme profit - taking it before reversal`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'MAX_PROFIT');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'MAX_PROFIT');
        }
      }
      
      // Safety: Stop loss (extreme backup, prevent disaster)
      else if (pnl <= -config.SAFETY_SL_PCT) {
        console.log(`\n🛑 SAFETY STOP LOSS! ${pnl.toFixed(2)}%`);
        console.log(`   Extreme loss - cutting to prevent disaster`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'SAFETY_SL');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'SAFETY_SL');
        }
      }
      
      // Scalping: Max hold time (no bagholding)
      else if (config.MAX_HOLD_TIME_MIN && holdTime > config.MAX_HOLD_TIME_MIN * 60 * 1000) {
        const holdMinutes = Math.floor(holdTime / 60000);
        console.log(`\n⏰ MAX HOLD TIME! ${holdMinutes} minutes`);
        console.log(`   P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`);
        console.log(`   Exiting to avoid bagholding`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'MAX_HOLD');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'MAX_HOLD');
        }
      }
      
      // Log status periodically
      else {
        console.log(`💎 Position #${position.id}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% | Hold: ${Math.floor(holdTime / 1000)}s`);
      }
    }
  }
  
  /**
   * Check if max positions reached
   */
  hasMaxPositions() {
    return this.positions.length >= config.MAX_POSITIONS;
  }
  
  /**
   * Check if max drawdown reached
   */
  isMaxDrawdownReached() {
    const drawdown = ((this.startingCapital - this.currentCapital) / this.startingCapital) * 100;
    return drawdown >= config.MAX_DRAWDOWN_PCT;
  }
  
  /**
   * Check if session drawdown exceeds limit (NEW 2026-02-19)
   */
  isSessionDrawdownExceeded() {
    const sessionDrawdown = ((this.sessionStartCapital - this.currentCapital) / this.sessionStartCapital) * 100;
    return sessionDrawdown >= config.MAX_SESSION_DRAWDOWN_PCT;
  }
  
  /**
   * Check if consecutive losses exceeded (NEW 2026-02-19)
   */
  isConsecutiveLossesExceeded() {
    return this.consecutiveLosses >= config.MAX_CONSECUTIVE_LOSSES;
  }
  
  /**
   * Check if circuit breaker should block trading (NEW 2026-02-19)
   */
  isCircuitBreakerActive() {
    if (!this.circuitBreakerTripped) return false;
    
    if (!this.circuitBreakerTime) return false;
    
    const cooldownMs = config.COOLDOWN_AFTER_STOP_MIN * 60 * 1000;
    const elapsed = Date.now() - this.circuitBreakerTime;
    
    if (elapsed >= cooldownMs) {
      // Cooldown complete, reset
      console.log('\n✅ Circuit breaker cooldown complete - trading re-enabled\n');
      this.circuitBreakerTripped = false;
      this.circuitBreakerTime = null;
      this.consecutiveLosses = 0; // Reset counter
      return false;
    }
    
    const remaining = Math.ceil((cooldownMs - elapsed) / 1000 / 60);
    console.log(`\n🛑 Circuit breaker active - ${remaining} minutes remaining\n`);
    return true;
  }
  
  /**
   * Trip circuit breaker (NEW 2026-02-19)
   */
  tripCircuitBreaker(reason) {
    this.circuitBreakerTripped = true;
    this.circuitBreakerTime = Date.now();
    
    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛑 CIRCUIT BREAKER ACTIVATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Reason: ${reason}`);
    console.log(`Cooldown: ${config.COOLDOWN_AFTER_STOP_MIN} minutes`);
    console.log(`Current capital: ${this.currentCapital.toFixed(4)} SOL`);
    console.log(`Session drawdown: ${((this.sessionStartCapital - this.currentCapital) / this.sessionStartCapital * 100).toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    this.saveState();
  }
  
  /**
   * Track trade result for circuit breaker (NEW 2026-02-19)
   */
  recordTradeResult(pnl) {
    if (pnl < 0) {
      this.consecutiveLosses++;
      console.log(`   🔴 Consecutive losses: ${this.consecutiveLosses}/${config.MAX_CONSECUTIVE_LOSSES}`);
    } else {
      this.consecutiveLosses = 0; // Reset on win
    }
    
    // Check circuit breaker conditions
    if (this.isConsecutiveLossesExceeded()) {
      this.tripCircuitBreaker(`${config.MAX_CONSECUTIVE_LOSSES} consecutive losses`);
    } else if (this.isSessionDrawdownExceeded()) {
      const sessionDD = ((this.sessionStartCapital - this.currentCapital) / this.sessionStartCapital * 100).toFixed(2);
      this.tripCircuitBreaker(`Session drawdown ${sessionDD}% exceeded ${config.MAX_SESSION_DRAWDOWN_PCT}%`);
    }
  }
  
  /**
   * Get position size in SOL
   */
  getPositionSize() {
    return this.currentCapital * (config.POSITION_SIZE_PCT / 100);
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const wins = this.trades.filter(t => t.pnl > 0).length;
    const losses = this.trades.filter(t => t.pnl <= 0).length;
    const winRate = this.trades.length > 0 ? (wins / this.trades.length) * 100 : 0;
    
    const totalPnl = this.trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = this.trades.length > 0 ? totalPnl / this.trades.length : 0;
    
    return {
      totalTrades: this.trades.length,
      wins: wins,
      losses: losses,
      winRate: winRate,
      avgPnl: avgPnl,
      currentCapital: this.currentCapital,
      startingCapital: this.startingCapital,
      totalReturn: ((this.currentCapital - this.startingCapital) / this.startingCapital) * 100
    };
  }
  
  /**
   * Load state from disk
   */
  loadState() {
    if (fs.existsSync(config.STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(config.STATE_FILE, 'utf8'));
      this.positions = state.positions || [];
      this.currentCapital = state.currentCapital || this.startingCapital;
    }
    
    if (fs.existsSync(config.TRADES_FILE)) {
      const trades = JSON.parse(fs.readFileSync(config.TRADES_FILE, 'utf8'));
      this.trades = trades || [];
    }
  }
  
  /**
   * Save state to disk
   */
  saveState() {
    const state = {
      positions: this.positions,
      currentCapital: this.currentCapital,
      startingCapital: this.startingCapital,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(config.STATE_FILE, JSON.stringify(state, null, 2));
    fs.writeFileSync(config.TRADES_FILE, JSON.stringify(this.trades, null, 2));
  }
}

export default PositionManager;
