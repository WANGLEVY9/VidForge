type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

const MAX_LOG_ENTRIES = 200;
const STORAGE_KEY = 'vidforge_logs';

class Logger {
  private logs: LogEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.logs = JSON.parse(saved);
    } catch {
      /* ignore */
    }
  }

  private save() {
    try {
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      /* ignore */
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };
    this.logs.push(entry);
    this.save();

    const fn =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;
    fn(`[${module}] ${message}`, data ?? '');
  }

  debug(module: string, message: string, data?: any) {
    this.log('debug', module, message, data);
  }
  info(module: string, message: string, data?: any) {
    this.log('info', module, message, data);
  }
  warn(module: string, message: string, data?: any) {
    this.log('warn', module, message, data);
  }
  error(module: string, message: string, data?: any) {
    this.log('error', module, message, data);
  }

  getLogs(level?: LogLevel, module?: string): LogEntry[] {
    let filtered = this.logs;
    if (level) filtered = filtered.filter((l) => l.level === level);
    if (module) filtered = filtered.filter((l) => l.module === module);
    return filtered;
  }

  clear() {
    this.logs = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const logger = new Logger();
