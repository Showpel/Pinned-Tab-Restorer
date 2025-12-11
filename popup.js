// popup.js

document.addEventListener('DOMContentLoaded', () => {
  renderList();

  document.getElementById('add-current').addEventListener('click', addCurrentTab);
});

function renderList() {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const savedUrls = result.pinnedTabs || [];
    const listElement = document.getElementById('tab-list');
    listElement.innerHTML = '';

    if (savedUrls.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No pinned tabs saved.';
      listElement.appendChild(empty);
      return;
    }

    savedUrls.forEach((url, index) => {
      const li = document.createElement('li');

      const textSpan = document.createElement('span');
      textSpan.className = 'url-text';
      textSpan.textContent = url;
      textSpan.title = url; // Tooltip for full URL

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Remove';
      deleteBtn.onclick = () => deleteUrl(index);

      li.appendChild(textSpan);
      li.appendChild(deleteBtn);
      listElement.appendChild(li);
    });
  });
}

function deleteUrl(index) {
  chrome.storage.local.get(['pinnedTabs'], (result) => {
    const savedUrls = result.pinnedTabs || [];
    savedUrls.splice(index, 1);
    chrome.storage.local.set({ pinnedTabs: savedUrls }, () => {
      renderList();
    });
  });
}

function addCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const newUrl = tabs[0].url;
      chrome.tabs.update(tabs[0].id, { pinned: true }); // Also pin it in browser

      // Note: background.js listener might catch this update, but we also manually add 
      // to ensure UI updates immediately and if background logic is debounced or async
      chrome.storage.local.get(['pinnedTabs'], (result) => {
        const savedUrls = result.pinnedTabs || [];
        if (!savedUrls.includes(newUrl)) {
          savedUrls.push(newUrl);
          chrome.storage.local.set({ pinnedTabs: savedUrls }, () => {
            renderList();
          });
        }
      });
    }
  });
}
