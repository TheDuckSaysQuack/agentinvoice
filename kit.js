import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import 'dotenv/config';

// Create adapter using factory function (correct SDK pattern)
export const adapter = createViemAdapterFromPrivateKey({
  privateKey: process.env.WALLET_PRIVATE_KEY,
});

// Initialize App Kit
export const kit = new AppKit({
  kitKey: process.env.KIT_KEY,
});

console.log('Arc App Kit initialized');
console.log('Wallet:', process.env.WALLET_ADDRESS);