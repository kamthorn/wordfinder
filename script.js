let currentLang = 'en';
let currentUiLang = localStorage.getItem('wordfinder_ui_lang') || 'en';

const wordLists = {
    en: [],
    th: []
};
let activeLoads = 0;

const elements = {
    input: document.getElementById('pattern-input'),
    excludeInput: document.getElementById('exclude-input'),
    lengthInput: document.getElementById('length-input'),
    searchBtn: document.getElementById('search-btn'),
    resultsContainer: document.getElementById('results-container'),
    resultsGrid: document.getElementById('results-grid'),
    resultCount: document.getElementById('result-count'),
    status: document.getElementById('status'),
    statusMessage: document.getElementById('status-message'),
    statusLoading: document.getElementById('status-loading'),
    statusError: document.getElementById('status-error'),
    retryBtn: document.getElementById('retry-btn'),
    emptyState: document.getElementById('empty-state'),
    limitMessage: document.getElementById('limit-message'),
    shareBtn: document.getElementById('share-btn'),
    shareText: document.getElementById('share-text'),
    historyContainer: document.getElementById('history-container'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    dictContainer: document.getElementById('dict-container'),
    dictSelect: document.getElementById('dict-select'),
    tilesInput: document.getElementById('tiles-input'),
    subtitle: document.getElementById('subtitle'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsDropdown: document.getElementById('settings-dropdown'),
    uiLangSelect: document.getElementById('ui-lang-select'),
    dictHint: document.getElementById('dict-hint')
};

const MAX_HISTORY = 10;
const HISTORY_KEY = 'wordfinder_history';
const DICT_KEY = 'wordfinder_dict';
const UI_LANG_KEY = 'wordfinder_ui_lang';

let currentDict = localStorage.getItem(DICT_KEY) || 'standard';

const BATCH_SIZE = 100;
const debounceDelay = 500;
let debounceTimer = null;
let allResults = [];
let displayedCount = 0;
let isFetching = false;

const uiStrings = {
    en: {
        dictHint: 'Dictionary loads on first search',
        subtitle: 'Professional word finder and anagram solver for Scrabble, Wordle, Crosswords, and all your favorite word games.',
        dictionary: 'Dictionary',
        pattern: 'Pattern',
        patternPlaceholder: 'A_P_E or *ING or B?T',
        patternHelp1: '_ or ? for 1 letter',
        patternHelp2: '* for multiple letters',
        tiles: 'Tiles / Anagram',
        tilesPlaceholder: 'e.g. apple',
        tilesHelp: 'Only finds words using these letters',
        exclude: 'Exclude',
        excludePlaceholder: 'e.g. rts',
        excludeHelp: 'Words containing these letters are excluded',
        length: 'Length',
        lengthPlaceholder: 'e.g. 5',
        lengthHelp: 'Leave empty to skip filtering',
        searchBtn: 'Search Words',
        shareText: 'Copy Link',
        copiedText: 'Copied!',
        recentSearches: 'Recent Searches',
        clearAll: 'Clear All',
        loading: 'Loading data...',
        loadDict: 'Loading dictionary...',
        loadDictEn: 'Loading English dictionary',
        loadDictTh: 'Loading Thai dictionary',
        failed: 'Failed to load data',
        retry: 'Retry',
        searchResults: 'Search Results',
        words: 'words',
        loadingMore: 'Loading more...',
        noResults: 'No words found matching your pattern'
    },
    th: {
        dictHint: 'พจนานุกรมจะโหลดเมื่อค้นหาครั้งแรก',
        subtitle: 'เครื่องมือช่วยคิดและค้นหาคำศัพท์ภาษาอังกฤษและภาษาไทย สำหรับ Scrabble, Wordle, อักษรไขว้, และเกมคำศัพท์ทุกประเภท',
        dictionary: 'พจนานุกรม',
        pattern: 'รูปแบบคำ',
        patternPlaceholder: 'A_P_E or *ING or B?T',
        patternHelp1: '_ or ? สำหรับ 1 ตัวอักษร',
        patternHelp2: '* สำหรับหลายตัวอักษร',
        tiles: 'ตัวอักษรที่มีในมือ',
        tilesPlaceholder: 'เช่น apple',
        tilesHelp: 'ระบบจะหาเฉพาะคำที่ประกอบจากตัวอักษรเหล่านี้เท่านั้น',
        exclude: 'ตัวอักษรที่ไม่มีในคำ',
        excludePlaceholder: 'เช่น rts',
        excludeHelp: 'คำที่มีตัวเหล่านี้จะถูกคัดออก',
        length: 'ความยาวคำ',
        lengthPlaceholder: 'เช่น 5',
        lengthHelp: 'ไม่ต้องระบุหากไม่ต้องการกรอง',
        searchBtn: 'ค้นหาคำศัพท์',
        shareText: 'คัดลอกลิงก์',
        copiedText: 'คัดลอกแล้ว!',
        recentSearches: 'ประวัติการค้นล่าสุด',
        clearAll: 'ล้างประวัติ',
        loading: 'กำลังโหลดข้อมูล...',
        loadDict: 'กำลังโหลดพจนานุกรม...',
        loadDictEn: 'กำลังโหลดพจนานุกรมภาษาอังกฤษ',
        loadDictTh: 'กำลังโหลดพจนานุกรมภาษาไทย',
        failed: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        retry: 'ลองใหม่',
        searchResults: 'ผลการค้นหา',
        words: 'คำ',
        loadingMore: 'กำลังโหลด...',
        noResults: 'ไม่พบคำที่ตรงกับรูปแบบที่กำหนด'
    }
};

function t(key) {
    return uiStrings[currentUiLang][key] || uiStrings.en[key] || key;
}

function setUiLang(lang) {
    currentUiLang = lang;
    localStorage.setItem(UI_LANG_KEY, lang);
    updateUITranslations();
}

function updateUITranslations() {
    const s = uiStrings[currentUiLang];

    elements.subtitle.textContent = s.subtitle;

    const dictLabel = elements.dictContainer.querySelector('label');
    if (dictLabel) dictLabel.textContent = s.dictionary;

    const patternLabel = elements.input.parentElement.querySelector('label');
    if (patternLabel) patternLabel.textContent = s.pattern;
    elements.input.placeholder = s.patternPlaceholder;

    const patternHelp = elements.input.parentElement.querySelector('.flex-wrap');
    if (patternHelp) {
        const helpSpans = patternHelp.querySelectorAll('span');
        if (helpSpans[0]) helpSpans[0].innerHTML = `<code>_</code> or <code>?</code> ${s.patternHelp1.split(' for ')[1] || s.patternHelp1}`;
        if (helpSpans[1]) helpSpans[1].innerHTML = `<code>*</code> ${s.patternHelp2}`;
    }

    const tilesLabel = elements.tilesInput.parentElement.querySelector('label');
    if (tilesLabel) tilesLabel.textContent = s.tiles;
    elements.tilesInput.placeholder = s.tilesPlaceholder;
    const tilesHelp = elements.tilesInput.parentElement.querySelector('p');
    if (tilesHelp) tilesHelp.textContent = s.tilesHelp;

    const excludeLabel = elements.excludeInput.parentElement.querySelector('label');
    if (excludeLabel) excludeLabel.textContent = s.exclude;
    elements.excludeInput.placeholder = s.excludePlaceholder;
    const excludeHelp = elements.excludeInput.parentElement.querySelector('p');
    if (excludeHelp) excludeHelp.textContent = s.excludeHelp;

    const lengthLabel = elements.lengthInput.parentElement.querySelector('label');
    if (lengthLabel) lengthLabel.textContent = s.length;
    elements.lengthInput.placeholder = s.lengthPlaceholder;
    const lengthHelp = elements.lengthInput.parentElement.querySelector('p');
    if (lengthHelp) lengthHelp.textContent = s.lengthHelp;

    elements.searchBtn.textContent = s.searchBtn;
    elements.shareText.textContent = s.shareText;

    const historyTitle = elements.historyContainer.querySelector('h3');
    if (historyTitle) historyTitle.textContent = s.recentSearches;
    elements.clearHistoryBtn.textContent = s.clearAll;

    elements.statusMessage.textContent = s.loading;
    const errorText = document.getElementById('error-text');
    if (errorText) errorText.textContent = s.failed;
    elements.retryBtn.textContent = s.retry;

    const resultsTitle = elements.resultsContainer.querySelector('h2');
    if (resultsTitle) resultsTitle.textContent = s.searchResults;
    if (elements.resultCount.dataset.original === undefined) {
        elements.resultCount.dataset.original = elements.resultCount.textContent;
    }
    if (allResults.length > 0) {
        elements.resultCount.textContent = `${allResults.length} ${s.words}`;
    }

    elements.limitMessage.innerHTML = displayedCount < allResults.length
        ? `<span class="loading-spinner"></span> ${s.loadingMore}`
        : '';
    if (elements.limitMessage.textContent === s.loadingMore) {
        elements.limitMessage.innerHTML = `<span class="loading-spinner"></span> ${s.loadingMore}`;
    }

    elements.emptyState.querySelector('p').textContent = s.noResults;

    const uiLangSelectLabel = elements.settingsDropdown.querySelector('label');
    if (uiLangSelectLabel) uiLangSelectLabel.textContent = currentUiLang === 'en' ? 'Language' : 'ภาษา';
}

function setSearchLang(lang) {
    currentLang = lang;

    elements.input.placeholder = lang === 'en'
        ? uiStrings[currentUiLang].patternPlaceholder
        : 'ก_น หรือ *การ หรือ ?ำ';
    elements.excludeInput.placeholder = lang === 'en'
        ? uiStrings[currentUiLang].excludePlaceholder
        : 'เช่น กขค';
    elements.tilesInput.placeholder = lang === 'en'
        ? uiStrings[currentUiLang].tilesPlaceholder
        : 'เช่น กานดา';

    if (lang === 'en') {
        elements.dictContainer.classList.remove('hidden');
    } else {
        elements.dictContainer.classList.add('hidden');
    }
}

// Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // 0. Apply saved UI language
    elements.uiLangSelect.value = currentUiLang;
    updateUITranslations();

    // Dictionary loads lazily on first search

    // 1. Parse URL parameters for Deep Linking
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    const urlQ = params.get('q');
    const urlEx = params.get('ex');
    const urlLen = params.get('len');
    const urlDict = params.get('dict');
    const urlTiles = params.get('tiles');

    if (urlDict) currentDict = urlDict;

    // Restore Settings
    if (urlLang === 'th') setSearchLang('th');
    else setSearchLang('en');

    if (urlQ) elements.input.value = urlQ;
    if (urlEx) elements.excludeInput.value = urlEx;
    if (urlLen) elements.lengthInput.value = urlLen;
    if (urlTiles) elements.tilesInput.value = urlTiles;

    elements.dictSelect.value = currentDict;

    // 3. Define Standard Actions
    elements.dictSelect.addEventListener('change', (e) => {
        currentDict = e.target.value;
        localStorage.setItem(DICT_KEY, currentDict);
        performSearch();
    });

    elements.searchBtn.addEventListener('click', performSearch);

    function scheduleSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performSearch, debounceDelay);
    }

    function handleEnterKey(e) {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            performSearch();
        }
    }

    elements.input.addEventListener('input', scheduleSearch);
    elements.input.addEventListener('keypress', handleEnterKey);
    elements.excludeInput.addEventListener('input', scheduleSearch);
    elements.excludeInput.addEventListener('keypress', handleEnterKey);
    elements.lengthInput.addEventListener('input', scheduleSearch);
    elements.lengthInput.addEventListener('keypress', handleEnterKey);
    elements.tilesInput.addEventListener('input', scheduleSearch);
    elements.tilesInput.addEventListener('keypress', handleEnterKey);
    elements.dictSelect.addEventListener('change', performSearch);

    // 4. Share Link functionality
    elements.shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const originalText = elements.shareText.textContent;
            elements.shareText.textContent = t('copiedText');
            setTimeout(() => {
                elements.shareText.textContent = originalText;
            }, 2000);
        });
    });

    // 5. Settings Dropdown toggle
    elements.settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.settingsDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!elements.settingsDropdown.contains(e.target) && e.target !== elements.settingsBtn) {
            elements.settingsDropdown.classList.add('hidden');
        }
    });

    elements.uiLangSelect.addEventListener('change', (e) => {
        setUiLang(e.target.value);
    });

    // 5. Clear History
    elements.clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });

    // 6. Initial History Render
    renderHistory();

    // 7. Automatic search if pattern exists
    if (urlQ) {
        await loadWords(currentLang);
        performSearch();
    }

    // 8. Retry Button listener
    elements.retryBtn.addEventListener('click', () => {
        loadWords(currentLang);
    });

    // 9. Setup Infinite Scroll
    setupInfiniteScroll();
});

