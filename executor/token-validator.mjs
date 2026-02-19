#!/usr/bin/env node
/**
 * token-validator.mjs - Universal Token Validator for Solana
 * Validates and fetches token info for ANY Solana token before trading
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';

export class TokenValidator {
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.tokenCache = new Map(); // Cache token info to avoid repeated RPC calls
  }
  
  /**
   * Validate and fetch complete token information
   * @param {string} tokenAddress - Token mint address
   * @returns {Object} Token info or throws error
   */
  async validateToken(tokenAddress) {
    // Check cache first
    if (this.tokenCache.has(tokenAddress)) {
      const cached = this.tokenCache.get(tokenAddress);
      // Cache for 5 minutes
      if (Date.now() - cached.timestamp < 300000) {
        return cached.info;
      }
    }
    
    console.log(`\n🔍 Validating token: ${tokenAddress.substring(0, 8)}...`);
    
    try {
      const tokenPubkey = new PublicKey(tokenAddress);
      
      // Step 1: Check if token exists on-chain
      const accountInfo = await this.connection.getAccountInfo(tokenPubkey);
      
      if (!accountInfo) {
        throw new Error('Token does not exist on-chain');
      }
      
      // Step 2: Determine token program (standard SPL or Token-2022)
      let tokenProgram = TOKEN_PROGRAM_ID;
      let isToken2022 = false;
      
      if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        tokenProgram = TOKEN_2022_PROGRAM_ID;
        isToken2022 = true;
        console.log('   ✅ Token-2022 detected');
      } else if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        console.log('   ✅ Standard SPL token detected');
      } else {
        throw new Error('Invalid token program (not SPL or Token-2022)');
      }
      
      // Step 3: Get decimals from on-chain data
      let decimals;
      try {
        const mintInfo = await this.connection.getParsedAccountInfo(tokenPubkey);
        if (mintInfo.value && mintInfo.value.data && mintInfo.value.data.parsed) {
          decimals = mintInfo.value.data.parsed.info.decimals;
          console.log(`   ✅ Decimals: ${decimals}`);
        } else {
          throw new Error('Could not parse mint info');
        }
      } catch (err) {
        console.log(`   ⚠️  RPC mint parsing failed, trying DexScreener...`);
        decimals = await this.getDecimalsFromDexScreener(tokenAddress);
      }
      
      if (decimals === null || decimals === undefined) {
        throw new Error('Could not determine token decimals');
      }
      
      // Step 4: Get market data (optional but useful)
      const marketData = await this.getMarketData(tokenAddress);
      
      // Step 5: Check Jupiter route availability
      const jupiterSupported = await this.checkJupiterRoute(tokenAddress);
      
      if (!jupiterSupported) {
        console.log('   ⚠️  WARNING: Token may have limited liquidity on Jupiter');
      }
      
      const tokenInfo = {
        address: tokenAddress,
        decimals: decimals,
        program: tokenProgram.toBase58(),
        isToken2022: isToken2022,
        jupiterSupported: jupiterSupported,
        marketData: marketData,
        validated: true,
        timestamp: Date.now()
      };
      
      // Cache the result
      this.tokenCache.set(tokenAddress, {
        info: tokenInfo,
        timestamp: Date.now()
      });
      
      console.log('   ✅ Token validated successfully');
      
      return tokenInfo;
      
    } catch (err) {
      console.error(`   ❌ Token validation failed: ${err.message}`);
      throw new Error(`Token validation failed: ${err.message}`);
    }
  }
  
  /**
   * Get decimals from DexScreener (fallback)
   */
  async getDecimalsFromDexScreener(tokenAddress) {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        
        // DexScreener might not have decimals directly, infer from common patterns
        // Most pump.fun tokens: 6 decimals
        // Standard SPL: 9 decimals
        // USDC/USDT: 6 decimals
        
        // Check if it's a common token
        const symbol = pair.baseToken?.symbol?.toLowerCase();
        
        if (symbol === 'usdc' || symbol === 'usdt') {
          return 6;
        }
        
        // Default for most tokens
        // Check market cap - if very low, likely pump.fun (6 decimals)
        const fdv = parseFloat(pair.fdv || 0);
        if (fdv < 10000000) { // < $10M = likely pump.fun
          console.log('   💡 Low market cap detected, using 6 decimals (pump.fun pattern)');
          return 6;
        }
        
        // Default to 9 for established tokens
        return 9;
      }
      
      return null;
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Get market data from DexScreener
   */
  async getMarketData(tokenAddress) {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        
        return {
          symbol: pair.baseToken?.symbol || 'Unknown',
          price: parseFloat(pair.priceUsd || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          marketCap: parseFloat(pair.fdv || pair.marketCap || 0)
        };
      }
      
      return null;
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Check if Jupiter has a route for this token
   */
  async checkJupiterRoute(tokenAddress) {
    try {
      // Check SOL → Token route
      const solMint = 'So11111111111111111111111111111111111111112';
      const testAmount = 10000000; // 0.01 SOL in lamports
      
      const params = new URLSearchParams({
        inputMint: solMint,
        outputMint: tokenAddress,
        amount: testAmount.toString()
      });
      
      const response = await fetch(
        `https://lite-api.jup.ag/ultra/v1/order?${params}`
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // If Jupiter returns a route, token is supported
      if (data.outAmount && parseInt(data.outAmount) > 0) {
        console.log('   ✅ Jupiter route available');
        return true;
      }
      
      return false;
    } catch (err) {
      console.log(`   ⚠️  Could not verify Jupiter route: ${err.message}`);
      return false; // Assume not supported if we can't verify
    }
  }
  
  /**
   * Validate multiple tokens at once
   */
  async validateTokens(tokenAddresses) {
    const results = {};
    
    for (const address of tokenAddresses) {
      try {
        results[address] = await this.validateToken(address);
      } catch (err) {
        results[address] = {
          validated: false,
          error: err.message
        };
      }
    }
    
    return results;
  }
  
  /**
   * Clear cache (useful when switching tokens frequently)
   */
  clearCache() {
    this.tokenCache.clear();
  }
}

// Export singleton instance
export default new TokenValidator();
