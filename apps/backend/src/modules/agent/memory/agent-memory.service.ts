import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AgentMemory } from './agent-memory.entity';
import {
  AgentMemoryKind,
  RecallAgentMemoryInput,
  RememberAgentMemoryInput,
  RecalledAgentMemory,
} from './agent-memory.types';

const MAX_CONTENT_LENGTH = 4_000;
const MAX_QUERY_LENGTH = 600;

/**
 * Small, provider-neutral memory plane.
 *
 * The first version intentionally uses deterministic lexical retrieval. It
 * gives the system a safe baseline before adding embeddings or a reranker:
 * every hit has a score, provenance, tenant filter and expiry check, and the
 * retrieval contract can later be backed by pgvector without changing agents.
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @InjectRepository(AgentMemory)
    private readonly repo: Repository<AgentMemory>
  ) {}

  async remember(input: RememberAgentMemoryInput): Promise<AgentMemory> {
    const content = input.content.trim().slice(0, MAX_CONTENT_LENGTH);
    if (!input.userId || !input.semanticKey.trim() || !content) {
      throw new Error('Agent memory requires userId, semanticKey and content');
    }

    const semanticKey = input.semanticKey.trim().slice(0, 220);
    const existing = await this.repo.findOne({ where: { userId: input.userId, semanticKey } });
    const value = {
      userId: input.userId,
      productSpaceId: input.productSpaceId ?? null,
      sourceRunId: input.sourceRunId ?? null,
      scope: input.scope ?? (input.productSpaceId ? 'product_space' : 'user'),
      kind: input.kind,
      semanticKey,
      content,
      metadata: input.metadata ?? null,
      importance: clamp(input.importance ?? 0.5, 0, 1),
      expiresAt: input.expiresAt ?? null,
    } satisfies Partial<AgentMemory>;

    if (existing) {
      Object.assign(existing, value);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(value));
  }

  async recall(input: RecallAgentMemoryInput): Promise<RecalledAgentMemory[]> {
    if (!input.userId) return [];
    const query = (input.query ?? '').trim().slice(0, MAX_QUERY_LENGTH);
    const limit = clampInt(input.limit ?? 6, 1, 20);
    const now = new Date();

    try {
      const qb = this.repo
        .createQueryBuilder('memory')
        .where('memory.userId = :userId', { userId: input.userId })
        .andWhere(
          new Brackets((scope) => {
            scope
              .where('memory.productSpaceId IS NULL')
              .orWhere('memory.productSpaceId = :productSpaceId', {
                productSpaceId: input.productSpaceId ?? '',
              });
          })
        )
        .andWhere(
          new Brackets((expiry) => {
            expiry.where('memory.expiresAt IS NULL').orWhere('memory.expiresAt > :now', { now });
          })
        )
        .orderBy('memory.importance', 'DESC')
        .addOrderBy('memory.updatedAt', 'DESC')
        .take(Math.min(limit * 5, 100));

      if (input.kinds?.length) {
        qb.andWhere('memory.kind IN (:...kinds)', { kinds: input.kinds });
      }

      const candidates = await qb.getMany();
      const tokens = tokenize(query);
      const ranked = candidates
        .map((memory) => {
          const lexical = lexicalScore(tokens, `${memory.content} ${memory.semanticKey}`);
          const recency = recencyScore(memory.updatedAt, now);
          const score = clamp(lexical * 0.65 + memory.importance * 0.25 + recency * 0.1, 0, 1);
          return { memory, score };
        })
        .filter(({ score }) => !query || score >= 0.12)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (ranked.length) {
        const accessedAt = new Date();
        await Promise.all(
          ranked.map(({ memory }) =>
            this.repo.update(memory.id, {
              accessCount: (memory.accessCount ?? 0) + 1,
              lastAccessedAt: accessedAt,
            })
          )
        );
      }

      return ranked.map(({ memory, score }) => ({
        id: memory.id,
        kind: memory.kind,
        scope: memory.scope,
        content: memory.content,
        metadata: memory.metadata ?? {},
        score: Number(score.toFixed(4)),
      }));
    } catch (error: any) {
      // Memory is an enhancement, never a reason to fail video generation.
      this.logger.warn(`Agent memory recall failed: ${error?.message ?? error}`);
      return [];
    }
  }

  async listForUser(userId: string, productSpaceId?: string, limit = 50): Promise<AgentMemory[]> {
    return this.repo.find({
      where: productSpaceId ? { userId, productSpaceId } : { userId },
      order: { updatedAt: 'DESC' },
      take: clampInt(limit, 1, 100),
    });
  }

  async removeForUser(userId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLocaleLowerCase()
        .split(/[\s,，。！？!?:：;；、/|()[\]{}]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  );
}

function lexicalScore(tokens: string[], value: string): number {
  if (!tokens.length) return 0;
  const haystack = value.toLocaleLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits / tokens.length;
}

function recencyScore(updatedAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - updatedAt.getTime()) / 86_400_000);
  return Math.exp(-ageDays / 30);
}

export const __memoryTestables = { lexicalScore, recencyScore, tokenize };
