---
sidebar_position: 5
---

# FAQ

Frequently asked questions about Interactive Logger.

## Why was Interactive Logger created?

Interactive Logger was created to solve the challenge of debugging and logging in browser environments, especially mobile web applications. Traditional console logging is difficult to access on mobile devices, making it hard to debug issues that only occur in production or on specific devices.

With Interactive Logger, you can:
- Capture logs directly in the browser
- Download logs as files for analysis
- Persist logs across page reloads
- Access logs without needing developer tools

This makes debugging mobile web apps and production issues much easier.

## Who is Interactive Logger for?

### QA Engineers

Interactive Logger is perfect for QA teams who need to:
- **Create better bug reports**: Download and attach log files to bug reports
- **Reproduce issues**: Share log files with developers to help reproduce bugs
- **Test mobile apps**: Access logs on mobile devices where console access is limited
- **Track user sessions**: Use session separators to track user journeys

### Developers

Developers can use Interactive Logger to:
- **Debug production issues**: Capture logs from production environments
- **Debug mobile web apps**: Access logs on mobile devices without remote debugging
- **Debug third-party code**: Use console interception to capture logs from libraries
- **Track complex flows**: Use multiple logger instances to track different parts of the application
- **Analyze user behavior**: Download and analyze logs to understand how users interact with the app

### Product Teams

Product teams can benefit from:
- **User feedback**: Users can download and share logs when reporting issues
- **Analytics**: Analyze logs to understand user behavior and identify pain points
- **Support**: Support teams can request log files from users to diagnose issues

## How does Interactive Logger compare to other logging solutions?

### vs. Console Logging

**Console Logging**:
- Only accessible via developer tools
- Lost on page reload
- Difficult to access on mobile devices
- No way to export logs

**Interactive Logger**:
- Accessible via UI button
- Persists across page reloads
- Easy to access on mobile devices
- Download logs as files

### vs. Remote Logging Services

**Remote Logging Services**:
- Require network connection
- May have privacy concerns
- Can be expensive
- Require server infrastructure

**Interactive Logger**:
- Works offline
- All data stays local
- Free and open source
- No server required

### vs. Browser DevTools

**Browser DevTools**:
- Not available on mobile devices easily
- Logs cleared on page reload
- Requires technical knowledge to use
- Can't export logs easily

**Interactive Logger**:
- Works on all devices
- Logs persist across reloads
- Easy to use for non-technical users
- Simple download mechanism

## Is Interactive Logger production-ready?

Yes! Interactive Logger is designed for production use with:
- **Performance optimizations**: Batched writes and automatic trimming
- **Error handling**: Graceful degradation if IndexedDB is unavailable
- **Browser compatibility**: Works in all modern browsers
- **No dependencies on external services**: All data stays local
- **TypeScript support**: Full type definitions included

## How much data can Interactive Logger store?

By default, Interactive Logger stores up to 5,000 log entries. You can configure this limit:

```javascript
const logger = InteractiveLogger({
  maxLogs: 10000  // Store up to 10,000 logs
});
```

When the limit is reached, the oldest entries are automatically removed to make room for new ones.

## Does Interactive Logger affect performance?

Interactive Logger is designed to minimize performance impact:
- **Batched writes**: Logs are written in batches every 100ms
- **Asynchronous operations**: All storage operations are async and non-blocking
- **Automatic trimming**: Prevents storage from growing indefinitely
- **Fire-and-forget**: Log writes don't block the main thread

For most applications, the performance impact is negligible.

## Can I use Interactive Logger with other logging libraries?

Yes! Interactive Logger can work alongside other logging libraries. You can use console interception to capture logs from other libraries:

```javascript
logger.enableConsoleInterception();
// Now all console output from other libraries is captured
```

## Is Interactive Logger secure?

Interactive Logger stores all data locally in the browser's IndexedDB. No data is sent to external servers. However, you should be careful not to log sensitive information like:
- Passwords
- API keys
- Personal information
- Authentication tokens

## Can I customize the download button?

Yes! The download button is fully customizable:

```javascript
logger.injectButton({
  text: "Download Logs",
  style: {
    background: "#007bff",
    color: "#fff",
    borderRadius: "8px"
  }
});
```

See the [API Reference](api-reference/inject-button) for more customization options.

## How do I clear logs?

You can clear all logs programmatically:

```javascript
await logger.clear();
```

Or users can clear logs by clearing their browser's IndexedDB storage.

## Can I use Interactive Logger in Node.js?

No, Interactive Logger is designed for browser environments only. It requires:
- IndexedDB (browser API)
- File API (for downloads)
- DOM APIs (for UI button)

For Node.js logging, consider other solutions like Winston, Pino, or Bunyan.

## How do I report bugs or request features?

Please report bugs and request features on the [GitHub repository](https://github.com/nishant/ilogger).
