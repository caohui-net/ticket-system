import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// 确保日志目录存在
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// 控制台格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, trace }) => {
    const contextStr = context ? `[${context}]` : '';
    const traceStr = trace ? `\n${trace}` : '';
    return `${timestamp} ${contextStr} ${level}: ${message}${traceStr}`;
  }),
);

// Winston配置
export const winstonConfig = {
  level: logLevel,
  format: customFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: customFormat,
    }),

    // 警告日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'warn.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: customFormat,
    }),

    // 综合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
      format: customFormat,
    }),

    // 应用日志文件（info级别）
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: customFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
};

// 创建logger实例
export const logger = winston.createLogger(winstonConfig);

// 在非生产环境下，日志输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// 导出辅助函数
export const createLogger = (context: string) => {
  return {
    log: (message: string, ...args: any[]) =>
      logger.info(message, { context, ...args }),
    error: (message: string, trace?: string, ...args: any[]) =>
      logger.error(message, { context, trace, ...args }),
    warn: (message: string, ...args: any[]) =>
      logger.warn(message, { context, ...args }),
    debug: (message: string, ...args: any[]) =>
      logger.debug(message, { context, ...args }),
    verbose: (message: string, ...args: any[]) =>
      logger.verbose(message, { context, ...args }),
  };
};
