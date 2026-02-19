#!/usr/bin/env node
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';

const BUDI_MINT = '7usWgvKjHRrSi9dfzoCXaBXggnwbGmKcwE6pdJZtpump';
const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_usdc_wallet.json', 'utf8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
const connection = new Connection('https://api.mainnet-beta.solana.com');

try {
  const budiMint = new PublicKey(BUDI_MINT);
  const ata = await getAssociatedTokenAddress(budiMint, wallet.publicKey);
  
  console.log(`Checking: ${ata.toString()}\n`);
  
  const account = await getAccount(connection, ata);
  const rawBalance = Number(account.amount);
  
  console.log('Raw balance:', rawBalance);
  console.log('With 6 decimals:', rawBalance / 1e6);
  console.log('With 9 decimals:', rawBalance / 1e9);
} catch (err) {
  console.log('Error:', err.message);
}
