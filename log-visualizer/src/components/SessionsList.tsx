import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ParsedLogs } from '../utils/logParser';
import { SessionTimelineView } from './SessionTimelineView';
import './SessionsList.css';

interface SessionsListProps {
    logs: ParsedLogs;
}

interface Session {
    id: number;
    startTime: Date | null;
    endTime: Date | null;
    entryCount: number;
    loggerNames: string[];
}

export function SessionsList({ logs }: SessionsListProps) {
    const [activeView, setActiveView] = useState<'list' | 'timeline'>('list');

    const sessions = useMemo(() => {
        const sessionList: Session[] = [];
        let currentSession: Session | null = null;
        let sessionId = 0;

        logs.entries.forEach(entry => {
            if (entry.isSeparator) {
                // Save previous session if it exists
                if (currentSession) {
                    sessionList.push(currentSession);
                }
                // Start new session
                sessionId++;
                currentSession = {
                    id: sessionId,
                    startTime: entry.timestamp,
                    endTime: entry.timestamp,
                    entryCount: 0,
                    loggerNames: new Set<string>(),
                };
            } else {
                // First entry - create session if needed
                if (!currentSession) {
                    sessionId++;
                    currentSession = {
                        id: sessionId,
                        startTime: entry.timestamp,
                        endTime: entry.timestamp,
                        entryCount: 0,
                        loggerNames: new Set<string>(),
                    };
                }

                // Update session info
                currentSession.entryCount++;
                if (entry.loggerName) {
                    (currentSession.loggerNames as any).add(entry.loggerName);
                }
                if (entry.timestamp) {
                    if (!currentSession.startTime || entry.timestamp < currentSession.startTime) {
                        currentSession.startTime = entry.timestamp;
                    }
                    if (!currentSession.endTime || entry.timestamp > currentSession.endTime) {
                        currentSession.endTime = entry.timestamp;
                    }
                }
            }
        });

        // Add last session
        if (currentSession) {
            sessionList.push(currentSession);
        }

        // Convert Sets to Arrays
        return sessionList.map(session => ({
            ...session,
            loggerNames: Array.from(session.loggerNames as any),
        }));
    }, [logs.entries]);

    const formatTime = (date: Date | null): string => {
        if (!date) return 'Unknown';
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatDuration = (start: Date | null, end: Date | null): string => {
        if (!start || !end) return 'N/A';
        const duration = end.getTime() - start.getTime();
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Get the first session's start time for timeline view
    const firstSessionStartTime = sessions.length > 0 ? sessions[0].startTime : null;

    return (
        <div className="sessions-list">
            <div className="sessions-header">
                <h2>Sessions</h2>
                <div className="sessions-summary">
                    <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{logs.entries.length} total log entries</span>
                </div>
            </div>

            <div className="view-tabs">
                <button
                    className={`tab-button ${activeView === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveView('list')}
                >
                    List View
                </button>
                <button
                    className={`tab-button ${activeView === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveView('timeline')}
                >
                    Timeline View
                </button>
            </div>

            {activeView === 'list' ? (
                <div className="sessions-grid">
                    {sessions.map((session) => (
                        <Link
                            key={session.id}
                            to={`/sessions/${session.id}`}
                            className="session-card"
                        >
                            <div className="session-card-header">
                                <h3>Session {session.id}</h3>
                                <span className="session-entry-count">{session.entryCount} entries</span>
                            </div>
                            <div className="session-card-body">
                                <div className="session-info-row">
                                    <span className="session-label">Start:</span>
                                    <span className="session-value">{formatTime(session.startTime)}</span>
                                </div>
                                <div className="session-info-row">
                                    <span className="session-label">End:</span>
                                    <span className="session-value">{formatTime(session.endTime)}</span>
                                </div>
                                <div className="session-info-row">
                                    <span className="session-label">Duration:</span>
                                    <span className="session-value">
                                        {formatDuration(session.startTime, session.endTime)}
                                    </span>
                                </div>
                                <div className="session-info-row">
                                    <span className="session-label">Loggers:</span>
                                    <span className="session-value">
                                        {session.loggerNames.length > 0
                                            ? session.loggerNames.join(', ')
                                            : 'None'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <SessionTimelineView
                    entries={logs.entries}
                    loggerNames={logs.loggerNames}
                    sessionStartTime={firstSessionStartTime}
                />
            )}
        </div>
    );
}
