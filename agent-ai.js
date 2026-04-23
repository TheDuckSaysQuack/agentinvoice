import { HttpsProxyAgent } from 'https-proxy-agent';
import 'dotenv/config';

const BASE_URL = 'http://localhost:3000';
const AGENT_WALLET = process.env.WALLET_ADDRESS;
const AGENT_BUDGET = parseFloat(process.env.AGENT_BUDGET || '0.010');

const headers = {
  'Content-Type': 'application/json',
  'x-agent-wallet': AGENT_WALLET,
};

// ─── PAID API TOOLS ────────────────────────────────────────────────
async function getWeather(city, spent) {
  const r = await fetch(`${BASE_URL}/api/weather?city=${city}`, {
    headers: {
      ...headers,
      'x-agent-budget': AGENT_BUDGET.toString(),
      'x-agent-spent': spent.toFixed(3),
    },
  });
  return r.json();
}

async function summarizeText(text, spent) {
  const r = await fetch(`${BASE_URL}/api/summarize`, {
    method: 'POST',
    headers: {
      ...headers,
      'x-agent-budget': AGENT_BUDGET.toString(),
      'x-agent-spent': spent.toFixed(3),
    },
    body: JSON.stringify({ text }),
  });
  return r.json();
}

async function analyzeSentiment(text, spent) {
  const r = await fetch(`${BASE_URL}/api/sentiment`, {
    method: 'POST',
    headers: {
      ...headers,
      'x-agent-budget': AGENT_BUDGET.toString(),
      'x-agent-spent': spent.toFixed(3),
    },
    body: JSON.stringify({ text }),
  });
  return r.json();
}

// ─── GROK API ──────────────────────────────────────────────────────
async function callAI(messages) {
  const { default: nodeFetch } = await import('node-fetch');
  const agent = new HttpsProxyAgent(process.env.PROXY_URL);

  const response = await nodeFetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    }),
    agent,
  });

  const data = await response.json();
  if (data.error) {
    console.log('API error:', data.error.message);
    process.exit(1);
  }
  return data;
}

// ─── TOOL DEFINITIONS ──────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a city. Costs $0.001 USDC per call via Circle Nanopayments on Arc.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_text',
      description: 'Summarize a text. Costs $0.005 USDC per call via Circle Nanopayments on Arc.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to summarize' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_sentiment',
      description: 'Analyze sentiment of text (positive/negative/neutral). Costs $0.002 USDC per call via Circle Nanopayments on Arc.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' },
        },
        required: ['text'],
      },
    },
  },
];

