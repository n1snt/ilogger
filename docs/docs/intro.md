---
sidebar_position: 1
---

# Getting Started

**Interactive Logger** is an in-browser logger with persistent storage and downloadable logs. Store logs in IndexedDB, manage multiple logger instances, and download logs as files.

## What is Interactive Logger?

Interactive Logger solves the challenge of debugging and logging in browser environments, especially mobile web apps where traditional console logging is difficult to access. It provides:

- **Persistent Storage**: Logs are stored in IndexedDB and persist across page reloads
- **Multiple Logger Instances**: Create separate loggers for different parts of your application
- **Downloadable Logs**: Download logs as a single file or grouped by logger (ZIP)
- **UI Button**: Floating, draggable download button for easy log access
- **Console Interception**: Capture all console output automatically
- **Performance Optimized**: Batched writes to IndexedDB for high-frequency logging

## Installation

Install Interactive Logger using npm:

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

Here's a simple example to get you started:

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

That's it! You now have a logger that:
- Stores logs persistently in IndexedDB
- Allows you to download logs via a floating button
- Supports multiple logger instances for organized logging

## Next Steps

- Learn about [Core Concepts](./core-concepts) to understand how Interactive Logger works
- Check out [Examples](./examples) for more detailed usage scenarios
- Explore the [Architecture](./architecture) to understand the internals
- Browse the [API Reference](api-reference/interactive-logger) for detailed API documentation