// History Management
function loadHistory() {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (e) {
        return [];
    }
}

function saveToHistory(lang, q, ex, len, tiles) {
    let history = loadHistory();
    
    // Create new item
    const newItem = { lang, q, ex, len, tiles, timestamp: Date.now() };
    
    // Remove duplicates (by content, not timestamp)
    history = history.filter(item => 
        !(item.lang === lang && item.q === q && item.ex === ex && item.len === len && item.tiles === tiles)
    );
    
    // Add to top
    history.unshift(newItem);
    
    // Limit size
    history = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = loadHistory();
    
    if (history.length === 0) {
        elements.historyContainer.classList.add('hidden');
        return;
    }
    
    elements.historyContainer.classList.remove('hidden');
    elements.historyList.innerHTML = '';
    
    history.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 bg-white/60 border border-gray-100 rounded-full text-xs font-medium text-gray-500 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-1';
        
        const langBadge = item.lang === 'th' ? 'TH' : 'EN';
        const displayQ = item.q;
        const displayLen = item.len ? ` (${item.len})` : '';
        
        btn.innerHTML = `<span class="opacity-40 text-[10px] font-bold">${langBadge}</span> ${displayQ}${displayLen}`;
        
        btn.onclick = () => {
            // Set values
            setSearchLang(item.lang);
            elements.input.value = item.q;
            elements.excludeInput.value = item.ex || '';
            elements.lengthInput.value = item.len || '';
            elements.tilesInput.value = item.tiles || '';
            
            // Perform search
            performSearch();
        };
        
        elements.historyList.appendChild(btn);
    });
}

