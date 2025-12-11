// background.js

// Function to save current pinned tabs
function savePinnedTabs() {
  chrome.tabs.query({ pinned: true }, (tabs) => {
    const pinnedTabs = tabs.map(tab => tab.url);
    chrome.storage.local.set({ pinnedTabs }, () => {
      console.log('Pinned tabs saved:', pinnedTabs);
    });
  });
}

// Function to restore pinned tabs on startup
function restorePinnedTabs() {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const savedUrls = result.pinnedTabs;
    if (savedUrls && savedUrls.length > 0) {
      // Get current tabs to avoid duplicates if Chrome already restored them
      chrome.tabs.query({ pinned: true }, (currentPinnedTabs) => {
        const currentUrls = currentPinnedTabs.map(t => t.url);

        savedUrls.forEach(url => {
          // Simple check to avoid restoring if it's already there
          // Note: exact URL match might miss some dynamic parameters but good for now
          if (!currentUrls.includes(url)) {
            chrome.tabs.create({ url: url, pinned: true, active: false });
          }
        });
      });
    }
  });
}

// Event Listeners to trigger saving
// 1. Tab updated (e.g. navigation, pin status change)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.pinned !== undefined || (tab.pinned && changeInfo.url)) {
    savePinnedTabs();
  }
});

// 2. Tab created (if created as pinned)
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pinned) {
    savePinnedTabs();
  }
});

// 3. Tab removed (if it was pinned, we need to update list)
// Since we don't know the state of the closed tab easily in onRemoved without keeping state,
// we just re-query everything. In MV3 service workers, state is volatile, so re-query is safer.
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  savePinnedTabs();
});

// 4. Tab detached/attached (moving between windows)
chrome.tabs.onDetached.addListener(() => savePinnedTabs());
chrome.tabs.onAttached.addListener(() => savePinnedTabs());


// Restore on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, restoring tabs...');
  restorePinnedTabs();
});

// Also restore on installation for testing immediately
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
  // Optional: restore triggers on install too? 
  // Maybe better not to force open tabs on install unless user wants it. 
  // keeping it commented out or simple log.
  savePinnedTabs(); // Initialize storage with current state
});
