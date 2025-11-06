import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { StorageAdapter } from "./storageAdapter";

export function injectDownloadButton(storage: StorageAdapter) {
  if (typeof document === "undefined") return; // skip for Node
  if (document.getElementById("illogger-download-btn")) return;

  const btn = document.createElement("button");
  btn.id = "illogger-download-btn";
  btn.textContent = "⬇️ Logs";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#111",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    zIndex: "99999",
    opacity: "0.8",
  });

  btn.onmouseenter = () => (btn.style.opacity = "1");
  btn.onmouseleave = () => (btn.style.opacity = "0.8");

  btn.onclick = async () => {
    const logs = storage.getAll();
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
  };

  document.body.appendChild(btn);
}
