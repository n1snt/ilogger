import { StorageAdapter } from "./storageAdapter";

export class LoggerInstance {
  constructor(
    private name: string,
    private storage: StorageAdapter,
    private withTimestamps = true,
    private consoleLogging = false,
  ) { }

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

    // Fire and forget - don't block on storage write
    this.storage.append(entry).catch((error) => {
      console.error("Failed to write log to storage:", error);
    });
    if (this.consoleLogging) console.log(`[${this.name}]`, ...args);
  }

  setConsoleLogging(enabled: boolean) {
    this.consoleLogging = enabled;
  }

  setTimestamps(enabled: boolean) {
    this.withTimestamps = enabled;
  }
}
