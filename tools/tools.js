"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const firmwareInput = document.getElementById("firmwareFile");
  const uploadBtn = document.getElementById("uploadBtn");
  const logDiv = document.getElementById("log");

  function log(msg) {
    const timestamp = new Date().toLocaleTimeString();
    logDiv.textContent += `[${timestamp}] ${msg}\n`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  uploadBtn.addEventListener("click", () => {
    const file = firmwareInput.files[0];
    if (!file || (!file.name.endsWith(".bin") && !file.name.endsWith(".sig"))) {
      alert("Please select a valid .bin or .sig firmware file.");
      return;
    }

    const ws = new WebSocket("ws://127.0.0.1:58778/ws/device");

    ws.onopen = () => {
      log("WebSocket connected");

      ws.send(JSON.stringify({
        module: "upgrade",
        action: "start_upload",
        filename: file.name,
        size: file.size
      }));
      log("Sent: start_upload");

      const chunkSize = 512 * 1024;
      let offset = 0;
      const totalChunks = Math.ceil(file.size / chunkSize);
      let chunkIndex = 0;

      const sendNextChunk = () => {
        if (offset >= file.size) {
          log("All chunks sent. Sending start_flash...");
          ws.send(JSON.stringify({
            module: "upgrade",
            action: "start_flash",
            filename: file.name
          }));
          return;
        }

        const reader = new FileReader();
        const slice = file.slice(offset, offset + chunkSize);

        reader.onload = () => {
          const buffer = new Uint8Array(reader.result);
          ws.send(buffer);
          offset += chunkSize;
          chunkIndex++;
          log(`Sent chunk ${chunkIndex}/${totalChunks}`);
          setTimeout(sendNextChunk, 50);
        };

        reader.onerror = () => {
          log("Error reading file chunk.");
        };

        reader.readAsArrayBuffer(slice);
      };

      setTimeout(sendNextChunk, 300);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        log(`Server: ${data.message || "OK"}`);
      } catch (err) {
        log(`Raw Server Message: ${msg.data}`);
      }
    };

    ws.onerror = (err) => {
      log(`WebSocket error: ${err.message}`);
    };

    ws.onclose = () => {
      log("WebSocket closed");
    };
  });
});
