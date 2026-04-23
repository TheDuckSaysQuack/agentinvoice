# AgentInvoice

> Pay-per-use API middleware for AI agents. Powered by Circle Nanopayments on Arc.

AgentInvoice wraps any API and adds autonomous micropayments. When an AI agent calls a paid endpoint, the middleware processes a USDC nanopayment on Arc blockchain — no billing system, no subscriptions, no gas fees.

## How it works
AI Agent → POST /api/weather
+ x-agent-wallet header
+ x-agent-budget header
↓
AgentInvoice Middleware
↓
Circle Nanopayment: $0.001 USDC
↓
Arc Testnet settlement (~5 seconds)
↓
API response returned to agent

## Demo

Grok AI agent autonomously:
1. Calls get_weather → pays $0.001 USDC
2. Calls summarize_text → pays $0.005 USDC
3. Calls analyze_sentiment → pays $0.002 USDC
4. Hits $0.010 budget limit → middleware blocks → agent adapts

All payments on Arc Block Explorer:
https://testnet.arcscan.app/address/0x7Df7AeE6DcD7722B0bDd7Ec82f38A8a161f48BFE

## Stack

- Node.js + Express
- Circle App Kit (`@circle-fin/app-kit`)
- Circle Viem Adapter v2 (`@circle-fin/adapter-viem-v2`)
- Grok API (xAI)
- Arc Testnet + USDC

## Setup

```bash
npm install
```

Create `.env`:
KIT_KEY=your_circle_kit_key
WALLET_PRIVATE_KEY=your_wallet_private_key
WALLET_ADDRESS=your_wallet_address
RECIPIENT_ADDRESS=recipient_wallet_address
GROK_API_KEY=your_grok_api_key
PROXY_URL=http://user:pass@host:port
AGENT_BUDGET=0.010

Run:
```bash
# Terminal 1 — API server
node index.js

# Terminal 2 — AI agent demo
node agent-ai.js
```

## API Pricing

| Endpoint | Price | Method |
|---|---|---|
| /api/weather | $0.001 USDC | GET |
| /api/summarize | $0.005 USDC | POST |
| /api/sentiment | $0.002 USDC | POST |

## Budget Enforcement

x-agent-budget: 0.010
x-agent-spent: 0.006

Returns 402 when exceeded:
```json
{
  "error": "Budget Exceeded",
  "budget": "0.010",
  "spent": "0.006",
  "requested": "0.005"
}
```

## Why Circle Nanopayments?

| Rail | Fee per $0.001 call | Viable? |
|---|---|---|
| Stripe | $0.30 minimum | ❌ 300x |
| Ethereum gas | $0.50–$5.00 | ❌ 500x–5000x |
| Circle Nanopayments on Arc | ~$0.00109 | ✅ |

## Built at Arc Hackathon — Agentic Economy, April 2026