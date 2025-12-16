import {NextFunction, Request, Response} from 'express';
import {pgPool, PoolMode} from '@config/postgres.config';
import {redisSafe} from "@cache/redis-safe.cache";

type ProductApi = {
    id: number;
    name: string;
    priceCents: number;
    updatedAt: string;
};

const mapProduct = (row: any): ProductApi => ({
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    updatedAt: new Date(row.updated_at).toISOString(),
});

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, priceCents } = req.body as {
            name?: string;
            priceCents?: number;
        };

        if (typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: 'Invalid name' });
        }
        if (!Number.isInteger(priceCents) || priceCents! < 0) {
            return res.status(400).json({ message: 'Invalid priceCents' });
        }

        const { rows } = await pgPool(PoolMode.WRITE).query(
            `
      INSERT INTO products (name, price_cents)
      VALUES ($1, $2)
      RETURNING id, name, price_cents, updated_at
      `,
            [name.trim(), priceCents]
        );

        const product = mapProduct(rows[0]);

        await redisSafe.setEx(`product:${product.id}`, 60, JSON.stringify(product));

        return res.status(201).json(product);
    } catch (err) {
        next(err);
    }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Invalid id' });
        }

        const cacheKey = `product:${id}`;

        const cached = await redisSafe.get(cacheKey);
        if (cached) {
            return res.json({
                source: 'cache',
                data: JSON.parse(cached) as ProductApi,
            });
        }

        const { rows } = await pgPool(PoolMode.READ).query(
            'SELECT id, name, price_cents, updated_at FROM products WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const product = mapProduct(rows[0]);

        await redisSafe.setEx(cacheKey, 60, JSON.stringify(product));

        return res.json({
            source: 'database',
            data: product,
        });
    } catch (err) {
        next(err);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Invalid id' });
        }

        const { name, priceCents } = req.body as { name?: string; priceCents?: number };

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return res.status(400).json({ message: 'Invalid name' });
        }
        if (priceCents !== undefined && (!Number.isInteger(priceCents) || priceCents < 0)) {
            return res.status(400).json({ message: 'Invalid priceCents' });
        }
        if (name === undefined && priceCents === undefined) {
            return res.status(400).json({ message: 'Nothing to update' });
        }

        const sets: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            values.push(name.trim());
            sets.push(`name = $${values.length}`);
        }
        if (priceCents !== undefined) {
            values.push(priceCents);
            sets.push(`price_cents = $${values.length}`);
        }

        values.push(id);

        const { rows } = await pgPool(PoolMode.WRITE).query(
            `
      UPDATE products
      SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, name, price_cents, updated_at
      `,
            values
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const updatedProduct = mapProduct(rows[0]);

        await redisSafe.del(`product:${id}`);

        return res.json(updatedProduct);
    } catch (err) {
        next(err);
    }
};
