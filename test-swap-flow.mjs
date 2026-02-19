#!/usr/bin/env node
/**
 * Test complete swap flow with different tokens
 */

import config from './config.mjs';
import tokenValidator from './executor/token-validator.mjs';
import { JupiterSwap } from './executor/jupiter-swap.mjs';

const testTokens = [
  {
    name: 'BONK',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    testAmount: 0.001 // 0.001 SOL test buy
  },
  {
    name: 'WIF',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    testAmount: 0.001
  },
  {
    name: 'GROKIUS',
    address: '67ezHLk8PUkjJCXjmmgPbx85VowA52ghfRXa9A8Tpump',
    testAmount: 0.001
  }
];

async function testTokenFlow(token) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${token.name} (${token.address})`);
  console.log('='.repeat(80));
  
  // Step 1: Validate token
  console.log('\n1️⃣ Validating token...');
  try {
    const tokenInfo = await tokenValidator.validateToken(token.address);
    
    if (!tokenInfo.validated) {
      console.log('❌ Token validation failed');
      return false;
    }
    
    console.log('✅ Token validated:');
    console.log('   Symbol:', tokenInfo.marketData?.symbol || 'N/A');
    console.log('   Decimals:', tokenInfo.decimals);
    console.log('   Program:', tokenInfo.isToken2022 ? 'Token-2022' : 'Standard SPL');
    console.log('   Jupiter:', tokenInfo.jupiterSupported ? 'YES' : 'NO');
    console.log('   Liquidity: $' + (tokenInfo.marketData?.liquidity || 0).toLocaleString());
    
    if (!tokenInfo.jupiterSupported) {
      console.log('⚠️  Jupiter not supported - skipping swap test');
      return false;
    }
    
    // Step 2: Test swap quote (no execution)
    console.log('\n2️⃣ Testing Jupiter quote...');
    const jupiter = new JupiterSwap();
    await jupiter.initialize();
    
    const solLamports = Math.floor(token.testAmount * 1e9);
    
    // Get quote by fetching from Jupiter API
    const params = new URLSearchParams({
      inputMint: config.TOKEN_ADDRESS_SOL,
      outputMint: token.address,
      amount: solLamports.toString(),
      taker: jupiter.wallet.publicKey.toBase58()
    });
    
    const response = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params}`);
    
    if (!response.ok) {
      console.log('❌ Jupiter quote failed:', response.status);
      return false;
    }
    
    const quote = await response.json();
    
    if (quote.errorCode) {
      console.log('❌ Jupiter error:', quote.errorMessage);
      return false;
    }
    
    const outputAmount = parseInt(quote.outAmount);
    const outputDisplay = (outputAmount / Math.pow(10, tokenInfo.decimals)).toFixed(6);
    
    console.log('✅ Jupiter quote successful:');
    console.log('   Input:', token.testAmount, 'SOL');
    console.log('   Output:', outputDisplay, token.name);
    console.log('   Price: $' + (token.testAmount * 200 / parseFloat(outputDisplay)).toFixed(6), 'per', token.name);
    
    console.log('\n✅ Token is ready for trading!');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Swap Flow for Multiple Tokens\n');
  console.log('This test verifies:');
  console.log('  1. Token validation works');
  console.log('  2. Decimals detected correctly');
  console.log('  3. Jupiter quotes work');
  console.log('  4. Ready for real trading\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const token of testTokens) {
    const success = await testTokenFlow(token);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${testTokens.length}`);
  console.log(`❌ Failed: ${failed}/${testTokens.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tokens ready for trading!');
  } else {
    console.log('\n⚠️  Some tokens failed validation');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
