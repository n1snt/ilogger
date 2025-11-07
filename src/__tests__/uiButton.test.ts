/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from '../storageAdapter';
import { downloadLogs, injectDownloadButton, withdrawDownloadButton, type ButtonOptions } from '../uiButton';

// Mock file-saver
vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
}));

// Mock jszip
vi.mock('jszip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            file: vi.fn(),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content'], { type: 'application/zip' })),
        })),
    };
});

import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Helper function to read blob content
async function readBlobContent(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
    });
}

// Polyfill Touch API for jsdom
class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;

    constructor(touchInitDict: {
        identifier: number;
        target: EventTarget;
        clientX: number;
        clientY: number;
        radiusX?: number;
        radiusY?: number;
        rotationAngle?: number;
        force?: number;
    }) {
        this.identifier = touchInitDict.identifier;
        this.target = touchInitDict.target;
        this.clientX = touchInitDict.clientX;
        this.clientY = touchInitDict.clientY;
        this.radiusX = touchInitDict.radiusX ?? 0;
        this.radiusY = touchInitDict.radiusY ?? 0;
        this.rotationAngle = touchInitDict.rotationAngle ?? 0;
        this.force = touchInitDict.force ?? 0;
    }
}

// Add Touch to global scope
(global as any).Touch = Touch;

