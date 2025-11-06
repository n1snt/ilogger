import { LoggerInstance } from "./loggerInstance";
import { StorageAdapter } from "./storageAdapter";
import { injectDownloadButton, withdrawDownloadButton } from "./uiButton";

class ILoggerCore {
  private instances: Record<string, LoggerInstance> = {};
  private storage: StorageAdapter;
  private consoleLogging = false;

  constructor(options: { maxLogs?: number } = {}) {
    this.storage = new StorageAdapter("__illogger__", options.maxLogs ?? 5000);
  }

  createInstance(name: string, options: { timeStamps?: boolean } = {}) {
    const instance = new LoggerInstance(
      name,
      this.storage,
      options.timeStamps ?? true,
      this.consoleLogging,
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

  injectButton() {
    injectDownloadButton(this.storage);
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
}

let _illogger: ILoggerCore | null = null;

export function ILogger(options?: { maxLogs?: number }) {
  if (!_illogger) _illogger = new ILoggerCore(options);
  return _illogger;
}

export function getLogger(name: string) {
  return _illogger?.getLogger(name);
}
