import express from 'express';
import { paymentGate, API_PRICES } from './middleware.js';
import 'dotenv/config';

const app = express();
app.use(express.json());

// Apply payment gate to all routes
app.use(paymentGate);

// ─── FREE ENDPOINT ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'AgentInvoice Demo',
    description: 'Pay-per-use API middleware powered by Circle Nanopayments on Arc',
    endpoints: API_PRICES,
    how_to_use: 'Add header: x-agent-wallet: YOUR_WALLET_ADDRESS',
  });
});

// ─── WEATHER API - $0.001 per call ────────────────────────────────
app.get('/api/weather', (req, res) => {
  const cities = ['Phuket', 'Bangkok', 'Singapore', 'Tokyo', 'New York'];
  const city = req.query.city || cities[Math.floor(Math.random() * cities.length)];

  res.json({
    city,
    temperature: Math.floor(Math.random() * 15 + 25) + '°C',
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 30 + 60) + '%',
    payment: req.payment,
    powered_by: 'AgentInvoice — Circle Nanopayments on Arc',
  });
});

// ─── SUMMARIZER API - $0.005 per call ─────────────────────────────
app.post('/api/summarize', (req, res) => {
  const text = req.body.text || 'No text provided';
  const words = text.split(' ');
  const summary = words.slice(0, Math.min(10, words.length)).join(' ') + '...';

  res.json({
    original_length: words.length + ' words',
    summary,
    compression: Math.round((1 - 10 / words.length) * 100) + '%',
    payment: req.payment,
    powered_by: 'AgentInvoice — Circle Nanopayments on Arc',
  });
});

// ─── SENTIMENT API - $0.002 per call ──────────────────────────────
app.post('/api/sentiment', (req, res) => {
  const text = req.body.text || '';
  const positive = ['good', 'great', 'excellent', 'amazing', 'love', 'happy'];
  const negative = ['bad', 'terrible', 'hate', 'awful', 'horrible'];

  const words = text.toLowerCase().split(' ');
  const posScore = words.filter(w => positive.includes(w)).length;
  const negScore = words.filter(w => negative.includes(w)).length;

  const sentiment = posScore > negScore ? 'positive' :
                    negScore > posScore ? 'negative' : 'neutral';

  res.json({
    text: text.slice(0, 100),
    sentiment,
    confidence: Math.floor(Math.random() * 20 + 75) + '%',
    payment: req.payment,
    powered_by: 'AgentInvoice — Circle Nanopayments on Arc',
  });
});

export default app;