#!/usr/bin/env node
/**
 * birdeye-api.mjs - Birdeye API Client
 * Fetches OHLCV candle data for Solana tokens
 */

import fetch from 'node-fetch';
import config from '../config.mjs';

export class BirdeyeAPI {
  constructor() {
    this.baseUrl = config.BIRDEYE_BASE_URL;
    this.apiKey = config.BIRDEYE_API_KEY;
  }
  
  /**
   * Fetch OHLCV candles for a token
   * @param {string} tokenAddress - Solana token address
   * @param {string} timeframe - '1m', '5m', '15m', '30m', '1h', etc.
   * @param {number} limit - Number of candles to fetch (max 1000)
   * @returns {Array} Array of candle objects {time, open, high, low, close, volume}
   */
  async fetchCandles(tokenAddress, timeframe = '1m', limit = 100) {
    try {
      // Convert timeframe to Birdeye format
      const interval = this.convertTimeframe(timeframe);
      
      const url = `${this.baseUrl}/defi/ohlcv?address=${tokenAddress}&type=${interval}&time_from=${this.getTimeFrom(interval, limit)}&time_to=${Math.floor(Date.now() / 1000)}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Birdeye API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.items) {
        throw new Error('Invalid response from Birdeye API');
      }
      
      // Convert to standard format
      return data.data.items.map(item => ({
        time: item.unixTime * 1000, // Convert to milliseconds
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v
      }));
      
    } catch (err) {
      console.error(`Birdeye fetch error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Convert our timeframe format to Birdeye's
   */
  convertTimeframe(timeframe) {
    const map = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '8h': '8H',
      '12h': '12H',
      '1d': '1D',
    };
    
    return map[timeframe] || '1m';
  }
  
  /**
   * Calculate time_from parameter based on interval and limit
   */
  getTimeFrom(interval, limit) {
    const now = Math.floor(Date.now() / 1000);
    
    // Convert interval to seconds
    const intervalSeconds = {
      '1m': 60,
      '3m': 180,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1H': 3600,
      '2H': 7200,
      '4H': 14400,
      '6H': 21600,
      '8H': 28800,
      '12H': 43200,
      '1D': 86400,
    };
    
    const seconds = intervalSeconds[interval] || 60;
    return now - (seconds * limit);
  }
  
  /**
   * Get current token price (latest close)
   */
  async getCurrentPrice(tokenAddress) {
    const candles = await this.fetchCandles(tokenAddress, '1m', 1);
    if (!candles || candles.length === 0) {
      return null;
    }
    return candles[candles.length - 1].close;
  }
}

export default BirdeyeAPI;
