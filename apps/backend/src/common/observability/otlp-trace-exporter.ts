import { createHash, randomUUID } from 'node:crypto';

export interface OtlpSpanInput {
  name: string;
  startedAt: Date;
  endedAt: Date;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean | undefined>;
  traceId?: string;
}

/** Optional OTLP/HTTP exporter. It is inert unless an OTEL endpoint is configured. */
export class OtlpTraceExporter {
  private readonly endpoint = this.resolveEndpoint();

  async export(input: OtlpSpanInput): Promise<void> {
    if (!this.endpoint || typeof fetch !== 'function') return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.toPayload(input)),
        signal: controller.signal,
      });
    } catch {
      // Telemetry must never change the business outcome.
    } finally {
      clearTimeout(timeout);
    }
  }

  private toPayload(input: OtlpSpanInput): Record<string, unknown> {
    const traceId = this.toTraceId(input.traceId ?? randomUUID());
    const spanId = randomUUID().replaceAll('-', '').slice(0, 16);
    const attributes = Object.entries(input.attributes)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ key, value: this.toAnyValue(value!) }));

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: 'service.name', value: { stringValue: 'vidforge-backend' } }],
          },
          scopeSpans: [
            {
              scope: { name: 'vidforge.observability' },
              spans: [
                {
                  traceId,
                  spanId,
                  name: input.name,
                  startTimeUnixNano: String(input.startedAt.getTime() * 1_000_000),
                  endTimeUnixNano: String(input.endedAt.getTime() * 1_000_000),
                  attributes,
                  status: { code: input.status === 'ok' ? 1 : 2 },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private toTraceId(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 32);
  }

  private toAnyValue(value: string | number | boolean): Record<string, unknown> {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { boolValue: value };
    return { doubleValue: value };
  }

  private resolveEndpoint(): string | undefined {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();
    if (endpoint) return endpoint;
    const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    if (!base) return undefined;
    return base.endsWith('/v1/traces') ? base : `${base.replace(/\/$/, '')}/v1/traces`;
  }
}
