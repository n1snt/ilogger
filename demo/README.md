# Interactive Logger Demo

This is a demo project showcasing the features of **Interactive Logger** - an in-browser logger with persistent storage and downloadable logs.

## Features Demonstrated

- ✅ **Multiple Logger Instances**: Create and use different logger instances (app, api, ui, auth)
- ✅ **Persistent Storage**: Logs persist across page reloads using sessionStorage
- ✅ **Download Logs**: Download all logs as a ZIP file with the download button
- ✅ **Timestamps**: Automatic timestamping for all log entries
- ✅ **Console Logging**: Optional console logging toggle
- ✅ **Error Handling**: Log JavaScript errors with stack traces
- ✅ **Object/Array Logging**: Log complex data structures

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. First, make sure the main Interactive Logger package is built:
   ```bash
   cd ..
   npm install
   npm run build
   ```

2. Install demo dependencies:
   ```bash
   cd demo
   npm install
   ```

### Running the Demo

Start the development server:

```bash
npm run dev
```

This will:
- Start a Vite dev server on `http://localhost:3000`
- Automatically open the demo in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage Examples

The demo includes interactive buttons to test various logging scenarios:

1. **Basic Logging**: Test info, warning, error, object, and array logging
2. **Multiple Loggers**: Switch between different logger instances
3. **Configuration**: Toggle console logging, clear logs
4. **Simulations**: Simulate API calls, user actions, and complete workflows

## How It Works

1. **Initialization**: The demo initializes Interactive Logger and creates multiple logger instances
2. **Logging**: Each button triggers different logging scenarios
3. **Storage**: All logs are stored in sessionStorage (compressed with LZ-String)
4. **Download**: Click the "⬇️ Logs" button in the bottom-right to download all logs as a ZIP file

## Try These Scenarios

1. **Log some messages** → Reload the page → Logs persist!
2. **Enable console logging** → Check browser console for duplicate logs
3. **Run simulations** → Generate lots of logs quickly
4. **Download logs** → Get a ZIP file with separate log files for each logger instance
5. **Clear logs** → Start fresh (logs are cleared from sessionStorage)

## Notes

- Logs are stored in **sessionStorage**, so they persist across page reloads but are cleared when the browser tab is closed
- The download button is automatically injected by Interactive Logger
- Each logger instance creates a separate log file in the downloaded ZIP
