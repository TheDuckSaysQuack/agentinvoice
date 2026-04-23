import app from './api-server.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log('\nAgentInvoice is running!');
  console.log(`Server: http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('   GET  /api/weather   — $0.001 USDC');
  console.log('   POST /api/summarize — $0.005 USDC');
  console.log('   POST /api/sentiment — $0.002 USDC');
  console.log('\nArc Explorer: https://testnet.arcscan.app');
  console.log('\nWaiting for agent requests...\n');
});