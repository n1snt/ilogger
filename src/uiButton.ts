import { saveAs } from "file-saver";
import JSZip from "jszip";
import type { StorageAdapter } from "./storageAdapter";

/**
 * Download logs from storage
 * Can be called programmatically or from the UI button
 */
export async function downloadLogs(
  storage: StorageAdapter,
  singleFile: boolean,
  showTimestamps: boolean | (() => boolean)
) {
  const logs = await storage.getAll();
  const shouldShowTimestamps = typeof showTimestamps === "function" ? showTimestamps() : showTimestamps;

  if (singleFile) {
    // Create a single log file with all logs
    const content = logs
      .map((log: any) => {
        // Handle session separator entries
        if (log.isSeparator || log.name === "__session_separator__") {
          const timestamp = shouldShowTimestamps && log.timestamp ? `[${log.timestamp}] ` : '';
          const separatorLine = "=".repeat(60);
          return `\n${separatorLine}\n${timestamp}${log.message}\n${separatorLine}\n`;
        }

        const loggerPrefix = log.name ? `[${log.name}] ` : '';
        const timestamp = shouldShowTimestamps && log.timestamp ? `[${log.timestamp}] ` : '';
        return `${timestamp}${loggerPrefix}${log.message}`;
      })
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    saveAs(blob, "illogger-logs.log");
  } else {
    // Create multiple files grouped by logger name (original behavior)
    // Maintain chronological order: separators appear in all files at their chronological position
    const grouped: Record<string, any[]> = {};

    logs.forEach((log: any) => {
      if (log.isSeparator || log.name === "__session_separator__") {
        // Add separator to all existing groups to maintain chronological order
        Object.keys(grouped).forEach((key) => {
          grouped[key].push(log);
        });
      } else {
        // Add regular log to its group
        (grouped[log.name] ||= []).push(log);
      }
    });

    const zip = new JSZip();
    Object.entries(grouped).forEach(([name, entries]: any) => {
      const content = entries
        .map((e: any) => {
          // Handle session separator entries
          if (e.isSeparator || e.name === "__session_separator__") {
            const timestamp = shouldShowTimestamps && e.timestamp ? `[${e.timestamp}] ` : '';
            const separatorLine = "=".repeat(60);
            return `\n${separatorLine}\n${timestamp}${e.message}\n${separatorLine}\n`;
          }

          const timestamp = shouldShowTimestamps && e.timestamp ? `[${e.timestamp}] ` : '';
          return `${timestamp}${e.message}`;
        })
        .join("\n");
      zip.file(`${name}.log`, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "illogger-logs.zip");
  }
}

const POSITION_STORAGE_KEY = "illogger-button-position";

function getSavedPosition(): { top: number; left: number } | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      const { top, left } = JSON.parse(saved);
      return { top, left };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

function savePosition(top: number, left: number) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ top, left }));
  } catch (e) {
    // Ignore storage errors
  }
}

