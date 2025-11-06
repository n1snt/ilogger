import { StorageAdapter } from "./storageAdapter";

export class LoggerInstance {
  constructor(
    private name: string,
    private storage: StorageAdapter,
    private withTimestamps = true,
    private consoleLogging = false,
  ) {}

  writeLog(...args: any[]) {
    const message = args
      .map((a) =>
        typeof a === "string"
          ? a
          : a instanceof Error
            ? `${a.message}\n${a.stack}`
            : JSON.stringify(a),
      )
      .join(" ");

    const entry = {
      name: this.name,
      message,
      timestamp: this.withTimestamps ? new Date().toISOString() : undefined,
    };

    this.storage.append(entry);
    if (this.consoleLogging) console.log(`[${this.name}]`, ...args);
  }

  setConsoleLogging(enabled: boolean) {
    this.consoleLogging = enabled;
  }
}
