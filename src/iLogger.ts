import { LoggerInstance } from "./loggerInstance";
import { StorageAdapter } from "./storageAdapter";
import { injectDownloadButton, withdrawDownloadButton } from "./uiButton";

class ILoggerCore {
  private instances: Record<string, LoggerInstance> = {};
  private storage = new StorageAdapter();
  private consoleLogging = false;

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
    };
  }
}

let _illogger: ILoggerCore | null = null;

export function ILogger() {
  if (!_illogger) _illogger = new ILoggerCore();
  return _illogger;
}

export function getLogger(name: string) {
  return _illogger?.getLogger(name);
}
