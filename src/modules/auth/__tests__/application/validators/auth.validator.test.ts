import { validateEmail, validatePassword, validateCredentials } from '../../../application/validators/auth.validator';
import { RegexPatterns } from '../../../../../shared/domain/validation/RegexPatterns';

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
        const isValidByRegex = RegexPatterns.EMAIL_PATTERN.test(email);
        if (isValidByRegex) {
          console.warn(`Email "${email}" unexpectedly passes regex pattern but is marked as invalid in test`);
        }
        expect(isValidByRegex).toBe(false);
      });

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
          'A1bcdefghijklmnop',
          'password',
          'simple',
          '12345678',
          'abcdef'
        ];

        validPasswords.forEach(password => {
          expect(() => validatePassword(password)).not.toThrow();
          expect(validatePassword(password)).toBe(true);
        });
      });

      it('should accept any non-empty string password (regex validation removed)', () => {
        const anyPasswords = [
          'password',
          'PASSWORD123',
          'Password',
          'pass123',
          'Pass1',
          '12345678'
        ];

        anyPasswords.forEach(password => {
          expect(() => validatePassword(password)).not.toThrow();
          expect(validatePassword(password, { throwOnFail: false })).toBe(true);
        });
      });
    });

    describe('with strong strength', () => {
      it('should accept any valid password regardless of strength setting', () => {
        const anyPasswords = [
          'Password123!',
          'simple',
          'nouppercaseorsymbols',
          '12345',
          'justletters'
        ];

        anyPasswords.forEach(password => {
          expect(() => validatePassword(password, { isStrong: true })).not.toThrow();
          expect(validatePassword(password, { isStrong: true })).toBe(true);
        });
      });

      it('should accept passwords without special characters (regex validation removed)', () => {
        const simplePasswords = [
          'Password123',
          'ABCDEF123',
          'abcdef123',
          'Abcdefghi',
          'short'
        ];

        simplePasswords.forEach(password => {
          expect(() => validatePassword(password, { isStrong: true })).not.toThrow();
          expect(validatePassword(password, { isStrong: true, throwOnFail: false })).toBe(true);
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

    it('should accept any non-empty password (regex validation removed)', () => {
      expect(() => validateCredentials('test@example.com', 'simple')).not.toThrow();
    });

    it('should accept any password regardless of strong requirement setting', () => {
      expect(() => validateCredentials('test@example.com', 'simple', { requireStrongPassword: true })).not.toThrow();
      expect(() => validateCredentials('test@example.com', 'Password123', { requireStrongPassword: true })).not.toThrow();
    });
  });
}); 