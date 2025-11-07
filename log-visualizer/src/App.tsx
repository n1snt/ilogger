import { useState } from 'react';
import './App.css';
import { FileUpload } from './components/FileUpload';
import { LogVisualizer } from './components/LogVisualizer';
import type { ParsedLogs } from './utils/logParser';

function App() {
    const [parsedLogs, setParsedLogs] = useState<ParsedLogs | null>(null);

    const handleLogsParsed = (logs: ParsedLogs) => {
        setParsedLogs(logs);
    };

    const handleReset = () => {
        setParsedLogs(null);
    };

    return (
        <div className="app">
            {parsedLogs ? (
                <div className="app-with-visualizer">
                    <div className="app-header">
                        <h1>iLogger Visualizer</h1>
                        <button onClick={handleReset} className="reset-button">
                            Upload New File
                        </button>
                    </div>
                    <LogVisualizer logs={parsedLogs} />
                </div>
            ) : (
                <div className="app-with-upload">
                    <div className="app-header">
                        <h1>iLogger Visualizer</h1>
                    </div>
                    <FileUpload onLogsParsed={handleLogsParsed} />
                </div>
            )}
        </div>
    );
}

export default App;
