import request from 'supertest';
import app from '../../src/app';
import { PrismaService } from '../../src/infrastructure/database/prisma';

describe('Auth E2E Tests', () => {
  const testPhone = '+221771234567';
  const testPassword = 'TestPassword123!';
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up test data
    await PrismaService.getInstance().$executeRaw`
      DELETE FROM "User" WHERE phone = ${testPhone}
    `;
  });

  afterAll(async () => {
    // Clean up test data
    await PrismaService.getInstance().$executeRaw`
      DELETE FROM "User" WHERE phone = ${testPhone}
    `;
    await PrismaService.disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and send OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: testPhone,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBeDefined();
      userId = response.body.data.userId;
    });

    it('should return 409 for duplicate phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: testPhone,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: 'invalid-phone',
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: '+221779999999',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Activate user for login tests
      await PrismaService.getInstance().user.update({
        where: { phone: testPhone },
        data: { status: 'ACTIVE', isPhoneVerified: true },
      });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: testPhone,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: testPhone,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+221779999998',
          password: testPassword,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe(testPhone);
      expect(response.body.data.firstName).toBe('Test');
      expect(response.body.data.lastName).toBe('User');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Update tokens for further tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should return 401 with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    const newPassword = 'NewTestPassword123!';

    it('should change password with correct current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for incorrect current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'AnotherPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should login with new password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: testPhone,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      accessToken = response.body.data.accessToken;
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 401 after logout with old token', async () => {
      // After logout, the token should be invalidated
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
