import { Redis } from "@upstash/redis";

// Mirrors src/lib/turing/redis.ts so the chain engine uses the same
// Upstash/KV credentials already provisioned for the project.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
