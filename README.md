# iLogger

**iLogger (Interactive Logger)** - An in-browser logger with persistent session storage and downloadable logs. Store logs in IndexedDB, manage multiple logger instances, and download logs as files.

## Features

- **Persistent Storage**: Logs are stored in IndexedDB and persist across page reloads
- **Multiple Logger Instances**: Create separate loggers for different parts of your application
- **Timestamps**: Optional timestamp support for all log entries
- **Download Logs**: Download logs as a single file or grouped by logger (ZIP)
- **Programmatic Download**: Trigger log downloads programmatically or from console
- **UI Button**: Floating, draggable download button for easy log access
- **Performance Optimized**: Batched writes to IndexedDB for high-frequency logging
- **Auto-trimming**: Automatically maintains maximum log limit by removing oldest entries
- **Runtime Configuration**: Enable/disable logging, timestamps, and console output at runtime
- **Console Interception**: Capture all console output (console.log, console.error, etc.) and write to log files

## Installation

```bash
npm install iLogger
```

## Quick Start

```javascript
import { ILogger, getLogger } from 'iLogger';

// Initialize iLogger with options
const logger = ILogger({
  maxLogs: 5000,      // Maximum number of logs to store (default: 5000)
  singleFile: false,  // Download as single file or ZIP (default: false)
  timestamps: true,   // Include timestamps in logs (default: true)
  enabled: true       // Enable/disable logging (default: true)
});

// Create logger instances
const appLogger = logger.createInstance('app', { timeStamps: true });
const apiLogger = logger.createInstance('api', { timeStamps: true });

// Log messages
appLogger.writeLog('Application started');
apiLogger.writeLog('GET /api/users', { status: 200 });

// Inject download button
logger.injectButton();
```

## API Reference

### ILogger Constructor Options

The `ILogger()` function accepts an optional configuration object:

```typescript
ILogger(options?: {
  maxLogs?: number;      // Maximum number of logs to store (default: 5000)
  singleFile?: boolean;  // Download logs as single file vs ZIP (default: false)
  timestamps?: boolean;  // Include timestamps in logs (default: true)
  enabled?: boolean;     // Enable/disable logging globally (default: true)
})
```

#### Constructor Provisions

- **`maxLogs`** (number, default: `5000`): Maximum number of log entries to store. When exceeded, oldest entries are automatically removed.
- **`singleFile`** (boolean, default: `false`):
  - `false`: Download logs as a ZIP file with separate files for each logger instance
  - `true`: Download all logs as a single `.log` file
- **`timestamps`** (boolean, default: `true`): Whether to include ISO timestamps in log entries
- **`enabled`** (boolean, default: `true`): Global enable/disable flag for all logging operations

### Core Methods

#### `createInstance(name: string, options?: { timeStamps?: boolean }): LoggerInstance`

Creates a new logger instance with a unique name.

**Parameters:**
- `name` (string, required): Unique identifier for the logger instance
- `options` (object, optional):
  - `timeStamps` (boolean, optional): Override global timestamp setting for this instance (defaults to global setting)

**Returns:** `LoggerInstance` object

**Example:**
```javascript
const appLogger = logger.createInstance('app', { timeStamps: true });
const apiLogger = logger.createInstance('api', { timeStamps: false });
```

#### `getLogger(name: string): LoggerInstance | undefined`

Retrieves an existing logger instance by name.

**Parameters:**
- `name` (string, required): Name of the logger instance

**Returns:** `LoggerInstance` if found, `undefined` otherwise

**Example:**
```javascript
const appLogger = getLogger('app');
if (appLogger) {
  appLogger.writeLog('Found existing logger');
}
```

### Runtime Configuration Methods

#### `setConsoleLogging(enabled: boolean): void`

Enable or disable console logging for all logger instances. When enabled, logs are also output to the browser console.

**Parameters:**
- `enabled` (boolean, required): `true` to enable console logging, `false` to disable

**Example:**
```javascript
logger.setConsoleLogging(true);  // Enable console output
logger.setConsoleLogging(false); // Disable console output
```

