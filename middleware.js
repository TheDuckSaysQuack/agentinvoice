import { kit, adapter } from './kit.js';
import 'dotenv/config';

// API pricing config
export const API_PRICES = {
  '/api/weather':   '0.001',  // $0.001 per call
  '/api/summarize': '0.005',  // $0.005 per call
  '/api/sentiment': '0.002',  // $0.002 per call
};

// Payment gate middleware
export async function paymentGate(req, res, next) {
  const agentBudget = req.headers['x-agent-budget'];
  const agentSpent = req.headers['x-agent-spent'];

  if (agentBudget && agentSpent) {
  const budget = parseFloat(agentBudget);
  const spent = parseFloat(agentSpent);
  const price = parseFloat(API_PRICES[req.path]);
  
  if (spent + price > budget) {
    console.log(`\n[BUDGET] Agent exceeded budget!`);
    console.log(`  Budget: $${budget} USDC`);
    console.log(`  Spent:  $${spent} USDC`);
    console.log(`  Requested: $${price} USDC`);
    console.log(`  BLOCKED`);
    
    return res.status(402).json({
      error: 'Budget Exceeded',
      budget: agentBudget,
      spent: agentSpent,
      requested: API_PRICES[req.path],
      message: `Cannot spend $${price} — budget limit $${budget} would be exceeded`,
    });
  }
}const price = API_PRICES[req.path];

  if (!price) {
    return next(); // No price = free endpoint
  }

  const agentWallet = req.headers['x-agent-wallet'];
  if (!agentWallet) {
    return res.status(402).json({
      error: 'Payment Required',
      message: `This endpoint costs $${price} USDC per request`,
      instructions: 'Include x-agent-wallet header with your wallet address',
      price_usdc: price,
    });
  }

  try {
    console.log(`\n[PAYMENT] $${price} USDC for ${req.path}`);
    console.log(`  Agent: ${agentWallet}`);

    // Send nanopayment via Arc App Kit
    let result;
    let attempts = 0;

    while (attempts < 3) {
    try {
        attempts++;
        console.log(`  [SEND] Attempt ${attempts}...`);
        result = await kit.send({
        from: { adapter, chain: 'Arc_Testnet' },
        to: process.env.RECIPIENT_ADDRESS,
        amount: price,
        token: 'USDC',
        });
        break; // success — exit retry loop
    } catch (err) {
        if (attempts >= 3) throw err;
        console.log(`  [RETRY] Attempt ${attempts} failed: ${err.message.slice(0, 50)}`);
        await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
    }
    }

    const txHash = result?.txHash || result?.transactionHash || result?.hash || 'confirmed';
    
    console.log(`  [OK] Tx: ${txHash}`);
    console.log(`  Explorer: https://testnet.arcscan.app/tx/${txHash}`);

    // Attach payment info to request
    req.payment = {
    amount: price,
    txHash,
    explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
    timestamp: new Date().toISOString(),
    };

    next(); // Payment confirmed — proceed to API handler

  } catch (error) {
    console.error('   ❌ Payment failed:', error.message);
    return res.status(402).json({
      error: 'Payment Failed',
      message: error.message,
    });
  }
}