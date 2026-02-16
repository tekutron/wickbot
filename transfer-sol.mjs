import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const fromWalletPath = process.argv[2];
const toAddress = process.argv[3];
const amountSol = parseFloat(process.argv[4]);

if (!fromWalletPath || !toAddress || !amountSol) {
  console.error('Usage: node transfer-sol.mjs <from_wallet_path> <to_address> <amount_sol>');
  process.exit(1);
}

const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');

// Load sender wallet
const walletData = JSON.parse(fs.readFileSync(fromWalletPath, 'utf8'));
const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(walletData));

console.log(`\n💸 Transferring ${amountSol} SOL`);
console.log(`   From: ${fromKeypair.publicKey.toString()}`);
console.log(`   To: ${toAddress}`);

// Get balance
const balance = await connection.getBalance(fromKeypair.publicKey);
console.log(`   Current balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

if (balance < amountSol * LAMPORTS_PER_SOL) {
  console.error('❌ Insufficient balance');
  process.exit(1);
}

// Create transfer transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromKeypair.publicKey,
    toPubkey: toAddress,
    lamports: amountSol * LAMPORTS_PER_SOL
  })
);

console.log('📤 Sending transaction...');

try {
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Transfer complete!');
  console.log(`   Signature: ${signature}`);
  
  // Check new balances
  const fromBalance = await connection.getBalance(fromKeypair.publicKey);
  const toBalance = await connection.getBalance(toAddress);
  
  console.log(`\n💰 New balances:`);
  console.log(`   From: ${(fromBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   To: ${(toBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  
} catch (err) {
  console.error('❌ Transfer failed:', err.message);
  process.exit(1);
}
