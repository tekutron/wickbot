#!/usr/bin/env node
/**
 * Test the token validator with different Solana tokens
 */

import tokenValidator from './executor/token-validator.mjs';

const testTokens = [
  {
    name: 'fartbutt',
    address: '9r1U43rsLHYNng9mZQ7jxLXAzdhXfmecwoQzjXhzpump'
  },
  {
    name: 'WAR',
    address: '8opvqaWysX1oYbXuTL8PHaoaTiXD69VFYAX4smPebonk'
  },
  {
    name: 'BONK',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
  },
  {
    name: 'WIF',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
  },
  {
    name: 'USDC',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }
];

async function main() {
  console.log('🧪 Testing Token Validator\n');
  console.log('=' .repeat(80));
  
  for (const token of testTokens) {
    console.log(`\n📊 Testing: ${token.name}`);
    console.log('-'.repeat(80));
    
    try {
      const info = await tokenValidator.validateToken(token.address);
      
      console.log('\n✅ Validation Result:');
      console.log('   Address:', info.address);
      console.log('   Decimals:', info.decimals);
      console.log('   Program:', info.isToken2022 ? 'Token-2022' : 'Standard SPL');
      console.log('   Jupiter Supported:', info.jupiterSupported ? 'YES' : 'NO');
      
      if (info.marketData) {
        console.log('\n📈 Market Data:');
        console.log('   Symbol:', info.marketData.symbol);
        console.log('   Price: $' + info.marketData.price.toFixed(6));
        console.log('   Liquidity: $' + info.marketData.liquidity.toLocaleString());
        console.log('   24h Volume: $' + info.marketData.volume24h.toLocaleString());
        console.log('   24h Change: ' + info.marketData.priceChange24h.toFixed(2) + '%');
        console.log('   Market Cap: $' + info.marketData.marketCap.toLocaleString());
      }
      
    } catch (err) {
      console.log('\n❌ Validation Failed:');
      console.log('   Error:', err.message);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Token validator test complete!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
