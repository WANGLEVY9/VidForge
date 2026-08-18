import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderOperation, ProviderOperationStatus } from './provider-operation.entity';

export interface BeginProviderOperationInput {
  userId: string;
  runId: string;
  nodeName: string;
  provider: string;
  capability: string;
  idempotencyKey: string;
  /** JSON-safe input used only to calculate a deterministic non-secret hash. */
  request: Record<string, unknown>;
  requestMetadata?: Record<string, unknown>;
}

export interface ProviderOperationAudit {
  id: string;
  nodeName: string;
  provider: string;
  capability: string;
  idempotencyKey: string;
  requestHash: string;
  remoteOperationId: string | null;
  status: ProviderOperationStatus;
  attempt: number;
  requestMetadata: Record<string, unknown> | null;
  resultMetadata: Record<string, unknown> | null;
  errorMessage: string | null;
  dispatchedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider side-effect control plane.
 *
 * A stable idempotency key maps to exactly one local operation record. If a
 * worker dies after the remote request is accepted, a resumed node can reuse
 * the recorded remote task ID and poll it instead of blindly creating a new
 * paid task. This is an operation ledger, not a transactional outbox: queue
 * dispatch and third-party APIs still have independent failure domains.
 */
@Injectable()
export class ProviderOperationService {
  private readonly logger = new Logger(ProviderOperationService.name);

  constructor(
    @InjectRepository(ProviderOperation)
    private readonly repo: Repository<ProviderOperation>
  ) {}

  async begin(input: BeginProviderOperationInput): Promise<ProviderOperation> {
    const idempotencyKey = input.idempotencyKey.trim().slice(0, 220);
    if (!input.userId || !input.runId || !idempotencyKey) {
      throw new Error('Provider operation requires userId, runId and idempotencyKey');
    }

    const existing = await this.repo.findOne({
      where: { provider: input.provider, idempotencyKey },
    });
    if (existing) return existing;

    const operation = this.repo.create({
      userId: input.userId,
      runId: input.runId,
      nodeName: input.nodeName,
      provider: input.provider,
      capability: input.capability,
      idempotencyKey,
      requestHash: stableRequestHash(input.request),
      remoteOperationId: null,
      status: 'pending',
      attempt: 0,
      requestMetadata: input.requestMetadata ?? null,
      resultMetadata: null,
      errorMessage: null,
      dispatchedAt: null,
      completedAt: null,
    });

    try {
      return await this.repo.save(operation);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrent = await this.repo.findOne({
        where: { provider: input.provider, idempotencyKey },
      });
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async markDispatched(
    operation: ProviderOperation,
    remoteOperationId: string
  ): Promise<ProviderOperation> {
    if (!remoteOperationId.trim()) throw new Error('remoteOperationId is required');
    if (operation.remoteOperationId && operation.remoteOperationId !== remoteOperationId) {
      throw new Error(`Provider operation ${operation.id} already owns a different remote ID`);
    }
    return this.repo.save({
      ...operation,
      remoteOperationId,
      status: 'running',
      attempt: operation.attempt + (operation.remoteOperationId ? 0 : 1),
      dispatchedAt: operation.dispatchedAt ?? new Date(),
      errorMessage: null,
    });
  }

  async markSucceeded(
    operation: ProviderOperation,
    resultMetadata: Record<string, unknown>
  ): Promise<ProviderOperation> {
    return this.repo.save({
      ...operation,
      status: 'succeeded',
      resultMetadata: { ...(operation.resultMetadata ?? {}), ...resultMetadata },
      errorMessage: null,
      completedAt: new Date(),
    });
  }

  async markFailed(operation: ProviderOperation, error: unknown): Promise<ProviderOperation> {
    const message = String(error instanceof Error ? error.message : error).slice(0, 2_000);
    this.logger.warn(`Provider operation ${operation.id} failed: ${message}`);
    return this.repo.save({
      ...operation,
      status: 'failed',
      errorMessage: message,
      completedAt: new Date(),
    });
  }

  async listAuditForRun(userId: string, runId: string): Promise<ProviderOperationAudit[]> {
    const operations = await this.repo.find({
      where: { userId, runId },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return operations.map(toAudit);
  }
}

function stableRequestHash(request: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(sortValue(request)))
    .digest('hex');
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }
  return value;
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === '23505'
  );
}

function toAudit(operation: ProviderOperation): ProviderOperationAudit {
  return {
    id: operation.id,
    nodeName: operation.nodeName,
    provider: operation.provider,
    capability: operation.capability,
    idempotencyKey: operation.idempotencyKey,
    requestHash: operation.requestHash,
    remoteOperationId: operation.remoteOperationId,
    status: operation.status,
    attempt: operation.attempt,
    requestMetadata: operation.requestMetadata,
    resultMetadata: operation.resultMetadata,
    errorMessage: operation.errorMessage,
    dispatchedAt: operation.dispatchedAt,
    completedAt: operation.completedAt,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  };
}

export const __providerOperationTestables = { stableRequestHash, sortValue };
