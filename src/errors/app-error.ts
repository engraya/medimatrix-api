export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export const missing = (code = 'NOT_FOUND') => new AppError(404, code, 'Resource not found');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'Access denied');
export const unauthorized = (code = 'UNAUTHENTICATED') =>
  new AppError(401, code, 'Authentication required');
