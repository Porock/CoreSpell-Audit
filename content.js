// Состояние проверки
let isCheckerActive = false;
let originalHTML = '';
let errorCache = new Map();
let processingQueue = [];
let isProcessing = false;
let customDictionary = new Set();
let currentErrorIndex = 0;
let allErrors = [];
let currentLang = 'en'; // По умолчанию английский

// API Yandex.Speller
const SPELLER_API = 'https://speller.yandex.net/services/spellservice.json/checkTexts';

// Локализация (встроенная копия из locales.js)
const translations = {
  en: {
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
    errorFoundTitle: 'Error Found',
    wordLabel: 'Word:',
    suggestionsLabel: 'Suggestions:',
    addToDictButton: 'Add to Dictionary',
    skipButton: 'Skip',
    copied: 'Copied',
    exportSuccess: 'Report exported successfully',
    exportNoErrors: 'No errors to export'
  },
  ru: {
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
    errorFoundTitle: 'Найдена ошибка',
    wordLabel: 'Слово:',
    suggestionsLabel: 'Предложения:',
    addToDictButton: 'Добавить в словарь',
    skipButton: 'Пропустить',
    copied: 'Скопировано',
    exportSuccess: 'Отчет успешно экспортирован',
    exportNoErrors: 'Нет ошибок для экспорта'
  }
};

// Функция перевода
function t(key) {
  return translations[currentLang][key] || key;
}

// Загружаем словарь и язык из хранилища при запуске
chrome.storage.local.get(['customDictionary', 'language'], (result) => {
  if (result.customDictionary) {
    customDictionary = new Set(result.customDictionary);
    console.log('Loaded dictionary:', customDictionary.size, 'words');
  }
  if (result.language) {
    currentLang = result.language;
    console.log('Loaded language:', currentLang);
  }
});

// Сохранение словаря
function saveDictionary() {
  chrome.storage.local.set({ 
    customDictionary: Array.from(customDictionary) 
  }, () => {
    console.log('Dictionary saved');
  });
}

// Функция прокрутки к следующей ошибке
function scrollToNextError() {
  // Обновляем список ошибок
  allErrors = Array.from(document.querySelectorAll('.qa-text-error'));
  
  console.log('Total errors found:', allErrors.length);
  console.log('Current index:', currentErrorIndex);
  
  if (allErrors.length === 0) {
    showNotification(t('noErrors', currentLang), 'info');
    return;
  }
  
  // Если индекс вышел за пределы (после удаления ошибок), сбрасываем
  if (currentErrorIndex >= allErrors.length) {
    currentErrorIndex = 0;
  }
  
  // Убираем предыдущую подсветку
  allErrors.forEach(el => el.classList.remove('qa-text-highlight'));
  
  // Получаем текущую ошибку
  const currentError = allErrors[currentErrorIndex];
  
  console.log('Scrolling to error:', currentError.textContent);
  
  // Добавляем подсветку
  currentError.classList.add('qa-text-highlight');
  
  // Прокручиваем к элементу с отступом
  const elementRect = currentError.getBoundingClientRect();
  const absoluteElementTop = elementRect.top + window.pageYOffset;
  const middle = absoluteElementTop - (window.innerHeight / 2);
  
  window.scrollTo({
    top: middle,
    behavior: 'smooth'
  });
  
  // Показываем уведомление
  showNotification(`${t('errorNavigation', currentLang)} ${currentErrorIndex + 1} ${t('of', currentLang)} ${allErrors.length}`, 'info');
  
  // Переходим к следующей ошибке (циклично)
  currentErrorIndex = (currentErrorIndex + 1) % allErrors.length;
  
  console.log('Next index will be:', currentErrorIndex);
}

