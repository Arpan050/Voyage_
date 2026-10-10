/** An error whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(msg: string, details?: unknown) { return new AppError(400, msg, details); }
  static unauthorized(msg = "Not authenticated") { return new AppError(401, msg); }
  static forbidden(msg = "Insufficient permissions") { return new AppError(403, msg); }
  static notFound(msg = "Not found") { return new AppError(404, msg); }
  static conflict(msg: string) { return new AppError(409, msg); }
}
