import winston from 'winston'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Winston logger dung cho cac doan code khong nam trong NestJS DI scope
 * (vd: pre-bootstrap, seed scripts). Bootstrap (main.ts) van dung NestJS Logger.
 */
const logger = winston.createLogger({
  level: isProd ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? `\n${JSON.stringify(meta, null, 2)}`
              : ''
            return `${timestamp} [${level}]: ${message}${metaStr}`
          })
        )
  ),
  transports: [new winston.transports.Console()],
})

export default logger
