// Test Jupiter Ultra API directly
import fetch from 'node-fetch';

const testMint = 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump'; // Lobstefeller
const solMint = 'So11111111111111111111111111111111111111112';
const amount = '2104296309106';

console.log('🧪 Testing Jupiter Ultra API directly...\n');

// Test 1: Without API key
console.log('Test 1: Order endpoint (no API key)');
const params1 = new URLSearchParams({
  inputMint: testMint,
  outputMint: solMint,
  amount: amount,
  taker: 'DqfDgvcGMhHczhAeQp6nUNFGNkhQSbGPGjKLEn4QGihf',
  priorityFee: '50000'
});

try {
  const response1 = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${params1}`, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  console.log(`Status: ${response1.status}`);
  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));
} catch (err) {
  console.log('Error:', err.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 2: Try quote-api.jup.ag (standard API)
console.log('Test 2: Standard quote API (v6)');
const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${testMint}&outputMint=${solMint}&amount=${amount}&slippageBps=500`;

try {
  const response2 = await fetch(quoteUrl);
  console.log(`Status: ${response2.status}`);
  const data2 = await response2.json();
  
  if (data2.error) {
    console.log('Error:', data2.error);
  } else if (data2.outAmount) {
    console.log(`✅ Quote found!`);
    console.log(`   Out: ${(parseInt(data2.outAmount) / 1e9).toFixed(6)} SOL`);
    console.log(`   Price impact: ${data2.priceImpactPct}%`);
  }
} catch (err) {
  console.log('Error:', err.message);
}
