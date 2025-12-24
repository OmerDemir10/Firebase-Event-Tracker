// Firebase DebugView Event Tracker - Background Script

chrome.runtime.onInstalled.addListener(() => {
  console.log("Firebase DebugView Event Tracker yüklendi");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.action === "startScanAll") {
    broadcastToAnalyticsFrames(tabId, { action: "startScan" });
    sendResponse({ success: true });
  } else if (message.action === "stopScanAll") {
    broadcastToAnalyticsFrames(tabId, { action: "stopScan" });
    sendResponse({ success: true });
  } else if (message.action === "eventsFound") {
    console.log("📊 Event'ler alındı:", message.events);
    chrome.tabs
      .sendMessage(tabId, {
        action: "iframeEvents",
        events: message.events,
      })
      .catch(() => {});
    sendResponse({ success: true });
  }

  return false;
});

async function broadcastToAnalyticsFrames(tabId, message) {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    for (const frame of frames) {
      if (frame.url?.includes("analytics.google.com")) {
        console.log("📊 Analytics iframe'e mesaj gönderiliyor:", frame.frameId);
        chrome.tabs
          .sendMessage(tabId, message, { frameId: frame.frameId })
          .catch(() => {});
      }
    }
  } catch (e) {
    console.log("Broadcast error:", e);
  }
}
