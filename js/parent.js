(function () {
  "use strict";

  // Firebase DebugView Event Tracker - Parent Window Script
  // Bu script ana sayfada çalışır ve iframe'lerden gelen mesajları dinler

  console.log("🔥 Firebase Event Tracker - Parent Window Script yüklendi");

  // Global değişkenler
  let parentFloatingPanel = null;
  let eventsCount = {};
  let isTracking = false;
  let keywords = ["iap", "revenue", "ecpm", "cumulative"];

  // iframe'lerden gelen mesajları dinle
  window.addEventListener("message", (event) => {
    const message = event.data;

    if (message.type === "FIREBASE_EVENT_TRACKER_CREATE_PANEL") {
      console.log("📨 iframe'den panel oluşturma isteği alındı");
      createPanelInParent();
    } else if (message.type === "FIREBASE_EVENT_TRACKER_EVENT_DETECTED") {
      console.log("📨 iframe'den event tespit edildi:", message.eventName);
      handleEventFromIframe(message.eventName, message.allEvents);
    } else if (message.type === "FIREBASE_EVENT_TRACKER_STATUS_UPDATE") {
      console.log("📨 iframe'den status güncellemesi:", message.status);
      updatePanelStatus(message.status);
    }
  });

  // Ana sayfada panel oluştur - content.js ile aynı yapı
  function createPanelInParent() {
    if (parentFloatingPanel) {
      console.log("Panel zaten mevcut");
      parentFloatingPanel.style.display = "block";
      return;
    }

    console.log("✨ Ana sayfada panel oluşturuluyor...");

    // Panel ana container
    parentFloatingPanel = document.createElement("div");
    parentFloatingPanel.id = "firebase-event-tracker-panel";
    parentFloatingPanel.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    width: 400px !important;
    background-color: #fff !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
    z-index: 2147483647 !important;
    font-family: Arial, sans-serif !important;
    font-size: 14px !important;
    padding: 15px !important;
    resize: both !important;
    overflow: auto !important;
    max-height: 600px !important;
    isolation: isolate !important;
    pointer-events: auto !important;
    transform: translateZ(0) !important;
    will-change: transform !important;
    -webkit-transform: translateZ(0) !important;
  `;

    // Başlık ve sürükleme bölgesi
    const header = document.createElement("div");
    header.style.padding = "5px";
    header.style.marginBottom = "10px";
    header.style.borderBottom = "1px solid #eee";
    header.style.cursor = "move";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("h3");
    title.textContent = "Firebase DebugView Event Tracker";
    title.style.margin = "0";
    title.style.padding = "0";
    title.style.fontSize = "16px";

    // Kapat butonu
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "✕";
    closeButton.style.backgroundColor = "#F44336";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "50%";
    closeButton.style.width = "24px";
    closeButton.style.height = "24px";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "14px";
    closeButton.title = "Kapat";

    closeButton.addEventListener("click", () => {
      parentFloatingPanel.style.display = "none";
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    parentFloatingPanel.appendChild(header);

    // Durum mesajı bölgesi
    const statusContainer = document.createElement("div");
    statusContainer.id = "event-tracker-status";
    statusContainer.style.padding = "10px";
    statusContainer.style.marginBottom = "15px";
    statusContainer.style.backgroundColor = "#f5f5f5";
    statusContainer.style.borderRadius = "4px";
    statusContainer.innerHTML =
      '<p>Firebase DebugView sayfasında olayları izlemek için "Başlat" düğmesine tıklayın.</p>';
    parentFloatingPanel.appendChild(statusContainer);

    // Başlat/Durdur butonu
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.marginBottom = "15px";

    const toggleButton = document.createElement("button");
    toggleButton.id = "event-tracker-toggle";
    toggleButton.textContent = "Başlat";
    toggleButton.style.padding = "8px 16px";
    toggleButton.style.border = "none";
    toggleButton.style.borderRadius = "4px";
    toggleButton.style.cursor = "pointer";
    toggleButton.style.fontWeight = "bold";
    toggleButton.style.backgroundColor = "#4CAF50";
    toggleButton.style.color = "white";
    toggleButton.style.minWidth = "100px";

    toggleButton.onclick = function () {
      console.log("Toggle butonu tıklandı");
      if (isTracking) {
        stopTracking();
      } else {
        startTracking();
      }
    };

    buttonContainer.appendChild(toggleButton);
    parentFloatingPanel.appendChild(buttonContainer);

    // Sonuçlar bölümü
    const resultsContainer = document.createElement("div");
    resultsContainer.id = "event-tracker-results";
    resultsContainer.style.display = "none";

    // Tabs
    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.marginBottom = "15px";
    tabs.style.borderBottom = "1px solid #eee";

    const allEventsTab = document.createElement("button");
    allEventsTab.textContent = "Tüm Tetiklenen Olaylar";
    allEventsTab.dataset.tab = "all-events";
    allEventsTab.classList.add("event-tracker-tab", "active");
    allEventsTab.style.background = "none";
    allEventsTab.style.padding = "8px 15px";
    allEventsTab.style.border = "none";
    allEventsTab.style.borderBottom = "2px solid #4285F4";
    allEventsTab.style.color = "#4285F4";
    allEventsTab.style.cursor = "pointer";

    const importantEventsTab = document.createElement("button");
    importantEventsTab.textContent = "Önemli Olaylar";
    importantEventsTab.dataset.tab = "important-events";
    importantEventsTab.classList.add("event-tracker-tab");
    importantEventsTab.style.background = "none";
    importantEventsTab.style.padding = "8px 15px";
    importantEventsTab.style.border = "none";
    importantEventsTab.style.borderBottom = "2px solid transparent";
    importantEventsTab.style.color = "#555";
    importantEventsTab.style.cursor = "pointer";

    // Tab içerikleri - Tüm Olaylar
    const allEventsContent = document.createElement("div");
    allEventsContent.id = "all-events-content";
    allEventsContent.classList.add("event-tracker-tab-content", "active");

    const allEventsTitle = document.createElement("h4");
    allEventsTitle.textContent = "Tüm Tetiklenen Olaylar";
    allEventsTitle.style.marginTop = "0";
    allEventsTitle.style.marginBottom = "10px";

    const copyAllButton = document.createElement("button");
    copyAllButton.textContent = "Kopyala";
    copyAllButton.style.backgroundColor = "#4285F4";
    copyAllButton.style.color = "white";
    copyAllButton.style.border = "none";
    copyAllButton.style.borderRadius = "4px";
    copyAllButton.style.padding = "5px 10px";
    copyAllButton.style.marginBottom = "10px";
    copyAllButton.style.cursor = "pointer";
    copyAllButton.dataset.target = "all-events-table";

    const allEventsTableContainer = document.createElement("div");
    allEventsTableContainer.style.maxHeight = "300px";
    allEventsTableContainer.style.overflowY = "auto";
    allEventsTableContainer.style.border = "1px solid #eee";
    allEventsTableContainer.style.borderRadius = "4px";

    const allEventsTable = document.createElement("table");
    allEventsTable.id = "all-events-table";
    allEventsTable.style.width = "100%";
    allEventsTable.style.borderCollapse = "collapse";

    const allEventsHead = document.createElement("thead");
    const allEventsHeaderRow = document.createElement("tr");

    const allEventsNameHeader = document.createElement("th");
    allEventsNameHeader.textContent = "Olay Adı";
    allEventsNameHeader.style.padding = "8px 12px";
    allEventsNameHeader.style.textAlign = "left";
    allEventsNameHeader.style.backgroundColor = "#f8f8f8";
    allEventsNameHeader.style.borderBottom = "1px solid #eee";

    const allEventsCountHeader = document.createElement("th");
    allEventsCountHeader.textContent = "Sayı";
    allEventsCountHeader.style.padding = "8px 12px";
    allEventsCountHeader.style.textAlign = "left";
    allEventsCountHeader.style.backgroundColor = "#f8f8f8";
    allEventsCountHeader.style.borderBottom = "1px solid #eee";

    const allEventsBody = document.createElement("tbody");
    allEventsBody.id = "all-events-body";

    allEventsHeaderRow.appendChild(allEventsNameHeader);
    allEventsHeaderRow.appendChild(allEventsCountHeader);
    allEventsHead.appendChild(allEventsHeaderRow);
    allEventsTable.appendChild(allEventsHead);
    allEventsTable.appendChild(allEventsBody);
    allEventsTableContainer.appendChild(allEventsTable);

    allEventsContent.appendChild(allEventsTitle);
    allEventsContent.appendChild(copyAllButton);
    allEventsContent.appendChild(allEventsTableContainer);

    // Tab içerikleri - Önemli Olaylar
    const importantEventsContent = document.createElement("div");
    importantEventsContent.id = "important-events-content";
    importantEventsContent.classList.add("event-tracker-tab-content");
    importantEventsContent.style.display = "none";

    const importantEventsTitle = document.createElement("h4");
    importantEventsTitle.textContent = "Önemli Olaylar";
    importantEventsTitle.style.marginTop = "0";
    importantEventsTitle.style.marginBottom = "10px";

    const copyImportantButton = document.createElement("button");
    copyImportantButton.textContent = "Kopyala";
    copyImportantButton.style.backgroundColor = "#4285F4";
    copyImportantButton.style.color = "white";
    copyImportantButton.style.border = "none";
    copyImportantButton.style.borderRadius = "4px";
    copyImportantButton.style.padding = "5px 10px";
    copyImportantButton.style.marginBottom = "10px";
    copyImportantButton.style.cursor = "pointer";
    copyImportantButton.dataset.target = "important-events-table";

    const importantEventsTableContainer = document.createElement("div");
    importantEventsTableContainer.style.maxHeight = "300px";
    importantEventsTableContainer.style.overflowY = "auto";
    importantEventsTableContainer.style.border = "1px solid #eee";
    importantEventsTableContainer.style.borderRadius = "4px";

    const importantEventsTable = document.createElement("table");
    importantEventsTable.id = "important-events-table";
    importantEventsTable.style.width = "100%";
    importantEventsTable.style.borderCollapse = "collapse";

    const importantEventsHead = document.createElement("thead");
    const importantEventsHeaderRow = document.createElement("tr");

    const importantEventsNameHeader = document.createElement("th");
    importantEventsNameHeader.textContent = "Olay Adı";
    importantEventsNameHeader.style.padding = "8px 12px";
    importantEventsNameHeader.style.textAlign = "left";
    importantEventsNameHeader.style.backgroundColor = "#f8f8f8";
    importantEventsNameHeader.style.borderBottom = "1px solid #eee";

    const importantEventsCountHeader = document.createElement("th");
    importantEventsCountHeader.textContent = "Sayı";
    importantEventsCountHeader.style.padding = "8px 12px";
    importantEventsCountHeader.style.textAlign = "left";
    importantEventsCountHeader.style.backgroundColor = "#f8f8f8";
    importantEventsCountHeader.style.borderBottom = "1px solid #eee";

    const importantEventsBody = document.createElement("tbody");
    importantEventsBody.id = "important-events-body";

    importantEventsHeaderRow.appendChild(importantEventsNameHeader);
    importantEventsHeaderRow.appendChild(importantEventsCountHeader);
    importantEventsHead.appendChild(importantEventsHeaderRow);
    importantEventsTable.appendChild(importantEventsHead);
    importantEventsTable.appendChild(importantEventsBody);
    importantEventsTableContainer.appendChild(importantEventsTable);

    importantEventsContent.appendChild(importantEventsTitle);
    importantEventsContent.appendChild(copyImportantButton);
    importantEventsContent.appendChild(importantEventsTableContainer);

    // Tab geçişleri için click listener ekle
    tabs.appendChild(allEventsTab);
    tabs.appendChild(importantEventsTab);

    allEventsTab.addEventListener("click", () => {
      document.querySelectorAll(".event-tracker-tab").forEach((tab) => {
        tab.classList.remove("active");
        tab.style.borderBottom = "2px solid transparent";
        tab.style.color = "#555";
      });
      allEventsTab.classList.add("active");
      allEventsTab.style.borderBottom = "2px solid #4285F4";
      allEventsTab.style.color = "#4285F4";

      document
        .querySelectorAll(".event-tracker-tab-content")
        .forEach((content) => {
          content.style.display = "none";
        });
      document.getElementById("all-events-content").style.display = "block";
    });

    importantEventsTab.addEventListener("click", () => {
      document.querySelectorAll(".event-tracker-tab").forEach((tab) => {
        tab.classList.remove("active");
        tab.style.borderBottom = "2px solid transparent";
        tab.style.color = "#555";
      });
      importantEventsTab.classList.add("active");
      importantEventsTab.style.borderBottom = "2px solid #4285F4";
      importantEventsTab.style.color = "#4285F4";

      document
        .querySelectorAll(".event-tracker-tab-content")
        .forEach((content) => {
          content.style.display = "none";
        });
      document.getElementById("important-events-content").style.display =
        "block";
    });

    // Kopyalama işlevini ekle
    [copyAllButton, copyImportantButton].forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const table = document.getElementById(targetId);

        let tableText = "";

        // Başlık satırı
        const headers = table.querySelectorAll("thead th");
        const headerRow = Array.from(headers).map((th) =>
          th.textContent.trim()
        );
        tableText += headerRow.join("\t") + "\n";

        // Veri satırları
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          const rowData = Array.from(cells).map((cell) =>
            cell.textContent.trim()
          );
          tableText += rowData.join("\t") + "\n";
        });

        navigator.clipboard
          .writeText(tableText)
          .then(() => {
            const originalText = button.textContent;
            button.textContent = "Kopyalandı!";
            button.style.backgroundColor = "#4CAF50";

            setTimeout(() => {
              button.textContent = originalText;
              button.style.backgroundColor = "#4285F4";
            }, 2000);
          })
          .catch((err) => {
            console.error("Kopyalama hatası:", err);
            alert("Kopyalama başarısız: " + err);
          });
      });
    });

    resultsContainer.appendChild(tabs);
    resultsContainer.appendChild(allEventsContent);
    resultsContainer.appendChild(importantEventsContent);
    parentFloatingPanel.appendChild(resultsContainer);

    // Anahtar Kelimeler bölümü
    const keywordsSection = document.createElement("div");
    keywordsSection.style.marginTop = "15px";
    keywordsSection.style.paddingTop = "15px";
    keywordsSection.style.borderTop = "1px solid #eee";

    const keywordsTitle = document.createElement("h4");
    keywordsTitle.textContent = "Anahtar Kelimeler";
    keywordsTitle.style.marginTop = "0";
    keywordsTitle.style.marginBottom = "10px";

    const keywordInputContainer = document.createElement("div");
    keywordInputContainer.style.display = "flex";
    keywordInputContainer.style.marginBottom = "10px";

    const keywordInput = document.createElement("input");
    keywordInput.id = "keyword-input";
    keywordInput.type = "text";
    keywordInput.placeholder = "Yeni anahtar kelime...";
    keywordInput.style.flexGrow = "1";
    keywordInput.style.padding = "6px 10px";
    keywordInput.style.border = "1px solid #ddd";
    keywordInput.style.borderRadius = "4px";
    keywordInput.style.marginRight = "5px";

    const addKeywordButton = document.createElement("button");
    addKeywordButton.textContent = "Ekle";
    addKeywordButton.style.backgroundColor = "#4285F4";
    addKeywordButton.style.color = "white";
    addKeywordButton.style.border = "none";
    addKeywordButton.style.borderRadius = "4px";
    addKeywordButton.style.padding = "5px 10px";
    addKeywordButton.style.cursor = "pointer";

    const keywordsList = document.createElement("div");
    keywordsList.id = "keywords-list";
    keywordsList.style.display = "flex";
    keywordsList.style.flexWrap = "wrap";
    keywordsList.style.gap = "5px";

    keywordInputContainer.appendChild(keywordInput);
    keywordInputContainer.appendChild(addKeywordButton);
    keywordsSection.appendChild(keywordsTitle);
    keywordsSection.appendChild(keywordInputContainer);
    keywordsSection.appendChild(keywordsList);

    parentFloatingPanel.appendChild(keywordsSection);

    // Paneli sayfaya ekle
    document.documentElement.appendChild(parentFloatingPanel);

    // Sürükleme işlevi ekle
    makeDraggable(parentFloatingPanel, header);

    // Anahtar kelime işlevleri
    updateKeywordsList();

    addKeywordButton.addEventListener("click", () => {
      const newKeyword = keywordInput.value.trim();

      if (newKeyword && !keywords.includes(newKeyword)) {
        keywords.push(newKeyword);
        updateKeywordsList();
        keywordInput.value = "";
        updateImportantEvents();
      }
    });

    keywordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const newKeyword = keywordInput.value.trim();

        if (newKeyword && !keywords.includes(newKeyword)) {
          keywords.push(newKeyword);
          updateKeywordsList();
          keywordInput.value = "";
          updateImportantEvents();
        }
      }
    });

    console.log("✅ Panel ana sayfaya eklendi");
  }

  // Anahtar kelime listesini güncelleme
  function updateKeywordsList() {
    const keywordsList = document.getElementById("keywords-list");
    if (!keywordsList) return;

    keywordsList.innerHTML = "";

    keywords.forEach((keyword) => {
      const tag = document.createElement("div");
      tag.className = "keyword-tag";
      tag.style.backgroundColor = "#e0e0e0";
      tag.style.padding = "4px 8px";
      tag.style.borderRadius = "4px";
      tag.style.display = "flex";
      tag.style.alignItems = "center";

      const text = document.createElement("span");
      text.textContent = keyword;

      const removeButton = document.createElement("span");
      removeButton.className = "remove-keyword";
      removeButton.textContent = "×";
      removeButton.style.marginLeft = "5px";
      removeButton.style.color = "#666";
      removeButton.style.cursor = "pointer";
      removeButton.style.fontWeight = "bold";

      removeButton.addEventListener("click", () => {
        keywords = keywords.filter((k) => k !== keyword);
        updateKeywordsList();
        updateImportantEvents();
      });

      tag.appendChild(text);
      tag.appendChild(removeButton);
      keywordsList.appendChild(tag);
    });
  }

  // Tracking başlat
  function startTracking() {
    if (isTracking) return;

    console.log("=== EVENT İZLEME BAŞLATILIYOR ===");
    isTracking = true;
    eventsCount = {};

    const toggleButton = document.getElementById("event-tracker-toggle");
    if (toggleButton) {
      toggleButton.textContent = "Durdur";
      toggleButton.style.backgroundColor = "#F44336";
    }
    updatePanelStatus("Tracking aktif...");

    const resultsContainer = document.getElementById("event-tracker-results");
    if (resultsContainer) {
      resultsContainer.style.display = "block";
      updateAllEvents();
      updateImportantEvents();
    }

    sendMessageToIframes({ type: "FIREBASE_EVENT_TRACKER_START_TRACKING" });
  }

  // Tracking durdur
  function stopTracking() {
    if (!isTracking) return;

    console.log("Event izleme durduruldu");
    isTracking = false;

    const toggleButton = document.getElementById("event-tracker-toggle");
    if (toggleButton) {
      toggleButton.textContent = "Başlat";
      toggleButton.style.backgroundColor = "#4CAF50";
    }
    updatePanelStatus("Tracking durduruldu");

    sendMessageToIframes({ type: "FIREBASE_EVENT_TRACKER_STOP_TRACKING" });
  }

  // iframe'den event geldiğinde
  function handleEventFromIframe(eventName, allEvents) {
    if (allEvents) {
      eventsCount = allEvents;
    } else {
      eventsCount[eventName] = (eventsCount[eventName] || 0) + 1;
    }
    updateAllEvents();
    updateImportantEvents();
  }

  // Tüm eventleri güncelle
  function updateAllEvents() {
    const tbody = document.getElementById("all-events-body");
    if (!tbody) return;

    if (Object.keys(eventsCount).length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #999;">Henüz olay tespit edilmedi</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    const sortedEvents = Object.entries(eventsCount).sort(
      (a, b) => b[1] - a[1]
    );

    sortedEvents.forEach(([eventName, count]) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = eventName;
      nameCell.style.padding = "8px 12px";
      nameCell.style.borderBottom = "1px solid #eee";

      const countCell = document.createElement("td");
      countCell.textContent = count;
      countCell.style.padding = "8px 12px";
      countCell.style.borderBottom = "1px solid #eee";

      row.appendChild(nameCell);
      row.appendChild(countCell);
      tbody.appendChild(row);
    });
  }

  // Önemli eventleri güncelle
  function updateImportantEvents() {
    const tbody = document.getElementById("important-events-body");
    if (!tbody) return;

    const importantEvents = {};

    Object.entries(eventsCount).forEach(([eventName, count]) => {
      const lowerEventName = eventName.toLowerCase();
      if (
        keywords.some((keyword) =>
          lowerEventName.includes(keyword.toLowerCase())
        )
      ) {
        importantEvents[eventName] = count;
      }
    });

    if (Object.keys(importantEvents).length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #999;">Henüz önemli olay tespit edilmedi</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    const sortedEvents = Object.entries(importantEvents).sort(
      (a, b) => b[1] - a[1]
    );

    sortedEvents.forEach(([eventName, count]) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = eventName;
      nameCell.style.padding = "8px 12px";
      nameCell.style.borderBottom = "1px solid #eee";

      const countCell = document.createElement("td");
      countCell.textContent = count;
      countCell.style.padding = "8px 12px";
      countCell.style.borderBottom = "1px solid #eee";

      row.appendChild(nameCell);
      row.appendChild(countCell);
      tbody.appendChild(row);
    });
  }

  // Panel status güncelle
  function updatePanelStatus(status) {
    const statusContainer = document.getElementById("event-tracker-status");
    if (statusContainer) {
      statusContainer.innerHTML = `<p>${status}</p>`;
    }
  }

  // Sürüklenebilir yap
  function makeDraggable(element, handle) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    handle.onmousedown = (e) => {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = () => {
        document.onmouseup = null;
        document.onmousemove = null;
      };
      document.onmousemove = (e) => {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = element.offsetTop - pos2 + "px";
        element.style.left = element.offsetLeft - pos1 + "px";
        element.style.right = "auto";
      };
    };
  }

  // iframe'lere mesaj gönder
  function sendMessageToIframes(message) {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow.postMessage(message, "*");
      } catch (e) {
        console.warn("iframe mesaj hatası:", e);
      }
    });
  }

  // Parent hazır olduğunda iframe'lere bildir
  setTimeout(() => {
    sendMessageToIframes({ type: "FIREBASE_EVENT_TRACKER_PARENT_READY" });
  }, 1000);
})(); // IIFE kapanışı