#### `enableConsoleInterception(): void`

Enable console interception to capture all console output (console.log, console.error, console.warn, console.info, console.debug, console.trace) and automatically write them to the log file. This allows you to capture console output from your application and third-party libraries.

**Note:** When enabled, intercepted console calls are stored with the logger name `__console__` and include the log level prefix (e.g., `[LOG]`, `[ERROR]`, `[WARN]`).

**Example:**
```javascript
logger.enableConsoleInterception();

// Now all console output will be captured
console.log("This will be captured");
console.error("This error will be captured");
console.warn("This warning will be captured");

// These will appear in your downloaded logs under the "__console__" logger
```

#### `disableConsoleInterception(): void`

Disable console interception and restore the original console methods.

**Example:**
```javascript
logger.disableConsoleInterception();
// Console methods are now restored to their original behavior
```

#### `isConsoleInterceptionEnabled(): boolean`

Check if console interception is currently enabled.

**Returns:** `boolean` - `true` if console interception is enabled, `false` otherwise

**Example:**
```javascript
if (logger.isConsoleInterceptionEnabled()) {
  console.log("Console interception is active");
}
```

#### `setTimestamps(enabled: boolean): void`

Enable or disable timestamps for all existing and future logger instances.

**Parameters:**
- `enabled` (boolean, required): `true` to include timestamps, `false` to exclude

**Example:**
```javascript
logger.setTimestamps(true);  // Enable timestamps
logger.setTimestamps(false); // Disable timestamps
```

#### `getTimestamps(): boolean`

Get the current global timestamp setting.

**Returns:** `boolean` - Current timestamp setting

**Example:**
```javascript
const timestampsEnabled = logger.getTimestamps();
console.log('Timestamps enabled:', timestampsEnabled);
```

#### `setEnabled(enabled: boolean): void`

Enable or disable logging globally. When disabled, `writeLog()` calls are ignored (but console logging may still work if enabled).

**Parameters:**
- `enabled` (boolean, required): `true` to enable logging, `false` to disable

**Example:**
```javascript
logger.setEnabled(false); // Disable all logging
// ... later ...
logger.setEnabled(true);  // Re-enable logging
```

#### `getEnabled(): boolean`

Get the current global enabled state.

**Returns:** `boolean` - Current enabled state

**Example:**
```javascript
const isEnabled = logger.getEnabled();
if (!isEnabled) {
  console.warn('Logger is currently disabled');
}
```

### Download Methods

#### `downloadLogs(): Promise<void>`

Programmatically trigger a log download. This method respects the current `singleFile` and `timestamps` settings and will download logs in the same format as the UI button.

**Returns:** `Promise<void>` that resolves when the download is initiated

**Example:**
```javascript
// Trigger download programmatically
await logger.downloadLogs();

// In an event handler
button.addEventListener('click', async () => {
  await logger.downloadLogs();
});
```

**Note:** The download format depends on your `singleFile` setting:
- If `singleFile: true`, downloads a single `.log` file
- If `singleFile: false`, downloads a `.zip` file with separate files per logger

### Download Button Methods

#### `injectButton(): void`

Injects a floating, draggable download button into the page. The button position is saved in localStorage and restored on subsequent page loads.

**Features:**
- Draggable button that can be repositioned anywhere on the page
- Position persists across page reloads
- Automatically constrains to viewport bounds
- Adjusts position on window resize

**Example:**
```javascript
logger.injectButton(); // Add download button to page
```

#### `withdrawButton(): void`

Removes the download button from the page and cleans up all event listeners.

**Example:**
```javascript
logger.withdrawButton(); // Remove download button
```

### Console Interface Methods

#### `enableConsoleInterface(): void`

Exposes the `downloadLogs()` function on the `window` object, allowing you to trigger downloads directly from the browser console.

**Example:**
```javascript
logger.enableConsoleInterface();

// Then in browser console:
downloadLogs()  // Triggers the download
```