describe('uiButton', () => {
    let mockStorage: StorageAdapter;
    let mockGetAll: ReturnType<typeof vi.fn>;
    let mockZipInstance: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create mock zip instance
        mockZipInstance = {
            file: vi.fn(),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content'], { type: 'application/zip' })),
        };
        (JSZip as any).mockImplementation(() => mockZipInstance);

        // Create mock storage adapter
        mockGetAll = vi.fn();
        mockStorage = {
            getAll: mockGetAll,
        } as unknown as StorageAdapter;

        // Setup DOM environment
        document.body.innerHTML = '';
        localStorage.clear();

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
        });
    });

    afterEach(() => {
        // Clean up any injected buttons
        const btn = document.getElementById('illogger-download-btn');
        if (btn) {
            withdrawDownloadButton();
        }
        vi.restoreAllMocks();
    });

    describe('downloadLogs', () => {
        describe('singleFile mode', () => {
            it('should download a single log file with all logs', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                    { name: 'logger2', message: 'Message 2', timestamp: '2024-01-01T10:01:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                expect(mockGetAll).toHaveBeenCalled();
                expect(saveAs).toHaveBeenCalledTimes(1);
                const [blob, filename] = (saveAs as any).mock.calls[0];
                expect(filename).toBe('illogger-logs.log');
                expect(blob).toBeInstanceOf(Blob);
                expect(blob.type).toBe('text/plain');
            });

            it('should include timestamps when showTimestamps is true', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('[2024-01-01T10:00:00]');
                expect(content).toContain('[logger1]');
            });

            it('should not include timestamps when showTimestamps is false', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, false);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).not.toContain('[2024-01-01T10:00:00]');
                expect(content).toContain('[logger1]');
            });

            it('should handle showTimestamps as a function', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);
                const getShowTimestamps = vi.fn().mockReturnValue(true);

                await downloadLogs(mockStorage, true, getShowTimestamps);

                expect(getShowTimestamps).toHaveBeenCalled();
                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('[2024-01-01T10:00:00]');
            });

            it('should handle session separator entries', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                    { isSeparator: true, message: 'Session Start', timestamp: '2024-01-01T11:00:00' },
                    { name: 'logger2', message: 'Message 2', timestamp: '2024-01-01T10:01:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('='.repeat(60));
                expect(content).toContain('Session Start');
            });

            it('should handle __session_separator__ name', async () => {
                const logs = [
                    { name: '__session_separator__', message: 'Session Start', timestamp: '2024-01-01T11:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('='.repeat(60));
            });

            it('should handle logs without names', async () => {
                const logs = [
                    { message: 'Message without name', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('Message without name');
                expect(content).not.toContain('[]');
            });

            it('should handle logs without timestamps', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, true, true);

                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toContain('[logger1] Message 1');
            });

            it('should handle empty logs array', async () => {
                mockGetAll.mockResolvedValue([]);

                await downloadLogs(mockStorage, true, true);

                expect(saveAs).toHaveBeenCalled();
                const [blob] = (saveAs as any).mock.calls[0];
                const content = await readBlobContent(blob);
                expect(content).toBe('');
            });
        });

        describe('multiFile mode (zip)', () => {
            it('should create a zip file with multiple log files', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                    { name: 'logger2', message: 'Message 2', timestamp: '2024-01-01T10:01:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, false, true);

                expect(mockGetAll).toHaveBeenCalled();
                expect(JSZip).toHaveBeenCalled();
                expect(mockZipInstance.file).toHaveBeenCalledTimes(2);
                expect(mockZipInstance.generateAsync).toHaveBeenCalled();
                expect(saveAs).toHaveBeenCalledTimes(1);
                const [blob, filename] = (saveAs as any).mock.calls[0];
                expect(filename).toBe('illogger-logs.zip');
            });

            it('should group logs by logger name', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                    { name: 'logger1', message: 'Message 2', timestamp: '2024-01-01T10:01:00' },
                    { name: 'logger2', message: 'Message 3', timestamp: '2024-01-01T10:02:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, false, true);

                expect(mockZipInstance.file).toHaveBeenCalledWith('logger1.log', expect.any(String));
                expect(mockZipInstance.file).toHaveBeenCalledWith('logger2.log', expect.any(String));
            });

            it('should include session separators in all files at chronological position', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                    { name: 'logger2', message: 'Message 2', timestamp: '2024-01-01T10:01:00' },
                    { isSeparator: true, message: 'Session Start', timestamp: '2024-01-01T10:30:00' },
                    { name: 'logger1', message: 'Message 3', timestamp: '2024-01-01T10:02:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, false, true);

                const calls = (mockZipInstance.file as any).mock.calls;

                // Find logger1.log call
                const logger1Call = calls.find((call: any[]) => call[0] === 'logger1.log');
                expect(logger1Call).toBeDefined();
                expect(logger1Call[1]).toContain('Message 1');
                expect(logger1Call[1]).toContain('Session Start');
                expect(logger1Call[1]).toContain('Message 3');

                // Find logger2.log call
                const logger2Call = calls.find((call: any[]) => call[0] === 'logger2.log');
                expect(logger2Call).toBeDefined();
                expect(logger2Call[1]).toContain('Message 2');
                expect(logger2Call[1]).toContain('Session Start');
            });

            it('should handle timestamps in multiFile mode', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, false, true);

                const [filename, content] = (mockZipInstance.file as any).mock.calls[0];
                expect(content).toContain('[2024-01-01T10:00:00]');
            });

            it('should not include logger prefix in multiFile mode', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);

                await downloadLogs(mockStorage, false, true);

                const [filename, content] = (mockZipInstance.file as any).mock.calls[0];
                expect(content).not.toContain('[logger1]');
                expect(content).toContain('Message 1');
            });

            it('should handle showTimestamps as a function in multiFile mode', async () => {
                const logs = [
                    { name: 'logger1', message: 'Message 1', timestamp: '2024-01-01T10:00:00' },
                ];
                mockGetAll.mockResolvedValue(logs);
                const getShowTimestamps = vi.fn().mockReturnValue(false);

                await downloadLogs(mockStorage, false, getShowTimestamps);

                expect(getShowTimestamps).toHaveBeenCalled();
                const [filename, content] = (mockZipInstance.file as any).mock.calls[0];
                expect(content).not.toContain('[2024-01-01T10:00:00]');
            });
        });
    });

    describe('injectDownloadButton', () => {
        it('should create and inject a button into the DOM', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn');
            expect(btn).toBeTruthy();
            expect(btn?.textContent).toBe('Interactive Logger');
        });

        it('should not create duplicate buttons', () => {
            injectDownloadButton(mockStorage);
            injectDownloadButton(mockStorage);

            const buttons = document.querySelectorAll('#illogger-download-btn');
            expect(buttons.length).toBe(1);
        });

        it('should use custom button text when provided', () => {
            const options: ButtonOptions = { text: 'Download Logs' };
            injectDownloadButton(mockStorage, false, true, options);

            const btn = document.getElementById('illogger-download-btn');
            expect(btn?.textContent).toBe('Download Logs');
        });

        it('should apply default styles', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLElement;
            expect(btn?.style.position).toBe('fixed');
            expect(btn?.style.background).toBe('rgb(17, 17, 17)');
            expect(btn?.style.color).toBe('rgb(255, 255, 255)');
            expect(btn?.style.cursor).toBe('grab');
            expect(btn?.style.zIndex).toBe('99999');
        });

        it('should apply custom styles when provided', () => {
            const options: ButtonOptions = {
                style: {
                    background: '#ff0000',
                    color: '#00ff00',
                    fontSize: '20px',
                },
            };
            injectDownloadButton(mockStorage, false, true, options);

            const btn = document.getElementById('illogger-download-btn') as HTMLElement;
            expect(btn?.style.background).toBe('rgb(255, 0, 0)');
            expect(btn?.style.color).toBe('rgb(0, 255, 0)');
            expect(btn?.style.fontSize).toBe('20px');
        });

        it('should position button at default location when no saved position', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLElement;
            const defaultTop = window.innerHeight - 60;
            const defaultLeft = window.innerWidth - 100;
            expect(btn?.style.top).toBe(`${defaultTop}px`);
            expect(btn?.style.left).toBe(`${defaultLeft}px`);
        });

        it('should restore saved position from localStorage', () => {
            localStorage.setItem('illogger-button-position', JSON.stringify({ top: 100, left: 200 }));
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLElement;
            expect(btn?.style.top).toBe('100px');
            expect(btn?.style.left).toBe('200px');
        });

        it('should handle invalid saved position gracefully', () => {
            localStorage.setItem('illogger-button-position', 'invalid json');
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLElement;
            expect(btn).toBeTruthy();
            // Should fall back to default position
            const defaultTop = window.innerHeight - 60;
            expect(btn?.style.top).toBe(`${defaultTop}px`);
        });

        it('should download logs when button is clicked', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);

            injectDownloadButton(mockStorage, true, true);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            btn.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockGetAll).toHaveBeenCalled();
            expect(saveAs).toHaveBeenCalled();
        });

        it('should not download logs if button was dragged', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);

            injectDownloadButton(mockStorage, true, true);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Simulate drag
            const mousedown = new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true });
            btn.dispatchEvent(mousedown);

            const mousemove = new MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true });
            document.dispatchEvent(mousemove);

            const mouseup = new MouseEvent('mouseup', { bubbles: true });
            document.dispatchEvent(mouseup);

            // Wait a bit for drag state to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Now click
            btn.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should not have downloaded because we dragged
            expect(mockGetAll).not.toHaveBeenCalled();
        });

        it('should handle mouse drag functionality', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            const initialLeft = parseInt(btn.style.left);
            const initialTop = parseInt(btn.style.top);

            // Start drag
            const mousedown = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true,
            });
            btn.dispatchEvent(mousedown);

            expect(btn.dataset.dragging).toBe('true');
            expect(btn.style.cursor).toBe('grabbing');

            // Move
            const mousemove = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 150,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);

            // End drag
            const mouseup = new MouseEvent('mouseup', { bubbles: true });
            document.dispatchEvent(mouseup);

            expect(btn.dataset.dragging).toBeUndefined();
            expect(btn.style.cursor).toBe('grab');
        });

        it('should constrain button to viewport bounds during drag', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Mock getBoundingClientRect
            vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                width: 80,
                height: 40,
                right: 80,
                bottom: 40,
                x: 0,
                y: 0,
                toJSON: () => { },
            } as DOMRect);

            // Start drag
            const mousedown = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true,
            });
            btn.dispatchEvent(mousedown);

            // Try to drag outside viewport
            const mousemove = new MouseEvent('mousemove', {
                clientX: -100,
                clientY: -100,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);

            // Button should be constrained to 0,0
            expect(parseInt(btn.style.left)).toBeGreaterThanOrEqual(0);
            expect(parseInt(btn.style.top)).toBeGreaterThanOrEqual(0);
        });

        it('should save position after drag ends', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Mock getBoundingClientRect
            vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
                left: 200,
                top: 300,
                width: 80,
                height: 40,
                right: 280,
                bottom: 340,
                x: 200,
                y: 300,
                toJSON: () => { },
            } as DOMRect);

            // Start and end drag
            const mousedown = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true,
            });
            btn.dispatchEvent(mousedown);

            const mouseup = new MouseEvent('mouseup', { bubbles: true });
            document.dispatchEvent(mouseup);

            // Wait for position save
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const saved = localStorage.getItem('illogger-button-position');
                    expect(saved).toBeTruthy();
                    const { top, left } = JSON.parse(saved!);
                    expect(top).toBe(300);
                    expect(left).toBe(200);
                    resolve();
                }, 10);
            });
        });

        it('should handle touch events for mobile', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);

            injectDownloadButton(mockStorage, true, true);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Simulate tap (touch without significant movement)
            const touch = new Touch({ identifier: 1, target: btn, clientX: 100, clientY: 100, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touchstart = new TouchEvent('touchstart', {
                touches: [touch],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchstart);

            const touchend = new TouchEvent('touchend', {
                touches: [],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchend);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockGetAll).toHaveBeenCalled();
        });

        it('should handle touch drag', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Mock getBoundingClientRect
            vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                width: 80,
                height: 40,
                right: 80,
                bottom: 40,
                x: 0,
                y: 0,
                toJSON: () => { },
            } as DOMRect);

            // Start touch
            const touch1 = new Touch({ identifier: 1, target: btn, clientX: 100, clientY: 100, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touchstart = new TouchEvent('touchstart', {
                touches: [touch1],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchstart);

            // Move touch significantly
            const touch2 = new Touch({ identifier: 1, target: btn, clientX: 150, clientY: 150, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touchmove = new TouchEvent('touchmove', {
                touches: [touch2],
                bubbles: true,
                cancelable: true,
            });
            document.dispatchEvent(touchmove);

            // End touch
            const touchend = new TouchEvent('touchend', {
                touches: [],
                bubbles: true,
                cancelable: true,
            });
            document.dispatchEvent(touchend);

            expect(btn.dataset.dragging).toBeUndefined();
        });

        it('should handle window resize to keep button in bounds', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Set button outside viewport
            btn.style.left = '2000px';
            btn.style.top = '2000px';

            // Mock getBoundingClientRect
            vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
                left: 2000,
                top: 2000,
                width: 80,
                height: 40,
                right: 2080,
                bottom: 2040,
                x: 2000,
                y: 2000,
                toJSON: () => { },
            } as DOMRect);

            // Trigger resize
            window.dispatchEvent(new Event('resize'));

            // Button should be adjusted to be within bounds
            const maxLeft = window.innerWidth - 80;
            const maxTop = window.innerHeight - 40;
            expect(parseInt(btn.style.left)).toBeLessThanOrEqual(maxLeft);
            expect(parseInt(btn.style.top)).toBeLessThanOrEqual(maxTop);
        });

        it('should handle mouse hover opacity changes', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            expect(btn.style.opacity).toBe('0.8');

            // Hover
            btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(btn.style.opacity).toBe('1');

            // Leave
            btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            expect(btn.style.opacity).toBe('0.8');
        });

        it('should not change opacity on hover when dragging', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Start drag
            const mousedown = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true,
            });
            btn.dispatchEvent(mousedown);

            expect(btn.style.opacity).toBe('1');

            // Hover during drag
            btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(btn.style.opacity).toBe('1'); // Should stay at 1

            // Leave during drag
            btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            expect(btn.style.opacity).toBe('1'); // Should stay at 1
        });

        it('should ignore non-left mouse button clicks', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Right mouse button
            const mousedown = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 2,
                bubbles: true,
            });
            btn.dispatchEvent(mousedown);

            expect(btn.dataset.dragging).toBeUndefined();
        });

        it('should handle multiple touch points gracefully', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Multiple touches
            const touch1 = new Touch({ identifier: 1, target: btn, clientX: 100, clientY: 100, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touch2 = new Touch({ identifier: 2, target: btn, clientX: 150, clientY: 150, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touchstart = new TouchEvent('touchstart', {
                touches: [touch1, touch2],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchstart);

            // Should not start dragging
            expect(btn.dataset.dragging).toBeUndefined();
        });

        it('should handle touchcancel event', () => {
            injectDownloadButton(mockStorage);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            const touch = new Touch({ identifier: 1, target: btn, clientX: 100, clientY: 100, radiusX: 0, radiusY: 0, rotationAngle: 0, force: 0 } as any);
            const touchstart = new TouchEvent('touchstart', {
                touches: [touch],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchstart);

            const touchcancel = new TouchEvent('touchcancel', {
                touches: [],
                bubbles: true,
                cancelable: true,
            });
            btn.dispatchEvent(touchcancel);

            // Should reset state
            expect(btn.dataset.dragging).toBeUndefined();
        });

        it('should pass singleFile parameter to downloadLogs', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);

            injectDownloadButton(mockStorage, true, true);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            btn.click();

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'illogger-logs.log');
        });

        it('should pass showTimestamps parameter to downloadLogs', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);

            injectDownloadButton(mockStorage, true, false);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            btn.click();

            await new Promise(resolve => setTimeout(resolve, 50));

            const [blob] = (saveAs as any).mock.calls[0];
            const content = await readBlobContent(blob);
            expect(content).not.toContain('[2024-01-01T10:00:00]');
        });

        it('should handle showTimestamps as a function', async () => {
            const logs = [{ name: 'logger1', message: 'Test', timestamp: '2024-01-01T10:00:00' }];
            mockGetAll.mockResolvedValue(logs);
            const getShowTimestamps = vi.fn().mockReturnValue(true);

            injectDownloadButton(mockStorage, true, getShowTimestamps);

            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;
            btn.click();

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(getShowTimestamps).toHaveBeenCalled();
        });

        it('should return early if document is undefined (Node.js environment)', () => {
            const originalDocument = global.document;
            // @ts-ignore
            delete global.document;

            injectDownloadButton(mockStorage);

            // Should not throw
            expect(true).toBe(true);

            // Restore
            global.document = originalDocument;
        });
    });

    describe('withdrawDownloadButton', () => {
        it('should remove button from DOM', () => {
            injectDownloadButton(mockStorage);
            expect(document.getElementById('illogger-download-btn')).toBeTruthy();

            withdrawDownloadButton();
            expect(document.getElementById('illogger-download-btn')).toBeNull();
        });

        it('should clean up event listeners', () => {
            injectDownloadButton(mockStorage);
            const btn = document.getElementById('illogger-download-btn') as HTMLButtonElement;

            // Verify cleanup function exists
            expect((btn as any).__illogger_cleanup).toBeDefined();

            withdrawDownloadButton();

            // Button should be removed
            expect(document.getElementById('illogger-download-btn')).toBeNull();
        });

        it('should handle case when button does not exist', () => {
            expect(() => withdrawDownloadButton()).not.toThrow();
        });

        it('should return early if document is undefined (Node.js environment)', () => {
            const originalDocument = global.document;
            // @ts-ignore
            delete global.document;

            expect(() => withdrawDownloadButton()).not.toThrow();

            // Restore
            global.document = originalDocument;
        });

        it('should handle multiple withdrawals gracefully', () => {
            injectDownloadButton(mockStorage);
            withdrawDownloadButton();
            withdrawDownloadButton();
            withdrawDownloadButton();

            expect(document.getElementById('illogger-download-btn')).toBeNull();
        });
    });
});
