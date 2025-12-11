// background.js

// Function to save current pinned tabs
function savePinnedTabs() {
  chrome.tabs.query({ pinned: true }, (tabs) => {
    // Deduplicate URLs using Set
    const pinnedTabs = [...new Set(tabs.map(tab => tab.url))];
    chrome.storage.local.set({ pinnedTabs }, () => {
      console.log('Pinned tabs saved (unique):', pinnedTabs);
    });
  });
}

// Function to restore pinned tabs
// windowId: optional, if provided, restores to that specific window
function restorePinnedTabs(windowId) {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const savedUrls = result.pinnedTabs;
    if (savedUrls && savedUrls.length > 0) {
      if (windowId) {
        // Restore to specific window
        savedUrls.forEach(url => {
          chrome.tabs.create({ windowId: windowId, url: url, pinned: true, active: false });
        });
      } else {
        // Startup restore (default window)
        chrome.tabs.query({ pinned: true }, (currentPinnedTabs) => {
          const currentUrls = currentPinnedTabs.map(t => t.url);

          savedUrls.forEach(url => {
            if (!currentUrls.includes(url)) {
              chrome.tabs.create({ url: url, pinned: true, active: false });
            }
          });
        });
      }
    }
  });
}

// Event Listeners to trigger saving
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.pinned !== undefined || (tab.pinned && changeInfo.url)) {
    savePinnedTabs();
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pinned) {
    savePinnedTabs();
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  savePinnedTabs();
});

chrome.tabs.onDetached.addListener(() => savePinnedTabs());
chrome.tabs.onAttached.addListener(() => savePinnedTabs());


// Restore on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, restoring tabs...');
  restorePinnedTabs();
});

// Restore on new window creation
chrome.windows.onCreated.addListener((window) => {
  console.log('Window created:', window);
  // Only restore for normal windows
  if (window.type === 'normal') {
    // Use a small timeout to ensure the window is initialized?
    // Sometimes onCreated fires before the window is fully ready to accept tabs in some OS/Chrome versions,
    // but generally it's fine. Adding a small log and direct call.
    restorePinnedTabs(window.id);
  }
});

// Also restore on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
  savePinnedTabs();
});
