import validator from 'validator';

/**
 * Input Sanitization Utilities
 * Prevents XSS, injection attacks, and malicious input
 */

/**
 * Sanitize user text input
 * - Escape HTML entities
 * - Remove null bytes
 * - Trim whitespace
 */
export const sanitizeText = (input: string): string => {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Escape HTML to prevent XSS
    sanitized = validator.escape(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length to prevent DoS
    if (sanitized.length > 5000) {
        sanitized = sanitized.substring(0, 5000);
    }

    return sanitized;
};

/**
 * Validate and sanitize MongoDB ObjectId
 */
export const sanitizeObjectId = (id: string): string => {
    if (!validator.isMongoId(id)) {
        throw new Error('Invalid ID format');
    }
    return id;
};

/**
 * Sanitize numeric input
 */
export const sanitizeNumber = (input: any, min?: number, max?: number): number => {
    const num = Number(input);

    if (isNaN(num)) {
        throw new Error('Invalid number');
    }

    if (min !== undefined && num < min) {
        throw new Error(`Number must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
        throw new Error(`Number must be at most ${max}`);
    }

    return num;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    return validator.isEmail(email);
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
    return validator.isURL(url);
};
