import { AppError } from '../../../../shared/domain/AppError';
import { RegexPatterns } from '../../../../shared/domain/validation/RegexPatterns';

/**
 * Validates email format
 * @param email The email to validate
 * @throws AppError if email format is invalid
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email is required', 400);
  }
  
  if (!RegexPatterns.EMAIL_PATTERN.test(email)) {
    throw new AppError('Invalid email format', 400);
  }
}

/**
 * Validates password strength
 * @param password The password to validate
 * @param options Options for validation
 * @throws AppError if password doesn't meet requirements
 */
export function validatePassword(
  password: string, 
  options: { 
    isStrong?: boolean,
    throwOnFail?: boolean 
  } = { isStrong: false, throwOnFail: true }
): boolean {
  if (!password || typeof password !== 'string') {
    if (options.throwOnFail) {
      throw new AppError('Password is required', 400);
    }
    return false;
  }
  
  // Use the appropriate regex pattern based on required strength
  const pattern = options.isStrong 
    ? RegexPatterns.STRONG_PASSWORD_PATTERN 
    : RegexPatterns.MODERATE_PASSWORD_PATTERN;
  
  const isValid = pattern.test(password);
  
  if (!isValid && options.throwOnFail) {
    const message = options.isStrong
      ? 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      : 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
    
    throw new AppError(message, 400);
  }
  
  return isValid;
}

/**
 * Validates auth credentials
 * @param email User's email
 * @param password User's password
 * @param options Validation options
 * @throws AppError if credentials are invalid
 */
export function validateCredentials(
  email: string, 
  password: string, 
  options: { 
    requireStrongPassword?: boolean 
  } = { requireStrongPassword: false }
): void {
  validateEmail(email);
  validatePassword(password, { isStrong: options.requireStrongPassword });
} 