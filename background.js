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
      // Determine which window to check/restore to
      const targetWindowId = windowId || chrome.windows.WINDOW_ID_CURRENT;

      // Query tabs in the target window to avoid duplicates
      chrome.tabs.query({ windowId: targetWindowId, pinned: true }, (currentPinnedTabs) => {
        const currentUrls = currentPinnedTabs.map(t => t.url);
        // Also check unpinned tabs just in case? No, purely pinned.

        savedUrls.forEach(url => {
          // Avoid restoring if it's already there (exact match)
          if (!currentUrls.includes(url)) {
            chrome.tabs.create({ windowId: windowId, url: url, pinned: true, active: false });
          } else {
            console.log(`Skipping duplicate restore for: ${url}`);
          }
        });
      });
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
  console.log('Extension started.');
  // onCreated handles the initial window restore, so we skip it here to avoid duplication.
  // restorePinnedTabs();
});

// Restore on new window creation
chrome.windows.onCreated.addListener((window) => {
  console.log('Window created:', window);
  // Only restore for normal windows
  if (window.type === 'normal') {
    // Startup Race Condition Logic:
    // When Chrome starts (Cmd+Q -> Open), it might restore session tabs natively.
    // If we run immediately, we see 0 tabs, add ours, then Chrome adds theirs -> Duplicates.
    // We wait 1000ms to let Chrome finish its native restore.
    setTimeout(() => {
      restorePinnedTabs(window.id);
    }, 1000);
  }
});

// Also restore on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
  savePinnedTabs();
});
