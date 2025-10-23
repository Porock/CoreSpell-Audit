// Локализация для CoreSpell Audit
const i18n = {
  en: {
    // Popup
    extensionName: 'CoreSpell Audit',
    statusActive: 'Check active',
    statusInactive: 'Check disabled',
    buttonEnable: 'Enable Check',
    buttonDisable: 'Disable Check',
    errorsFound: 'Errors found',
    clickToNavigate: '(click to navigate)',
    words: 'words',
    word: 'word',
    
    // Dictionary section
    dictionaryTitle: 'Custom Dictionary',
    viewDictionary: 'View Dictionary',
    clearDictionary: 'Clear Dictionary',
    clearConfirm: 'Are you sure you want to clear the entire custom dictionary?',
    dictionaryEmpty: 'Dictionary is empty',
    wordsInDictionary: 'Words in dictionary',
    
    // Info text
    infoText: 'Click on underlined error to see suggestions or add word to dictionary.',
    
    // Notifications
    checkStarted: 'Checking started...',
    checkingProgress: 'Checking',
    errorsFoundNotif: 'Errors found',
    noErrors: 'No errors found',
    checkDisabled: 'Check disabled',
    addedToDictionary: 'added to dictionary',
    dictionaryCleared: 'Dictionary cleared',
    noTextFound: 'No text found to check',
    errorNavigation: 'Error',
    of: 'of',
    
    // Modal
    errorFoundTitle: 'Error Found',
    wordLabel: 'Word:',
    suggestionsLabel: 'Suggestions:',
    addToDictButton: 'Add to Dictionary',
    skipButton: 'Skip',
    copied: 'Copied',
    
    // Context menu
    contextMenuCheck: 'Check text on page (CoreSpell)',
    
    // Language switcher
    languageLabel: 'Language:',
    languageEn: 'English',
    languageRu: 'Русский',
    
    // Export
    exportReport: 'Export Errors Report',
    exportSuccess: 'Report exported successfully',
    exportNoErrors: 'No errors to export'
  },
  
  ru: {
    // Popup
    extensionName: 'CoreSpell Audit',
    statusActive: 'Проверка активна',
    statusInactive: 'Проверка отключена',
    buttonEnable: 'Включить проверку',
    buttonDisable: 'Отключить проверку',
    errorsFound: 'Найдено ошибок',
    clickToNavigate: '(кликните для навигации)',
    words: 'слов',
    word: 'слово',
    
    // Dictionary section
    dictionaryTitle: 'Пользовательский словарь',
    viewDictionary: 'Просмотреть словарь',
    clearDictionary: 'Очистить словарь',
    clearConfirm: 'Вы уверены, что хотите очистить весь пользовательский словарь?',
    dictionaryEmpty: 'Словарь пуст',
    wordsInDictionary: 'Слова в словаре',
    
    // Info text
    infoText: 'Нажмите на подчеркнутую ошибку, чтобы увидеть предложения или добавить исключение в словарь.',
    
    // Notifications
    checkStarted: 'Проверка начата...',
    checkingProgress: 'Проверка',
    errorsFoundNotif: 'Найдено ошибок',
    noErrors: 'Ошибки не найдены',
    checkDisabled: 'Проверка отключена',
    addedToDictionary: 'добавлено в словарь',
    dictionaryCleared: 'Словарь очищен',
    noTextFound: 'Текст для проверки не найден',
    errorNavigation: 'Ошибка',
    of: 'из',
    
    // Modal
    errorFoundTitle: 'Найдена ошибка',
    wordLabel: 'Слово:',
    suggestionsLabel: 'Предложения:',
    addToDictButton: 'Добавить в словарь',
    skipButton: 'Пропустить',
    copied: 'Скопировано',
    
    // Context menu
    contextMenuCheck: 'Проверить текст на странице (CoreSpell)',
    
    // Language switcher
    languageLabel: 'Язык:',
    languageEn: 'English',
    languageRu: 'Русский',
    
    // Export
    exportReport: 'Экспорт отчета об ошибках',
    exportSuccess: 'Отчет успешно экспортирован',
    exportNoErrors: 'Нет ошибок для экспорта'
  }
};

// Получение текущего языка
function getCurrentLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['language'], (result) => {
      resolve(result.language || 'en'); // По умолчанию английский
    });
  });
}

// Сохранение языка
function saveLanguage(lang) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ language: lang }, () => {
      resolve();
    });
  });
}

// Получение переведенного текста
function t(key, lang = 'en') {
  return i18n[lang][key] || key;
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, getCurrentLanguage, saveLanguage, t };
}