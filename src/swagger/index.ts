import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config';

/**
 * Configure Swagger documentation routes
 * @param app Express application instance
 */
export function setupSwagger(app: Application): void {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Echlub API Documentation'
  }));
  
  // Serve Swagger specification as JSON
  app.get('/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('✓ Swagger API documentation available at /api-docs');
} 