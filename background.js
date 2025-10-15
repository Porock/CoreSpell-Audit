// Background script для обработки событий расширения

chrome.runtime.onInstalled.addListener(() => {
  console.log('CoreSpell Audit installed');
  
  // Устанавливаем язык по умолчанию
  chrome.storage.local.get(['language'], (result) => {
    if (!result.language) {
      chrome.storage.local.set({ language: 'en' });
    }
  });
});

// Контекстное меню
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'qaCheckText',
    title: 'Check text on page (CoreSpell)',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'qaCheckText') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});