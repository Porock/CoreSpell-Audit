const toggleBtn = document.getElementById('toggleBtn');
const statusDiv = document.getElementById('status');
const statsDiv = document.getElementById('stats');
const errorCount = document.getElementById('errorCount');
const errorCountSection = document.getElementById('errorCountSection');
const dictCount = document.getElementById('dictCount');
const clearDictBtn = document.getElementById('clearDictBtn');
const viewDictBtn = document.getElementById('viewDictBtn');

// Обновление UI
function updateUI(isActive, count = 0, dictionarySize = 0) {
  if (isActive) {
    statusDiv.className = 'status active';
    statusDiv.querySelector('.status-text').textContent = 'Проверка активна';
    toggleBtn.textContent = 'Отключить проверку';
    statsDiv.style.display = 'block';
    errorCount.textContent = count;
  } else {
    statusDiv.className = 'status inactive';
    statusDiv.querySelector('.status-text').textContent = 'Проверка отключена';
    toggleBtn.textContent = 'Включить проверку';
    statsDiv.style.display = 'none';
  }
  
  dictCount.textContent = `${dictionarySize} слов${dictionarySize === 1 ? 'о' : dictionarySize < 5 ? 'а' : ''}`;
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
        // Закрываем popup после отправки сообщения
        /*setTimeout(() => {
          window.close();
        }, 100); */
      });
    }
  });
});

// Очистка словаря
clearDictBtn.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите очистить весь пользовательский словарь?')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'clearDictionary' }, (response) => {
        if (response && response.success) {
          dictCount.textContent = '0 слов';
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
          alert('Словарь пуст');
        } else {
          const wordList = words.join('\n');
          alert(`Слова в словаре (${words.length}):\n\n${wordList}`);
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