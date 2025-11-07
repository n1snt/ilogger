import JSZip from 'jszip';

export interface LogEntry {
    loggerName: string;
    message: string;
    timestamp: Date | null;
    isSeparator: boolean;
    rawLine: string;
}

export interface ParsedLogs {
    entries: LogEntry[];
    loggerNames: string[];
    timeRange: {
        start: Date | null;
        end: Date | null;
    };
}

/**
 * Parse a timestamp from a log line
 * Supports ISO format: [2024-01-15T10:30:00.000Z]
 */
function parseTimestamp(line: string): Date | null {
    const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\]/);
    if (timestampMatch) {
        try {
            return new Date(timestampMatch[1]);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Check if a line is a session separator
 */
function isSeparatorLine(line: string): boolean {
    return line.includes('='.repeat(60)) || line.trim().startsWith('============================================================');
}

/**
 * Extract logger name from a log line (for single-file format)
 * Format: [timestamp] [logger-name] message
 */
function extractLoggerName(line: string): string | null {
    // Try to match [timestamp] [logger-name] pattern
    const match = line.match(/\[.*?\]\s+\[([^\]]+)\]/);
    return match ? match[1] : null;
}

/**
 * Parse a single log file content
 * Supports both multi-file format ([timestamp] message) and single-file format ([timestamp] [logger-name] message)
 */
function parseLogFile(content: string, defaultLoggerName: string): LogEntry[] {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];
    let inSeparator = false;
    let separatorTimestamp: Date | null = null;
    let separatorMessage = '';
    let separatorLoggerName = defaultLoggerName;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) continue;

        // Check if this is a separator line
        if (isSeparatorLine(trimmedLine)) {
            if (!inSeparator) {
                // Start of separator
                inSeparator = true;
                separatorTimestamp = parseTimestamp(trimmedLine);
                const loggerName = extractLoggerName(trimmedLine);
                if (loggerName) {
                    separatorLoggerName = loggerName;
                }
            } else {
                // End of separator - create entry
                entries.push({
                    loggerName: separatorLoggerName,
                    message: separatorMessage || 'New Session',
                    timestamp: separatorTimestamp,
                    isSeparator: true,
                    rawLine: trimmedLine,
                });
                inSeparator = false;
                separatorTimestamp = null;
                separatorMessage = '';
                separatorLoggerName = defaultLoggerName;
            }
            continue;
        }

        if (inSeparator) {
            // We're inside a separator block, collect the message
            const timestamp = parseTimestamp(trimmedLine);
            if (timestamp) {
                separatorTimestamp = timestamp;
            }
            const loggerName = extractLoggerName(trimmedLine);
            if (loggerName) {
                separatorLoggerName = loggerName;
            }
            // Remove both timestamp and logger name if present
            separatorMessage = trimmedLine
                .replace(/\[.*?\]\s*/g, '')
                .trim();
            continue;
        }

        // Regular log entry
        const timestamp = parseTimestamp(trimmedLine);
        let loggerName = defaultLoggerName;
        let message = trimmedLine;

        if (timestamp) {
            // Check if this is single-file format with logger name
            const extractedLogger = extractLoggerName(trimmedLine);
            if (extractedLogger) {
                loggerName = extractedLogger;
                // Remove both [timestamp] and [logger-name]
                message = trimmedLine.replace(/\[.*?\]\s+\[.*?\]\s*/, '').trim();
            } else {
                // Multi-file format, just remove timestamp
                message = trimmedLine.replace(/\[.*?\]\s*/, '').trim();
            }
        }

        entries.push({
            loggerName,
            message,
            timestamp,
            isSeparator: false,
            rawLine: trimmedLine,
        });
    }

    return entries;
}

/**
 * Extract and parse logs from a zip file
 */
export async function parseLogsFromZip(file: File): Promise<ParsedLogs> {
    const zip = await JSZip.loadAsync(file);
    const entries: LogEntry[] = [];
    const loggerNames = new Set<string>();

    // Process each file in the zip
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
        // Skip directories
        if (zipEntry.dir) continue;

        // Only process .log files
        if (!filename.endsWith('.log')) continue;

        // Extract logger name from filename (remove .log extension and path)
        const baseFilename = filename.split('/').pop() || filename;
        const loggerName = baseFilename.replace(/\.log$/, '');

        // Read file content
        const content = await zipEntry.async('text');
        const fileEntries = parseLogFile(content, loggerName);

        // Collect all logger names (including those extracted from single-file format)
        fileEntries.forEach(entry => {
            loggerNames.add(entry.loggerName);
        });

        entries.push(...fileEntries);
    }

    // Sort all entries by timestamp
    entries.sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Calculate time range
    const timestamps = entries
        .map(e => e.timestamp)
        .filter((t): t is Date => t !== null);

    const timeRange = {
        start: timestamps.length > 0 ? timestamps[0] : null,
        end: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
    };

    return {
        entries,
        loggerNames: Array.from(loggerNames).sort(),
        timeRange,
    };
}
