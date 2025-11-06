import { IndexedDBAdapter } from "./indexedDBAdapter";

export class StorageAdapter {
  private db: IndexedDBAdapter;
  private pendingWrites: any[] = [];
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private maxEntries: number;

  constructor(
    private key = "__illogger__",
    maxEntries = 5000,
  ) {
    this.maxEntries = maxEntries;
    this.db = new IndexedDBAdapter(key, "logs", 1);
  }

  getMaxLogs(): number {
    return this.maxEntries;
  }

  async setMaxLogs(maxLogs: number) {
    if (maxLogs < 1) {
      throw new Error("maxLogs must be at least 1");
    }
    // Flush any pending writes before checking count
    await this.flushPendingWrites();
    this.maxEntries = maxLogs;
    // Trim if current count exceeds new limit
    const currentCount = await this.db.count();
    if (currentCount > this.maxEntries) {
      await this.trimOldEntries();
    }
  }

  /**
   * Append a log entry to IndexedDB
   * Uses batching to improve performance for high-frequency logging
   */
  async append(entry: any): Promise<void> {
    this.pendingWrites.push(entry);

    // Batch writes to avoid too many IndexedDB transactions
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    this.writeTimer = setTimeout(async () => {
      await this.flushPendingWrites();
    }, 100); // Batch writes every 100ms
  }

  /**
   * Flush pending writes to IndexedDB
   */
  private async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.length === 0) return;

    const toWrite = [...this.pendingWrites];
    this.pendingWrites = [];

    try {
      // Check current count and trim before adding if we're at or near the limit
      const currentCount = await this.db.count();
      const willExceedLimit = currentCount + toWrite.length > this.maxEntries;

      if (willExceedLimit) {
        // Trim old entries first to make room
        await this.trimOldEntries(currentCount + toWrite.length - this.maxEntries);
      }

      // Add all pending entries
      await Promise.all(toWrite.map((entry) => this.db.append(entry)));

      // Final trim check in case of race conditions
      const finalCount = await this.db.count();
      if (finalCount > this.maxEntries) {
        await this.trimOldEntries();
      }
    } catch (error) {
      console.error("Failed to flush pending writes:", error);
      // Re-add failed writes to pending queue
      this.pendingWrites.unshift(...toWrite);
    }
  }

  /**
   * Trim old entries to maintain maxEntries limit
   * @param excessCount - Optional number of excess entries to remove (defaults to removing all excess)
   */
  private async trimOldEntries(excessCount?: number): Promise<void> {
    try {
      const logs = await this.db.read();

      // If excessCount is provided, we need to trim proactively
      // Otherwise, only trim if we're over the limit
      if (excessCount === undefined && logs.length <= this.maxEntries) {
        return;
      }

      // Sort by id (which represents insertion order via auto-increment)
      // Lower id = older entry, higher id = newer entry
      const sorted = logs.sort((a, b) => (a.id || 0) - (b.id || 0));

      let toKeep: any[];
      if (excessCount !== undefined && excessCount > 0) {
        // Remove only the excess count, keeping the most recent entries
        toKeep = sorted.slice(excessCount);
      } else {
        // Keep only the most recent maxEntries
        toKeep = sorted.slice(-this.maxEntries);
      }

      // Remove id field before rewriting (IndexedDB will assign new auto-increment IDs)
      const logsWithoutId = toKeep.map(({ id, ...log }) => log);
      await this.db.write(logsWithoutId);
    } catch (error) {
      console.error("Failed to trim old entries:", error);
    }
  }

  /**
   * Get all logs from IndexedDB
   */
  async getAll(): Promise<any[]> {
    // Flush any pending writes first
    await this.flushPendingWrites();
    const logs = await this.db.read();
    // Remove the internal id field before returning
    return logs.map(({ id, ...log }) => log);
  }

  /**
   * Get count of logs in storage
   */
  async count(): Promise<number> {
    await this.flushPendingWrites();
    return await this.db.count();
  }

  /**
   * Clear all logs from IndexedDB
   */
  async clear(): Promise<void> {
    this.pendingWrites = [];
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    await this.db.clear();
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    // Flush pending writes before closing
    this.flushPendingWrites().finally(() => {
      this.db.close();
    });
  }
}