// Функция для проверки текста через API
async function checkTextWithAPI(texts) {
  try {
    const formData = new URLSearchParams();
    texts.forEach(text => {
      formData.append('text', text);
    });
    
    const response = await fetch(SPELLER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    if (!response.ok) throw new Error('API request failed');
    
    const results = await response.json();
    return results;
  } catch (error) {
    console.error('Check error:', error);
    return [];
  }
}

// Извлечение всех текстовых блоков
function extractTextBlocks(element) {
  const blocks = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Игнорируем скрипты, стили и пустые узлы
        const parent = node.parentElement;
        if (!parent || 
            parent.tagName === 'SCRIPT' || 
            parent.tagName === 'STYLE' ||
            parent.tagName === 'NOSCRIPT' ||
            !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 0) {
      blocks.push({
        node: node,
        text: text,
        parent: node.parentElement
      });
    }
  }
  
  return blocks;
}

// Разбивка на батчи для API (Yandex ограничение - до 10000 символов на запрос)
function createBatches(blocks, maxChars = 9000) {
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;
  
  blocks.forEach(block => {
    const textLength = block.text.length;
    
    if (currentLength + textLength > maxChars && currentBatch.length > 0) {
      batches.push([...currentBatch]);
      currentBatch = [block];
      currentLength = textLength;
    } else {
      currentBatch.push(block);
      currentLength += textLength;
    }
  });
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  return batches;
}

// Обработка результатов и подсветка ошибок
function highlightErrors(blocks, apiResults) {
  let totalErrors = 0;
  
  apiResults.forEach((errors, index) => {
    if (!errors || errors.length === 0 || !blocks[index]) return;
    
    const block = blocks[index];
    const parent = block.parent;
    const originalText = block.text;
    
    // Фильтруем ошибки, которые есть в словаре
    const filteredErrors = errors.filter(error => {
      const errorWord = originalText.substring(error.pos, error.pos + error.len).toLowerCase();
      return !customDictionary.has(errorWord);
    });
    
    if (filteredErrors.length === 0) return;
    
    // Сортируем ошибки по позиции (с конца, чтобы индексы не сбивались)
    const sortedErrors = [...filteredErrors].sort((a, b) => b.pos - a.pos);
    
    let modifiedText = originalText;
    const replacements = [];
    
    sortedErrors.forEach(error => {
      const errorWord = originalText.substring(error.pos, error.pos + error.len);
      const suggestions = error.s.join(', ');
      
      replacements.push({
        pos: error.pos,
        len: error.len,
        word: errorWord,
        suggestions: suggestions
      });
      
      totalErrors++;
    });
    
    // Создаем новый HTML с подсветкой
    if (replacements.length > 0) {
      let result = '';
      let lastPos = 0;
      
      // Сортируем обратно по возрастанию для корректной вставки
      replacements.reverse().forEach(rep => {
        result += escapeHtml(modifiedText.substring(lastPos, rep.pos));
        result += `<span class="qa-text-error" data-word="${escapeHtml(rep.word)}" data-suggestions="${escapeHtml(rep.suggestions)}" title="Suggestions: ${escapeHtml(rep.suggestions)}">${escapeHtml(rep.word)}</span>`;
        lastPos = rep.pos + rep.len;
      });
      result += escapeHtml(modifiedText.substring(lastPos));
      
      // Создаем обертку для замены
      const wrapper = document.createElement('span');
      wrapper.className = 'qa-text-wrapper';
      wrapper.innerHTML = result;
      
      // Заменяем текстовый узел
      if (block.node.parentNode) {
        block.node.parentNode.replaceChild(wrapper, block.node);
      }
    }
  });
  
  return totalErrors;
}

// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Основная функция проверки
async function performCheck() {
  showNotification(t('checkStarted', currentLang), 'info');
  
  // Сохраняем оригинальный HTML
  originalHTML = document.body.innerHTML;
  
  // Извлекаем текстовые блоки
  const blocks = extractTextBlocks(document.body);
  
  if (blocks.length === 0) {
    showNotification(t('noTextFound', currentLang), 'warning');
    return 0;
  }
  
  // Разбиваем на батчи
  const batches = createBatches(blocks);
  let totalErrors = 0;
  
  // Обрабатываем батчи
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const texts = batch.map(b => b.text);
    
    showNotification(`${t('checkingProgress', currentLang)} ${i + 1}/${batches.length}...`, 'info');
    
    const results = await checkTextWithAPI(texts);
    const errorsFound = highlightErrors(batch, results);
    totalErrors += errorsFound;
    
    // Небольшая задержка между запросами
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return totalErrors;
}

