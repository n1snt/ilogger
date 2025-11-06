import { LoggerInstance } from "./loggerInstance";
import { StorageAdapter } from "./storageAdapter";
import { downloadLogs, injectDownloadButton, withdrawDownloadButton } from "./uiButton";

class ILoggerCore {
  private instances: Record<string, LoggerInstance> = {};
  private storage: StorageAdapter;
  private consoleLogging = false;
  private singleFile = false;
  private timestampsEnabled = true;
  private enabled = true;
  private consoleInterceptionEnabled = false;
  private originalConsoleMethods: {
    log?: typeof console.log;
    error?: typeof console.error;
    warn?: typeof console.warn;
    info?: typeof console.info;
    debug?: typeof console.debug;
    trace?: typeof console.trace;
  } = {};

  constructor(options: { maxLogs?: number; singleFile?: boolean; timestamps?: boolean; enabled?: boolean } = {}) {
    this.storage = new StorageAdapter("__illogger__", options.maxLogs ?? 5000);
    this.singleFile = options.singleFile ?? false;
    this.timestampsEnabled = options.timestamps ?? true;
    this.enabled = options.enabled ?? true;
  }

  createInstance(name: string, options: { timeStamps?: boolean } = {}) {
    const instance = new LoggerInstance(
      name,
      this.storage,
      options.timeStamps ?? this.timestampsEnabled,
      this.consoleLogging,
      this.enabled,
    );
    this.instances[name] = instance;
    return instance;
  }

  getLogger(name: string) {
    return this.instances[name];
  }

  setConsoleLogging(enabled: boolean) {
    this.consoleLogging = enabled;
    Object.values(this.instances).forEach((i) => i.setConsoleLogging(enabled));
  }

  setTimestamps(enabled: boolean) {
    this.timestampsEnabled = enabled;
    Object.values(this.instances).forEach((i) => i.setTimestamps(enabled));
  }

  getTimestamps(): boolean {
    return this.timestampsEnabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    Object.values(this.instances).forEach((i) => i.setEnabled(enabled));
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  injectButton() {
    injectDownloadButton(this.storage, this.singleFile, () => this.timestampsEnabled);
  }

  withdrawButton() {
    withdrawDownloadButton();
  }

  async clear() {
    await this.storage.clear();
  }

  async getStats() {
    const logs = await this.storage.getAll();
    const uniqueLoggers = new Set(logs.map((log) => log?.name).filter(Boolean));
    return {
      totalLogs: logs.length,
      activeLoggers: uniqueLoggers.size,
      maxLogs: this.storage.getMaxLogs(),
    };
  }

  async setMaxLogs(maxLogs: number) {
    await this.storage.setMaxLogs(maxLogs);
  }

  getMaxLogs(): number {
    return this.storage.getMaxLogs();
  }

  async downloadLogs() {
    await downloadLogs(this.storage, this.singleFile, () => this.timestampsEnabled);
  }

  enableConsoleInterface() {
    if (typeof window !== "undefined") {
      (window as any).downloadLogs = () => this.downloadLogs();
    }
  }

  disableConsoleInterface() {
    if (typeof window !== "undefined") {
      delete (window as any).downloadLogs;
    }
  }

  /**
   * Enable console interception to capture all console output
   * This will intercept console.log, console.error, console.warn, console.info, console.debug, and console.trace
   */
  enableConsoleInterception() {
    if (this.consoleInterceptionEnabled) return;
    if (typeof console === "undefined") return;

    this.consoleInterceptionEnabled = true;

    // Store original methods
    this.originalConsoleMethods.log = console.log;
    this.originalConsoleMethods.error = console.error;
    this.originalConsoleMethods.warn = console.warn;
    this.originalConsoleMethods.info = console.info;
    this.originalConsoleMethods.debug = console.debug;
    this.originalConsoleMethods.trace = console.trace;

    // Helper to serialize console arguments
    const serializeArgs = (...args: any[]): string => {
      return args
        .map((a) =>
          typeof a === "string"
            ? a
            : a instanceof Error
              ? `${a.message}\n${a.stack}`
              : JSON.stringify(a, null, 2),
        )
        .join(" ");
    };

    // Helper to log to storage
    const logToStorage = (level: string, ...args: any[]) => {
      const message = serializeArgs(...args);
      const entry = {
        name: "__console__",
        message: `[${level}] ${message}`,
        timestamp: this.timestampsEnabled ? new Date().toISOString() : undefined,
      };
      // Fire and forget - don't block on storage write
      this.storage.append(entry).catch((error) => {
        // Use original console.error to avoid recursion
        this.originalConsoleMethods.error?.("Failed to write console log to storage:", error);
      });
    };

    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsoleMethods.log?.apply(console, args);
      logToStorage("LOG", ...args);
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsoleMethods.error?.apply(console, args);
      logToStorage("ERROR", ...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsoleMethods.warn?.apply(console, args);
      logToStorage("WARN", ...args);
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsoleMethods.info?.apply(console, args);
      logToStorage("INFO", ...args);
    };

    // Intercept console.debug
    console.debug = (...args: any[]) => {
      this.originalConsoleMethods.debug?.apply(console, args);
      logToStorage("DEBUG", ...args);
    };

    // Intercept console.trace
    console.trace = (...args: any[]) => {
      this.originalConsoleMethods.trace?.apply(console, args);
      logToStorage("TRACE", ...args);
    };
  }

  /**
   * Disable console interception and restore original console methods
   */
  disableConsoleInterception() {
    if (!this.consoleInterceptionEnabled) return;
    if (typeof console === "undefined") return;

    this.consoleInterceptionEnabled = false;

    // Restore original methods
    if (this.originalConsoleMethods.log) console.log = this.originalConsoleMethods.log;
    if (this.originalConsoleMethods.error) console.error = this.originalConsoleMethods.error;
    if (this.originalConsoleMethods.warn) console.warn = this.originalConsoleMethods.warn;
    if (this.originalConsoleMethods.info) console.info = this.originalConsoleMethods.info;
    if (this.originalConsoleMethods.debug) console.debug = this.originalConsoleMethods.debug;
    if (this.originalConsoleMethods.trace) console.trace = this.originalConsoleMethods.trace;

    // Clear stored methods
    this.originalConsoleMethods = {};
  }

  /**
   * Check if console interception is enabled
   */
  isConsoleInterceptionEnabled(): boolean {
    return this.consoleInterceptionEnabled;
  }
}

let _illogger: ILoggerCore | null = null;

export function ILogger(options?: { maxLogs?: number; singleFile?: boolean; timestamps?: boolean; enabled?: boolean }) {
  if (!_illogger) _illogger = new ILoggerCore(options);
  return _illogger;
}

export function getLogger(name: string) {
  return _illogger?.getLogger(name);
}
