/**
 * Common regex patterns for validation throughout the application
 */
export class RegexPatterns {
  /**
   * Email validation regex
   * - Allows standard email format (name@domain.tld)
   * - Requires @ symbol and domain with TLD
   * - Supports subdomains and various TLDs
   */
  public static readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Strong password validation regex
   * - Requires at least 8 characters
   * - Must contain at least 1 uppercase letter
   * - Must contain at least 1 lowercase letter 
   * - Must contain at least 1 number
   * - Must contain at least 1 special character
   */
  public static readonly STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;

  /**
   * Moderate password validation regex
   * - Requires at least 8 characters
   * - Must contain at least 1 uppercase letter
   * - Must contain at least 1 lowercase letter
   * - Must contain at least 1 number
   */
  public static readonly MODERATE_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
} 