// Firebase DebugView - iframe Scanner
(function () {
  if (window.iframeScannerLoaded) return;
  window.iframeScannerLoaded = true;

  console.log("🔍 iframe-scanner yüklendi:", window.location.href);

  let isScanning = false;
  let scanInterval = null;

  // Parent'tan mesaj dinle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startScan") {
      startScanning();
    } else if (message.action === "stopScan") {
      stopScanning();
    } else if (message.action === "scanNow") {
      scanAndSend();
    }
    sendResponse({ success: true });
    return false;
  });

  function startScanning() {
    if (isScanning) return;
    isScanning = true;
    console.log("🔍 Tarama başlatıldı");

    scanInterval = setInterval(scanAndSend, 2000);
    scanAndSend();
  }

  function stopScanning() {
    isScanning = false;
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    console.log("🔍 Tarama durduruldu");
  }

  function scanAndSend() {
    const events = {};

    // text.stream-node-name
    document.querySelectorAll("text.stream-node-name").forEach((el) => {
      const name = el.textContent?.trim();
      if (isValidEvent(name)) {
        events[name] = (events[name] || 0) + 1;
      }
    });

    // text[x="135"]
    document.querySelectorAll('text[x="135"]').forEach((el) => {
      const name = el.textContent?.trim();
      if (isValidEvent(name)) {
        events[name] = (events[name] || 0) + 1;
      }
    });

    // g.stream-node text
    document
      .querySelectorAll("g.stream-node text, g.clickable-node text")
      .forEach((el) => {
        const name = el.textContent?.trim();
        if (isValidEvent(name)) {
          events[name] = (events[name] || 0) + 1;
        }
      });

    if (Object.keys(events).length > 0) {
      console.log("🔍 Event'ler bulundu:", Object.keys(events));
      chrome.runtime
        .sendMessage({
          action: "eventsFound",
          events: events,
        })
        .catch(() => {});
    }
  }

  function isValidEvent(name) {
    if (!name || name.length < 2) return false;
    if (name.includes(":")) return false;
    if (/^\d+$/.test(name)) return false;
    if (/^\d+s$/.test(name)) return false; // 5s, 26s gibi süreleri filtrele
    if (/^\d{2}:\d{2}/.test(name)) return false; // Saat formatı
    return true;
  }
})();
