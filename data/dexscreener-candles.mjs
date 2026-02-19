#!/usr/bin/env node
/**
 * dexscreener-candles.mjs - DexScreener Candle Builder
 * Builds synthetic 1m candles from DexScreener price change data
 */

import fetch from 'node-fetch';

export class DexScreenerCandles {
  constructor() {
    this.baseUrl = 'https://api.dexscreener.com/latest/dex/tokens';
    this.cache = new Map(); // Cache responses
    this.cacheTTL = 5000; // 5 second cache
  }
  
  /**
   * Fetch token data from DexScreener
   */
  async fetchTokenData(tokenAddress) {
    // Check cache
    const cached = this.cache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/${tokenAddress}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        throw new Error('No trading pairs found');
      }
      
      // Get most liquid pair
      const mainPair = data.pairs.sort((a, b) => 
        parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
      )[0];
      
      // Cache result
      this.cache.set(tokenAddress, {
        data: mainPair,
        timestamp: Date.now()
      });
      
      return mainPair;
      
    } catch (err) {
      console.error(`DexScreener fetch error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Build synthetic 1m candles from price change data
   * Uses current price + priceChange data to estimate historical prices
   */
  async fetchCandles(tokenAddress, timeframe = '1m', limit = 100) {
    try {
      const pairData = await this.fetchTokenData(tokenAddress);
      
      if (!pairData) {
        return null;
      }
      
      const currentPrice = parseFloat(pairData.priceUsd);
      const priceChange = pairData.priceChange || {};
      const volume = pairData.volume || {};
      
      // Build candles working backwards from current price
      const candles = [];
      const now = Date.now();
      
      // Convert timeframe to milliseconds
      const intervalMs = this.getIntervalMs(timeframe);
      
      // Strategy: Use price change data to estimate prices at different points
      // m5: -5 minutes ago
      // h1: -60 minutes ago
      // h6: -360 minutes ago
      // h24: -1440 minutes ago
      
      for (let i = 0; i < limit; i++) {
        const candleTime = now - (i * intervalMs);
        const minutesAgo = i; // For 1m candles
        
        // Estimate price at this point in time
        let estimatedPrice = currentPrice;
        
        if (minutesAgo <= 5 && priceChange.m5 !== undefined) {
          // Within last 5 minutes - use m5 change
          const changeRatio = 1 - (priceChange.m5 / 100);
          estimatedPrice = currentPrice * Math.pow(changeRatio, minutesAgo / 5);
        } else if (minutesAgo <= 60 && priceChange.h1 !== undefined) {
          // Within last hour - use h1 change
          const changeRatio = 1 - (priceChange.h1 / 100);
          estimatedPrice = currentPrice * Math.pow(changeRatio, minutesAgo / 60);
        } else if (minutesAgo <= 360 && priceChange.h6 !== undefined) {
          // Within last 6 hours - use h6 change
          const changeRatio = 1 - (priceChange.h6 / 100);
          estimatedPrice = currentPrice * Math.pow(changeRatio, minutesAgo / 360);
        } else if (priceChange.h24 !== undefined) {
          // Fallback to 24h change
          const changeRatio = 1 - (priceChange.h24 / 100);
          estimatedPrice = currentPrice * Math.pow(changeRatio, minutesAgo / 1440);
        }
        
        // Add some realistic variation (±0.5% random walk)
        const variation = 1 + ((Math.random() - 0.5) * 0.01);
        estimatedPrice *= variation;
        
        // Build OHLC with slight variation
        const high = estimatedPrice * (1 + Math.random() * 0.003);
        const low = estimatedPrice * (1 - Math.random() * 0.003);
        const open = estimatedPrice * (1 + (Math.random() - 0.5) * 0.002);
        const close = estimatedPrice;
        
        // Estimate volume (distribute hourly volume across minutes)
        let estimatedVolume = 0;
        if (volume.h24) {
          estimatedVolume = parseFloat(volume.h24) / 1440; // Spread 24h volume
        } else if (volume.h6) {
          estimatedVolume = parseFloat(volume.h6) / 360; // Spread 6h volume
        } else if (volume.h1) {
          estimatedVolume = parseFloat(volume.h1) / 60; // Spread 1h volume
        }
        
        candles.unshift({ // Prepend to maintain chronological order
          time: candleTime,
          open: open,
          high: Math.max(open, high, low, close),
          low: Math.min(open, high, low, close),
          close: close,
          volume: estimatedVolume
        });
      }
      
      return candles;
      
    } catch (err) {
      console.error(`DexScreener candle builder error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Get current token price (latest close)
   */
  async getCurrentPrice(tokenAddress) {
    const pairData = await this.fetchTokenData(tokenAddress);
    if (!pairData) {
      return null;
    }
    return parseFloat(pairData.priceUsd);
  }
  
  /**
   * Convert timeframe to milliseconds
   */
  getIntervalMs(timeframe) {
    const map = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    
    return map[timeframe] || 60 * 1000;
  }
}

export default DexScreenerCandles;
