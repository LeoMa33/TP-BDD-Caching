import { Pool } from 'pg';
import config from "@config/config";

export enum PoolMode {
    WRITE,
    READ
}

export const pgPool_write = new Pool({
    host: config.dbWriteHost,
    port: config.dbWritePort,
    user: config.dbWriteUser,
    password: config.dbWritePassword,
    database: config.dbWriteName,
});

export const pgPool_read = new Pool({
    host: config.dbReadHost,
    port: config.dbReadPort,
    user: config.dbReadUser,
    password: config.dbReadPassword,
    database: config.dbReadName,
});

export const pgPool = (mode: PoolMode): Pool => {
    switch (mode) {
        case PoolMode.READ:
            return pgPool_read;
        case PoolMode.WRITE:
            return pgPool_write;
    }
};