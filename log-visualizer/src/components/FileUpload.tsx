import { useState } from 'react';
import { parseLogsFromZip, type ParsedLogs } from '../utils/logParser';
import './FileUpload.css';

interface FileUploadProps {
    onLogsParsed: (logs: ParsedLogs) => void;
}

export function FileUpload({ onLogsParsed }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.zip')) {
            setError('Please upload a .zip file');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const parsedLogs = await parseLogsFromZip(file);

            if (parsedLogs.entries.length === 0) {
                setError('No log entries found in the zip file');
                setIsProcessing(false);
                return;
            }

            onLogsParsed(parsedLogs);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse log file');
            console.error('Error parsing logs:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    return (
        <div className="file-upload-container">
            <div
                className={`file-upload-area ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isProcessing ? (
                    <div className="upload-content">
                        <div className="spinner" />
                        <p>Processing log file...</p>
                    </div>
                ) : (
                    <div className="upload-content">
                        <div className="upload-icon">📁</div>
                        <h2>Upload Log Zip File</h2>
                        <p>Drag and drop your <code>illogger-logs.zip</code> file here</p>
                        <p className="upload-or">or</p>
                        <label className="upload-button">
                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleFileInput}
                                style={{ display: 'none' }}
                            />
                            Browse Files
                        </label>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="upload-info">
                <h3>About</h3>
                <p>
                    This tool visualizes logs exported from iLogger. Upload a zip file containing
                    log files to see all logs displayed in a timeline view, with each logger shown
                    in its own column.
                </p>
                <p>
                    The visualization shows logs chronologically, allowing you to see what happened
                    across different loggers at the same time.
                </p>
            </div>
        </div>
    );
}
