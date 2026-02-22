import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';

// Test PumpPortal swap API
const config = {
  wallet: './wallets/wickbot_wallet.json',
  rpc: 'https://api.mainnet-beta.solana.com',
  slippage: 10, // 10%
  priorityFee: 0.0001 // SOL
};

async function testPumpPortalSwap() {
  console.log('🧪 Testing PumpPortal Swap API\n');
  
  const walletData = JSON.parse(fs.readFileSync(config.wallet));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const connection = new Connection(config.rpc, 'confirmed');
  
  // Test 1: Get quote for a potential buy
  console.log('Test 1: BUY quote (0.01 SOL)');
  console.log('Endpoint: https://pumpportal.fun/api/trade-local');
  
  const buyBody = {
    publicKey: wallet.publicKey.toString(),
    action: 'buy',
    mint: 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump', // Lobstefeller
    amount: 0.01,
    denominatedInSol: 'true',
    slippage: config.slippage,
    priorityFee: config.priorityFee,
    pool: 'pump'
  };
  
  console.log('Request:', JSON.stringify(buyBody, null, 2));
  
  try {
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buyBody)
    });
    
    console.log(`\nStatus: ${response.status}`);
    
    if (response.ok) {
      const txBytes = await response.arrayBuffer();
      console.log(`✅ Got transaction (${txBytes.byteLength} bytes)`);
      
      // Try to deserialize
      try {
        const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
        console.log(`✅ Transaction deserialized successfully`);
        console.log(`   Instructions: ${tx.message.compiledInstructions.length}`);
      } catch (err) {
        console.log(`❌ Deserialize failed: ${err.message}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }
  } catch (err) {
    console.log(`❌ Request failed: ${err.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Compare with Jupiter Ultra
  console.log('\nComparison with Jupiter Ultra:');
  console.log('  PumpPortal: Direct bonding curve trades');
  console.log('  Jupiter: Aggregator (may route through multiple pools)');
  console.log('\nFor pump.fun tokens specifically:');
  console.log('  ✅ PumpPortal likely faster (direct)');
  console.log('  ✅ Jupiter Ultra has more liquidity routing');
}

testPumpPortalSwap();
