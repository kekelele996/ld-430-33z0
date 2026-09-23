export const logger = {
  info: (message: string, meta?: unknown) => console.info(`[info] ${message}`, meta ?? ''),
  warn: (message: string, meta?: unknown) => console.warn(`[warn] ${message}`, meta ?? ''),
  error: (message: string, meta?: unknown) => console.error(`[error] ${message}`, meta ?? ''),
};
