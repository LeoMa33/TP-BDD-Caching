import { Router } from 'express';
import { getOne, update, create } from '@controllers/products.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Products
 *     description: Gestion des produits
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Keyboard
 *         priceCents:
 *           type: integer
 *           example: 4999
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-16T10:30:00.000Z"
 *
 *     ProductCreate:
 *       type: object
 *       required: [name, priceCents]
 *       properties:
 *         name:
 *           type: string
 *           example: Mouse
 *         priceCents:
 *           type: integer
 *           example: 2999
 *
 *     ProductUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Mouse Pro
 *         priceCents:
 *           type: integer
 *           example: 3499
 */

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Crée un produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201:
 *         description: Produit créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides
 */
router.post('/', create);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Récupère un produit par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source:
 *                   type: string
 *                   example: cache
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Produit non trouvé
 */
router.get('/:id', getOne);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Met à jour un produit
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides / rien à mettre à jour
 *       404:
 *         description: Produit non trouvé
 */
router.put('/:id', update);

export default router;
