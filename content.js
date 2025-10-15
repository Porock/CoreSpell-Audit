// Состояние проверки
let isCheckerActive = false;
let originalHTML = '';
let errorCache = new Map();
let processingQueue = [];
let isProcessing = false;
let customDictionary = new Set();
let currentErrorIndex = 0;
let allErrors = [];

// API Yandex.Speller
const SPELLER_API = 'https://speller.yandex.net/services/spellservice.json/checkTexts';

// Загружаем словарь из хранилища при запуске
chrome.storage.local.get(['customDictionary'], (result) => {
  if (result.customDictionary) {
    customDictionary = new Set(result.customDictionary);
    console.log('Загружен словарь:', customDictionary.size, 'слов');
  }
});

// Сохранение словаря
function saveDictionary() {
  chrome.storage.local.set({ 
    customDictionary: Array.from(customDictionary) 
  }, () => {
    console.log('Словарь сохранен');
  });
}

// Функция прокрутки к следующей ошибке
function scrollToNextError() {
  allErrors = Array.from(document.querySelectorAll('.qa-text-error'));
  
  console.log('Всего ошибок найдено:', allErrors.length);
  console.log('Текущий индекс:', currentErrorIndex);
  
  if (allErrors.length === 0) {
    showNotification('Ошибки не найдены', 'info');
    return;
  }
  
  // Убираем предыдущую подсветку
  allErrors.forEach(el => el.classList.remove('qa-text-highlight'));
  
  // Получаем текущую ошибку
  const currentError = allErrors[currentErrorIndex];
  
  console.log('Прокрутка к ошибке:', currentError.textContent);
  
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
  showNotification(`Ошибка ${currentErrorIndex + 1} из ${allErrors.length}`, 'info');
  
  // Переходим к следующей ошибке (циклично)
  currentErrorIndex = (currentErrorIndex + 1) % allErrors.length;
  
  console.log('Следующий индекс будет:', currentErrorIndex);
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
    console.error('Ошибка проверки:', error);
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
        result += `<span class="qa-text-error" data-word="${escapeHtml(rep.word)}" data-suggestions="${escapeHtml(rep.suggestions)}" title="Предложения: ${escapeHtml(rep.suggestions)}">${escapeHtml(rep.word)}</span>`;
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
  showNotification('Проверка начата...', 'info');
  
  // Сохраняем оригинальный HTML
  originalHTML = document.body.innerHTML;
  
  // Извлекаем текстовые блоки
  const blocks = extractTextBlocks(document.body);
  
  if (blocks.length === 0) {
    showNotification('Текст для проверки не найден', 'warning');
    return 0;
  }
  
  // Разбиваем на батчи
  const batches = createBatches(blocks);
  let totalErrors = 0;
  
  // Обрабатываем батчи
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const texts = batch.map(b => b.text);
    
    showNotification(`Проверка ${i + 1}/${batches.length}...`, 'info');
    
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
    showNotification(`Найдено ошибок: ${errorCount}`, errorCount > 0 ? 'error' : 'success');
    
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
    showNotification('Проверка отключена', 'info');
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
    
    const message = `Ошибка: "${word}"\n\nПредложения: ${suggestions}`;
    
    // Создаем кастомное модальное окно
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
        <strong>Найдена ошибка</strong>
        <button class="qa-modal-close">×</button>
      </div>
      <div class="qa-modal-body">
        <p><strong>Слово:</strong> <span class="qa-error-word">${escapeHtml(word)}</span></p>
        <p><strong>Предложения:</strong></p>
        <ul class="qa-suggestions">
          ${suggestions.map(s => `<li class="qa-suggestion-item">${escapeHtml(s)}</li>`).join('')}
        </ul>
        <div class="qa-modal-actions">
          <button class="qa-btn qa-btn-add-dict">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Добавить в словарь
          </button>
          <button class="qa-btn qa-btn-ignore">Пропустить</button>
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
    
    showNotification(`"${word}" добавлено в словарь`, 'success');
    closeModal();
    
    // Обновляем счетчик
    chrome.runtime.sendMessage({
      action: 'updateState',
      isActive: isCheckerActive,
      errorCount: document.querySelectorAll('.qa-text-error').length
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
      showNotification('Скопировано: ' + item.textContent, 'info');
    });
  });
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
    return true; // Асинхронный ответ
  } else if (request.action === 'getState') {
    sendResponse({ 
      isActive: isCheckerActive,
      errorCount: document.querySelectorAll('.qa-text-error').length,
      dictionarySize: customDictionary.size
    });
  } else if (request.action === 'clearDictionary') {
    customDictionary.clear();
    saveDictionary();
    showNotification('Словарь очищен', 'info');
    sendResponse({ success: true });
  } else if (request.action === 'getDictionary') {
    sendResponse({ 
      dictionary: Array.from(customDictionary).sort() 
    });
  } else if (request.action === 'scrollToNextError') {
    scrollToNextError();
    sendResponse({ success: true });
  }
  return true;
});

console.log('CoreSpell Audit с API загружен');