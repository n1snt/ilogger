import { useMemo, useState } from 'react';
import type { LogEntry } from '../utils/logParser';
import './SessionTimelineView.css';

interface SessionTimelineViewProps {
    entries: LogEntry[];
    loggerNames: string[];
    sessionStartTime: Date | null;
}

export function SessionTimelineView({ entries, loggerNames, sessionStartTime }: SessionTimelineViewProps) {
    const [selectedLoggers, setSelectedLoggers] = useState<Set<string>>(
        new Set(loggerNames)
    );

    // Filter entries by selected loggers
    const filteredEntries = entries.filter(e => {
        if (e.isSeparator) return true;
        return Array.from(selectedLoggers).some(
            selected => selected.toLowerCase() === e.loggerName.toLowerCase()
        );
    });

    // Group entries by logger and sort by timestamp
    const entriesByLogger = useMemo(() => {
        const grouped = new Map<string, LogEntry[]>();
        filteredEntries.forEach(entry => {
            if (!entry.isSeparator) {
                // Normalize logger name
                const normalized = entry.loggerName.toLowerCase();
                const matchingLogger = Array.from(selectedLoggers).find(
                    name => name.toLowerCase() === normalized
                ) || entry.loggerName;

                if (!grouped.has(matchingLogger)) {
                    grouped.set(matchingLogger, []);
                }
                grouped.get(matchingLogger)!.push(entry);
            }
        });

        // Sort entries within each logger by timestamp
        grouped.forEach((entries, loggerName) => {
            entries.sort((a, b) => {
                if (!a.timestamp && !b.timestamp) return 0;
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return a.timestamp.getTime() - b.timestamp.getTime();
            });
        });

        // Create a sorted array of logger names based on loggerNames order
        const sortedLoggerNames = Array.from(grouped.keys()).sort((a, b) => {
            const indexA = loggerNames.findIndex(name => name.toLowerCase() === a.toLowerCase());
            const indexB = loggerNames.findIndex(name => name.toLowerCase() === b.toLowerCase());
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Create a new Map with sorted order
        const sortedGrouped = new Map<string, LogEntry[]>();
        sortedLoggerNames.forEach(name => {
            sortedGrouped.set(name, grouped.get(name)!);
        });

        return sortedGrouped;
    }, [filteredEntries, selectedLoggers, loggerNames]);

    // Build global timestamp position map for alignment across all loggers
    // Also track max stack height per timestamp
    const { globalTimestampPositions, maxStackHeights, totalHeight } = useMemo(() => {
        const positions = new Map<number, number>();
        const stackHeights = new Map<number, number>();
        const allTimestamps = new Set<number>();

        // Collect all unique timestamps and count entries per timestamp per logger
        entriesByLogger.forEach((loggerEntries) => {
            const loggerTimestampCounts = new Map<number, number>();
            loggerEntries.forEach(entry => {
                if (entry.timestamp) {
                    const key = entry.timestamp.getTime();
                    allTimestamps.add(key);
                    loggerTimestampCounts.set(key, (loggerTimestampCounts.get(key) || 0) + 1);
                }
            });

            // Track max stack height for each timestamp across all loggers
            loggerTimestampCounts.forEach((count, timestamp) => {
                const currentMax = stackHeights.get(timestamp) || 0;
                stackHeights.set(timestamp, Math.max(currentMax, count));
            });
        });

        // Sort timestamps and assign base positions
        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
        let currentPosition = 0;
        const entrySpacing = 5;
        const baseEntryHeight = 40;

        sortedTimestamps.forEach(timestamp => {
            positions.set(timestamp, currentPosition);
            // Move to next position based on max stack height for this timestamp
            const maxStack = stackHeights.get(timestamp) || 1;
            currentPosition += (baseEntryHeight + entrySpacing) * maxStack;
        });

        // Calculate total height (currentPosition is already the total)
        let height = currentPosition;

        // Add entries without timestamps
        entriesByLogger.forEach((loggerEntries) => {
            loggerEntries.forEach(entry => {
                if (!entry.timestamp) {
                    const messageLines = entry.message.split('\n').length;
                    height += Math.max(40, messageLines * 20 + 10) + entrySpacing;
                }
            });
        });

        // Add extra padding at the bottom to ensure last entry is fully visible
        // Need to account for the tallest entry that might be at the last position
        let maxEntryHeight = 0;
        entriesByLogger.forEach((loggerEntries) => {
            loggerEntries.forEach(entry => {
                const messageLines = entry.message.split('\n').length;
                const entryHeight = Math.max(40, messageLines * 20 + 10);
                maxEntryHeight = Math.max(maxEntryHeight, entryHeight);
            });
        });

        const bottomPadding = Math.max(50, maxEntryHeight + 20);

        return {
            globalTimestampPositions: positions,
            maxStackHeights: stackHeights,
            totalHeight: Math.max(height + bottomPadding, 100)
        };
    }, [entriesByLogger]);

    // Calculate positions for entries - sequential positioning (no gaps)
    // All loggers align entries that happen at the same time
    const calculatePositions = (loggerEntries: LogEntry[], globalPositions: Map<number, number>): Map<LogEntry, { top: number; height: number }> => {
        const positions = new Map<LogEntry, { top: number; height: number }>();
        // Track how many entries at each timestamp position for stacking
        const timestampStackCount = new Map<number, number>();

        loggerEntries.forEach(entry => {
            const messageLines = entry.message.split('\n').length;
            const height = Math.max(40, messageLines * 20 + 10);

            let top: number;
            if (entry.timestamp) {
                // Use global position for this timestamp (aligns across loggers)
                const timestampKey = entry.timestamp.getTime();
                const baseTop = globalPositions.get(timestampKey) ?? 0;

                // Stack multiple entries at the same timestamp
                const stackIndex = timestampStackCount.get(timestampKey) || 0;
                timestampStackCount.set(timestampKey, stackIndex + 1);

                // Offset by stack index (each entry is ~45px tall with spacing)
                top = baseTop + (stackIndex * 45);
            } else {
                // No timestamp - place at the end
                const maxPosition = globalPositions.size > 0
                    ? Math.max(...Array.from(globalPositions.values()), 0) + 50
                    : 0;
                top = maxPosition;
            }

            positions.set(entry, { top, height });
        });

        return positions;
    };

    const formatTime = (date: Date | null): string => {
        if (!date) return 'No timestamp';
        const timeStr = date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        return `${timeStr}.${ms}`;
    };

    // Calculate time range for display info only
    const timeRange = useMemo(() => {
        const timestamps = filteredEntries
            .map(e => e.timestamp)
            .filter((t): t is Date => t !== null);

        if (timestamps.length === 0) {
            return { start: sessionStartTime, end: sessionStartTime };
        }

        return {
            start: timestamps[0],
            end: timestamps[timestamps.length - 1],
        };
    }, [filteredEntries, sessionStartTime]);

    const duration = timeRange.start && timeRange.end
        ? timeRange.end.getTime() - timeRange.start.getTime()
        : 0;

    return (
        <div className="session-timeline-view">
            <div className="timeline-controls">
                <div className="logger-selector">
                    <h3>Loggers</h3>
                    <div className="logger-checkboxes">
                        {loggerNames.map(name => (
                            <label key={name} className="logger-checkbox">
                                <input
                                    type="checkbox"
                                    checked={Array.from(selectedLoggers).some(
                                        selected => selected.toLowerCase() === name.toLowerCase()
                                    )}
                                    onChange={(e) => {
                                        const newSelected = new Set(selectedLoggers);
                                        if (e.target.checked) {
                                            newSelected.add(name);
                                        } else {
                                            const toRemove = Array.from(newSelected).find(
                                                n => n.toLowerCase() === name.toLowerCase()
                                            );
                                            if (toRemove) {
                                                newSelected.delete(toRemove);
                                            }
                                        }
                                        setSelectedLoggers(newSelected);
                                    }}
                                />
                                <span>{name}</span>
                            </label>
                        ))}
                    </div>
                </div>


                <div className="time-range-info">
                    <div>Start: {timeRange.start ? formatTime(timeRange.start) : 'N/A'}</div>
                    <div>End: {timeRange.end ? formatTime(timeRange.end) : 'N/A'}</div>
                    <div>Duration: {duration > 0 ? (duration / 1000).toFixed(2) + 's' : 'N/A'}</div>
                </div>
            </div>

            <div className="timeline-main">
                <div className="timeline-columns-container">
                    <div className="timeline-columns-wrapper" style={{ minHeight: totalHeight }}>
                        {Array.from(entriesByLogger.entries()).map(([loggerName, loggerEntries], index) => {
                            const positions = calculatePositions(loggerEntries, globalTimestampPositions);

                            // Calculate the actual height needed for this column
                            let columnMaxBottom = 0;
                            positions.forEach(({ top, height }) => {
                                columnMaxBottom = Math.max(columnMaxBottom, top + height);
                            });

                            return (
                                <div key={loggerName} className="timeline-column" data-column-index={index}>
                                    <div className="timeline-column-header">
                                        <span className="logger-name">{loggerName}</span>
                                        <span className="entry-count-badge">{loggerEntries.length}</span>
                                    </div>
                                    <div className="timeline-column-content" style={{ minHeight: columnMaxBottom + 50 }}>
                                        {loggerEntries.map((entry, index) => {
                                            const position = positions.get(entry);
                                            if (!position) return null;

                                            const hasTimestamp = entry.timestamp !== null;
                                            return (
                                                <div
                                                    key={`${loggerName}-${index}-${entry.timestamp?.getTime() || index}`}
                                                    className={`timeline-entry ${entry.isSeparator ? 'separator' : ''} ${!hasTimestamp ? 'no-timestamp' : ''}`}
                                                    style={{
                                                        top: `${position.top}px`,
                                                        minHeight: `${position.height}px`,
                                                        position: 'absolute',
                                                        left: '5px',
                                                        right: '5px',
                                                    }}
                                                    title={`${formatTime(entry.timestamp)} - ${entry.message}`}
                                                >
                                                    {hasTimestamp && (
                                                        <div className="timeline-entry-time">
                                                            {formatTime(entry.timestamp)}
                                                        </div>
                                                    )}
                                                    <div className="timeline-entry-message">{entry.message}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
