// export class MemoryRateLimiter implements RateLimiter {
//   private attempts = new Map<string, { count: number; lastAttempt: number }>();

//   async recordAttempt(identifier: string) {
//     const entry = this.attempts.get(identifier) || {
//       count: 0,
//       lastAttempt: Date.now(),
//     };
//     entry.count++;
//     entry.lastAttempt = Date.now();
//     this.attempts.set(identifier, entry);
//   }

//   async checkLimit(identifier: string) {
//     const entry = this.attempts.get(identifier);
//     if (!entry) return { allowed: true };

//     const windowMs = 15 * 60 * 1000; // 15 minutes
//     if (Date.now() - entry.lastAttempt > windowMs) {
//       this.attempts.delete(identifier);
//       return { allowed: true };
//     }

//     return { allowed: entry.count < 5, retryAfter: windowMs };
//   }
// }
