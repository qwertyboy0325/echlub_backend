import { validateEmail, validatePassword, validateCredentials } from '../../../application/validators/auth.validator';

describe('Auth Validators', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.co.uk',
        'small@domain.org',
        'test123@domain123.com'
      ];

      validEmails.forEach(email => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'plainaddress',
        '@missinguser.com',
        'user@.com',
        'user@domain',
        'user@domain.',
        '.user@domain.com',
        'user name@domain.com',
        'user@domain..com'
      ];

      invalidEmails.forEach(email => {
        expect(() => validateEmail(email)).toThrow();
        expect(() => validateEmail(email)).toThrow('Invalid email format');
      });
    });

    it('should reject empty or non-string emails', () => {
      expect(() => validateEmail('')).toThrow('Email is required');
      expect(() => validateEmail(null as any)).toThrow('Email is required');
      expect(() => validateEmail(undefined as any)).toThrow('Email is required');
      expect(() => validateEmail(123 as any)).toThrow('Email is required');
    });
  });

  describe('validatePassword', () => {
    describe('with moderate strength (default)', () => {
      it('should accept valid passwords', () => {
        const validPasswords = [
          'Password123',
          'Abcdef123',
          'Test1Password',
          'Hello2World!',
          'A1bcdefghijklmnop'
        ];

        validPasswords.forEach(password => {
          expect(() => validatePassword(password)).not.toThrow();
          expect(validatePassword(password)).toBe(true);
        });
      });

      it('should reject invalid passwords', () => {
        const invalidPasswords = [
          'password', // no uppercase, no number
          'PASSWORD123', // no lowercase
          'Password', // no number
          'pass123', // no uppercase
          'Pass1', // too short
          '12345678' // no letters
        ];

        invalidPasswords.forEach(password => {
          expect(() => validatePassword(password)).toThrow();
          expect(() => validatePassword(password)).toThrow('Password must be at least 8 characters long');
          expect(validatePassword(password, { throwOnFail: false })).toBe(false);
        });
      });
    });

    describe('with strong strength', () => {
      it('should accept valid strong passwords', () => {
        const validStrongPasswords = [
          'Password123!',
          'Abcdef123@',
          'Test1Password#',
          'Hello2World!',
          'A1bcdef!ghijklmnop'
        ];

        validStrongPasswords.forEach(password => {
          expect(() => validatePassword(password, { isStrong: true })).not.toThrow();
          expect(validatePassword(password, { isStrong: true })).toBe(true);
        });
      });

      it('should reject passwords without special characters when strong is required', () => {
        const invalidStrongPasswords = [
          'Password123', // no special char
          'ABCDEF123!', // no lowercase
          'abcdef123!', // no uppercase
          'Abcdefghi!', // no number
          'Pass1!', // too short
        ];

        invalidStrongPasswords.forEach(password => {
          expect(() => validatePassword(password, { isStrong: true })).toThrow();
          expect(validatePassword(password, { isStrong: true, throwOnFail: false })).toBe(false);
        });
      });
    });

    it('should reject empty or non-string passwords', () => {
      expect(() => validatePassword('')).toThrow('Password is required');
      expect(() => validatePassword(null as any)).toThrow('Password is required');
      expect(() => validatePassword(undefined as any)).toThrow('Password is required');
      expect(() => validatePassword(123 as any)).toThrow('Password is required');
    });
  });

  describe('validateCredentials', () => {
    it('should validate both email and password', () => {
      expect(() => validateCredentials('test@example.com', 'Password123')).not.toThrow();
    });

    it('should throw on invalid email', () => {
      expect(() => validateCredentials('invalid', 'Password123')).toThrow('Invalid email format');
    });

    it('should throw on invalid password', () => {
      expect(() => validateCredentials('test@example.com', 'password')).toThrow();
    });

    it('should validate with strong password requirement when specified', () => {
      expect(() => validateCredentials('test@example.com', 'Password123!', { requireStrongPassword: true })).not.toThrow();
      expect(() => validateCredentials('test@example.com', 'Password123', { requireStrongPassword: true })).toThrow();
    });
  });
}); 