**Note:** This only works in browser environments. The function is exposed as `window.downloadLogs`.

#### `disableConsoleInterface(): void`

Removes the `downloadLogs()` function from the `window` object.

**Example:**
```javascript
logger.disableConsoleInterface();
// downloadLogs() is no longer available in console
```

### Storage Management Methods

#### `clear(): Promise<void>`

Clears all logs from storage. This operation is irreversible.

**Returns:** `Promise<void>` that resolves when all logs are cleared

**Example:**
```javascript
await logger.clear();
console.log('All logs cleared');
```

#### `getStats(): Promise<{ totalLogs: number; activeLoggers: number; maxLogs: number }>`

Get statistics about the current log storage.

**Returns:** `Promise<object>` with:
- `totalLogs` (number): Total number of log entries stored
- `activeLoggers` (number): Number of unique logger instances that have logged
- `maxLogs` (number): Maximum number of logs allowed

**Example:**
```javascript
const stats = await logger.getStats();
console.log(`Total logs: ${stats.totalLogs}`);
console.log(`Active loggers: ${stats.activeLoggers}`);
console.log(`Max logs: ${stats.maxLogs}`);
```

#### `setMaxLogs(maxLogs: number): Promise<void>`

Update the maximum number of logs to store. If the current count exceeds the new limit, oldest entries are automatically trimmed.

**Parameters:**
- `maxLogs` (number, required): New maximum number of logs (must be at least 1)

**Throws:** `Error` if `maxLogs` is less than 1

**Returns:** `Promise<void>` that resolves when the limit is updated and trimming is complete

**Example:**
```javascript
await logger.setMaxLogs(10000); // Increase limit to 10,000
await logger.setMaxLogs(1000);  // Decrease limit to 1,000 (trims if needed)
```

#### `getMaxLogs(): number`

Get the current maximum number of logs setting.

**Returns:** `number` - Current maximum log limit

**Example:**
```javascript
const maxLogs = logger.getMaxLogs();
console.log(`Max logs: ${maxLogs}`);
```

## LoggerInstance API

Each logger instance provides methods for writing logs and configuring instance-specific settings.

### Methods

#### `writeLog(...args: any[]): void`

Write a log entry. Accepts any number of arguments, which are serialized appropriately:
- Strings are kept as-is
- Errors are serialized with message and stack trace
- Objects and arrays are JSON stringified
- Multiple arguments are joined with spaces

**Parameters:**
- `...args` (any[]): Any number of arguments to log

**Example:**
```javascript
appLogger.writeLog('Simple message');
appLogger.writeLog('User ID:', 12345);
appLogger.writeLog('Error occurred:', new Error('Something went wrong'));
appLogger.writeLog('User data:', { id: 1, name: 'John' });
appLogger.writeLog('Items:', [1, 2, 3]);
```

**Behavior:**
- If logging is disabled globally, this method does nothing (unless console logging is enabled)
- Logs are written asynchronously to IndexedDB (fire-and-forget)
- Errors during storage are caught and logged to console

#### `setConsoleLogging(enabled: boolean): void`

Enable or disable console logging for this specific logger instance.

**Parameters:**
- `enabled` (boolean, required): `true` to enable, `false` to disable

**Example:**
```javascript
appLogger.setConsoleLogging(true);  // Enable for this instance only
```

#### `setTimestamps(enabled: boolean): void`

Enable or disable timestamps for this specific logger instance.

**Parameters:**
- `enabled` (boolean, required): `true` to enable, `false` to disable

**Example:**
```javascript
appLogger.setTimestamps(false); // Disable timestamps for this instance
```

#### `setEnabled(enabled: boolean): void`

Enable or disable logging for this specific logger instance.

**Parameters:**
- `enabled` (boolean, required): `true` to enable, `false` to disable

**Example:**
```javascript
appLogger.setEnabled(false); // Disable this instance only
```

## Storage Architecture

### IndexedDB Storage

iLogger uses IndexedDB for persistent storage with the following structure:

