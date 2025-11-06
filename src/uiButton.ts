import { saveAs } from "file-saver";
import JSZip from "jszip";
import type { StorageAdapter } from "./storageAdapter";

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

export function injectDownloadButton(storage: StorageAdapter, singleFile = false) {
  if (typeof document === "undefined") return; // skip for Node
  if (document.getElementById("illogger-download-btn")) return;

  const btn = document.createElement("button");
  btn.id = "illogger-download-btn";
  btn.textContent = "⬇️ Logs";
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

  const handleMouseDown = (e: MouseEvent) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;

    isDragging = true;
    hasDragged = false;
    btn.dataset.dragging = "true";
    btn.style.cursor = "grabbing";
    btn.style.opacity = "1";

    startX = e.clientX;
    startY = e.clientY;
    const rect = btn.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Mark that we've dragged if mouse moved significantly
    if (!hasDragged) {
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      if (deltaX > 5 || deltaY > 5) {
        hasDragged = true;
      }
    }

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

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

  const handleMouseUp = (e: MouseEvent) => {
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
  };

  // Append button to DOM first
  document.body.appendChild(btn);

  // Set up event listeners after button is in DOM
  btn.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

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

    const logs = await storage.getAll();

    if (singleFile) {
      // Create a single log file with all logs
      const content = logs
        .map((log: any) => {
          const loggerPrefix = log.name ? `[${log.name}] ` : '';
          const timestamp = log.timestamp ? `[${log.timestamp}] ` : '';
          return `${timestamp}${loggerPrefix}${log.message}`;
        })
        .join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      saveAs(blob, "illogger-logs.log");
    } else {
      // Create multiple files grouped by logger name (original behavior)
      const grouped = logs.reduce((acc: any, log: any) => {
        (acc[log.name] ||= []).push(log);
        return acc;
      }, {});
      const zip = new JSZip();
      Object.entries(grouped).forEach(([name, entries]: any) => {
        const content = entries
          .map((e: any) => `[${e.timestamp}] ${e.message}`)
          .join("\n");
        zip.file(`${name}.log`, content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "illogger-logs.zip");
    }
  };

  btn.addEventListener("click", handleClick);

  // Store cleanup function on the button for later removal
  (btn as any).__illogger_cleanup = () => {
    btn.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
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
