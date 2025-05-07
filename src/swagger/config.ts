import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

/**
 * Swagger configuration options
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Echlub API Documentation',
      version,
      description: 'API documentation for Echlub Backend Services',
      contact: {
        name: 'API Support',
        email: 'support@echlub.com'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Development API Server'
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Collaboration',
        description: 'Real-time collaboration and signaling endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    './src/modules/*/presentation/controllers/*.ts',
    './src/modules/*/presentation/routes/*.ts',
    './src/shared/infrastructure/middlewares/*.ts'
  ]
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec; 