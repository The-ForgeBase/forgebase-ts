export class WSError extends Error {
  constructor(...args: any[]) {
    super(...args);
    this.name = 'WSError';
  }
}
