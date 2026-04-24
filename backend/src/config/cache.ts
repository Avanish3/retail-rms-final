import Redis from "ioredis";
import { env } from "./env";

class InMemoryCache {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string) {
    const hit = this.store.get(key);
    if (!hit) {
      return null;
    }

    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return hit.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

const memoryCache = new InMemoryCache();

let redis: Redis | null = null;

export async function initCache() {
  if (!env.redisUrl) {
    return;
  }

  redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true
  });

  try {
    await redis.connect();
  } catch (error) {
    redis = null;
    console.warn("Redis unavailable, using in-memory cache fallback.", error);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = redis ? await redis.get(key) : await memoryCache.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = env.cacheTtlSeconds) {
  const serialized = JSON.stringify(value);
  if (redis) {
    await redis.set(key, serialized, "EX", ttlSeconds);
    return;
  }

  await memoryCache.set(key, serialized, ttlSeconds);
}
