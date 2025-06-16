'use strict';

let file = null;
let paused = false;
let cancelled = false;
let ws = null;

const firmwareInput = document.getElementById('firmwareFile');
const selectBtn = document.getElementById('selectBtn');
const flashBtn = document.getElementById('flashBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const cancelBtn = document.getElementById('cancelBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const log = document.getElementById('log');

function appendLog(msg) {
  const now = new Date().toLocaleTimeString();
  log.textContent += `[${now}] ${msg}\n`;
  log.scrollTop = log.scrollHeight;
}

selectBtn.addEventListener('click', () => {
  firmwareInput.click();
});

firmwareInput.addEventListener('change', () => {
  file = firmwareInput.files[0];
  if (file) {
    appendLog(`[Ready] Selected file: ${file.name}`);
  }
});

flashBtn.addEventListener('click', () => {
  if (!file) {
    appendLog('[Error] No file selected.');
    return;
  }

  cancelled = false;
  paused = false;
  pauseBtn.disabled = false;
  cancelBtn.disabled = false;
  flashBtn.disabled = true;

  ws = new WebSocket("ws://127.0.0.1:58778/ws/device");

  ws.onopen = () => {
    appendLog('[WS] Connected');
    ws.send(JSON.stringify({ action: "start_upload", filename: file.name }));
    sendChunks();
  };

  ws.onmessage = (event) => {
    appendLog(`[WS] Message: ${event.data}`);
  };

  ws.onerror = (err) => {
    appendLog(`[WS Error] ${err.message || err}`);
  };

  ws.onclose = () => {
    appendLog('[WS] Connection closed.');
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    cancelBtn.disabled = true;
    flashBtn.disabled = false;
  };
});

pauseBtn.addEventListener('click', () => {
  paused = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  appendLog('[Action] Upload paused...');
});

resumeBtn.addEventListener('click', () => {
  paused = false;
  resumeBtn.disabled = true;
  pauseBtn.disabled = false;
  appendLog('[Action] Resuming...');
  sendChunks();
});

cancelBtn.addEventListener('click', () => {
  cancelled = true;
  paused = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  cancelBtn.disabled = true;
  flashBtn.disabled = false;
  appendLog('[Action] Upload cancelled.');
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  progressBar.value = 0;
  progressText.textContent = '0%';
});

let offset = 0;
const chunkSize = 512 * 1024;

function sendChunks() {
  if (!file || cancelled || paused || offset >= file.size) return;

  const reader = new FileReader();
  const chunk = file.slice(offset, offset + chunkSize);

  reader.onload = () => {
    if (cancelled || paused) return;

    const buffer = reader.result;
    ws.send(buffer);
    offset += chunkSize;

    const percent = Math.min(100, Math.round((offset / file.size) * 100));
    progressBar.value = percent;
    progressText.textContent = `${percent}%`;

    appendLog(`[Uploading] ${percent}% (${offset}/${file.size} bytes)`);

    setTimeout(sendChunks, 20);
  };

  reader.onerror = () => {
    appendLog('[Error] Failed to read file.');
  };

  reader.readAsArrayBuffer(chunk);
}