// Включение/выключение проверки
async function toggleChecker() {
  isCheckerActive = !isCheckerActive;
  
  if (isCheckerActive) {
    const errorCount = await performCheck();
    const message = errorCount > 0 ? 
      `${t('errorsFoundNotif', currentLang)}: ${errorCount}` : 
      t('noErrors', currentLang);
    showNotification(message, errorCount > 0 ? 'error' : 'success');
    
    // Сбрасываем индекс при новой проверке
    currentErrorIndex = 0;
    allErrors = Array.from(document.querySelectorAll('.qa-text-error'));
    
    chrome.runtime.sendMessage({
      action: 'updateState',
      isActive: isCheckerActive,
      errorCount: errorCount
    });
  } else {
    restoreOriginalText();
    showNotification(t('checkDisabled', currentLang), 'info');
    currentErrorIndex = 0;
    allErrors = [];
    
    chrome.runtime.sendMessage({
      action: 'updateState',
      isActive: isCheckerActive,
      errorCount: 0
    });
  }
}

// Восстановление оригинального текста
function restoreOriginalText() {
  if (originalHTML) {
    document.body.innerHTML = originalHTML;
    originalHTML = '';
  }
}

// Уведомление
function showNotification(message, type = 'info') {
  // Удаляем предыдущее уведомление
  const existing = document.querySelector('.qa-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `qa-notification qa-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('qa-notification-show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('qa-notification-show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Обработка кликов по ошибкам
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('qa-text-error')) {
    const word = e.target.getAttribute('data-word');
    const suggestions = e.target.getAttribute('data-suggestions');
    
    showErrorModal(word, suggestions.split(', '));
  }
}, true);

