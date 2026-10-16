declare const chrome: any;

if (typeof chrome !== "undefined" && chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: unknown) => console.warn("sidePanel error:", err));
}
