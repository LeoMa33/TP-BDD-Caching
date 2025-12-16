import { createClient } from 'redis';
import config from '@config/config';

export const redisClient = createClient({
    url: `redis://${config.redisPath}:${config.redisPort}`,
    socket: {
        reconnectStrategy(retries) {
            if (retries > 10) {
                console.warn('Redis: too many retries, stop reconnecting for now');
                return false;
            }
            return Math.min(retries * 200, 2000);
        },
    },
});

redisClient.on('error', (err) => {
    console.error('Redis error', err);
});

(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('Redis unavailable at startup, cache disabled');
    }
})();
