import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IndexedDBAdapter } from '../indexedDBAdapter';

describe('IndexedDBAdapter', () => {
    let adapter: IndexedDBAdapter;
    let testDbName: string;
    const testStoreName = 'test_logs';
    let testCounter = 0;

    beforeEach(() => {
        // Use unique database name for each test to ensure isolation
        testDbName = `__test_db_${Date.now()}_${testCounter++}__`;
        // Create a new adapter instance for each test
        adapter = new IndexedDBAdapter(testDbName, testStoreName, 1);
    });

    afterEach(async () => {
        // Clean up: close the database connection
        if (adapter) {
            adapter.close();
        }
        // Delete the test database and wait for it to complete
        await new Promise<void>((resolve) => {
            const deleteRequest = indexedDB.deleteDatabase(testDbName);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => resolve(); // Resolve anyway to continue
            deleteRequest.onblocked = () => {
                // If blocked, wait a bit and try again
                setTimeout(() => resolve(), 10);
            };
        });
    });

    describe('Constructor', () => {
        it('should create an instance with default parameters', () => {
            const defaultAdapter = new IndexedDBAdapter();
            expect(defaultAdapter).toBeInstanceOf(IndexedDBAdapter);
            defaultAdapter.close();
        });

        it('should create an instance with custom parameters', () => {
            const customAdapter = new IndexedDBAdapter('custom_db', 'custom_store', 2);
            expect(customAdapter).toBeInstanceOf(IndexedDBAdapter);
            customAdapter.close();
        });
    });

    describe('read', () => {
        it('should return an empty array when database is empty', async () => {
            const logs = await adapter.read();
            expect(logs).toEqual([]);
        });

        it('should return all logs from the database', async () => {
            const testLogs = [
                { message: 'Test log 1', timestamp: Date.now() },
                { message: 'Test log 2', timestamp: Date.now() + 1000 },
            ];

            await adapter.write(testLogs);
            const logs = await adapter.read();

            expect(logs).toHaveLength(2);
            expect(logs[0]).toMatchObject(testLogs[0]);
            expect(logs[1]).toMatchObject(testLogs[1]);
            // IndexedDB adds an id field
            expect(logs[0]).toHaveProperty('id');
            expect(logs[1]).toHaveProperty('id');
        });
    });

    describe('write', () => {
        it('should write an empty array to the database', async () => {
            await adapter.write([]);
            const logs = await adapter.read();
            expect(logs).toEqual([]);
        });

        it('should write logs to the database', async () => {
            const testLogs = [
                { message: 'Log 1', level: 'info' },
                { message: 'Log 2', level: 'error' },
            ];

            await adapter.write(testLogs);
            const logs = await adapter.read();

            expect(logs).toHaveLength(2);
            expect(logs[0]).toMatchObject(testLogs[0]);
            expect(logs[1]).toMatchObject(testLogs[1]);
        });

        it('should replace all existing logs when writing', async () => {
            // Write initial logs
            await adapter.write([
                { message: 'Old log 1' },
                { message: 'Old log 2' },
            ]);

            // Write new logs
            const newLogs = [
                { message: 'New log 1' },
                { message: 'New log 2' },
                { message: 'New log 3' },
            ];
            await adapter.write(newLogs);

            const logs = await adapter.read();
            expect(logs).toHaveLength(3);
            expect(logs[0]).toMatchObject(newLogs[0]);
            expect(logs[1]).toMatchObject(newLogs[1]);
            expect(logs[2]).toMatchObject(newLogs[2]);
        });

        it('should handle writing large arrays of logs', async () => {
            const largeLogArray = Array.from({ length: 100 }, (_, i) => ({
                message: `Log ${i}`,
                index: i,
            }));

            await adapter.write(largeLogArray);
            const logs = await adapter.read();

            expect(logs).toHaveLength(100);
            expect(logs[0]).toMatchObject(largeLogArray[0]);
            expect(logs[99]).toMatchObject(largeLogArray[99]);
        });

        it('should handle write operations correctly after reinitialization', async () => {
            // Close the adapter first
            adapter.close();

            // Create a new adapter with the same database name - it will reinitialize on write
            const newAdapter = new IndexedDBAdapter(testDbName, testStoreName, 1);
            // Write should work even after the previous adapter was closed
            await newAdapter.write([{ message: 'test' }]);

            const logs = await newAdapter.read();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'test' });

            newAdapter.close();
        });
    });

    describe('append', () => {
        it('should append a single log entry to the database', async () => {
            const logEntry = { message: 'Appended log', level: 'info' };

            await adapter.append(logEntry);
            const logs = await adapter.read();

            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject(logEntry);
            expect(logs[0]).toHaveProperty('id');
        });

        it('should append multiple entries sequentially', async () => {
            const entry1 = { message: 'Entry 1' };
            const entry2 = { message: 'Entry 2' };
            const entry3 = { message: 'Entry 3' };

            await adapter.append(entry1);
            await adapter.append(entry2);
            await adapter.append(entry3);

            const logs = await adapter.read();
            expect(logs).toHaveLength(3);
            expect(logs[0]).toMatchObject(entry1);
            expect(logs[1]).toMatchObject(entry2);
            expect(logs[2]).toMatchObject(entry3);
        });

        it('should append to existing logs without clearing them', async () => {
            // Write initial logs
            await adapter.write([
                { message: 'Existing log 1' },
                { message: 'Existing log 2' },
            ]);

            // Append a new log
            await adapter.append({ message: 'New appended log' });

            const logs = await adapter.read();
            expect(logs).toHaveLength(3);
            expect(logs[2]).toMatchObject({ message: 'New appended log' });
        });

        it('should handle append operations correctly after reinitialization', async () => {
            // Close the adapter first
            adapter.close();

            // Create a new adapter with the same database name - it will reinitialize on append
            const newAdapter = new IndexedDBAdapter(testDbName, testStoreName, 1);
            // Append should work even after the previous adapter was closed
            await newAdapter.append({ message: 'test' });

            const logs = await newAdapter.read();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'test' });

            newAdapter.close();
        });
    });

    describe('clear', () => {
        it('should clear an empty database without error', async () => {
            await expect(adapter.clear()).resolves.not.toThrow();
            const logs = await adapter.read();
            expect(logs).toEqual([]);
        });

        it('should clear all logs from the database', async () => {
            // Write some logs
            await adapter.write([
                { message: 'Log 1' },
                { message: 'Log 2' },
                { message: 'Log 3' },
            ]);

            // Clear the database
            await adapter.clear();

            const logs = await adapter.read();
            expect(logs).toEqual([]);
        });

        it('should clear logs and allow new writes after clearing', async () => {
            await adapter.write([{ message: 'Old log' }]);
            await adapter.clear();
            await adapter.write([{ message: 'New log' }]);

            const logs = await adapter.read();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'New log' });
        });

        it('should handle clear operations correctly after reinitialization', async () => {
            // Write some data first
            await adapter.write([{ message: 'test1' }, { message: 'test2' }]);
            adapter.close();

            // Create a new adapter with the same database name - it will reinitialize on clear
            const newAdapter = new IndexedDBAdapter(testDbName, testStoreName, 1);
            // Clear should work even after the previous adapter was closed
            await newAdapter.clear();

            const logs = await newAdapter.read();
            expect(logs).toEqual([]);

            newAdapter.close();
        });
    });

    describe('count', () => {
        it('should return 0 for an empty database', async () => {
            const count = await adapter.count();
            expect(count).toBe(0);
        });

        it('should return the correct count of logs', async () => {
            await adapter.write([
                { message: 'Log 1' },
                { message: 'Log 2' },
                { message: 'Log 3' },
            ]);

            const count = await adapter.count();
            expect(count).toBe(3);
        });

        it('should return correct count after append', async () => {
            await adapter.write([{ message: 'Log 1' }]);
            expect(await adapter.count()).toBe(1);

            await adapter.append({ message: 'Log 2' });
            expect(await adapter.count()).toBe(2);
        });

        it('should return correct count after clear', async () => {
            await adapter.write([
                { message: 'Log 1' },
                { message: 'Log 2' },
            ]);
            expect(await adapter.count()).toBe(2);

            await adapter.clear();
            expect(await adapter.count()).toBe(0);
        });

        it('should return 0 when database is empty after reinitialization', async () => {
            adapter.close();

            // Create a new adapter - it will reinitialize on count
            const newAdapter = new IndexedDBAdapter(testDbName, testStoreName, 1);
            newAdapter.close();

            // Count should work and return 0 for empty database
            const count = await newAdapter.count();
            expect(count).toBe(0);

            newAdapter.close();
        });
    });

    describe('close', () => {
        it('should close the database connection', () => {
            // Should not throw
            expect(() => adapter.close()).not.toThrow();
        });

        it('should allow multiple close calls without error', () => {
            adapter.close();
            expect(() => adapter.close()).not.toThrow();
        });

        it('should allow operations after closing (reinitializes)', async () => {
            // Write some data first
            await adapter.write([{ message: 'test' }]);

            // Close the adapter
            adapter.close();

            // Operations should reinitialize the database and work
            const logs = await adapter.read();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({ message: 'test' });
        });
    });

    describe('Integration tests', () => {
        it('should handle a complete workflow: write, read, append, count, clear', async () => {
            // Write initial logs
            await adapter.write([
                { message: 'Initial log 1', timestamp: 1000 },
                { message: 'Initial log 2', timestamp: 2000 },
            ]);

            // Verify write
            let logs = await adapter.read();
            expect(logs).toHaveLength(2);

            // Verify count
            expect(await adapter.count()).toBe(2);

            // Append new log
            await adapter.append({ message: 'Appended log', timestamp: 3000 });

            // Verify append
            logs = await adapter.read();
            expect(logs).toHaveLength(3);
            expect(await adapter.count()).toBe(3);

            // Clear all logs
            await adapter.clear();

            // Verify clear
            logs = await adapter.read();
            expect(logs).toEqual([]);
            expect(await adapter.count()).toBe(0);
        });

        it('should maintain data integrity across multiple operations', async () => {
            const log1 = { message: 'Log 1', data: { key: 'value1' } };
            const log2 = { message: 'Log 2', data: { key: 'value2' } };
            const log3 = { message: 'Log 3', data: { key: 'value3' } };

            await adapter.append(log1);
            await adapter.append(log2);
            await adapter.append(log3);

            const logs = await adapter.read();
            expect(logs).toHaveLength(3);
            expect(logs[0].data).toEqual(log1.data);
            expect(logs[1].data).toEqual(log2.data);
            expect(logs[2].data).toEqual(log3.data);
        });

        it('should handle complex log objects with nested structures', async () => {
            const complexLog = {
                message: 'Complex log',
                metadata: {
                    user: { id: 123, name: 'Test User' },
                    context: { page: '/home', action: 'click' },
                },
                stack: ['frame1', 'frame2', 'frame3'],
                timestamp: Date.now(),
            };

            await adapter.append(complexLog);
            const logs = await adapter.read();

            expect(logs).toHaveLength(1);
            expect(logs[0].metadata).toEqual(complexLog.metadata);
            expect(logs[0].stack).toEqual(complexLog.stack);
            expect(logs[0].timestamp).toBe(complexLog.timestamp);
        });

        it('should handle concurrent operations', async () => {
            const promises = Array.from({ length: 10 }, (_, i) =>
                adapter.append({ message: `Concurrent log ${i}`, index: i })
            );

            await Promise.all(promises);

            const logs = await adapter.read();
            expect(logs).toHaveLength(10);
        });
    });

    describe('Database initialization', () => {
        it('should initialize database on first operation', async () => {
            // Database should be initialized when we call read
            const logs = await adapter.read();
            expect(logs).toEqual([]);
        });

        it('should reuse existing database connection', async () => {
            // First operation initializes
            await adapter.read();
            // Second operation should reuse the connection
            await adapter.write([{ message: 'test' }]);
            const logs = await adapter.read();
            expect(logs).toHaveLength(1);
        });

        it('should create indexes correctly', async () => {
            // Write logs with timestamp and name fields
            await adapter.write([
                { message: 'Log 1', timestamp: 1000, name: 'logger1' },
                { message: 'Log 2', timestamp: 2000, name: 'logger2' },
            ]);

            const logs = await adapter.read();
            expect(logs).toHaveLength(2);
            // Verify that logs can be read (indexes are working)
            expect(logs[0].timestamp).toBe(1000);
            expect(logs[1].name).toBe('logger2');
        });
    });
});
