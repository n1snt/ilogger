---
sidebar_position: 3
---

# Examples

This section provides comprehensive examples of using Interactive Logger in various scenarios.

## Basic Usage

### Simple Logging

```javascript
import { InteractiveLogger } from 'interactive-logger';

const logger = InteractiveLogger();
const appLogger = logger.createInstance('app');

// Log simple messages
appLogger.writeLog('User logged in');
appLogger.writeLog('Processing payment');
appLogger.writeLog('Order completed');
```

### Multiple Logger Instances

```javascript
const logger = InteractiveLogger();

// Create loggers for different modules
const authLogger = logger.createInstance('auth');
const apiLogger = logger.createInstance('api');
const uiLogger = logger.createInstance('ui');
const errorLogger = logger.createInstance('errors');

// Use them throughout your application
authLogger.writeLog('User authenticated', { userId: 123 });
apiLogger.writeLog('GET /api/users', { status: 200, duration: 45 });
uiLogger.writeLog('Button clicked', { buttonId: 'submit' });
errorLogger.writeLog('API error:', new Error('Network timeout'));
```

## Advanced Configuration

### Custom Configuration

```javascript
const logger = InteractiveLogger({
  maxLogs: 10000,           // Store up to 10,000 logs
  singleFile: false,        // Download as ZIP
  timestamps: true,         // Include timestamps
  enabled: true,            // Enable logging
  sessionSeparator: true,   // Add session separators
  sessionSeparatorMessage: "🔄 New Session Started",
  buttonOptions: {
    text: "Download Logs",
    style: {
      background: "#007bff",
      color: "#fff",
      borderRadius: "8px"
    }
  }
});
```

### Runtime Configuration

```javascript
const logger = InteractiveLogger();

// Initially disable logging
logger.setEnabled(false);

// Later, enable it
logger.setEnabled(true);

// Toggle timestamps
logger.setTimestamps(false);
logger.setTimestamps(true);

// Enable console output
logger.setConsoleLogging(true);

// Update max logs
await logger.setMaxLogs(20000);
```

## Visualizing Logs

After downloading logs from Interactive Logger, you can visualize them using the **iLogger Visualizer**:

