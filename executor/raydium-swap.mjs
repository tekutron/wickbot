#!/usr/bin/env node
/**
 * raydium-swap.mjs - Real Raydium DEX Integration (Backup for Jupiter)
 * Direct on-chain swaps via Raydium AMM pools
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  Liquidity,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
  Percent
} from '@raydium-io/raydium-sdk';
import { Decimal } from 'decimal.js';

export class RaydiumSwap {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    
    // SOL/USDC pool on Raydium (main liquidity pool)
    this.SOL_USDC_POOL_ID = new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');
    
    // Token mints
    this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
    this.USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  /**
   * Swap SOL → USDC via Raydium
   */
  async swapSolToUsdc(amountSol) {
    try {
      console.log(`\n🔄 [Raydium] Swapping ${amountSol.toFixed(4)} SOL → USDC...`);
      
      // Get pool info
      const poolInfo = await this.getPoolInfo();
      if (!poolInfo) {
        throw new Error('Failed to fetch Raydium pool info');
      }
      
      // Calculate swap amounts
      const amountIn = new TokenAmount(
        new Token(TOKEN_PROGRAM_ID, this.SOL_MINT, 9, 'SOL', 'SOL'),
        Math.floor(amountSol * 1e9).toString()
      );
      
      const slippage = new Percent(50, 10000); // 0.5% slippage
      
      const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
        poolKeys: poolInfo,
        poolInfo: poolInfo,
        amountIn,
        currencyOut: new Token(TOKEN_PROGRAM_ID, this.USDC_MINT, 6, 'USDC', 'USDC'),
        slippage
      });
      
      console.log(`   Expected output: ${(parseInt(amountOut.raw.toString()) / 1e6).toFixed(2)} USDC`);
      console.log(`   Min output: ${(parseInt(minAmountOut.raw.toString()) / 1e6).toFixed(2)} USDC`);
      
      // Build swap transaction
      const { transaction, signers } = await Liquidity.makeSwapTransaction({
        connection: this.connection,
        poolKeys: poolInfo,
        userKeys: {
          tokenAccounts: await this.getUserTokenAccounts(),
          owner: this.wallet.publicKey
        },
        amountIn,
        amountOut: minAmountOut,
        fixedSide: 'in'
      });
      
      // Sign and send
      const signature = await this.connection.sendTransaction(transaction, [this.wallet, ...signers], {
        skipPreflight: false,
        maxRetries: 3
      });
      
      console.log(`   ✅ Raydium swap sent: ${signature}`);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        signature,
        source: 'raydium'
      };
      
    } catch (err) {
      console.error(`   ❌ Raydium swap failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Swap USDC → SOL via Raydium
   */
  async swapUsdcToSol(amountUsdc) {
    try {
      console.log(`\n🔄 [Raydium] Swapping ${amountUsdc.toFixed(2)} USDC → SOL...`);
      
      // Get pool info
      const poolInfo = await this.getPoolInfo();
      if (!poolInfo) {
        throw new Error('Failed to fetch Raydium pool info');
      }
      
      // Calculate swap amounts
      const amountIn = new TokenAmount(
        new Token(TOKEN_PROGRAM_ID, this.USDC_MINT, 6, 'USDC', 'USDC'),
        Math.floor(amountUsdc * 1e6).toString()
      );
      
      const slippage = new Percent(50, 10000); // 0.5% slippage
      
      const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
        poolKeys: poolInfo,
        poolInfo: poolInfo,
        amountIn,
        currencyOut: new Token(TOKEN_PROGRAM_ID, this.SOL_MINT, 9, 'SOL', 'SOL'),
        slippage
      });
      
      console.log(`   Expected output: ${(parseInt(amountOut.raw.toString()) / 1e9).toFixed(4)} SOL`);
      console.log(`   Min output: ${(parseInt(minAmountOut.raw.toString()) / 1e9).toFixed(4)} SOL`);
      
      // Build swap transaction
      const { transaction, signers } = await Liquidity.makeSwapTransaction({
        connection: this.connection,
        poolKeys: poolInfo,
        userKeys: {
          tokenAccounts: await this.getUserTokenAccounts(),
          owner: this.wallet.publicKey
        },
        amountIn,
        amountOut: minAmountOut,
        fixedSide: 'in'
      });
      
      // Sign and send
      const signature = await this.connection.sendTransaction(transaction, [this.wallet, ...signers], {
        skipPreflight: false,
        maxRetries: 3
      });
      
      console.log(`   ✅ Raydium swap sent: ${signature}`);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        signature,
        source: 'raydium'
      };
      
    } catch (err) {
      console.error(`   ❌ Raydium swap failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Get Raydium pool information
   */
  async getPoolInfo() {
    try {
      // Fetch pool account data
      const accountInfo = await this.connection.getAccountInfo(this.SOL_USDC_POOL_ID);
      
      if (!accountInfo) {
        throw new Error('Pool account not found');
      }
      
      // Parse pool data using Raydium SDK
      const poolData = Liquidity.decodeStateLayout(accountInfo.data);
      
      // Build pool keys
      const poolKeys = {
        id: this.SOL_USDC_POOL_ID,
        baseMint: poolData.baseMint,
        quoteMint: poolData.quoteMint,
        lpMint: poolData.lpMint,
        baseDecimals: 9, // SOL
        quoteDecimals: 6, // USDC
        lpDecimals: poolData.lpDecimals,
        version: 4,
        programId: poolData.programId,
        authority: poolData.authority,
        openOrders: poolData.openOrders,
        targetOrders: poolData.targetOrders,
        baseVault: poolData.baseVault,
        quoteVault: poolData.quoteVault,
        withdrawQueue: poolData.withdrawQueue,
        lpVault: poolData.lpVault,
        marketVersion: 3,
        marketProgramId: poolData.marketProgramId,
        marketId: poolData.marketId,
        marketAuthority: PublicKey.default,
        marketBaseVault: poolData.baseVault,
        marketQuoteVault: poolData.quoteVault,
        marketBids: poolData.bids,
        marketAsks: poolData.asks,
        marketEventQueue: poolData.eventQueue
      };
      
      return poolKeys;
      
    } catch (err) {
      console.error(`   Failed to fetch pool info: ${err.message}`);
      return null;
    }
  }

  /**
   * Get user's token accounts
   */
  async getUserTokenAccounts() {
    const accounts = await this.connection.getTokenAccountsByOwner(
      this.wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    return accounts.value.map(({ pubkey, account }) => ({
      pubkey,
      accountInfo: account
    }));
  }
}

export default RaydiumSwap;