export function injectDownloadButton(
  storage: StorageAdapter,
  singleFile = false,
  showTimestamps: boolean | (() => boolean) = true
) {
  if (typeof document === "undefined") return; // skip for Node
  if (document.getElementById("illogger-download-btn")) return;

  // Helper to get current timestamp setting
  const getShowTimestamps = () =>
    typeof showTimestamps === "function" ? showTimestamps() : showTimestamps;

  const btn = document.createElement("button");
  btn.id = "illogger-download-btn";
  btn.textContent = "iLogger";
  btn.draggable = false; // Prevent native HTML5 drag

  // Get saved position or use default
  const savedPosition = getSavedPosition();
  const defaultTop = window.innerHeight - 60; // 20px from bottom + button height
  const defaultLeft = window.innerWidth - 100; // 20px from right + button width

  Object.assign(btn.style, {
    position: "fixed",
    top: savedPosition ? `${savedPosition.top}px` : `${defaultTop}px`,
    left: savedPosition ? `${savedPosition.left}px` : `${defaultLeft}px`,
    background: "#111",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    border: "none",
    cursor: "grab",
    zIndex: "99999",
    opacity: "0.8",
    width: "80px",
    height: "40px",
    userSelect: "none",
    touchAction: "none", // Prevent touch scrolling on mobile
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
  });

  btn.onmouseenter = () => {
    if (!btn.dataset.dragging) {
      btn.style.opacity = "1";
    }
  };
  btn.onmouseleave = () => {
    if (!btn.dataset.dragging) {
      btn.style.opacity = "0.8";
    }
  };

  // Drag functionality
  let isDragging = false;
  let hasDragged = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let isUsingTouch = false; // Track if we're using touch vs mouse

  const startDrag = (clientX: number, clientY: number) => {
    isDragging = true;
    hasDragged = false;
    btn.dataset.dragging = "true";
    btn.style.cursor = "grabbing";
    btn.style.opacity = "1";

    startX = clientX;
    startY = clientY;
    const rect = btn.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
  };

  const updateDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    // Mark that we've dragged if moved significantly
    if (!hasDragged) {
      const deltaX = Math.abs(clientX - startX);
      const deltaY = Math.abs(clientY - startY);
      if (deltaX > 5 || deltaY > 5) {
        hasDragged = true;
      }
    }

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;

    // Constrain to viewport bounds
    const btnRect = btn.getBoundingClientRect();
    const maxLeft = window.innerWidth - btnRect.width;
    const maxTop = window.innerHeight - btnRect.height;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    btn.style.left = `${newLeft}px`;
    btn.style.top = `${newTop}px`;
  };

  const endDrag = () => {
    if (isDragging) {
      const wasDragging = hasDragged;
      isDragging = false;
      delete btn.dataset.dragging;
      btn.style.cursor = "grab";
      btn.style.opacity = "0.8";

      // Save position
      const rect = btn.getBoundingClientRect();
      savePosition(rect.top, rect.left);

      // Reset hasDragged after a short delay to allow click handler to check it
      if (wasDragging) {
        setTimeout(() => {
          hasDragged = false;
        }, 100);
      }
    }
    isUsingTouch = false;
  };

  const handleMouseDown = (e: MouseEvent) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;
    // Ignore if we're currently using touch
    if (isUsingTouch) return;

    startDrag(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Ignore if we're using touch
    if (isUsingTouch) return;
    updateDrag(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: MouseEvent) => {
    // Ignore if we're using touch
    if (isUsingTouch) return;
    endDrag();
  };

  const handleTouchStart = (e: TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    isUsingTouch = true;
    const touch = e.touches[0];
    // Store initial touch position but don't start dragging yet
    // Only start dragging if touch moves significantly
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = btn.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    hasDragged = false;
    isDragging = false; // Ensure we start in non-dragging state

    // Prevent default to avoid scrolling/selection, but we'll handle tap manually in touchend
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isUsingTouch) return;
    // Only handle single touch
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Check if we've moved enough to start dragging
    if (!isDragging) {
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > 5 || deltaY > 5) {
        // Start dragging now
        isDragging = true;
        hasDragged = true;
        btn.dataset.dragging = "true";
        btn.style.cursor = "grabbing";
        btn.style.opacity = "1";
      } else {
        // Not enough movement yet, don't prevent default
        return;
      }
    }

    // We're dragging, update position
    updateDrag(touch.clientX, touch.clientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isUsingTouch) return;

    // If we were dragging, end the drag
    if (isDragging) {
      endDrag();
      e.preventDefault();
      e.stopPropagation();
    } else {
      // We weren't dragging, so this was a tap - trigger download directly
      // Reset touch state first
      isUsingTouch = false;
      hasDragged = false;

      // Manually trigger download for mobile (more reliable than waiting for click event)
      e.preventDefault();
      e.stopPropagation();

      // Use setTimeout to ensure state is reset before download
      setTimeout(async () => {
        await downloadLogs(storage, singleFile, getShowTimestamps);
      }, 0);
    }
  };

  const handleTouchCancel = (e: TouchEvent) => {
    if (!isUsingTouch) return;
    // If we were dragging, end it
    if (isDragging) {
      endDrag();
    } else {
      // Reset touch state
      isUsingTouch = false;
      hasDragged = false;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  // Append button to DOM first
  document.body.appendChild(btn);

  // Set up event listeners after button is in DOM
  btn.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Touch event listeners for mobile support
  btn.addEventListener("touchstart", handleTouchStart, { passive: false });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd, { passive: false });
  document.addEventListener("touchcancel", handleTouchCancel, { passive: false });

  // Handle window resize to keep button within bounds
  const onWindowResize = () => {
    const rect = btn.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;

    let currentLeft = rect.left;
    let currentTop = rect.top;

    // Adjust if button is outside viewport
    if (currentLeft > maxLeft) {
      currentLeft = maxLeft;
    }
    if (currentTop > maxTop) {
      currentTop = maxTop;
    }
    if (currentLeft < 0) {
      currentLeft = 0;
    }
    if (currentTop < 0) {
      currentTop = 0;
    }

    btn.style.left = `${currentLeft}px`;
    btn.style.top = `${currentTop}px`;
    savePosition(currentTop, currentLeft);
  };

  window.addEventListener("resize", onWindowResize);

  const handleClick = async (e: MouseEvent) => {
    // Only trigger download if we didn't drag
    if (hasDragged || isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    await downloadLogs(storage, singleFile, getShowTimestamps);
  };

  btn.addEventListener("click", handleClick);

  // Store cleanup function on the button for later removal
  (btn as any).__illogger_cleanup = () => {
    btn.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    btn.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchcancel", handleTouchCancel);
    window.removeEventListener("resize", onWindowResize);
    btn.removeEventListener("click", handleClick);
  };
}

export function withdrawDownloadButton() {
  if (typeof document === "undefined") return; // skip for Node

  const btn = document.getElementById("illogger-download-btn");
  if (!btn) return;

  // Clean up event listeners if cleanup function exists
  if ((btn as any).__illogger_cleanup) {
    (btn as any).__illogger_cleanup();
  }

  // Remove button from DOM
  btn.remove();
}