**[🌐 Log Visualizer](https://interactive-logger-visualizer.vercel.app/)**

### Using the Visualizer

1. **Download logs** from your application using Interactive Logger's download functionality
2. **Upload the ZIP file** to the visualizer (drag and drop or browse)
3. **View logs** in a timeline view with:
   - Each logger in its own column
   - Logs positioned by timestamp
   - Session-based navigation
   - Logger filtering
   - Collapsible logger sections
   - Pinned column headers

The visualizer supports both single-file and multi-file log formats exported from Interactive Logger.

## Console Interception

### Capture All Console Output

```javascript
const logger = InteractiveLogger();
logger.enableConsoleInterception();

// Now all console output is captured
console.log("This will be in logs");
console.error("This error will be in logs");
console.warn("This warning will be in logs");
console.info("This info will be in logs");

// Check if interception is enabled
if (logger.isConsoleInterceptionEnabled()) {
  console.log("Console interception is active");
}

// Disable when done
logger.disableConsoleInterception();
```

## Error Logging

### Logging Errors

```javascript
const errorLogger = logger.createInstance('errors');

try {
  // Some code that might throw
  riskyOperation();
} catch (error) {
  errorLogger.writeLog('Operation failed:', error);
  // Error message and stack trace are automatically captured
}

// Log errors with context
errorLogger.writeLog('API request failed:', {
  error: new Error('Network timeout'),
  endpoint: '/api/users',
  method: 'GET',
  timestamp: Date.now()
});
```

## Object and Array Logging

### Logging Complex Data

```javascript
const apiLogger = logger.createInstance('api');

// Log objects
apiLogger.writeLog('User data:', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com'
});

// Log arrays
apiLogger.writeLog('Items:', [1, 2, 3, 4, 5]);

// Log multiple arguments
apiLogger.writeLog('Request:', 'GET', '/api/users', { status: 200 });
```

## Download Button

### Basic Button

```javascript
const logger = InteractiveLogger();
logger.injectButton();
```

### Customized Button

```javascript
const logger = InteractiveLogger({
  buttonOptions: {
    text: "📥 Export Logs",
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      borderRadius: "20px",
      padding: "10px 20px",
      fontSize: "16px",
      fontWeight: "bold"
    }
  }
});
logger.injectButton();
```

### Programmatic Download

```javascript
const logger = InteractiveLogger();

// Download logs programmatically
await logger.downloadLogs();

// In an event handler
document.getElementById('downloadBtn').addEventListener('click', async () => {
  await logger.downloadLogs();
});

// Enable console interface for easy access
logger.enableConsoleInterface();
// Now you can type 'downloadLogs()' in the browser console
```

## Real-World Scenarios

### E-commerce Application

```javascript
const logger = InteractiveLogger({
  maxLogs: 5000,
  timestamps: true
});

const cartLogger = logger.createInstance('cart');
const checkoutLogger = logger.createInstance('checkout');
const paymentLogger = logger.createInstance('payment');

// Cart operations
cartLogger.writeLog('Item added to cart', { productId: 123, quantity: 2 });
cartLogger.writeLog('Item removed from cart', { productId: 123 });

// Checkout flow
checkoutLogger.writeLog('Checkout started', { userId: 456 });
checkoutLogger.writeLog('Shipping address updated', { address: '...' });

// Payment processing
paymentLogger.writeLog('Payment initiated', { amount: 99.99, currency: 'USD' });
paymentLogger.writeLog('Payment completed', { transactionId: 'txn_123' });
```

### API Monitoring

```javascript
const logger = InteractiveLogger();
const apiLogger = logger.createInstance('api');

// Intercept all console output for comprehensive logging
logger.enableConsoleInterception();

// Wrap API calls
async function apiCall(endpoint, options) {
  const startTime = Date.now();
  apiLogger.writeLog('API Request:', { endpoint, method: options.method });

  try {
    const response = await fetch(endpoint, options);
    const duration = Date.now() - startTime;

    apiLogger.writeLog('API Response:', {
      endpoint,
      status: response.status,
      duration,
      success: response.ok
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.writeLog('API Error:', {
      endpoint,
      error: error.message,
      duration
    });
    throw error;
  }
}
```

### Mobile Web App Debugging

```javascript
const logger = InteractiveLogger({
  maxLogs: 10000,
  sessionSeparator: true,
  sessionSeparatorMessage: "📱 New Session"
});

// Enable console interception to capture all logs
logger.enableConsoleInterception();

// Inject button for easy access
logger.injectButton({
  text: "📥 Get Logs",
  style: {
    background: "#28a745",
    color: "#fff",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    fontSize: "24px"
  }
});

// Log user interactions
const uiLogger = logger.createInstance('ui');
document.addEventListener('click', (e) => {
  uiLogger.writeLog('Click:', {
    target: e.target.tagName,
    id: e.target.id,
    class: e.target.className
  });
});

// Log touch events
document.addEventListener('touchstart', (e) => {
  uiLogger.writeLog('Touch:', {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  });
});
```

## Storage Management

### Check Statistics

```javascript
const logger = InteractiveLogger();

// Get storage statistics
const stats = await logger.getStats();
console.log(`Total logs: ${stats.totalLogs}`);
console.log(`Active loggers: ${stats.activeLoggers}`);
console.log(`Max logs: ${stats.maxLogs}`);
```

### Clear Logs

```javascript
const logger = InteractiveLogger();

// Clear all logs
await logger.clear();
console.log('All logs cleared');
```

### Update Max Logs

```javascript
const logger = InteractiveLogger();

// Increase limit
await logger.setMaxLogs(20000);

// Decrease limit (trims if needed)
await logger.setMaxLogs(1000);
```

## Instance-Specific Configuration

```javascript
const logger = InteractiveLogger({
  timestamps: true  // Global default
});

// Override timestamps for specific instance
const debugLogger = logger.createInstance('debug', { timeStamps: false });

// Configure per instance
const appLogger = logger.createInstance('app');
appLogger.setTimestamps(true);
appLogger.setConsoleLogging(true);
appLogger.setEnabled(true);

const silentLogger = logger.createInstance('silent');
silentLogger.setConsoleLogging(false);
silentLogger.setEnabled(true);
```
