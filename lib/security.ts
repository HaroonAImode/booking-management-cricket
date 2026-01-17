/**
 * Security Utilities
 * 
 * Input sanitization, validation, and XSS prevention
 */

/**
 * Sanitize text input to prevent XSS
 * Removes HTML tags and potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags
  let cleaned = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  cleaned = cleaned.replace(/[<>"';]/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Sanitize phone number
 * Removes all non-numeric characters
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Validate email format
 * RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
}

/**
 * Validate phone number (Pakistan format)
 * Accepts: 03XXXXXXXXX (11 digits)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = sanitizePhone(phone);
  
  // Must be exactly 11 digits starting with 03
  return /^03[0-9]{9}$/.test(cleaned);
}

/**
 * Validate name (no special characters)
 * Allows: letters, spaces, hyphens, apostrophes
 */
export function validateName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 100) return false;
  
  // Only letters, spaces, hyphens, apostrophes
  return /^[a-zA-Z\s'-]+$/.test(name);
}

/**
 * Validate address (basic check)
 */
export function validateAddress(address: string): boolean {
  if (!address) return true; // Optional field
  if (address.length > 200) return false;
  
  // Basic check - no HTML tags
  return !/<[^>]*>/g.test(address);
}

/**
 * Validate notes/textarea input
 * Maximum length and no HTML
 */
export function validateNotes(notes: string): boolean {
  if (!notes) return true; // Optional field
  if (notes.length > 500) return false;
  
  // No HTML tags
  return !/<[^>]*>/g.test(notes);
}

/**
 * Sanitize filename for storage
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remove path traversal attempts
  let clean = filename.replace(/\.\./g, '');
  clean = clean.replace(/[/\\]/g, '');
  
  // Remove dangerous characters
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (clean.length > 100) {
    const ext = clean.split('.').pop();
    clean = clean.substring(0, 90) + '.' + ext;
  }
  
  return clean;
}

/**
 * Validate file type for payment proofs
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PNG, JPEG, GIF, and WebP images are allowed.',
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.',
    };
  }
  
  return { valid: true };
}

/**
 * Escape HTML to prevent XSS
 * Use when displaying user input in HTML
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Validate booking date
 * Must be today or future date
 */
export function validateBookingDate(date: Date): boolean {
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);
  
  return bookingDate >= today;
}

/**
 * Validate slot hour (0-23)
 */
export function validateSlotHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

/**
 * Rate limiting helper (client-side)
 * Tracks request counts in localStorage
 */
export class ClientRateLimiter {
  private key: string;
  private maxRequests: number;
  private windowMs: number;

  constructor(key: string, maxRequests: number = 5, windowMinutes: number = 60) {
    this.key = `rate_limit_${key}`;
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Check if request should be allowed
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const data = this.getData();
    
    // Clean old entries
    const recentRequests = data.requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    return true;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    const now = Date.now();
    const data = this.getData();
    
    // Add new request
    data.requests.push(now);
    
    // Clean old entries
    data.requests = data.requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    // Save
    this.saveData(data);
  }

  /**
   * Get time until next request allowed
   */
  getTimeUntilReset(): number {
    const now = Date.now();
    const data = this.getData();
    
    if (data.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...data.requests);
    const resetTime = oldestRequest + this.windowMs;
    
    return Math.max(0, resetTime - now);
  }

  private getData(): { requests: number[] } {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return { requests: [] };
  }

  private saveData(data: { requests: number[] }): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      // Ignore storage errors
    }
  }
}

/**
 * CSRF token management (for future use)
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Secure random string generator
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window === 'undefined' || !window.crypto) {
    // Fallback for SSR
    return Math.random().toString(36).substring(2, 15);
  }
  
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Validate integer in range
 */
export function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
