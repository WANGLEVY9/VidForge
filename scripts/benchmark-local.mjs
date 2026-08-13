import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const configuredIterations = Number(process.env.BENCHMARK_ITERATIONS ?? 5000);
const iterations = Math.min(
  Math.max(Number.isFinite(configuredIterations) ? configuredIterations : 5000, 100),
  100000
);
const fixture = {
  model: 'doubao-seed-2.0-pro',
  messages: [
    { role: 'system', content: 'Generate a concise product video script.' },
    { role: 'user', content: 'A lightweight travel mug with a leak-proof lid.' },
  ],
  temperature: 0.2,
  maxTokens: 800,
};

const samples = [];
for (let i = 0; i < iterations; i += 1) {
  const startedAt = performance.now();
  createHash('sha256')
    .update(JSON.stringify({ ...fixture, sequence: i % 16 }))
    .digest('hex');
  samples.push(performance.now() - startedAt);
}
samples.sort((a, b) => a - b);

const percentile = (ratio) =>
  samples[Math.min(samples.length - 1, Math.floor(samples.length * ratio))];
console.log(
  JSON.stringify({
    benchmark: 'vidforge-local-baseline-v1',
    generatedAt: new Date().toISOString(),
    iterations,
    workload: 'deterministic cache-key hashing; no provider or network calls',
    latencyMs: {
      p50: Number(percentile(0.5).toFixed(4)),
      p95: Number(percentile(0.95).toFixed(4)),
    },
    estimatedCostCents: { text: 0.32, video5s: 18 },
    providerCalls: 0,
  })
);
