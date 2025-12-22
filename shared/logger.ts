type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const colors = {
  DEBUG: '\x1b[36m', // cyan
  INFO: '\x1b[32m',  // green
  WARN: '\x1b[33m',  // yellow
  ERROR: '\x1b[31m', // red
  RESET: '\x1b[0m',
};

export const createLogger = (service: string) => {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const prefix = `${color}[${timestamp}] [${level}] [${service}]${colors.RESET}`;
    if (data) {
      console.log(`${prefix} ${message}`, JSON.stringify(data));
    } else {
      console.log(`${prefix} ${message}`);
    }
  };

  return {
    debug: (msg: string, data?: unknown) => log('DEBUG', msg, data),
    info: (msg: string, data?: unknown) => log('INFO', msg, data),
    warn: (msg: string, data?: unknown) => log('WARN', msg, data),
    error: (msg: string, data?: unknown) => log('ERROR', msg, data),
  };
};
