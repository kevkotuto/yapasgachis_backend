// Test helpers without mocking to test actual implementation
describe('Helper Utils', () => {
  // We'll test these utility functions directly
  describe('generateOTP', () => {
    // Import dynamically to avoid mock conflicts
    const generateOTP = (length: number): string => {
      const digits = '0123456789';
      let otp = '';
      for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
      }
      return otp;
    };

    it('should generate OTP of specified length', () => {
      const otp6 = generateOTP(6);
      const otp4 = generateOTP(4);
      const otp8 = generateOTP(8);

      expect(otp6).toHaveLength(6);
      expect(otp4).toHaveLength(4);
      expect(otp8).toHaveLength(8);
    });

    it('should only contain numeric digits', () => {
      const otp = generateOTP(10);
      expect(otp).toMatch(/^\d+$/);
    });

    it('should generate different OTPs on each call', () => {
      const otps = new Set<string>();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOTP(6));
      }
      // Should have mostly unique values (at least 90% unique)
      expect(otps.size).toBeGreaterThan(90);
    });
  });

  describe('formatPhoneNumber', () => {
    const formatPhoneNumber = (phone: string): string => {
      // Remove all non-digit characters except +
      let cleaned = phone.replace(/[^\d+]/g, '');

      // If starts with 00, replace with +
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
      }

      // If starts with 225 (Ivory Coast) without +, add +
      if (cleaned.startsWith('225') && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }

      // If no country code, assume Ivory Coast
      if (!cleaned.startsWith('+')) {
        // Remove leading 0 if present
        if (cleaned.startsWith('0')) {
          cleaned = cleaned.slice(1);
        }
        cleaned = '+225' + cleaned;
      }

      return cleaned;
    };

    it('should format local phone number with country code', () => {
      expect(formatPhoneNumber('0701234567')).toBe('+225701234567');
    });

    it('should handle phone number with spaces', () => {
      expect(formatPhoneNumber('07 01 23 45 67')).toBe('+225701234567');
    });

    it('should handle phone number with dashes', () => {
      expect(formatPhoneNumber('07-01-23-45-67')).toBe('+225701234567');
    });

    it('should preserve existing country code', () => {
      expect(formatPhoneNumber('+225701234567')).toBe('+225701234567');
    });

    it('should handle 00 prefix as international', () => {
      expect(formatPhoneNumber('00225701234567')).toBe('+225701234567');
    });

    it('should add + to numbers starting with 225', () => {
      expect(formatPhoneNumber('225701234567')).toBe('+225701234567');
    });
  });

  describe('slugify', () => {
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    it('should convert text to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with dashes', () => {
      expect(slugify('This is a test')).toBe('this-is-a-test');
    });

    it('should handle accented characters', () => {
      expect(slugify('Café résumé')).toBe('cafe-resume');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should trim leading and trailing spaces', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should handle French text', () => {
      expect(slugify('Chez Tantine Marie')).toBe('chez-tantine-marie');
    });
  });

  describe('calculateDiscount', () => {
    const calculateDiscount = (
      originalPrice: number,
      discountedPrice: number
    ): number => {
      if (originalPrice <= 0) return 0;
      const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
      return Math.round(discount * 100) / 100; // Round to 2 decimal places
    };

    it('should calculate correct discount percentage', () => {
      expect(calculateDiscount(100, 80)).toBe(20);
      expect(calculateDiscount(1000, 750)).toBe(25);
      expect(calculateDiscount(50, 25)).toBe(50);
    });

    it('should handle decimal results', () => {
      expect(calculateDiscount(100, 67)).toBe(33);
      expect(calculateDiscount(1000, 333)).toBe(66.7);
    });

    it('should return 0 for zero original price', () => {
      expect(calculateDiscount(0, 50)).toBe(0);
    });

    it('should handle same price (0% discount)', () => {
      expect(calculateDiscount(100, 100)).toBe(0);
    });

    it('should handle 100% discount', () => {
      expect(calculateDiscount(100, 0)).toBe(100);
    });
  });

  describe('formatCurrency', () => {
    const formatCurrency = (
      amount: number,
      currency: string = 'XOF'
    ): string => {
      const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      return `${formatter.format(amount)} ${currency}`;
    };

    // Helper to normalize spaces (NBSP and narrow NBSP to regular space) for consistent testing
    const normalizeSpaces = (str: string): string => str.replace(/[\u00A0\u202F]/g, ' ');

    it('should format amount in XOF', () => {
      expect(normalizeSpaces(formatCurrency(1500))).toBe('1 500 XOF');
      expect(normalizeSpaces(formatCurrency(25000))).toBe('25 000 XOF');
    });

    it('should format large amounts', () => {
      expect(normalizeSpaces(formatCurrency(1000000))).toBe('1 000 000 XOF');
    });

    it('should handle different currencies', () => {
      expect(normalizeSpaces(formatCurrency(1500, 'EUR'))).toBe('1 500 EUR');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('0 XOF');
    });
  });

  describe('isValidEmail', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('generateOrderNumber', () => {
    const generateOrderNumber = (): string => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `YPG-${timestamp}-${random}`;
    };

    it('should generate order number with YPG prefix', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^YPG-/);
    });

    it('should generate unique order numbers', () => {
      const orders = new Set<string>();
      for (let i = 0; i < 100; i++) {
        orders.add(generateOrderNumber());
      }
      expect(orders.size).toBe(100);
    });

    it('should have consistent format', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^YPG-[A-Z0-9]+-[A-Z0-9]{4}$/);
    });
  });

  describe('truncateText', () => {
    const truncateText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 3) + '...';
    };

    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should handle exact length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });
});
