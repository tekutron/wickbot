import JupiterSwap from './executor/jupiter-swap.mjs';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

(async () => {
  console.log('💰 Selling pepper via Jupiter (100%)...\n');
  
  const jupiter = new JupiterSwap();
  await jupiter.initialize('./wallets/wickbot_wallet.json', 'https://api.mainnet-beta.solana.com');
  
  // Get actual token balance
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token');
  
  const walletData = JSON.parse(fs.readFileSync('./wallets/wickbot_wallet.json'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const mint = new PublicKey('9rn7HN8onzNUiHp6HevQBKC4qQmzAuaBo8u4uKJjpump');
  
  const ata = await getAssociatedTokenAddress(
    mint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const balance = await connection.getTokenAccountBalance(ata);
  const rawAmount = balance.value.amount;
  
  console.log(`Raw balance: ${rawAmount}`);
  console.log(`UI balance: ${balance.value.uiAmount}\n`);
  
  const result = await jupiter.swap(
    '9rn7HN8onzNUiHp6HevQBKC4qQmzAuaBo8u4uKJjpump',
    'So11111111111111111111111111111111111111112',
    rawAmount,
    9,
    9,
    'SWAP',
    5000
  );
  
  console.log('\nResult:', result);
})();