- **Database Name**: `__illogger__` (configurable via StorageAdapter)
- **Object Store**: `logs`
- **Key Path**: `id` (auto-incrementing)
- **Indexes**:
  - `timestamp`: For efficient querying by timestamp
  - `name`: For efficient querying by logger name

### Log Entry Format

Each log entry stored in IndexedDB has the following structure:

```typescript
{
  name: string;           // Logger instance name
  message: string;        // Serialized log message
  timestamp?: string;     // ISO timestamp (if timestamps enabled)
  id?: number;            // Auto-incrementing ID (internal, not in exports)
}
```

### Performance Optimizations

1. **Batched Writes**: Log entries are batched and written every 100ms to reduce IndexedDB transactions
2. **Automatic Trimming**: When the log limit is reached, oldest entries are automatically removed
3. **Proactive Trimming**: Before adding new entries, the system checks if trimming is needed
4. **Fire-and-Forget**: Log writes are asynchronous and don't block the main thread

## Download Formats

### Single File Mode (`singleFile: true`)

When `singleFile` is `true`, all logs are downloaded as a single `.log` file:

```
[2024-01-15T10:30:00.000Z] [app] Application started
[2024-01-15T10:30:01.000Z] [api] GET /api/users - Status: 200
[2024-01-15T10:30:02.000Z] [app] User logged in
```

### Multi-File Mode (`singleFile: false`, default)

When `singleFile` is `false`, logs are grouped by logger name and downloaded as a ZIP file:

```
illogger-logs.zip
├── app.log
├── api.log
├── ui.log
├── auth.log
└── __console__.log  (if console interception is enabled)
```

Each file contains logs from that specific logger instance, with timestamps if enabled. If console interception is enabled, all captured console output will be in the `__console__.log` file with log level prefixes (e.g., `[LOG]`, `[ERROR]`, `[WARN]`).

## Complete Example

```javascript
import { ILogger, getLogger } from 'iLogger';

// Initialize with custom options
const logger = ILogger({
  maxLogs: 10000,
  singleFile: false,
  timestamps: true,
  enabled: true
});

// Create multiple logger instances
const appLogger = logger.createInstance('app');
const apiLogger = logger.createInstance('api');
const errorLogger = logger.createInstance('errors', { timeStamps: true });

// Log various types of data
appLogger.writeLog('Application initialized');
apiLogger.writeLog('GET /api/users', { status: 200, duration: 45 });
errorLogger.writeLog('Failed to connect:', new Error('Connection timeout'));

// Runtime configuration
logger.setConsoleLogging(true);  // Also log to console
logger.setTimestamps(false);     // Disable timestamps globally
appLogger.setTimestamps(true);   // But keep them for app logger

// Check stats
const stats = await logger.getStats();
console.log(`Total logs: ${stats.totalLogs}`);

// Inject download button
logger.injectButton();

// Enable console interface for easy access
logger.enableConsoleInterface();
// Now you can type 'downloadLogs()' in the browser console

// Enable console interception to capture all console output
logger.enableConsoleInterception();
// Now all console.log, console.error, etc. will be captured to logs

// Or trigger download programmatically
await logger.downloadLogs();

// Later: disable logging temporarily
logger.setEnabled(false);
// ... logs are ignored ...
logger.setEnabled(true);

// Update max logs
await logger.setMaxLogs(5000);

// Clear all logs
await logger.clear();

// Remove download button
logger.withdrawButton();
```

## Browser Compatibility

iLogger requires:
- **IndexedDB support** (all modern browsers)
- **ES2019+ JavaScript features**
- **File API** (for downloads)

Compatible with:
- Chrome/Edge 79+
- Firefox 78+
- Safari 14+
- Opera 66+

## Error Handling

- Storage errors are caught and logged to the console
- Failed writes are re-queued for retry
- Invalid operations (e.g., `maxLogs < 1`) throw descriptive errors
- Graceful degradation if IndexedDB is unavailable (errors are logged but don't crash)

## License

Attribution-NonCommercial 4.0 International

## Author

Nishant
