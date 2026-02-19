#!/usr/bin/env node
/**
 * get-balance.mjs - Fetch balance for main wallet (single wallet mode)
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Timeout wrapper for RPC calls
async function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout')), ms)
    )
  ]);
}

async function getBalance() {
  try {
    // Load config
    const configPath = path.join(__dirname, '../config.mjs');
    const { default: config } = await import(`file://${configPath}`);
    
    // Connect to RPC
    const connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Load main wallet
    const walletPath = path.join(__dirname, '..', config.WALLET_PATH);
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    // Get SOL balance
    const solBalance = await withTimeout(connection.getBalance(wallet.publicKey));
    const solAmount = solBalance / 1e9;
    
    // Get USDC balance (if any)
    let usdcAmount = 0;
    try {
      const usdcMint = new PublicKey(config.TOKEN_ADDRESS_USDC);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);
      const accountInfo = await withTimeout(getAccount(connection, usdcTokenAccount));
      usdcAmount = Number(accountInfo.amount) / 1e6;
    } catch (err) {
      // No USDC account or empty
      usdcAmount = 0;
    }
    
    // Output as JSON
    console.log(JSON.stringify({
      address: wallet.publicKey.toString(),
      sol: solAmount,
      usdc: usdcAmount,
      timestamp: Date.now()
    }));
    
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

getBalance();
