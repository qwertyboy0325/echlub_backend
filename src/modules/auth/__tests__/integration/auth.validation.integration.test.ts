import request from 'supertest';
import express from 'express';
import { validateRegistrationMiddleware } from '../../presentation/middlewares/validateRegistration';
import { validateLoginMiddleware } from '../../presentation/middlewares/validateLogin';
import { errorHandlerMiddleware } from '../../../../shared/infrastructure/middlewares/errorHandlerMiddleware';

describe('Email and Password Validation Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Setup validation routes for testing
    app.post('/api/auth/validate-registration', validateRegistrationMiddleware, (_req, res) => {
      // If validation passes, return success
      res.status(200).json({ message: 'Validation passed' });
    });
    
    app.post('/api/auth/validate-login', validateLoginMiddleware, (_req, res) => {
      // If validation passes, return success
      res.status(200).json({ message: 'Validation passed' });
    });
    
    app.use(errorHandlerMiddleware);
  });

  describe('Registration Validation', () => {
    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'invalid-email',
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });

    it('should reject registration with weak password (no uppercase)', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'test1@example.com',
          password: 'password123!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should reject registration with weak password (no lowercase)', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'test2@example.com',
          password: 'PASSWORD123!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should reject registration with weak password (no number)', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'test3@example.com',
          password: 'PasswordWithoutNumber!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should reject registration with weak password (no special char)', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'test4@example.com',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should reject registration with weak password (too short)', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'test5@example.com',
          password: 'Pa1!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should accept registration with valid email and strong password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-registration')
        .send({
          email: 'valid-user@example.com',
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Validation passed');
    });
  });

  describe('Login Validation', () => {
    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/validate-login')
        .send({
          email: 'invalid-email',
          password: 'ValidPass123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });

    it('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-login')
        .send({
          email: 'test@example.com',
          password: ''
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Password is required');
    });

    it('should accept login with valid email and password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-login')
        .send({
          email: 'valid-login@example.com',
          password: 'AnyPassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Validation passed');
    });
  });
}); 