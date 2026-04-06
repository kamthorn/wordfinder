let currentLang = 'en';
const wordLists = {
    en: [],
    th: []
};

const elements = {
    langEn: document.getElementById('lang-en'),
    langTh: document.getElementById('lang-th'),
    input: document.getElementById('pattern-input'),
    excludeInput: document.getElementById('exclude-input'),
    lengthInput: document.getElementById('length-input'),
    searchBtn: document.getElementById('search-btn'),
    resultsContainer: document.getElementById('results-container'),
    resultsGrid: document.getElementById('results-grid'),
    resultCount: document.getElementById('result-count'),
    status: document.getElementById('status'),
    emptyState: document.getElementById('empty-state'),
    limitMessage: document.getElementById('limit-message'),
    shareBtn: document.getElementById('share-btn'),
    shareText: document.getElementById('share-text')
};

// Language Toggle
elements.langEn.addEventListener('click', () => setLang('en'));
elements.langTh.addEventListener('click', () => setLang('th'));

function setLang(lang) {
    currentLang = lang;
    elements.langEn.className = lang === 'en'
        ? 'px-6 py-2 rounded-lg font-medium transition-all bg-white shadow-sm text-primary text-indigo-600'
        : 'px-6 py-2 rounded-lg font-medium transition-all text-gray-500 hover:text-gray-700';
    elements.langTh.className = lang === 'th'
        ? 'px-6 py-2 rounded-lg font-medium transition-all bg-white shadow-sm text-primary text-indigo-600'
        : 'px-6 py-2 rounded-lg font-medium transition-all text-gray-500 hover:text-gray-700';

    elements.input.placeholder = lang === 'en' ? 'A_P_E or *ING or B?T' : 'ก_น หรือ *การ หรือ ?ำ';
    elements.excludeInput.placeholder = lang === 'en' ? 'เช่น rts' : 'เช่น กขค';
}

// Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial Load to ensure responsiveness
    loadWords('en');
    loadWords('th');

    // 2. Parse URL parameters for Deep Linking
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    const urlQ = params.get('q');
    const urlEx = params.get('ex');
    const urlLen = params.get('len');

    // Restore Settings
    if (urlLang === 'th') setLang('th');
    else setLang('en');

    if (urlQ) elements.input.value = urlQ;
    if (urlEx) elements.excludeInput.value = urlEx;
    if (urlLen) elements.lengthInput.value = urlLen;

    // 3. Define Standard Actions
    elements.langEn.addEventListener('click', () => {
        elements.input.value = '';
        elements.excludeInput.value = '';
        elements.lengthInput.value = '';
        setLang('en');
    });
    
    elements.langTh.addEventListener('click', () => {
        elements.input.value = '';
        elements.excludeInput.value = '';
        elements.lengthInput.value = '';
        setLang('th');
    });

    elements.searchBtn.addEventListener('click', performSearch);
    
    elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    elements.excludeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    elements.lengthInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // 4. Share Link functionality
    elements.shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const originalText = elements.shareText.textContent;
            elements.shareText.textContent = 'คัดลอกแล้ว!';
            setTimeout(() => {
                elements.shareText.textContent = originalText;
            }, 2000);
        });
    });

    // 5. Automatic search if pattern exists
    if (urlQ) {
        await loadWords(currentLang);
        performSearch();
    }
});

// Load Word Lists
async function loadWords(lang) {
    if (wordLists[lang].length > 0) return;

    elements.status.classList.remove('hidden');
    elements.status.textContent = `กำลังโหลดคลังคำตามภาษา${lang === 'en' ? 'อังกฤษ' : 'ไทย'}...`;

    try {
        const response = await fetch(`data/${lang}_words.txt`);
        const text = await response.text();
        wordLists[lang] = text.split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);
        elements.status.classList.add('hidden');
    } catch (error) {
        console.error('Failed to load words:', error);
        elements.status.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
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
        regex: new RegExp(`^${regexStr}$`, 'i'),
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

async function performSearch() {
    const pattern = elements.input.value.trim();
    if (!pattern) return;

    await loadWords(currentLang);

    const { regex, groupDefs } = patternToRegex(pattern, currentLang);

    // Build exclude set (case-insensitive for English)
    const excludeRaw = elements.excludeInput.value.trim();
    const excludeChars = excludeRaw
        ? new Set([...excludeRaw].map(c => c.toLowerCase()))
        : null;

    // Get length filter
    const lengthFilter = parseInt(elements.lengthInput.value.trim(), 10) || null;

    const results = wordLists[currentLang].filter(word => {
        if (lengthFilter && getWordLength(word, currentLang) !== lengthFilter) return false;
        if (!regex.test(word)) return false;
        if (excludeChars) {
            const lower = word.toLowerCase();
            for (const ch of excludeChars) {
                if (lower.includes(ch)) return false;
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

    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    if (window.location.search !== `?${newParams.toString()}`) {
        window.history.replaceState({}, '', newUrl);
    }
    
    // Reveal share button
    elements.shareBtn.dataset.visible = 'true';

    // Sort and Limit
    const sortedResults = results.sort((a, b) => a.localeCompare(b, currentLang === 'th' ? 'th' : 'en'));
    const displayedResults = sortedResults.slice(0, 100);

    renderResults(displayedResults, results.length, regex, groupDefs);
}

function renderResults(words, totalCount, regex, groupDefs) {
    elements.resultsGrid.innerHTML = '';

    if (words.length === 0) {
        elements.resultsContainer.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.resultsContainer.classList.remove('hidden');
    elements.resultCount.textContent = `${totalCount} คำ`;

    words.forEach(word => {
        const div = document.createElement('div');
        div.className = 'px-4 py-3 bg-white border border-gray-100 rounded-xl text-center font-medium hover:border-indigo-300 hover:shadow-sm transition-all cursor-default text-gray-700';
        
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

        elements.resultsGrid.appendChild(div);
    });

    if (totalCount > 100) {
        elements.limitMessage.classList.remove('hidden');
    } else {
        elements.limitMessage.classList.add('hidden');
    }
}

// End of script
