#!/usr/bin/env node
/**
 * position-manager.mjs - Position & Capital Management
 * Tracks open positions, P&L, capital, and enforces risk limits
 */

import fs from 'fs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import config from '../config.mjs';

export class PositionManager {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.positions = [];
    this.trades = [];
    this.startingCapital = config.STARTING_CAPITAL_SOL;
    this.currentCapital = config.STARTING_CAPITAL_SOL;
  }
  
  async initialize() {
    // Load wallet
    if (!fs.existsSync(config.WALLET_PATH)) {
      throw new Error(`Wallet not found: ${config.WALLET_PATH}`);
    }
    
    const walletData = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    // Connect to RPC
    this.connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Load state from disk
    this.loadState();
    
    // Update capital from blockchain
    await this.updateCapitalFromChain();
  }
  
  async getBalance() {
    const solBalance = await this.connection.getBalance(this.wallet.publicKey);
    const solAmount = solBalance / 1e9;
    
    // Estimate USD value (rough, for display only)
    const usdValue = solAmount * 200; // Assuming ~$200/SOL
    
    return {
      sol: solAmount,
      usd: usdValue
    };
  }
  
  async updateCapitalFromChain() {
    const balance = await this.getBalance();
    this.currentCapital = balance.sol;
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
      amountUsdc: tradeResult.amountOut,
      signature: tradeResult.signature,
      signal: tradeResult.signal
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
      
      // Safety: Max profit cap (prevent greed)
      else if (pnl >= config.MAX_PROFIT_PCT) {
        console.log(`\n🎯 MAX PROFIT CAP! +${pnl.toFixed(2)}%`);
        console.log(`   Taking profit before reversal`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'MAX_PROFIT');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'MAX_PROFIT');
        }
      }
      
      // Safety: Stop loss (prevent catastrophic loss)
      else if (pnl <= -config.SAFETY_STOP_LOSS_PCT) {
        console.log(`\n🛑 SAFETY STOP LOSS! ${pnl.toFixed(2)}%`);
        console.log(`   Cutting losses to prevent disaster`);
        
        if (executeSellCallback && !config.DRY_RUN) {
          await executeSellCallback(position, currentPrice, 'SAFETY_SL');
        } else if (config.DRY_RUN) {
          console.log(`   🧪 DRY-RUN: Would close position\n`);
          this.closePosition(position, currentPrice, 'DRY_RUN_SIG', 'SAFETY_SL');
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
