import LZString from "lz-string";

export class StorageAdapter {
  constructor(
    private key = "__illogger__",
    private maxEntries = 5000,
  ) {}

  private read(): any[] {
    try {
      const raw = sessionStorage.getItem(this.key);
      if (!raw) return [];
      return JSON.parse(LZString.decompressFromUTF16(raw) || "[]");
    } catch {
      return [];
    }
  }

  private write(logs: any[]) {
    try {
      const compressed = LZString.compressToUTF16(JSON.stringify(logs));
      sessionStorage.setItem(this.key, compressed);
    } catch {
      const trimmed = logs.slice(-Math.floor(this.maxEntries / 2));
      sessionStorage.setItem(this.key, JSON.stringify(trimmed));
    }
  }

  append(entry: any) {
    const logs = this.read();
    logs.push(entry);
    if (logs.length > this.maxEntries) logs.shift();
    this.write(logs);
  }

  getAll() {
    return this.read();
  }

  clear() {
    sessionStorage.removeItem(this.key);
  }
}
