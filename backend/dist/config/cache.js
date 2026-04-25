"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCache = initCache;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
class InMemoryCache {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
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
    async set(key, value, ttlSeconds) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
}
const memoryCache = new InMemoryCache();
let redis = null;
async function initCache() {
    if (!env_1.env.redisUrl) {
        return;
    }
    redis = new ioredis_1.default(env_1.env.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true
    });
    try {
        await redis.connect();
    }
    catch (error) {
        redis = null;
        console.warn("Redis unavailable, using in-memory cache fallback.", error);
    }
}
async function cacheGet(key) {
    const raw = redis ? await redis.get(key) : await memoryCache.get(key);
    return raw ? JSON.parse(raw) : null;
}
async function cacheSet(key, value, ttlSeconds = env_1.env.cacheTtlSeconds) {
    const serialized = JSON.stringify(value);
    if (redis) {
        await redis.set(key, serialized, "EX", ttlSeconds);
        return;
    }
    await memoryCache.set(key, serialized, ttlSeconds);
}
