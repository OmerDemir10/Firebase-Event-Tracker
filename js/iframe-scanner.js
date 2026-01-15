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

    // Top Events Table (div.events-table -> svg -> g.ga-viz-table -> g.ga-viz-table-row)
    // Screenshot 1-6 and 9 analysis shows this structure
    const rows = document.querySelectorAll("div.events-table g.ga-viz-table-row");

    if (rows.length > 0) {
      rows.forEach((row) => {
        // The structure usually has two text elements:
        // 1. Name: <text x="8" ...>EventName</text>
        // 2. Count: <text x="256" ...>Count</text> (or similar high X value, text-anchor="end")

        const textNodes = row.querySelectorAll("text");
        if (textNodes.length >= 2) {
          const nameNode = textNodes[0]; // First text is event name
          const countNode = textNodes[1]; // Second text is count

          if (nameNode && countNode) {
            const name = nameNode.textContent?.trim();
            const countText = countNode.textContent?.trim();
            const count = parseInt(countText, 10);

            if (isValidEvent(name) && !isNaN(count)) {
              events[name] = count;
            }
          }
        }
      });
    } else {
      // Fallback or secondary check if the specific div class isn't found but the table row exists
      // (This handles cases where the parent div might have a different dynamic class)
      document.querySelectorAll("g.ga-viz-table-row").forEach((row) => {
        const textNodes = row.querySelectorAll("text");
        if (textNodes.length >= 2) {
          const name = textNodes[0].textContent?.trim();
          const count = parseInt(textNodes[1].textContent?.trim(), 10);
          if (isValidEvent(name) && !isNaN(count)) {
            events[name] = count;
          }
        }
      });
    }

    // Eski seçicileri (fallback olarak veya karışıklık olmaması için) devre dışı bırakıyoruz
    // Kullanıcı özellikle yeni yapıdan çekilmesini istedi

    /*
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
    */

    if (Object.keys(events).length > 0) {
      console.log("🔍 Event'ler bulundu:", Object.keys(events));
      chrome.runtime
        .sendMessage({
          action: "eventsFound",
          events: events,
        })
        .catch(() => { });
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
