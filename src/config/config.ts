import dotenv from 'dotenv';

dotenv.config();

interface Config {
    // App
    port: number;
    nodeEnv: string;

    // Redis
    redisPath: string;
    redisPort: number;

    // Postgres WRITE (primary)
    dbWriteHost: string;
    dbWritePort: number;
    dbWriteUser: string;
    dbWritePassword: string;
    dbWriteName: string;

    // Postgres READ (replica)
    dbReadHost: string;
    dbReadPort: number;
    dbReadUser: string;
    dbReadPassword: string;
    dbReadName: string;
}

const config: Config = {
    // ===== APP =====
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // ===== REDIS =====
    redisPath: process.env.REDIS_PATH || 'localhost',
    redisPort: Number(process.env.REDIS_PORT) || 6379,

    // ===== POSTGRES WRITE =====
    dbWriteHost: process.env.DB_WRITE_HOST || 'localhost',
    dbWritePort: Number(process.env.DB_WRITE_PORT) || 5432,
    dbWriteUser: process.env.DB_WRITE_USER || 'app',
    dbWritePassword: process.env.DB_WRITE_PASSWORD || 'app_pwd',
    dbWriteName: process.env.DB_WRITE_NAME || 'appdb',

    // ===== POSTGRES READ =====
    dbReadHost: process.env.DB_READ_HOST || 'localhost',
    dbReadPort: Number(process.env.DB_READ_PORT) || 5433,
    dbReadUser: process.env.DB_READ_USER || 'app',
    dbReadPassword: process.env.DB_READ_PASSWORD || 'app_pwd',
    dbReadName: process.env.DB_READ_NAME || 'appdb',
};

export default config;
