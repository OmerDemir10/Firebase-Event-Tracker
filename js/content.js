// Firebase DebugView Event Tracker - Content Script
(function () {
  "use strict";

  // iframe içinde çalışma
  if (window.self !== window.top) {
    return;
  }

  // Çift yükleme kontrolü
  if (window.firebaseEventTrackerLoaded) {
    return;
  }
  window.firebaseEventTrackerLoaded = true;

  console.log("🔥 Firebase Event Tracker yüklendi (ana sayfa)");

  // Değişkenler
  let isTracking = false;
  let eventsCount = {};
  let floatingPanel = null;
  let keywords = [];
  let scanInterval = null;
  let networkObserver = null;
  let lastDOMEventCounts = {}; // Her event için DOM'da görülen son sayı
  let lastIframeEventCounts = {}; // iframe'den gelen son sayılar

  // Storage'dan keywords yükle
  try {
    const saved = localStorage.getItem("firebase_tracker_keywords");
    if (saved) keywords = JSON.parse(saved);
  } catch (e) {
    keywords = [];
  }

  // Sayfa yüklendiğinde başlat
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    console.log("🔥 Firebase Event Tracker başlatılıyor...");

    if (window.location.href.includes("firebase.google.com")) {
      setTimeout(createFloatingPanel, 2000);

      // Network isteklerini dinle (DebugView event'leri için)
      setupNetworkInterceptor();
    }
  }

  // Network isteklerini intercept et
  function setupNetworkInterceptor() {
    // XHR intercept
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url) {
      this._url = url;
      return originalXHR.apply(this, arguments);
    };

    const originalSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function (body) {
      this.addEventListener("load", function () {
        if (this._url && this._url.includes("analytics") && isTracking) {
          try {
            parseNetworkResponse(this.responseText);
          } catch (e) {}
        }
      });
      return originalSend.apply(this, arguments);
    };

    // Fetch intercept
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
      return originalFetch.apply(this, arguments).then((response) => {
        if (url && url.toString().includes("analytics") && isTracking) {
          response
            .clone()
            .text()
            .then((text) => {
              try {
                parseNetworkResponse(text);
              } catch (e) {}
            });
        }
        return response;
      });
    };

    console.log("🌐 Network interceptor kuruldu");

    // Background script'ten gelen mesajları dinle
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "iframeEvents" && isTracking) {
        // iframe'den gelen sayıları karşılaştır, sadece farkı ekle
        const iframeEvents = message.events;
        for (const [name, count] of Object.entries(iframeEvents)) {
          const lastCount = lastIframeEventCounts[name] || 0;
          const newCount = count - lastCount;

          if (newCount > 0) {
            if (!eventsCount[name]) {
              eventsCount[name] = 0;
              console.log("🆕 Yeni event (iframe):", name);
            }
            eventsCount[name] += newCount;
          }
          lastIframeEventCounts[name] = count;
        }
        updateUI();
      }
      sendResponse({ success: true });
      return false;
    });
  }

  function parseNetworkResponse(text) {
    // Event isimlerini response'dan çıkarmaya çalış
    const eventPatterns = [
      /"event_name":\s*"([^"]+)"/g,
      /"name":\s*"([^"]+)"/g,
      /eventName['":\s]+['"]([^'"]+)['"]/g,
    ];

    eventPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const eventName = match[1];
        if (isValidEventName(eventName)) {
          addEvent(eventName);
        }
      }
    });
  }

  function isValidEventName(name) {
    if (!name || name.length < 2) return false;
    if (name.includes(":")) return false;
    if (/^\d+$/.test(name)) return false;
    if (["true", "false", "null", "undefined"].includes(name.toLowerCase()))
      return false;
    return true;
  }

  function scanAndSendEvents() {
    // Bu fonksiyon artık kullanılmıyor - network interceptor kullanılıyor
  }

  // Floating panel oluştur
  function createFloatingPanel() {
    if (floatingPanel) return;

    console.log("📊 Panel oluşturuluyor...");

    floatingPanel = document.createElement("div");
    floatingPanel.id = "firebase-event-tracker-panel";
    floatingPanel.innerHTML = `
      <div class="fet-header">
        <span class="fet-title">🔥 Event Tracker</span>
        <button class="fet-close">✕</button>
      </div>
      <div class="fet-status">Hazır. Başlat butonuna tıklayın.</div>
      <div class="fet-buttons">
        <button class="fet-toggle">Başlat</button>
        <button class="fet-clear">Temizle</button>
      </div>
      <div class="fet-keyword-section">
        <div class="fet-keyword-header">Önemli Event Filtreleri:</div>
        <div class="fet-keyword-input-row">
          <input type="text" class="fet-keyword-input" placeholder="Event adı ekle...">
          <button class="fet-keyword-add">+</button>
        </div>
        <div class="fet-keyword-list" id="fet-keyword-list"></div>
      </div>
      <div class="fet-tabs">
        <button class="fet-tab active" data-tab="all">Tüm Olaylar</button>
        <button class="fet-tab" data-tab="important">Önemli Olaylar</button>
      </div>
      <div class="fet-content">
        <div class="fet-tab-content active" id="fet-all">
          <button class="fet-copy-btn" id="fet-copy-all">📋 Kopyala</button>
          <table class="fet-table">
            <thead><tr><th>Event Adı</th><th>Sayı</th></tr></thead>
            <tbody id="fet-all-body"></tbody>
          </table>
        </div>
        <div class="fet-tab-content" id="fet-important">
          <button class="fet-copy-btn" id="fet-copy-important">📋 Kopyala</button>
          <table class="fet-table">
            <thead><tr><th>Event Adı</th><th>Sayı</th></tr></thead>
            <tbody id="fet-important-body"></tbody>
          </table>
        </div>
      </div>
    `;

    // Stiller
    const style = document.createElement("style");
    style.textContent = `
      #firebase-event-tracker-panel {
        position: fixed !important;
        top: 100px !important;
        right: 20px !important;
        width: 380px !important;
        max-height: 80vh !important;
        background: white !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        z-index: 2147483647 !important;
        font-family: Arial, sans-serif !important;
        font-size: 13px !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .fet-header {
        background: #1a73e8 !important;
        color: white !important;
        padding: 12px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        cursor: move !important;
      }
      .fet-title { font-weight: bold !important; font-size: 16px !important; }
      .fet-close {
        background: #ff5252 !important;
        border: none !important;
        color: white !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
      }
      .fet-content {
        flex: 1 !important;
        overflow-y: auto !important;
        max-height: 400px !important;
      }
      .fet-copy-btn {
        width: calc(100% - 16px) !important;
        margin: 0 8px 8px 8px !important;
        padding: 8px !important;
        background: #4CAF50 !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: bold !important;
      }
      .fet-copy-btn:hover {
        background: #45a049 !important;
      }
      .fet-status {
        padding: 10px !important;
        background: #f5f5f5 !important;
        border-bottom: 1px solid #ddd !important;
      }
      .fet-buttons {
        padding: 10px !important;
        display: flex !important;
        gap: 10px !important;
      }
      .fet-toggle {
        flex: 1 !important;
        padding: 8px !important;
        background: #4CAF50 !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-weight: bold !important;
      }
      .fet-toggle.active { background: #f44336 !important; }
      .fet-clear {
        padding: 8px 16px !important;
        background: #757575 !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-weight: bold !important;
      }
      .fet-keyword-section {
        padding: 10px !important;
        border-bottom: 1px solid #ddd !important;
        background: #fafafa !important;
      }
      .fet-keyword-header {
        font-weight: bold !important;
        margin-bottom: 8px !important;
        font-size: 12px !important;
        color: #333 !important;
      }
      .fet-keyword-input-row {
        display: flex !important;
        gap: 5px !important;
        margin-bottom: 8px !important;
      }
      .fet-keyword-input {
        flex: 1 !important;
        padding: 6px 10px !important;
        border: 1px solid #ddd !important;
        border-radius: 4px !important;
        font-size: 12px !important;
      }
      .fet-keyword-add {
        padding: 6px 12px !important;
        background: #4CAF50 !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        font-size: 14px !important;
      }
      .fet-keyword-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
      }
      .fet-keyword-tag {
        background: #e3f2fd !important;
        color: #1565c0 !important;
        padding: 4px 8px !important;
        border-radius: 12px !important;
        font-size: 11px !important;
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
      }
      .fet-keyword-remove {
        background: none !important;
        border: none !important;
        color: #c62828 !important;
        cursor: pointer !important;
        font-size: 14px !important;
        padding: 0 !important;
        line-height: 1 !important;
      }
      .fet-tabs {
        display: flex !important;
        border-bottom: 1px solid #ddd !important;
      }
      .fet-tab {
        flex: 1 !important;
        padding: 10px !important;
        background: none !important;
        border: none !important;
        cursor: pointer !important;
        border-bottom: 2px solid transparent !important;
        font-weight: bold !important;
      }
      .fet-tab.active {
        color: #1a73e8 !important;
        border-bottom-color: #1a73e8 !important;
      }
      .fet-content {
        max-height: 300px !important;
        overflow-y: auto !important;
      }
      .fet-tab-content { display: none !important; }
      .fet-tab-content.active { display: block !important; }
      .fet-table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      .fet-table th, .fet-table td {
        padding: 8px !important;
        text-align: left !important;
        border-bottom: 1px solid #eee !important;
      }
      .fet-table th { background: #f9f9f9 !important; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(floatingPanel);

    // Event listeners
    floatingPanel.querySelector(".fet-close").onclick = () => {
      floatingPanel.style.display = "none";
    };

    floatingPanel.querySelector(".fet-toggle").onclick = function () {
      if (isTracking) {
        stopTracking();
        this.textContent = "Başlat";
        this.classList.remove("active");
      } else {
        startTracking();
        this.textContent = "Durdur";
        this.classList.add("active");
      }
    };

    floatingPanel.querySelector(".fet-clear").onclick = () => {
      eventsCount = {};
      lastDOMEventCounts = {};
      lastIframeEventCounts = {};
      updateUI();
      updateStatus("Temizlendi. Başlat butonuna tıklayın.");
    };

    // Kopyala butonları
    floatingPanel.querySelector("#fet-copy-all").onclick = () => {
      const header = "Event Adı\tTetiklenme Sayısı\n";
      const eventData = Object.keys(eventsCount)
        .sort()
        .map((name) => `${name}\t${eventsCount[name]}`)
        .join("\n");
      navigator.clipboard.writeText(header + eventData).then(() => {
        alert("Tüm event'ler kopyalandı!");
      });
    };

    floatingPanel.querySelector("#fet-copy-important").onclick = () => {
      const header = "Event Adı\tTetiklenme Sayısı\n";
      const eventData = Object.keys(eventsCount)
        .filter((name) =>
          keywords.some((kw) => name.toLowerCase().includes(kw.toLowerCase()))
        )
        .sort()
        .map((name) => `${name}\t${eventsCount[name]}`)
        .join("\n");
      navigator.clipboard.writeText(header + eventData).then(() => {
        alert("Önemli event'ler kopyalandı!");
      });
    };

    // Keyword ekleme
    const keywordInput = floatingPanel.querySelector(".fet-keyword-input");
    const keywordAddBtn = floatingPanel.querySelector(".fet-keyword-add");

    function addKeyword() {
      const value = keywordInput.value.trim();
      if (value && !keywords.includes(value)) {
        keywords.push(value);
        localStorage.setItem(
          "firebase_tracker_keywords",
          JSON.stringify(keywords)
        );
        keywordInput.value = "";
        renderKeywords();
        updateUI();
      }
    }

    keywordAddBtn.onclick = addKeyword;
    keywordInput.onkeypress = (e) => {
      if (e.key === "Enter") addKeyword();
    };

    renderKeywords();

    // Tab switching
    floatingPanel.querySelectorAll(".fet-tab").forEach((tab) => {
      tab.onclick = function () {
        floatingPanel
          .querySelectorAll(".fet-tab")
          .forEach((t) => t.classList.remove("active"));
        floatingPanel
          .querySelectorAll(".fet-tab-content")
          .forEach((c) => c.classList.remove("active"));
        this.classList.add("active");
        document
          .getElementById("fet-" + this.dataset.tab)
          .classList.add("active");
      };
    });

    // Sürükleme
    makeDraggable(floatingPanel, floatingPanel.querySelector(".fet-header"));

    console.log("✅ Panel oluşturuldu");
  }
  // Keywords render
  function renderKeywords() {
    const list = document.getElementById("fet-keyword-list");
    if (!list) return;

    list.innerHTML = "";
    keywords.forEach((kw, index) => {
      const tag = document.createElement("span");
      tag.className = "fet-keyword-tag";
      tag.innerHTML = `${kw}<button class="fet-keyword-remove" data-index="${index}">×</button>`;
      list.appendChild(tag);
    });

    // Remove butonları
    list.querySelectorAll(".fet-keyword-remove").forEach((btn) => {
      btn.onclick = function () {
        keywords.splice(parseInt(this.dataset.index), 1);
        localStorage.setItem(
          "firebase_tracker_keywords",
          JSON.stringify(keywords)
        );
        renderKeywords();
        updateUI();
      };
    });
  }
  // Sürükleme fonksiyonu
  function makeDraggable(element, handle) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
      element.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // iframe'lerden gelen mesajları dinle
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "EVENTS_UPDATE") {
      const newEvents = event.data.events;
      Object.keys(newEvents).forEach((name) => {
        if (!eventsCount[name]) {
          console.log("🆕 Yeni event (iframe'den):", name);
        }
        eventsCount[name] = newEvents[name];
      });
      updateUI();
    }
  });

  // Tracking başlat
  function startTracking() {
    if (isTracking) return;
    isTracking = true;

    console.log("▶️ Tracking başlatıldı");
    updateStatus("İzleniyor...");

    // Background'a iframe taraması başlatmasını söyle
    chrome.runtime.sendMessage({ action: "startScanAll" }).catch(() => {});
  }

  // Tracking durdur
  function stopTracking() {
    if (!isTracking) return;
    isTracking = false;

    console.log("⏹️ Tracking durduruldu");
    updateStatus(
      "Durduruldu. " +
        Object.keys(eventsCount).length +
        " farklı event bulundu."
    );

    chrome.runtime.sendMessage({ action: "stopScanAll" }).catch(() => {});
  }

  // Periyodik tarama
  function startPeriodicScan() {
    if (scanInterval) clearInterval(scanInterval);

    scanAllFrames();

    scanInterval = setInterval(() => {
      if (isTracking) {
        scanAllFrames();
      }
    }, 2000);
  }

  // Tüm frame'leri tara
  function scanAllFrames() {
    updateFromDOM();
    updateUI();
  }

  // Bir document'ı tara (artık kullanılmıyor)
  function scanDocument(doc) {
    if (!doc) return;

    try {
      doc.querySelectorAll("text.stream-node-name").forEach((el) => {
        const name = el.textContent?.trim();
        if (name && isValidEventName(name)) {
          addEventFromDOM(name, el);
        }
      });

      doc.querySelectorAll('text[x="135"]').forEach((el) => {
        const name = el.textContent?.trim();
        if (name && isValidEventName(name)) {
          addEventFromDOM(name, el);
        }
      });
    } catch (e) {}
  }

  // Event adı geçerli mi?
  function isValidEventName(name) {
    if (!name || name.length < 2) return false;
    if (name.includes(":")) return false;
    if (/^\d+$/.test(name)) return false;
    if (name.length > 100) return false;
    return true;
  }

  // DOM taramasından event'leri topla
  function collectDOMEvents() {
    const domEvents = {};
    const seenElements = new Set();

    const processElement = (el) => {
      if (seenElements.has(el)) return;
      seenElements.add(el);

      const name =
        el.textContent?.trim() || el.getAttribute?.("data-event-name");
      if (name && isValidEventName(name)) {
        domEvents[name] = (domEvents[name] || 0) + 1;
      }
    };

    // Tek seçici ile unique elementler
    document
      .querySelectorAll(
        'text.stream-node-name, text[x="135"], [data-event-name], .event-name, .ga-event-name'
      )
      .forEach(processElement);

    return domEvents;
  }

  // DOM event sayılarını güncelle (sadece yeni eklenenler sayılır)
  function updateFromDOM() {
    const currentDOMCounts = collectDOMEvents();

    for (const [eventName, count] of Object.entries(currentDOMCounts)) {
      const lastCount = lastDOMEventCounts[eventName] || 0;
      const newCount = count - lastCount;

      if (newCount > 0) {
        if (!eventsCount[eventName]) {
          eventsCount[eventName] = 0;
          console.log("🆕 Yeni event:", eventName);
        }
        eventsCount[eventName] += newCount;
      }

      lastDOMEventCounts[eventName] = count;
    }
  }

  // Event ekle (Network için)
  function addEvent(eventName) {
    if (!eventsCount[eventName]) {
      eventsCount[eventName] = 0;
      console.log("🆕 Yeni event:", eventName);
    }
    eventsCount[eventName]++;
  }

  // UI güncelle
  function updateUI() {
    if (!floatingPanel) return;

    const allBody = document.getElementById("fet-all-body");
    const importantBody = document.getElementById("fet-important-body");

    if (!allBody || !importantBody) return;

    allBody.innerHTML = "";
    Object.keys(eventsCount)
      .sort()
      .forEach((name) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${name}</td><td>${eventsCount[name]}</td>`;
        allBody.appendChild(row);
      });

    importantBody.innerHTML = "";
    Object.keys(eventsCount)
      .filter((name) => {
        if (keywords.length === 0) return false;
        return keywords.some((kw) =>
          name.toLowerCase().includes(kw.toLowerCase())
        );
      })
      .sort()
      .forEach((name) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${name}</td><td>${eventsCount[name]}</td>`;
        importantBody.appendChild(row);
      });

    const total = Object.keys(eventsCount).length;
    if (isTracking) {
      updateStatus(`İzleniyor... (${total} farklı event)`);
    }
  }

  // Status güncelle
  function updateStatus(text) {
    if (!floatingPanel) return;
    const status = floatingPanel.querySelector(".fet-status");
    if (status) status.textContent = text;
  }
})();
