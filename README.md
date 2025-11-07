# Interactive Logger

An in-browser logger with persistent storage and downloadable logs. Store logs in IndexedDB, manage multiple logger instances, and download logs as files.

## Features

- **Persistent Storage**: Logs are stored in IndexedDB and persist across page reloads
- **Multiple Logger Instances**: Create separate loggers for different parts of your application
- **Timestamps**: Optional timestamp support for all log entries
- **Download Logs**: Download logs as a single file or grouped by logger (ZIP)
- **Programmatic Download**: Trigger log downloads programmatically or from console
- **UI Button**: Floating, draggable download button for easy log access with customizable text and styling
- **Performance Optimized**: Batched writes to IndexedDB for high-frequency logging
- **Auto-trimming**: Automatically maintains maximum log limit by removing oldest entries
- **Runtime Configuration**: Enable/disable logging, timestamps, and console output at runtime
- **Console Interception**: Capture all console output (console.log, console.error, etc.) and write to log files
- **Session Separators**: Automatically add visual separators to mark new browser sessions/tabs in log files

## Installation

```bash
npm install interactive-logger
```

Or using yarn:

```bash
yarn add interactive-logger
```

Or using pnpm:

```bash
pnpm add interactive-logger
```

## Quick Start

```javascript
import { InteractiveLogger } from 'interactive-logger';

// Initialize Interactive Logger
const logger = InteractiveLogger({
  maxLogs: 5000,
  timestamps: true,
  enabled: true
});

// Create logger instances
const appLogger = logger.createInstance('app');
const apiLogger = logger.createInstance('api');

// Log messages
appLogger.writeLog('Application started');
apiLogger.writeLog('GET /api/users', { status: 200 });

// Inject download button
logger.injectButton();
```

## Documentation

For complete documentation, API reference, examples, and more, visit:

**https://n1snt.github.io/interactive-logger/docs**

## License

MIT
