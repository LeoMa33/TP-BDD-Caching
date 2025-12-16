import { redisClient } from '@config/redis.config';

export const redisSafe = {
    async get(key: string): Promise<string | null> {
        try {
            if (!redisClient.isOpen) return null;
            return await redisClient.get(key);
        } catch {
            return null;
        }
    },

    async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
        try {
            if (!redisClient.isOpen) return;
            await redisClient.setEx(key, ttlSeconds, value);
        } catch {
        }
    },

    async del(key: string): Promise<void> {
        try {
            if (!redisClient.isOpen) return;
            await redisClient.del(key);
        } catch {
        }
    },
};
