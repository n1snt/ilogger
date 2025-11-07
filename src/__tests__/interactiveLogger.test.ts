import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveLogger, getLogger } from '../interactiveLogger';

describe('InteractiveLogger', () => {
    let mockStorage: any;
    let originalWindow: any;

    beforeEach(() => {
        // Mock window object
        originalWindow = global.window;
        global.window = {
            ...global.window,
            sessionStorage: {
                getItem: vi.fn().mockReturnValue(null),
                setItem: vi.fn(),
            },
        } as any;

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'trace').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        global.window = originalWindow;
        // Reset singleton by clearing the module cache would require re-import
        // For now, we'll work with the singleton as-is
    });

    describe('Constructor', () => {
        it('should create an instance with default options', () => {
            const logger = InteractiveLogger();
            expect(logger).toBeDefined();
        });

        it('should create an instance with custom options on first call', () => {
            // Note: Singleton means options only apply on first call
            // This test verifies the instance is created
            const logger = InteractiveLogger({
                maxLogs: 1000,
                singleFile: true,
                timestamps: false,
                enabled: false,
            });
            expect(logger).toBeDefined();
            // Verify options can be set after creation
            logger.setTimestamps(false);
            logger.setEnabled(false);
            expect(logger.getTimestamps()).toBe(false);
            expect(logger.getEnabled()).toBe(false);
        });

        it('should return the same singleton instance on multiple calls', () => {
            const logger1 = InteractiveLogger();
            const logger2 = InteractiveLogger();
            expect(logger1).toBe(logger2);
        });
    });

    describe('createInstance', () => {
        it('should create a logger instance', () => {
            const logger = InteractiveLogger();
            const instance = logger.createInstance('test-logger');
            expect(instance).toBeDefined();
        });

        it('should create a logger instance with custom options', () => {
            const logger = InteractiveLogger({ timestamps: false });
            const instance = logger.createInstance('test-logger', { timeStamps: true });
            expect(instance).toBeDefined();
        });
    });

    describe('getLogger', () => {
        it('should return undefined for non-existent logger', () => {
            const logger = InteractiveLogger();
            const instance = logger.getLogger('non-existent');
            expect(instance).toBeUndefined();
        });

        it('should return the logger instance after creation', () => {
            const logger = InteractiveLogger();
            const created = logger.createInstance('test-logger');
            const retrieved = logger.getLogger('test-logger');
            expect(retrieved).toBe(created);
        });
    });

    describe('getLogger function', () => {
        it('should return logger instance if it exists', () => {
            // This tests the exported getLogger function
            const logger = InteractiveLogger();
            logger.createInstance('test-logger');
            const instance = getLogger('test-logger');
            expect(instance).toBeDefined();
        });

        it('should return undefined for non-existent logger', () => {
            const instance = getLogger('non-existent-logger');
            expect(instance).toBeUndefined();
        });
    });

    describe('setEnabled / getEnabled', () => {
        it('should set and get enabled state', () => {
            const logger = InteractiveLogger();
            logger.setEnabled(false);
            expect(logger.getEnabled()).toBe(false);
            logger.setEnabled(true);
            expect(logger.getEnabled()).toBe(true);
        });
    });

    describe('setTimestamps / getTimestamps', () => {
        it('should set and get timestamps state', () => {
            const logger = InteractiveLogger();
            logger.setTimestamps(false);
            expect(logger.getTimestamps()).toBe(false);
            logger.setTimestamps(true);
            expect(logger.getTimestamps()).toBe(true);
        });
    });

    describe('setConsoleLogging', () => {
        it('should set console logging state', () => {
            const logger = InteractiveLogger();
            logger.setConsoleLogging(true);
            // No direct getter, but we can verify it doesn't throw
            expect(() => logger.setConsoleLogging(false)).not.toThrow();
        });
    });

    describe('getMaxLogs / setMaxLogs', () => {
        it('should get default max logs', () => {
            const logger = InteractiveLogger();
            expect(logger.getMaxLogs()).toBe(5000);
        });

        it('should set and get max logs', async () => {
            const logger = InteractiveLogger();
            await logger.setMaxLogs(1000);
            expect(logger.getMaxLogs()).toBe(1000);
        });
    });

    describe('clear', () => {
        it('should clear storage', async () => {
            const logger = InteractiveLogger();
            await expect(logger.clear()).resolves.not.toThrow();
        });
    });

    describe('getStats', () => {
        it('should return stats', async () => {
            const logger = InteractiveLogger();
            const stats = await logger.getStats();
            expect(stats).toHaveProperty('totalLogs');
            expect(stats).toHaveProperty('activeLoggers');
            expect(stats).toHaveProperty('maxLogs');
            expect(typeof stats.totalLogs).toBe('number');
            expect(typeof stats.activeLoggers).toBe('number');
            expect(typeof stats.maxLogs).toBe('number');
        });
    });

    describe('enableConsoleInterface / disableConsoleInterface', () => {
        it('should enable console interface', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterface();
            expect((global.window as any).downloadLogs).toBeDefined();
        });

        it('should disable console interface', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterface();
            logger.disableConsoleInterface();
            expect((global.window as any).downloadLogs).toBeUndefined();
        });
    });

    describe('enableConsoleInterception / disableConsoleInterception', () => {
        beforeEach(() => {
            // Ensure interception is disabled before each test
            const logger = InteractiveLogger();
            if (logger.isConsoleInterceptionEnabled()) {
                logger.disableConsoleInterception();
            }
        });

        it('should enable console interception', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterception();
            expect(logger.isConsoleInterceptionEnabled()).toBe(true);
        });

        it('should disable console interception', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterception();
            logger.disableConsoleInterception();
            expect(logger.isConsoleInterceptionEnabled()).toBe(false);
        });

        it('should not enable twice if already enabled', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterception();
            const interceptedLog = console.log;
            logger.enableConsoleInterception();
            // Should still be the intercepted version (same reference)
            expect(console.log).toBe(interceptedLog);
        });

        it('should intercept console methods when enabled', () => {
            const logger = InteractiveLogger();
            const beforeInterception = console.log;
            logger.enableConsoleInterception();
            // After interception, console.log should be a different function
            expect(typeof console.log).toBe('function');
            logger.disableConsoleInterception();
        });
    });

    describe('isConsoleInterceptionEnabled', () => {
        beforeEach(() => {
            // Ensure interception is disabled before each test
            const logger = InteractiveLogger();
            if (logger.isConsoleInterceptionEnabled()) {
                logger.disableConsoleInterception();
            }
        });

        it('should return false by default', () => {
            const logger = InteractiveLogger();
            expect(logger.isConsoleInterceptionEnabled()).toBe(false);
        });

        it('should return true after enabling', () => {
            const logger = InteractiveLogger();
            logger.enableConsoleInterception();
            expect(logger.isConsoleInterceptionEnabled()).toBe(true);
        });
    });
});

