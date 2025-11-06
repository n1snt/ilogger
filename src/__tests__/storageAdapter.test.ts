import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StorageAdapter } from '../storageAdapter';

describe('StorageAdapter', () => {
    let adapter: StorageAdapter;
    let testKey: string;
    let testCounter = 0;

    beforeEach(() => {
        // Use unique key for each test to ensure isolation
        testKey = `__test_storage_${Date.now()}_${testCounter++}__`;
        adapter = new StorageAdapter(testKey, 5000);
    });

    afterEach(async () => {
        // Clean up: close the adapter and delete the database
        if (adapter) {
            adapter.close();
        }
        // Wait a bit for any pending timers to complete
        await new Promise((resolve) => setTimeout(resolve, 150));
        // Delete the test database
        await new Promise<void>((resolve) => {
            const deleteRequest = indexedDB.deleteDatabase(testKey);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => resolve();
            deleteRequest.onblocked = () => {
                setTimeout(() => resolve(), 10);
            };
        });
    });

    describe('Constructor', () => {
        it('should create an instance with default parameters', () => {
            const defaultAdapter = new StorageAdapter();
            expect(defaultAdapter).toBeInstanceOf(StorageAdapter);
            expect(defaultAdapter.getMaxLogs()).toBe(5000);
            defaultAdapter.close();
        });

        it('should create an instance with custom key and maxEntries', () => {
            const customAdapter = new StorageAdapter('custom_key', 1000);
            expect(customAdapter).toBeInstanceOf(StorageAdapter);
            expect(customAdapter.getMaxLogs()).toBe(1000);
            customAdapter.close();
        });

        it('should create an instance with only custom key', () => {
            const customAdapter = new StorageAdapter('custom_key');
            expect(customAdapter).toBeInstanceOf(StorageAdapter);
            expect(customAdapter.getMaxLogs()).toBe(5000); // Default maxEntries
            customAdapter.close();
        });
    });

    describe('getMaxLogs', () => {
        it('should return the maximum number of logs', () => {
            expect(adapter.getMaxLogs()).toBe(5000);
        });

        it('should return the custom maxEntries value', () => {
            const customAdapter = new StorageAdapter(testKey, 100);
            expect(customAdapter.getMaxLogs()).toBe(100);
            customAdapter.close();
        });
    });

    describe('setMaxLogs', () => {
        it('should update the maximum number of logs', async () => {
            await adapter.setMaxLogs(100);
            expect(adapter.getMaxLogs()).toBe(100);
        });

        it('should throw an error if maxLogs is less than 1', async () => {
            await expect(adapter.setMaxLogs(0)).rejects.toThrow('maxLogs must be at least 1');
            await expect(adapter.setMaxLogs(-1)).rejects.toThrow('maxLogs must be at least 1');
        });

        it('should trim old entries when new limit is lower than current count', async () => {
            // Set a higher limit first to allow adding entries
            await adapter.setMaxLogs(20);

            // Add more entries than we'll set the limit to
            for (let i = 0; i < 10; i++) {
                await adapter.append({ message: `Log ${i}`, index: i });
            }

            // Wait for batching to complete
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Verify we have 10 entries
            expect(await adapter.count()).toBe(10);

            // Reduce the limit to 3
            await adapter.setMaxLogs(3);

            // Wait for any operations to complete
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Should be trimmed to 3 entries
            const count = await adapter.count();
            expect(count).toBe(3);

            // Verify the most recent entries are kept
            const logs = await adapter.getAll();
            expect(logs).toHaveLength(3);
            // Should have the last 3 entries (indices 7, 8, 9)
            const indices = logs.map((log: any) => log.index).sort((a: number, b: number) => a - b);
            expect(indices).toEqual([7, 8, 9]);
        });

        it('should not trim when new limit is higher than current count', async () => {
            // Add some entries
            for (let i = 0; i < 5; i++) {
                await adapter.append({ message: `Log ${i}` });
            }

            // Wait for batching
            await new Promise((resolve) => setTimeout(resolve, 150));

            expect(await adapter.count()).toBe(5);

            // Increase the limit
            await adapter.setMaxLogs(100);

            // Count should remain the same
            expect(await adapter.count()).toBe(5);
        });

        it('should flush pending writes before checking count', async () => {
            // Add entries without waiting
            adapter.append({ message: 'Pending 1' });
            adapter.append({ message: 'Pending 2' });

            // Change max logs - should flush pending writes first
            await adapter.setMaxLogs(10);

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Should have both entries
            expect(await adapter.count()).toBe(2);
        });
    });

    describe('append', () => {
        it('should append a single log entry', async () => {
            await adapter.append({ message: 'Test log', level: 'info' });

            // Wait for batching to complete
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'Test log', level: 'info' });
        });

        it('should batch multiple appends together', async () => {
            // Append multiple entries quickly
            adapter.append({ message: 'Log 1' });
            adapter.append({ message: 'Log 2' });
            adapter.append({ message: 'Log 3' });

            // Immediately check - should not be written yet (batching delay)
            let logs = await adapter.getAll();
            expect(logs.length).toBeLessThanOrEqual(3); // Might be 0 or some

            // Wait for batching to complete (100ms + buffer)
            await new Promise((resolve) => setTimeout(resolve, 150));

            logs = await adapter.getAll();
            expect(logs).toHaveLength(3);
            expect(logs.map((l: any) => l.message)).toEqual(['Log 1', 'Log 2', 'Log 3']);
        });

        it('should reset timer when appending multiple times quickly', async () => {
            adapter.append({ message: 'Log 1' });
            await new Promise((resolve) => setTimeout(resolve, 50));
            adapter.append({ message: 'Log 2' });
            await new Promise((resolve) => setTimeout(resolve, 50));
            adapter.append({ message: 'Log 3' });

            // Wait for final batch
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(3);
        });

        it('should trim old entries when exceeding maxEntries', async () => {
            await adapter.setMaxLogs(5);

            // Add more than the limit
            for (let i = 0; i < 10; i++) {
                await adapter.append({ message: `Log ${i}`, index: i });
            }

            // Wait for all batches to complete
            await new Promise((resolve) => setTimeout(resolve, 200));

            const count = await adapter.count();
            expect(count).toBe(5);

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(5);
            // Should have the most recent 5 entries
            const indices = logs.map((log: any) => log.index).sort((a: number, b: number) => a - b);
            expect(indices).toEqual([5, 6, 7, 8, 9]);
        });

        it('should handle complex log objects', async () => {
            const complexLog = {
                message: 'Complex log',
                metadata: {
                    user: { id: 123, name: 'Test User' },
                    context: { page: '/home' },
                },
                stack: ['frame1', 'frame2'],
                timestamp: Date.now(),
            };

            await adapter.append(complexLog);
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0].metadata).toEqual(complexLog.metadata);
            expect(logs[0].stack).toEqual(complexLog.stack);
        });
    });

    describe('getAll', () => {
        it('should return an empty array when storage is empty', async () => {
            const logs = await adapter.getAll();
            expect(logs).toEqual([]);
        });

        it('should return all logs from storage', async () => {
            await adapter.append({ message: 'Log 1' });
            await adapter.append({ message: 'Log 2' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(2);
            expect(logs[0]).toMatchObject({ message: 'Log 1' });
            expect(logs[1]).toMatchObject({ message: 'Log 2' });
        });

        it('should flush pending writes before returning logs', async () => {
            // Append without waiting
            adapter.append({ message: 'Pending log' });

            // getAll should flush pending writes
            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'Pending log' });
        });

        it('should not include internal id field in returned logs', async () => {
            await adapter.append({ message: 'Test log' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).not.toHaveProperty('id');
            expect(logs[0]).toHaveProperty('message');
        });
    });

    describe('count', () => {
        it('should return 0 for empty storage', async () => {
            const count = await adapter.count();
            expect(count).toBe(0);
        });

        it('should return the correct count of logs', async () => {
            await adapter.append({ message: 'Log 1' });
            await adapter.append({ message: 'Log 2' });
            await adapter.append({ message: 'Log 3' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const count = await adapter.count();
            expect(count).toBe(3);
        });

        it('should flush pending writes before counting', async () => {
            adapter.append({ message: 'Pending 1' });
            adapter.append({ message: 'Pending 2' });

            // count should flush pending writes
            const count = await adapter.count();
            expect(count).toBe(2);
        });

        it('should return correct count after trimming', async () => {
            await adapter.setMaxLogs(3);

            for (let i = 0; i < 5; i++) {
                await adapter.append({ message: `Log ${i}` });
            }
            await new Promise((resolve) => setTimeout(resolve, 200));

            const count = await adapter.count();
            expect(count).toBe(3);
        });
    });

    describe('clear', () => {
        it('should clear an empty storage without error', async () => {
            await expect(adapter.clear()).resolves.not.toThrow();
            expect(await adapter.count()).toBe(0);
        });

        it('should clear all logs from storage', async () => {
            await adapter.append({ message: 'Log 1' });
            await adapter.append({ message: 'Log 2' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            await adapter.clear();

            const logs = await adapter.getAll();
            expect(logs).toEqual([]);
            expect(await adapter.count()).toBe(0);
        });

        it('should clear pending writes when clearing', async () => {
            adapter.append({ message: 'Pending 1' });
            adapter.append({ message: 'Pending 2' });

            // Clear should remove pending writes
            await adapter.clear();

            // Wait a bit to ensure no writes happen
            await new Promise((resolve) => setTimeout(resolve, 150));

            expect(await adapter.count()).toBe(0);
        });

        it('should cancel the write timer when clearing', async () => {
            adapter.append({ message: 'Log 1' });

            // Clear immediately
            await adapter.clear();

            // Wait for what would have been the batch time
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Should still be empty
            expect(await adapter.count()).toBe(0);
        });

        it('should allow new writes after clearing', async () => {
            await adapter.append({ message: 'Old log' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            await adapter.clear();

            await adapter.append({ message: 'New log' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'New log' });
        });
    });

    describe('close', () => {
        it('should close the adapter without error', () => {
            expect(() => adapter.close()).not.toThrow();
        });

        it('should flush pending writes before closing', async () => {
            adapter.append({ message: 'Pending log' });

            // Close immediately
            adapter.close();

            // Wait a bit for flush to complete
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Create a new adapter with the same key to check
            const newAdapter = new StorageAdapter(testKey, 5000);
            const logs = await newAdapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'Pending log' });
            newAdapter.close();
        });

        it('should cancel the write timer when closing', () => {
            adapter.append({ message: 'Log' });
            adapter.close();

            // Timer should be cancelled, but flush should still happen
            expect(() => adapter.close()).not.toThrow();
        });

        it('should allow multiple close calls', () => {
            adapter.close();
            expect(() => adapter.close()).not.toThrow();
        });
    });

    describe('Integration tests', () => {
        it('should handle a complete workflow: append, getAll, count, clear', async () => {
            // Append logs
            await adapter.append({ message: 'Log 1' });
            await adapter.append({ message: 'Log 2' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Verify
            expect(await adapter.count()).toBe(2);
            const logs = await adapter.getAll();
            expect(logs).toHaveLength(2);

            // Clear
            await adapter.clear();
            expect(await adapter.count()).toBe(0);
        });

        it('should maintain maxEntries limit across multiple operations', async () => {
            await adapter.setMaxLogs(3);

            // Add entries one by one
            for (let i = 0; i < 5; i++) {
                await adapter.append({ message: `Log ${i}`, index: i });
                await new Promise((resolve) => setTimeout(resolve, 150));
            }

            const count = await adapter.count();
            expect(count).toBe(3);

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(3);
            // Should have the most recent 3
            const indices = logs.map((log: any) => log.index).sort((a: number, b: number) => a - b);
            expect(indices).toEqual([2, 3, 4]);
        });

        it('should handle rapid appends with batching', async () => {
            // Append many entries rapidly
            for (let i = 0; i < 20; i++) {
                adapter.append({ message: `Log ${i}`, index: i });
            }

            // Wait for batching to complete
            await new Promise((resolve) => setTimeout(resolve, 200));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(20);

            // Verify all entries are present
            const indices = logs.map((log: any) => log.index).sort((a: number, b: number) => a - b);
            expect(indices).toEqual(Array.from({ length: 20 }, (_, i) => i));
        });

        it('should handle concurrent getAll and append operations', async () => {
            adapter.append({ message: 'Log 1' });

            // Call getAll which should flush pending writes
            const logs1 = await adapter.getAll();
            expect(logs1).toHaveLength(1);

            adapter.append({ message: 'Log 2' });
            const logs2 = await adapter.getAll();
            expect(logs2).toHaveLength(2);
        });

        it('should handle error recovery in flushPendingWrites', async () => {
            // Add a log first
            await adapter.append({ message: 'Initial log' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Close the adapter to cause an error scenario for future flushes
            adapter.close();

            // Try to append - this will queue in pendingWrites but flush will fail
            adapter.append({ message: 'Failed log' });

            // Wait for the failed flush attempt
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Create a new adapter with a different key to avoid conflicts
            const newKey = `${testKey}_new`;
            const newAdapter = new StorageAdapter(newKey, 5000);

            // The new adapter should work independently
            await newAdapter.append({ message: 'New log' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await newAdapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'New log' });

            newAdapter.close();
            // Clean up the new database
            await new Promise<void>((resolve) => {
                const deleteRequest = indexedDB.deleteDatabase(newKey);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => resolve();
                deleteRequest.onblocked = () => setTimeout(() => resolve(), 10);
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle setting maxLogs to 1', async () => {
            await adapter.setMaxLogs(1);

            await adapter.append({ message: 'Log 1' });
            await adapter.append({ message: 'Log 2' });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'Log 2' }); // Most recent
        });

        it('should handle very large maxEntries', async () => {
            await adapter.setMaxLogs(100000);
            expect(adapter.getMaxLogs()).toBe(100000);
        });

        it('should handle empty log entries', async () => {
            await adapter.append({});
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toEqual({});
        });

        it('should handle logs with null and undefined values', async () => {
            await adapter.append({
                message: 'Test',
                nullValue: null,
                undefinedValue: undefined
            });
            await new Promise((resolve) => setTimeout(resolve, 150));

            const logs = await adapter.getAll();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe('Test');
            expect(logs[0].nullValue).toBeNull();
            // undefined values are typically not serialized in JSON
        });
    });
});
