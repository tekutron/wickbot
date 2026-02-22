import { PositionManager } from './executor/position-manager.mjs';
import config from './config.mjs';

config.CUSTOM_TOKEN_ADDRESS = 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump';
config.CUSTOM_TOKEN_SYMBOL = 'Lobstefeller';

const position = {
  id: 'emergency_close',
  mint: 'B1Aeqi2Q8tv92W6G1makLWdsWb8c4gdJckJtjFmWpump',
  symbol: 'Lobstefeller',
  entryTime: Date.now() - 1000000,
  tokenAmount: 2104296.309106,
  tokenAmountRaw: '2104296309106',
  entryPrice: 0.000004794,
  entryCapital: 0.01,
  status: 'OPEN',
  exitReason: null
};

(async () => {
  console.log('💰 Emergency position close via PositionManager...\n');
  
  const pm = new PositionManager();
  await pm.initialize();
  
  console.log('Attempting to sell 2.1M Lobstefeller tokens...\n');
  
  const result = await pm.sellPosition(position, 'EMERGENCY_RECOVERY');
  
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`   TX: ${result.signature}`);
    console.log(`   SOL received: ${result.solReceived}`);
    console.log(`   New balance: ${result.newBalance}`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
})();
