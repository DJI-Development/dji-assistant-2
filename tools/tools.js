"use strict";

let file = null;
let ws = null;
let paused = false;
let canceled = false;
let offset = 0;
let chunkSize = 512 * 1024;

const fileInput = document.getElementById("firmwareFile");
const logBox = document.getElementById("log");

document.getElementById("selectBtn").onclick = () => fileInput.click();

fileInput.addEventListener("change", () => {
  file = fileInput.files[0];
  offset = 0;
  appendLog(`[Ready] Selected file: ${file.name}`);
  document.getElementById("pauseBtn").disabled = false;
  document.getElementById("cancelBtn").disabled = false;
});

document.getElementById("flashBtn").onclick = () => {
  if (!file) {
    alert("Please select a firmware file first.");
    return;
  }

  ws = new WebSocket("ws://127.0.0.1:58778/ws/device");

  ws.onopen = () => {
    appendLog("[WS] Connected");
    ws.send(JSON.stringify({ action: "start_upload", filename: file.name }));
    sendNextChunk();
  };

  ws.onmessage = (event) => {
    appendLog(`[WS] Message: ${event.data}`);
  };

  ws.onerror = (err) => {
    appendLog(`[WS] Error: ${err.message}`);
  };

  ws.onclose = () => {
    appendLog("[WS] Connection closed");
  };
};

document.getElementById("pauseBtn").onclick = () => {
  paused = true;
  appendLog("[Action] Paused...");
};

document.getElementById("resumeBtn").onclick = () => {
  if (!file || !ws) return;
  paused = false;
  appendLog("[Action] Resuming...");
  sendNextChunk();
};

document.getElementById("cancelBtn").onclick = () => {
  canceled = true;
  if (ws) ws.close();
  appendLog("[Action] Upload canceled.");
};

function sendNextChunk() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (paused) {
    document.getElementById("resumeBtn").disabled = false;
    return;
  }
  if (canceled) return;

  const reader = new FileReader();
  const slice = file.slice(offset, offset + chunkSize);

  reader.onload = () => {
    ws.send(new Uint8Array(reader.result));
    offset += chunkSize;

    const percent = Math.min(100, ((offset / file.size) * 100).toFixed(2));
    appendLog(`[Uploading] ${percent}% (${offset}/${file.size} bytes)`);

    if (offset < file.size) {
      setTimeout(sendNextChunk, 50);
    } else {
      appendLog("[Done] All chunks sent. Sending start_flash...");
      ws.send(JSON.stringify({ action: "start_flash", filename: file.name }));
    }
  };

  reader.onerror = () => {
    appendLog("[Error] Failed to read file.");
  };

  reader.readAsArrayBuffer(slice);
}

function appendLog(msg) {
  const now = new Date().toLocaleTimeString();
  logBox.textContent += `[${now}] ${msg}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}
