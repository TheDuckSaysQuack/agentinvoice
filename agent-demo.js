import 'dotenv/config';

const BASE_URL = 'http://localhost:3000';
const AGENT_WALLET = process.env.WALLET_ADDRESS;
const TOTAL_CALLS = 60; // Exceeds the 50+ requirement

const headers = {
  'Content-Type': 'application/json',
  'x-agent-wallet': AGENT_WALLET,
};

async function callWeather(i) {
  const cities = ['Phuket', 'Bangkok', 'Singapore', 'Tokyo', 'London'];
  const city = cities[i % cities.length];
  const r = await fetch(`${BASE_URL}/api/weather?city=${city}`, { headers });
  return r.json();
}

async function callSummarize(i) {
  const r = await fetch(`${BASE_URL}/api/summarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: `This is test text number ${i} for the AgentInvoice demo showing pay-per-use AI agent payments using Circle Nanopayments on Arc blockchain with USDC settlement.`
    }),
  });
  return r.json();
}

async function callSentiment(i) {
  const texts = [
    'This is great amazing excellent product',
    'This is terrible bad horrible experience',
    'The weather is okay today nothing special',
  ];
  const r = await fetch(`${BASE_URL}/api/sentiment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: texts[i % texts.length] }),
  });
  return r.json();
}

async function runDemo() {
  console.log('AgentInvoice Demo — AI Agent Simulation');
  console.log('='.repeat(50));
  console.log(`Agent wallet: ${AGENT_WALLET}`);
  console.log(`Total calls:  ${TOTAL_CALLS}`);
  console.log(`Target:       50+ onchain transactions\n`);

  let totalSpent = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < TOTAL_CALLS; i++) {
    try {
      let result;
      const callType = i % 3;

      if (callType === 0) {
        result = await callWeather(i);
        totalSpent += 0.001;
      } else if (callType === 1) {
        result = await callSummarize(i);
        totalSpent += 0.005;
      } else {
        result = await callSentiment(i);
        totalSpent += 0.002;
      }

      successful++;
      console.log(`[${i + 1}/${TOTAL_CALLS}] OK $${['0.001', '0.005', '0.002'][callType]} | Tx: ${result.payment?.txHash?.slice(0, 20)}...`);

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      failed++;
      console.log(`[${i + 1}/${TOTAL_CALLS}] ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('DEMO RESULTS');
  console.log('='.repeat(50));
  console.log(`Successful: ${successful}`);
  console.log(`Failed:     ${failed}`);
  console.log(`USDC spent: $${totalSpent.toFixed(3)}`);
  console.log(`Arc Explorer: https://testnet.arcscan.app`);
  console.log(`\nReady for hackathon submission!`);
}

runDemo().catch(console.error);