// ─── EXECUTE TOOL ──────────────────────────────────────────────────
async function executeTool(name, args, spent) {
  switch (name) {
    case 'get_weather':       return getWeather(args.city, spent);
    case 'summarize_text':    return summarizeText(args.text, spent);
    case 'analyze_sentiment': return analyzeSentiment(args.text, spent);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── AGENTIC LOOP ──────────────────────────────────────────────────
async function runAgent(task, taskNumber = '') {
  console.log('\n' + '='.repeat(60));
  console.log(`  TASK #${taskNumber}`);
  const taskPreview = task.split(/[.?!]/)[0].trim();
  console.log('  ' + taskPreview);
  console.log('  Agent:  ' + AGENT_WALLET);
  console.log('  Budget: $' + AGENT_BUDGET.toFixed(3) + ' USDC');
  console.log('='.repeat(60));

  const messages = [
    {
      role: 'system',
      content: `You are an autonomous AI agent with a crypto wallet. Budget: $${AGENT_BUDGET.toFixed(3)} USDC total.

STRICT RULES:
1. NEVER ask for clarification. ALWAYS call tools immediately.
2. Extract all needed information from the user message and call tools right away.
3. If asked for weather in multiple cities — call get_weather for EACH city separately.
4. After collecting data — call summarize_text or analyze_sentiment as needed.
5. Only stop when task is fully complete.
6. Every tool call costs USDC via Circle Nanopayments on Arc blockchain.`,
    },
    { role: 'user', content: task },
  ];

  let totalSpent = 0;
  let txHashes = [];
  let step = 0;

  while (step < 10) {
    step++;

    const response = await callAI(messages);

    if (!response.choices || !response.choices[0]) {
      console.log('  Unexpected API response:', JSON.stringify(response).slice(0, 100));
      break;
    }

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    // ── Tool calls ─────────────────────────────────────────────────
    if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length > 0) {
      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        const inputStr = Object.entries(args)
          .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
          .join(', ');

        console.log('\n  [CALL]    ' + name);
        console.log('  [INPUT]   ' + inputStr);
        console.log('  [BUDGET]  $' + (AGENT_BUDGET - totalSpent).toFixed(3) + ' remaining');

        const result = await executeTool(name, args, totalSpent);

        // ── Budget blocked ─────────────────────────────────────────
        if (result.error === 'Budget Exceeded') {
          console.log('  [BLOCKED] Insufficient budget');
          console.log('  [NEED]    $' + result.requested + ' USDC');
          console.log('  [HAVE]    $' + (AGENT_BUDGET - totalSpent).toFixed(3) + ' USDC');

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: 'Budget exceeded. Complete the task using only data already gathered.',
            }),
          });
          continue;
        }

        // ── Payment confirmed ──────────────────────────────────────
        if (result.payment) {
          totalSpent += parseFloat(result.payment.amount);
          txHashes.push(result.payment.txHash);
          console.log('  [PAYMENT] $' + result.payment.amount + ' USDC');
          console.log('  [TX]      ' + result.payment.txHash);
          console.log('  [ARC]     https://testnet.arcscan.app/tx/' + result.payment.txHash);
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    // ── Final answer ───────────────────────────────────────────────
    if (choice.finish_reason === 'stop') {
      console.log('\n' + '='.repeat(60));
      console.log('  ANSWER');
      console.log('='.repeat(60));
      console.log(message.content);
      console.log('\n' + '-'.repeat(60));
      console.log('  PAYMENT SUMMARY');
      console.log('-'.repeat(60));
      console.log('  Budget:       $' + AGENT_BUDGET.toFixed(3) + ' USDC');
      console.log('  Spent:        $' + totalSpent.toFixed(3) + ' USDC');
      console.log('  Remaining:    $' + (AGENT_BUDGET - totalSpent).toFixed(3) + ' USDC');
      console.log('  Transactions: ' + txHashes.length);
      if (txHashes.length > 0) {
        console.log('');
        txHashes.forEach((tx, i) => {
          console.log('  [' + (i + 1) + '] https://testnet.arcscan.app/tx/' + tx);
        });
      }
      console.log('-'.repeat(60));
      return { spent: totalSpent, transactions: txHashes.length };
    }
  }

  return { spent: totalSpent, transactions: txHashes.length };
}

// ─── DEMO TASKS ────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('  AgentInvoice — AI Agent Demo');
  console.log('  Powered by Grok + Circle Nanopayments on Arc');
  console.log('  ' + new Date().toISOString());
  console.log('');

  const r1 = await runAgent(
    'I need a travel briefing for Phuket, Thailand. ' +
    'Call get_weather for Phuket. Then call summarize_text on the weather data. ' +
    'Then call analyze_sentiment to check if the vibe is positive or negative. ' +
    'Finally give me a complete briefing.',
    1
  );

  const r2 = await runAgent(
    'Get weather for Phuket, Bangkok, and Singapore. ' +
    'Compare all three and recommend the best city for outdoor activities today.',
    2
  );

  const r3 = await runAgent(
    'Here is a customer review: "The product arrived late and packaging was damaged. ' +
    'However the item works perfectly and customer service was very helpful. Will order again." ' +
    'Call summarize_text on this review. ' +
    'Call analyze_sentiment on this review. ' +
    'Tell me if I should be concerned.',
    3
  );

  const r4 = await runAgent(
    'Get weather for Phuket, Bangkok, Singapore, Tokyo, London, and Paris. ' +
    'Then summarize all six cities together in one paragraph. ' +
    'Work within your budget.',
    4
  );

  // ── Overall session summary ────────────────────────────────────
  const totalSpent = (r1?.spent || 0) + (r2?.spent || 0) + (r3?.spent || 0) + (r4?.spent || 0);
  const totalTx = (r1?.transactions || 0) + (r2?.transactions || 0) + (r3?.transactions || 0) + (r4?.transactions || 0);

  console.log('\n' + '#'.repeat(60));
  console.log('  OVERALL SESSION SUMMARY');
  console.log('#'.repeat(60));
  console.log('  Tasks completed:    4');
  console.log('  Total transactions: ' + totalTx);
  console.log('  Total USDC spent:   $' + totalSpent.toFixed(3));
  console.log('  Avg cost per task:  $' + (totalSpent / 4).toFixed(3));
  console.log('  Network:            Arc Testnet');
  console.log('  Settlement:         Circle Nanopayments');
  console.log('  Agent wallet:       ' + AGENT_WALLET);
  console.log('  Arc Explorer:       https://testnet.arcscan.app/address/' + AGENT_WALLET);
  console.log('#'.repeat(60));
  console.log('');
}

main().catch(console.error);