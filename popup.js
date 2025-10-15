const toggleBtn = document.getElementById('toggleBtn');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const statsDiv = document.getElementById('stats');
const errorCount = document.getElementById('errorCount');
const errorCountSection = document.getElementById('errorCountSection');
const dictCount = document.getElementById('dictCount');
const clearDictBtn = document.getElementById('clearDictBtn');
const viewDictBtn = document.getElementById('viewDictBtn');
const langButtons = document.querySelectorAll('.lang-btn');

// Текущий язык
let currentLang = 'en';

// Загрузка языка при открытии popup
getCurrentLanguage().then(lang => {
  currentLang = lang;
  updateLanguageUI(lang);
  updateAllTexts(lang);
});

// Обновление UI языковых кнопок
function updateLanguageUI(lang) {
  langButtons.forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Обновление всех текстов
function updateAllTexts(lang) {
  document.getElementById('extensionName').textContent = t('extensionName', lang);
  document.getElementById('errorsFoundLabel').textContent = t('errorsFound', lang);
  document.getElementById('clickHint').textContent = t('clickToNavigate', lang);
  document.getElementById('dictionaryTitle').textContent = `📚 ${t('dictionaryTitle', lang)}`;
  document.getElementById('viewDictBtn').textContent = t('viewDictionary', lang);
  document.getElementById('clearDictBtn').textContent = t('clearDictionary', lang);
  document.getElementById('infoText').textContent = t('infoText', lang);
  
  // Обновляем tooltip
  errorCountSection.title = t('clickToNavigate', lang);
}

// Переключение языка
langButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    currentLang = lang;
    saveLanguage(lang);
    updateLanguageUI(lang);
    updateAllTexts(lang);
    
    // Отправляем сообщение content script о смене языка
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'changeLanguage', 
          language: lang 
        });
      }
    });
  });
});

// Обновление UI
function updateUI(isActive, count = 0, dictionarySize = 0) {
  if (isActive) {
    statusDiv.className = 'status active';
    statusText.textContent = t('statusActive', currentLang);
    toggleBtn.textContent = t('buttonDisable', currentLang);
    statsDiv.style.display = 'block';
    errorCount.textContent = count;
  } else {
    statusDiv.className = 'status inactive';
    statusText.textContent = t('statusInactive', currentLang);
    toggleBtn.textContent = t('buttonEnable', currentLang);
    statsDiv.style.display = 'none';
  }
  
  const wordsLabel = dictionarySize === 1 ? t('word', currentLang) : t('words', currentLang);
  dictCount.textContent = `${dictionarySize} ${wordsLabel}`;
}

// Получаем текущее состояние при открытии popup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'getState' }, (response) => {
    if (response) {
      updateUI(response.isActive, response.errorCount, response.dictionarySize);
    }
  });
});

// Обработка клика по кнопке
toggleBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, (response) => {
      if (response) {
        // Запрашиваем обновленное состояние после переключения
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getState' }, (stateResponse) => {
          if (stateResponse) {
            updateUI(stateResponse.isActive, stateResponse.errorCount, stateResponse.dictionarySize);
          }
        });
      }
    });
  });
});

// Клик по счетчику ошибок для навигации
errorCountSection.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scrollToNextError' }, (response) => {
        // Не закрываем popup - убрали window.close()
        console.log('Scrolled to next error');
      });
    }
  });
});

// Очистка словаря
clearDictBtn.addEventListener('click', () => {
  const confirmMsg = t('clearConfirm', currentLang);
  if (confirm(confirmMsg)) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'clearDictionary' }, (response) => {
        if (response && response.success) {
          updateUI(false, 0, 0);
        }
      });
    });
  }
});

// Просмотр словаря
viewDictBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getDictionary' }, (response) => {
      if (response && response.dictionary) {
        const words = response.dictionary;
        if (words.length === 0) {
          alert(t('dictionaryEmpty', currentLang));
        } else {
          const wordList = words.join('\n');
          const title = t('wordsInDictionary', currentLang);
          alert(`${title} (${words.length}):\n\n${wordList}`);
        }
      }
    });
  });
});

// Слушаем обновления состояния
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'updateState') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getState' }, (response) => {
        if (response) {
          updateUI(response.isActive, response.errorCount, response.dictionarySize);
        }
      });
    });
  }
});