import { useEffect, useRef, useState } from 'react';
import { type LogEntry, type ParsedLogs } from '../utils/logParser';
import './LogVisualizer.css';

interface LogVisualizerProps {
    logs: ParsedLogs;
}

export function LogVisualizer({ logs }: LogVisualizerProps) {
    const [selectedLoggers, setSelectedLoggers] = useState<Set<string>>(
        new Set(logs.loggerNames)
    );
    const [timeScale, setTimeScale] = useState(1000); // pixels per second
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const { entries, loggerNames, timeRange } = logs;

    // Calculate total duration in milliseconds
    const duration = timeRange.start && timeRange.end
        ? timeRange.end.getTime() - timeRange.start.getTime()
        : 0;

    // Calculate total height needed
    const totalHeight = duration / 1000 * timeScale;

    // Filter entries by selected loggers
    const filteredEntries = entries.filter(e => selectedLoggers.has(e.loggerName));

    // Group entries by logger
    const entriesByLogger = new Map<string, LogEntry[]>();
    filteredEntries.forEach(entry => {
        if (!entriesByLogger.has(entry.loggerName)) {
            entriesByLogger.set(entry.loggerName, []);
        }
        entriesByLogger.get(entry.loggerName)!.push(entry);
    });

    // Calculate position for a log entry
    const getEntryPosition = (entry: LogEntry): { top: number; height: number } => {
        if (!timeRange.start || !entry.timestamp) {
            return { top: 0, height: 20 };
        }

        const offset = entry.timestamp.getTime() - timeRange.start.getTime();
        const top = (offset / 1000) * timeScale;
        return { top, height: 20 };
    };

    // Format timestamp for display
    const formatTime = (date: Date | null): string => {
        if (!date) return 'No timestamp';
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    };

    // Handle scroll synchronization
    useEffect(() => {
        const container = containerRef.current;
        const timeline = timelineRef.current;
        if (!container || !timeline) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            setScrollPosition(scrollTop);
            timeline.scrollTop = scrollTop;
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Generate timeline markers
    const generateTimelineMarkers = () => {
        if (!timeRange.start || !timeRange.end) return [];

        const markers: Array<{ time: Date; position: number }> = [];
        const interval = Math.max(1000, duration / 20); // At least 1 second, or divide by 20
        const startTime = timeRange.start.getTime();

        for (let t = startTime; t <= timeRange.end.getTime(); t += interval) {
            const position = ((t - startTime) / 1000) * timeScale;
            markers.push({ time: new Date(t), position });
        }

        return markers;
    };

    const timelineMarkers = generateTimelineMarkers();

    return (
        <div className="log-visualizer">
            <div className="visualizer-controls">
                <div className="logger-selector">
                    <h3>Loggers</h3>
                    {loggerNames.map(name => (
                        <label key={name} className="logger-checkbox">
                            <input
                                type="checkbox"
                                checked={selectedLoggers.has(name)}
                                onChange={(e) => {
                                    const newSelected = new Set(selectedLoggers);
                                    if (e.target.checked) {
                                        newSelected.add(name);
                                    } else {
                                        newSelected.delete(name);
                                    }
                                    setSelectedLoggers(newSelected);
                                }}
                            />
                            <span>{name}</span>
                        </label>
                    ))}
                </div>

                <div className="time-controls">
                    <label>
                        Time Scale (px/sec):
                        <input
                            type="range"
                            min="100"
                            max="10000"
                            step="100"
                            value={timeScale}
                            onChange={(e) => setTimeScale(Number(e.target.value))}
                        />
                        <span>{timeScale}</span>
                    </label>
                </div>

                <div className="time-range">
                    <div>Start: {timeRange.start ? formatTime(timeRange.start) : 'N/A'}</div>
                    <div>End: {timeRange.end ? formatTime(timeRange.end) : 'N/A'}</div>
                    <div>Duration: {duration > 0 ? (duration / 1000).toFixed(2) + 's' : 'N/A'}</div>
                    <div>Total Entries: {entries.length}</div>
                </div>
            </div>

            <div className="visualizer-main">
                <div className="timeline-header" ref={timelineRef}>
                    <div className="timeline-marker-container" style={{ height: totalHeight }}>
                        {timelineMarkers.map((marker, i) => (
                            <div
                                key={i}
                                className="timeline-marker"
                                style={{ top: marker.position }}
                            >
                                <div className="timeline-marker-line" />
                                <div className="timeline-marker-label">
                                    {formatTime(marker.time)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="columns-container" ref={containerRef}>
                    <div className="columns-wrapper" style={{ height: totalHeight }}>
                        {Array.from(entriesByLogger.entries()).map(([loggerName, loggerEntries]) => (
                            <div key={loggerName} className="log-column">
                                <div className="log-column-header">{loggerName}</div>
                                <div className="log-column-content">
                                    {loggerEntries.map((entry, index) => {
                                        const { top, height } = getEntryPosition(entry);
                                        return (
                                            <div
                                                key={index}
                                                className={`log-entry ${entry.isSeparator ? 'separator' : ''}`}
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                }}
                                                title={`${formatTime(entry.timestamp)} - ${entry.message}`}
                                            >
                                                <div className="log-entry-time">
                                                    {entry.timestamp ? formatTime(entry.timestamp) : ''}
                                                </div>
                                                <div className="log-entry-message">{entry.message}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
