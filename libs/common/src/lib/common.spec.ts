import { timeStringToDate } from './common';

describe('timeStringToDate', () => {
  const marginOfError = 10; // Allow 10ms execution time difference
  let startTime: number;

  beforeEach(() => {
    startTime = Date.now();
  });

  describe('valid inputs', () => {
    const testCases = [
      { input: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
      { input: '30m', ms: 30 * 60 * 1000 },
      { input: '2h', ms: 2 * 60 * 60 * 1000 },
      { input: '45s', ms: 45 * 1000 },
      { input: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
      { input: '0d', ms: 0 },
      { input: '1000d', ms: 1000 * 24 * 60 * 60 * 1000 },
    ];

    testCases.forEach(({ input, ms }) => {
      it(`should handle ${input}`, () => {
        const result = timeStringToDate(input);
        const expectedTime = startTime + ms;
        expect(result.getTime()).toBeGreaterThanOrEqual(expectedTime);
        expect(result.getTime()).toBeLessThanOrEqual(
          expectedTime + marginOfError
        );
      });
    });

    it('should be case insensitive', () => {
      const lowerCase = timeStringToDate('1h');
      const upperCase = timeStringToDate('1H');
      expect(lowerCase.getTime()).toBe(upperCase.getTime());
    });
  });

  describe('invalid inputs', () => {
    const errorCases = [
      { input: 'invalid', error: 'Invalid time string format' },
      { input: '7', error: 'Invalid time string format' },
      { input: 'd', error: 'Invalid time string format' },
      { input: '7x', error: 'Unsupported time unit' },
      { input: '-7d', error: 'Invalid time string format' },
      { input: '3.5h', error: 'Invalid time string format' },
      { input: '7hd', error: 'Invalid time string format' },
    ];

    errorCases.forEach(({ input, error }) => {
      it(`should throw error for ${input}`, () => {
        expect(() => timeStringToDate(input)).toThrow(error);
      });
    });
  });

  // Additional edge cases
  describe('edge cases', () => {
    it('should handle maximum safe integer', () => {
      const maxSafe = `${Math.floor(
        Number.MAX_SAFE_INTEGER / (24 * 60 * 60 * 1000)
      )}d`;
      expect(() => timeStringToDate(maxSafe)).not.toThrow();
    });

    it('should throw for numbers exceeding safe integer', () => {
      const unsafe = '9007199254740992d'; // MAX_SAFE_INTEGER + 1
      expect(() => timeStringToDate(unsafe)).toThrow();
    });
  });
});
