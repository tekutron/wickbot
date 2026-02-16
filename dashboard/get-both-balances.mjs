#!/usr/bin/env node
/**
 * get-both-balances.mjs - Fetch balances for both SOL and USDC wallets
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getBothBalances() {
  try {
    // Load config
    const configPath = path.join(__dirname, '../config.mjs');
    const { default: config } = await import(`file://${configPath}`);
    
    // Connect to RPC
    const connection = new Connection(config.RPC_URL, 'confirmed');
    
    const wallets = [];
    
    // Get SOL wallet balance
    try {
      const solWalletPath = path.join(__dirname, '..', config.WALLET_PATH);
      const solWalletData = JSON.parse(fs.readFileSync(solWalletPath, 'utf8'));
      const solWallet = Keypair.fromSecretKey(Uint8Array.from(solWalletData));
      
      const solBalance = await connection.getBalance(solWallet.publicKey);
      const solAmount = solBalance / 1e9;
      
      let solUsdc = 0;
      try {
        const usdcMint = new PublicKey(config.TOKEN_ADDRESS_USDC);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, solWallet.publicKey);
        const accountInfo = await getAccount(connection, usdcTokenAccount);
        solUsdc = Number(accountInfo.amount) / 1e6;
      } catch (err) {
        solUsdc = 0;
      }
      
      wallets.push({
        name: 'SOL',
        address: solWallet.publicKey.toString(),
        sol: solAmount,
        usdc: solUsdc
      });
    } catch (err) {
      console.error(`SOL wallet error: ${err.message}`);
    }
    
    // Get USDC wallet balance
    try {
      const usdcWalletPath = path.join(__dirname, '..', config.USDC_WALLET_PATH);
      const usdcWalletData = JSON.parse(fs.readFileSync(usdcWalletPath, 'utf8'));
      const usdcWallet = Keypair.fromSecretKey(Uint8Array.from(usdcWalletData));
      
      const solBalance = await connection.getBalance(usdcWallet.publicKey);
      const solAmount = solBalance / 1e9;
      
      let usdcAmount = 0;
      try {
        const usdcMint = new PublicKey(config.TOKEN_ADDRESS_USDC);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, usdcWallet.publicKey);
        const accountInfo = await getAccount(connection, usdcTokenAccount);
        usdcAmount = Number(accountInfo.amount) / 1e6;
      } catch (err) {
        usdcAmount = 0;
      }
      
      wallets.push({
        name: 'USDC',
        address: usdcWallet.publicKey.toString(),
        sol: solAmount,
        usdc: usdcAmount
      });
    } catch (err) {
      console.error(`USDC wallet error: ${err.message}`);
    }
    
    // Output as JSON
    console.log(JSON.stringify({
      wallets,
      timestamp: Date.now()
    }));
    
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

getBothBalances();
