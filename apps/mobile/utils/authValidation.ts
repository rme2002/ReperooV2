/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

/**
 * Validates login form fields
 *
 * @param email - Email address
 * @param password - Password
 * @returns Validation result object
 */
export function validateLoginForm(
  email: string,
  password: string
): ValidationResult {
  if (!email || !password) {
    return {
      valid: false,
      errorTitle: "Missing info",
      errorMessage: "Enter email and password to continue.",
    };
  }
  return { valid: true };
}

/**
 * Validates signup form fields
 *
 * @param email - Email address
 * @param password - Password
 * @param confirmPassword - Password confirmation
 * @returns Validation result object
 */
export function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  if (!email || !password || !confirmPassword) {
    return {
      valid: false,
      errorTitle: "Missing info",
      errorMessage: "Fill out every field to continue.",
    };
  }
  if (password !== confirmPassword) {
    return {
      valid: false,
      errorTitle: "Passwords do not match",
      errorMessage: "Please re-enter matching passwords.",
    };
  }
  return { valid: true };
}
