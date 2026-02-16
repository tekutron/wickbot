import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';

const walletPath = process.argv[2] || './wallets/wickbot_wallet.json';
const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(walletData));
const connection = new Connection(rpcUrl, 'confirmed');

const balance = await connection.getBalance(keypair.publicKey);
console.log(`Wallet: ${keypair.publicKey.toString()}`);
console.log(`Balance: ${(balance / 1e9).toFixed(6)} SOL ($${((balance / 1e9) * 200).toFixed(2)})`);
