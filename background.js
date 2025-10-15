// Background script для обработки событий расширения

chrome.runtime.onInstalled.addListener(() => {
  console.log('CoreSpell Audit установлен');
});

// Можно добавить контекстное меню (по желанию)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'qaCheckText',
    title: 'Проверить текст на странице (CoreSpell)',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'qaCheckText') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});