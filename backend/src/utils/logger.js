import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Structured JSON log format for production.
 * Includes requestId, userId, jobId when available.
 */
const jsonFormat = combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const log = {
            timestamp,
            level,
            message,
            ...(stack && { stack }),
            ...meta,
        };
        return JSON.stringify(log);
    })
);

/**
 * Pretty-print format for development.
 */
const devFormat = combine(
    colorize(),
    timestamp({ format: "HH:mm:ss" }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ""}${metaStr}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: process.env.NODE_ENV === "production" ? jsonFormat : devFormat,
    defaultMeta: { service: "tryon-backend" },
    transports: [new winston.transports.Console()],
});

export { logger };
