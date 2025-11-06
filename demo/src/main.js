import { ILogger, getLogger } from "iLogger";

// Initialize iLogger
const logger = ILogger();
logger.injectButton();
// Don't auto-inject button - let user control it via UI

// Create multiple logger instances
const appLogger = logger.createInstance("app", { timeStamps: true });
const apiLogger = logger.createInstance("api", { timeStamps: true });
const uiLogger = logger.createInstance("ui", { timeStamps: true });
const authLogger = logger.createInstance("auth", { timeStamps: true });

// Store references for easy access
window.loggers = {
    app: appLogger,
    api: apiLogger,
    ui: uiLogger,
    auth: authLogger,
};

// Track session start time
const sessionStart = Date.now();

// Update stats periodically
async function updateStats() {
    try {
        const stats = await logger.getStats();
        document.getElementById("totalLogs").textContent = stats.totalLogs || 0;
        document.getElementById("activeLoggers").textContent = stats.activeLoggers || 0;

        const duration = Math.floor((Date.now() - sessionStart) / 1000);
        document.getElementById("sessionDuration").textContent = `${duration}s`;
    } catch (e) {
        console.error("Error updating stats:", e);
        document.getElementById("totalLogs").textContent = "?";
    }
}

setInterval(updateStats, 1000);
updateStats();

// Basic logging functions
window.logInfo = () => {
    appLogger.writeLog("ℹ️ Info: This is an informational message");
    updateStats();
};

window.logWarning = () => {
    appLogger.writeLog("⚠️ Warning: This is a warning message");
    updateStats();
};

window.logError = () => {
    appLogger.writeLog("❌ Error: This is an error message");
    updateStats();
};

window.logObject = () => {
    const obj = {
        userId: 12345,
        username: "demo_user",
        email: "demo@example.com",
        preferences: {
            theme: "dark",
            notifications: true,
        },
    };
    appLogger.writeLog("📦 Object logged:", obj);
    updateStats();
};

window.logArray = () => {
    const arr = ["apple", "banana", "cherry", "date", "elderberry"];
    appLogger.writeLog("📋 Array logged:", arr);
    updateStats();
};

// Logger selection functions
window.logWithSelected = () => {
    const selectedLogger = document.getElementById("loggerSelect").value;
    const loggerInstance =
        getLogger(selectedLogger) || window.loggers[selectedLogger];
    if (loggerInstance) {
        loggerInstance.writeLog(
            `Message from ${selectedLogger} logger at ${new Date().toLocaleTimeString()}`,
        );
        updateStats();
    }
};

window.logToAll = () => {
    const message = `Broadcast message at ${new Date().toLocaleTimeString()}`;
    Object.values(window.loggers).forEach((log) => {
        log.writeLog(message);
    });
    updateStats();
};

// Button management functions
window.injectDownloadButton = () => {
    logger.injectButton();
    appLogger.writeLog("🔘 Download button injected");
    updateStats();
    updateButtonState();
};

window.withdrawDownloadButton = () => {
    logger.withdrawButton();
    appLogger.writeLog("🔘 Download button withdrawn");
    updateStats();
    updateButtonState();
};

function updateButtonState() {
    const btn = document.getElementById("illogger-download-btn");
    const injectBtn = document.getElementById("injectBtn");
    const withdrawBtn = document.getElementById("withdrawBtn");

    if (btn) {
        injectBtn.disabled = true;
        withdrawBtn.disabled = false;
    } else {
        injectBtn.disabled = false;
        withdrawBtn.disabled = true;
    }
}

// Configuration functions
window.toggleConsoleLogging = () => {
    const enabled = document.getElementById("consoleLogging").checked;
    logger.setConsoleLogging(enabled);
    appLogger.writeLog(`Console logging ${enabled ? "enabled" : "disabled"}`);
    updateStats();
};

window.clearLogs = async () => {
    if (confirm("Are you sure you want to clear all logs?")) {
        await logger.clear();
        appLogger.writeLog("🗑️ All logs cleared");
        updateStats();
    }
};

window.simulateErrors = () => {
    const errors = [
        new Error("Network timeout"),
        new Error("Invalid API response"),
        new Error("Authentication failed"),
        new Error("Database connection lost"),
    ];

    errors.forEach((error, index) => {
        setTimeout(() => {
            appLogger.writeLog(`Error ${index + 1}:`, error);
            updateStats();
        }, index * 500);
    });
};

// Simulation functions
window.simulateAPI = () => {
    const endpoints = [
        { method: "GET", path: "/api/users", status: 200 },
        { method: "POST", path: "/api/users", status: 201 },
        { method: "GET", path: "/api/posts", status: 200 },
        { method: "PUT", path: "/api/posts/123", status: 200 },
        { method: "DELETE", path: "/api/posts/123", status: 204 },
    ];

    endpoints.forEach((endpoint, index) => {
        setTimeout(() => {
            apiLogger.writeLog(
                `${endpoint.method} ${endpoint.path} - Status: ${endpoint.status} - ${new Date().toISOString()}`,
            );
            updateStats();
        }, index * 300);
    });
};

window.simulateUserActions = () => {
    const actions = [
        "User clicked login button",
        "User entered credentials",
        "User submitted form",
        "User navigated to dashboard",
        "User clicked settings",
        "User updated profile",
    ];

    actions.forEach((action, index) => {
        setTimeout(() => {
            uiLogger.writeLog(`👤 ${action}`);
            updateStats();
        }, index * 400);
    });
};

window.simulateWorkflow = () => {
    // Simulate a complete user workflow
    setTimeout(() => authLogger.writeLog("🔐 User attempting to login"), 0);
    setTimeout(
        () => apiLogger.writeLog("POST /api/auth/login - Status: 200"),
        300,
    );
    setTimeout(() => authLogger.writeLog("✅ Login successful"), 600);
    setTimeout(() => uiLogger.writeLog("👤 User navigated to dashboard"), 900);
    setTimeout(
        () => apiLogger.writeLog("GET /api/user/profile - Status: 200"),
        1200,
    );
    setTimeout(
        () => apiLogger.writeLog("GET /api/dashboard/data - Status: 200"),
        1500,
    );
    setTimeout(() => uiLogger.writeLog("📊 Dashboard data loaded"), 1800);
    setTimeout(() => uiLogger.writeLog("👤 User clicked on item #42"), 2100);
    setTimeout(() => apiLogger.writeLog("GET /api/items/42 - Status: 200"), 2400);
    setTimeout(
        () => appLogger.writeLog("✨ Workflow simulation completed"),
        2700,
    );

    // Update stats after all logs
    setTimeout(updateStats, 3000);
};

// Initialize button state
updateButtonState();

// Log initial message
appLogger.writeLog("🚀 iLogger demo initialized");
appLogger.writeLog(`📅 Session started at ${new Date().toLocaleString()}`);

// Log some initial activity
setTimeout(() => {
    apiLogger.writeLog("🌐 API logger initialized");
    uiLogger.writeLog("🎨 UI logger initialized");
    authLogger.writeLog("🔒 Auth logger initialized");
    updateStats();
}, 100);
