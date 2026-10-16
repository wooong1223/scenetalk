// Local SDK import/interface check only. This makes no API requests.
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

const metadata = JSON.parse(readFileSync(new URL('../node_modules/@google/genai/package.json', import.meta.url), 'utf8'));
const client = new GoogleGenAI({ apiKey: 'offline-environment-check-placeholder' });
if (typeof client.interactions?.create !== 'function') {
  throw new Error('Gemini Interactions API is missing from the installed JavaScript SDK.');
}
if (typeof client.live?.connect !== 'function') {
  throw new Error('Gemini Live API is missing from the installed JavaScript SDK.');
}
console.log(JSON.stringify({version: metadata.version, interactions: true, live: true, networkCalls: 0}));
