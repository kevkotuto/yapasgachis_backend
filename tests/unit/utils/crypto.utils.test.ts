import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock config
jest.mock('@/config', () => ({
  default: {
    security: {
      bcryptRounds: 12,
    },
  },
}));

// Import the functions to test
import { hashPassword, comparePassword } from '@/utils/crypto.utils';

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'MySecurePassword123!';
      const hashedPassword = '$2b$12$hashedpasswordvalue';

      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should use configured bcrypt rounds', async () => {
      const password = 'AnotherPassword456!';

      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('$2b$12$hashvalue');

      await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should throw error if bcrypt fails', async () => {
      const password = 'TestPassword';

      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Hashing failed'));

      await expect(hashPassword(password)).rejects.toThrow('Hashing failed');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'MySecurePassword123!';
      const hashedPassword = '$2b$12$hashedpasswordvalue';

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'WrongPassword';
      const hashedPassword = '$2b$12$hashedpasswordvalue';

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should throw error if bcrypt comparison fails', async () => {
      const password = 'TestPassword';
      const hashedPassword = '$2b$12$invalid';

      (bcrypt.compare as jest.Mock).mockRejectedValueOnce(new Error('Comparison failed'));

      await expect(comparePassword(password, hashedPassword)).rejects.toThrow(
        'Comparison failed'
      );
    });
  });
});