// Load Word Lists
async function loadWords(lang) {
    const cacheKey = lang === 'en' ? `en_${currentDict}` : 'th';
    if (wordLists[cacheKey] && wordLists[cacheKey].length > 0) return;

    // Reset UI state
    activeLoads++;
    elements.status.classList.remove('hidden');
    elements.statusLoading.classList.remove('hidden');
    elements.statusError.classList.add('hidden');

    let dictLabel = '';
    if (lang === 'th') dictLabel = 'Thai';
    else {
        if (currentDict === 'twl') dictLabel = 'Scrabble TWL';
        else if (currentDict === 'sowpods') dictLabel = 'Scrabble SOWPODS';
        else dictLabel = 'Standard';
    }

    elements.statusMessage.textContent = `${t('loadDict')} (${dictLabel})`;

    try {
        let fileName = '';
        if (lang === 'th') fileName = 'th_words.txt';
        else {
            if (currentDict === 'twl') fileName = 'en_twl.txt';
            else if (currentDict === 'sowpods') fileName = 'en_sowpods.txt';
            else fileName = 'en_words.txt';
        }

        const response = await fetch(`data/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        wordLists[cacheKey] = text.split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);
            
        activeLoads--;
        if (elements.dictHint) {
            elements.dictHint.classList.add('hidden');
        }
        // Only hide if no more loads are active AND no errors are showing
        if (activeLoads === 0 && elements.statusError.classList.contains('hidden')) {
            elements.status.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to load words:', error);
        activeLoads--;
        elements.statusLoading.classList.add('hidden');
        elements.statusError.classList.remove('hidden');
    }
}

// Pattern to Regex (Highlighting Support)
function patternToRegex(pattern, lang) {
    let regexStr = '';
    let groupDefs = [];

    // Tokenize into [ "lit", "*", "lit", "_", "lit" ]
    const tokens = pattern.split(/([_?*]+)/);

    for (let token of tokens) {
        if (!token) continue;

        if (/^[_?*]+$/.test(token)) {
            // Wildcard token
            let wcRegex = '';
            for (let ch of token) {
                if (ch === '*') {
                    wcRegex += '.*';
                } else if (ch === '_' || ch === '?') {
                    if (lang === 'th') {
                        wcRegex += '(?:[^\u0E31\u0E34-\u0E3A\u0E47-\u0E4E][\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{0,})';
                    } else {
                        wcRegex += '.';
                    }
                }
            }
            regexStr += '(' + wcRegex + ')';
            groupDefs.push(false); // wildcard -> no highlight
        } else {
            // Literal token
            let escaped = token.replace(/[.+^${}()|[\]\\]/g, '\\$&');
            regexStr += '(' + escaped + ')';
            groupDefs.push(true); // literal -> highlight
        }
    }

    return {
        regex: new RegExp(`^${regexStr}$`, lang === 'en' ? 'i' : ''),
        groupDefs: groupDefs
    };
}

// Search Logic
const thaiNonBaselineRegex = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

function getWordLength(word, lang) {
    if (lang === 'th') {
        return word.replace(thaiNonBaselineRegex, '').length;
    }
    return word.length;
}

function getFrequencyMap(str, lang) {
    const map = {};
    const normStr = lang === 'en' ? str.toLowerCase() : str;
    for (const char of normStr) {
        map[char] = (map[char] || 0) + 1;
    }
    return map;
}

async function performSearch() {
    const pattern = elements.input.value.trim();
    const tilesRaw = elements.tilesInput.value.trim();
    
    if (!pattern && !tilesRaw) return; // Allow searching with only tiles (Anagram mode)

    // If only tiles provided, default pattern to "*"
    const effectivePattern = pattern || '*';

    await loadWords(currentLang);

    const { regex, groupDefs } = patternToRegex(effectivePattern, currentLang);

    // Build exclude set (case-insensitive for English)
    const excludeRaw = elements.excludeInput.value.trim();
    const excludeChars = excludeRaw
        ? new Set([...excludeRaw].map(c => c.toLowerCase()))
        : null;

    // Get length filter
    const lengthFilter = parseInt(elements.lengthInput.value.trim(), 10) || null;

    // Build Tiles Map
    const tilesMap = tilesRaw ? getFrequencyMap(tilesRaw, currentLang) : null;

    const cacheKey = currentLang === 'en' ? `en_${currentDict}` : 'th';
    const results = wordLists[cacheKey].filter(word => {
        if (lengthFilter && getWordLength(word, currentLang) !== lengthFilter) return false;
        
        // Regex Match
        if (!regex.test(word)) return false;
        
        // Exclude Filter
        if (excludeChars) {
            const lower = word.toLowerCase();
            for (const ch of excludeChars) {
                if (lower.includes(ch)) return false;
            }
        }
        
        // Tiles Filter (Frequency Map subset check)
        if (tilesMap) {
            const wordMap = getFrequencyMap(word, currentLang);
            for (const char in wordMap) {
                if (!tilesMap[char] || wordMap[char] > tilesMap[char]) return false;
            }
        }
        
        return true;
    });

    // Update URL Parameters via URLSearchParams
    const newParams = new URLSearchParams();
    newParams.set('lang', currentLang);
    if (pattern) newParams.set('q', pattern);
    if (excludeRaw) newParams.set('ex', excludeRaw);
    if (lengthFilter) newParams.set('len', lengthFilter.toString());
    if (tilesRaw) newParams.set('tiles', tilesRaw);
    if (currentLang === 'en' && currentDict !== 'standard') newParams.set('dict', currentDict);

    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    if (window.location.search !== `?${newParams.toString()}`) {
        window.history.replaceState({}, '', newUrl);
    }
    
    // Reveal share button
    elements.shareBtn.dataset.visible = 'true';

    // Save to History
    saveToHistory(currentLang, pattern, excludeRaw, lengthFilter ? lengthFilter.toString() : '', tilesRaw);

    // Sort results
    allResults = results.sort((a, b) => a.localeCompare(b, currentLang === 'th' ? 'th' : 'en'));
    displayedCount = 0;
    isFetching = false;

    loadMoreResults();
}

function appendWords(words, regex, groupDefs) {
    words.forEach(word => {
        const div = document.createElement('div');
        div.className = 'px-4 py-3 bg-white border border-gray-100 rounded-xl text-center font-medium hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer text-gray-700';
        
        if (regex && groupDefs) {
            const match = word.match(regex);
            if (match) {
                let html = '';
                for (let i = 0; i < groupDefs.length; i++) {
                    const text = match[i + 1] || '';
                    if (groupDefs[i] && text) {
                        html += `<span class="text-green-600 font-bold">${text}</span>`;
                    } else {
                        html += text;
                    }
                }
                div.innerHTML = html;
            } else {
                div.textContent = word;
            }
        } else {
            div.textContent = word;
        }

        div.onclick = () => {
            navigator.clipboard.writeText(word).then(() => {
                const originalHTML = div.innerHTML;
                div.innerHTML = '<span class="text-green-500">✓ คัดลอกแล้ว</span>';
                div.classList.add('bg-green-50', 'border-green-200');
                div.classList.remove('bg-white', 'border-gray-100');
                
                setTimeout(() => {
                    div.innerHTML = originalHTML;
                    div.classList.remove('bg-green-50', 'border-green-200');
                    div.classList.add('bg-white', 'border-gray-100');
                }, 1000);
            });
        };

        elements.resultsGrid.appendChild(div);
    });
}

function loadMoreResults() {
    if (allResults.length === 0) {
        elements.resultsContainer.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        elements.limitMessage.classList.add('hidden');
        return;
    }

    if (isFetching || displayedCount >= allResults.length) return;
    isFetching = true;
    
    elements.emptyState.classList.add('hidden');
    elements.resultsContainer.classList.remove('hidden');
    elements.resultCount.textContent = `${allResults.length} ${t('words')}`;

    const remaining = allResults.length - displayedCount;
    const batchSize = Math.min(BATCH_SIZE, remaining);
    const batch = allResults.slice(displayedCount, displayedCount + batchSize);

    appendWords(batch, null, null);
    displayedCount += batchSize;

    // Show loading indicator if more results exist
    if (displayedCount < allResults.length) {
        elements.limitMessage.innerHTML = `<span class="loading-spinner"></span> ${t('loadingMore')}`;
        elements.limitMessage.classList.remove('hidden');
    } else {
        elements.limitMessage.classList.add('hidden');
    }
    
    isFetching = false;
}

// Intersection Observer for infinite scroll
function setupInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isFetching && displayedCount < allResults.length) {
                loadMoreResults();
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
    });
    
    observer.observe(sentinel);
}

// End of script
