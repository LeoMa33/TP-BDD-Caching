import express from 'express';
import itemRoutes from '@routes/products.route';
import { errorHandler } from '@middlewares/errorHandler.middleware';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';


const app = express();

app.use(express.json());

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Products API',
        version: '1.0.0',
        description: 'API de gestion des produits',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
};

const swaggerOptions = {
    swaggerDefinition,
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/products', itemRoutes);

app.use(errorHandler);

export default app;