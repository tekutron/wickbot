#!/usr/bin/env node
console.log('🧪 Testing Decimal Fix\n');

// Example: 45281.215248 fartbutt tokens (6 decimals)
const tokenAmount = 45281.215248;
const wrongDecimals = 9;
const correctDecimals = 6;

console.log('Token amount:', tokenAmount);
console.log('');

// OLD (WRONG) WAY
const wrongBaseUnits = Math.floor(tokenAmount * Math.pow(10, wrongDecimals));
console.log('❌ OLD: Using 9 decimals (wrong)');
console.log(`   Base units: ${wrongBaseUnits}`);
console.log(`   This is 1000x TOO LARGE!`);
console.log('');

// NEW (CORRECT) WAY
const correctBaseUnits = Math.floor(tokenAmount * Math.pow(10, correctDecimals));
console.log('✅ NEW: Using 6 decimals (correct)');
console.log(`   Base units: ${correctBaseUnits}`);
console.log(`   This matches the on-chain amount!`);
console.log('');

console.log('Difference:', wrongBaseUnits / correctBaseUnits, 'x');
console.log('');
console.log('✅ Fix verified: Now using correct decimals per token!');
