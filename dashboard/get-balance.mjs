#!/usr/bin/env node
/**
 * get-balance.mjs - Fetch wallet balances (SOL + USDC)
 * Called by dashboard server to get real-time balances
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getBalances() {
  try {
    // Load config
    const configPath = path.join(__dirname, '../config.mjs');
    const { default: config } = await import(`file://${configPath}`);
    
    // Load wallet
    const walletPath = path.join(__dirname, '..', config.WALLET_PATH);
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    
    // Connect to RPC
    const connection = new Connection(config.RPC_URL, 'confirmed');
    
    // Get SOL balance
    const solBalance = await connection.getBalance(wallet.publicKey);
    const solAmount = solBalance / 1e9;
    
    // Get USDC balance
    let usdcAmount = 0;
    try {
      const usdcMint = new PublicKey(config.TOKEN_ADDRESS_USDC);
      const usdcTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.publicKey
      );
      
      const accountInfo = await getAccount(connection, usdcTokenAccount);
      usdcAmount = Number(accountInfo.amount) / 1e6; // USDC has 6 decimals
    } catch (err) {
      // USDC account doesn't exist yet
      usdcAmount = 0;
    }
    
    // Output as JSON
    console.log(JSON.stringify({
      sol: solAmount,
      usdc: usdcAmount,
      timestamp: Date.now()
    }));
    
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

getBalances();