// Модальное окно для исправлений
function showErrorModal(word, suggestions) {
  const modal = document.createElement('div');
  modal.className = 'qa-modal';
  modal.innerHTML = `
    <div class="qa-modal-content">
      <div class="qa-modal-header">
        <strong>${t('errorFoundTitle', currentLang)}</strong>
        <button class="qa-modal-close">×</button>
      </div>
      <div class="qa-modal-body">
        <p><strong>${t('wordLabel', currentLang)}</strong> <span class="qa-error-word">${escapeHtml(word)}</span></p>
        <p><strong>${t('suggestionsLabel', currentLang)}</strong></p>
        <ul class="qa-suggestions">
          ${suggestions.map(s => `<li class="qa-suggestion-item">${escapeHtml(s)}</li>`).join('')}
        </ul>
        <div class="qa-modal-actions">
          <button class="qa-btn qa-btn-add-dict">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            ${t('addToDictButton', currentLang)}
          </button>
          <button class="qa-btn qa-btn-ignore">${t('skipButton', currentLang)}</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => modal.classList.add('qa-modal-show'), 10);
  
  const closeBtn = modal.querySelector('.qa-modal-close');
  const addDictBtn = modal.querySelector('.qa-btn-add-dict');
  const ignoreBtn = modal.querySelector('.qa-btn-ignore');
  
  const closeModal = () => {
    modal.classList.remove('qa-modal-show');
    setTimeout(() => modal.remove(), 300);
  };
  
  // Добавление в словарь
  addDictBtn.addEventListener('click', () => {
    const wordLower = word.toLowerCase();
    customDictionary.add(wordLower);
    saveDictionary();
    
    // Удаляем все вхождения этого слова с ошибками
    document.querySelectorAll('.qa-text-error').forEach(errorSpan => {
      if (errorSpan.getAttribute('data-word').toLowerCase() === wordLower) {
        const textNode = document.createTextNode(errorSpan.textContent);
        errorSpan.parentNode.replaceChild(textNode, errorSpan);
      }
    });
    
    // Пересчитываем ошибки и обновляем индексы
    allErrors = Array.from(document.querySelectorAll('.qa-text-error'));
    
    // Если текущий индекс больше количества ошибок, сбрасываем
    if (currentErrorIndex >= allErrors.length) {
      currentErrorIndex = 0;
    }
    
    showNotification(`"${word}" ${t('addedToDictionary', currentLang)}`, 'success');
    closeModal();
    
    // Обновляем счетчик
    chrome.runtime.sendMessage({
      action: 'updateState',
      isActive: isCheckerActive,
      errorCount: allErrors.length
    });
  });
  
  ignoreBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Клик по предложению для копирования
  modal.querySelectorAll('.qa-suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      navigator.clipboard.writeText(item.textContent);
      showNotification(`${t('copied', currentLang)}: ${item.textContent}`, 'info');
    });
  });
}

// Получение контекста вокруг ошибки
function getContext(element, charsBefore = 50, charsAfter = 50) {
  // Идем назад, собирая текст
  let current = element.previousSibling;
  let beforeText = '';
  while (current && beforeText.length < charsBefore) {
    if (current.nodeType === Node.TEXT_NODE) {
      beforeText = current.textContent + beforeText;
    } else if (current.textContent) {
      beforeText = current.textContent + beforeText;
    }
    current = current.previousSibling;
  }
  beforeText = beforeText.slice(-charsBefore);
  
  // Текст ошибки
  const errorText = element.textContent;
  
  // Идем вперед, собирая текст
  current = element.nextSibling;
  let afterText = '';
  while (current && afterText.length < charsAfter) {
    if (current.nodeType === Node.TEXT_NODE) {
      afterText += current.textContent;
    } else if (current.textContent) {
      afterText += current.textContent;
    }
    current = current.nextSibling;
  }
  afterText = afterText.slice(0, charsAfter);
  
  return `...${beforeText}[${errorText}]${afterText}...`;
}

// Экспорт отчета об ошибках в CSV
function exportErrorsToCSV() {
  const errors = Array.from(document.querySelectorAll('.qa-text-error'));
  
  if (errors.length === 0) {
    showNotification(t('exportNoErrors', currentLang), 'warning');
    return false;
  }
  
  // Заголовок CSV
  let csv = 'Error Word,Suggestions,Context\n';
  
  // Данные
  errors.forEach((errorEl) => {
    const word = errorEl.getAttribute('data-word') || errorEl.textContent;
    const suggestions = errorEl.getAttribute('data-suggestions') || '';
    const context = getContext(errorEl, 50); // 50 символов контекста с каждой стороны
    
    // Экранируем кавычки и переносы строк
    const escapedWord = `"${word.replace(/"/g, '""')}"`;
    const escapedSuggestions = `"${suggestions.replace(/"/g, '""')}"`;
    const escapedContext = `"${context.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    
    csv += `${escapedWord},${escapedSuggestions},${escapedContext}\n`;
  });
  
  // Создаем и скачиваем файл
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // \ufeff - BOM для корректного UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Имя файла с датой и временем
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const hostname = window.location.hostname.replace(/[^a-z0-9]/gi, '_');
  link.download = `corespell-errors-${hostname}-${timestamp}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showNotification(t('exportSuccess', currentLang), 'success');
  return true;
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    toggleChecker().then(() => {
      sendResponse({ 
        success: true, 
        isActive: isCheckerActive,
        errorCount: document.querySelectorAll('.qa-text-error').length
      });
    });
    return true;
  } else if (request.action === 'getState') {
    sendResponse({ 
      isActive: isCheckerActive,
      errorCount: document.querySelectorAll('.qa-text-error').length,
      dictionarySize: customDictionary.size
    });
  } else if (request.action === 'clearDictionary') {
    customDictionary.clear();
    saveDictionary();
    showNotification(t('dictionaryCleared', currentLang), 'info');
    sendResponse({ success: true });
  } else if (request.action === 'getDictionary') {
    sendResponse({ 
      dictionary: Array.from(customDictionary).sort() 
    });
  } else if (request.action === 'scrollToNextError') {
    scrollToNextError();
    sendResponse({ success: true });
  } else if (request.action === 'changeLanguage') {
    currentLang = request.language;
    console.log('Language changed to:', currentLang);
    sendResponse({ success: true });
  } else if (request.action === 'exportErrors') {
    const success = exportErrorsToCSV();
    sendResponse({ success: success });
  }
  return true;
});

console.log('CoreSpell Audit with API loaded');