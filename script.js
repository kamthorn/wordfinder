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
    searchBtn: document.getElementById('search-btn'),
    resultsContainer: document.getElementById('results-container'),
    resultsGrid: document.getElementById('results-grid'),
    resultCount: document.getElementById('result-count'),
    status: document.getElementById('status'),
    emptyState: document.getElementById('empty-state'),
    limitMessage: document.getElementById('limit-message')
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
    // Clear exclude when switching language
    elements.excludeInput.value = '';
}

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

// Pattern to Regex
function patternToRegex(pattern) {
    // Escape special regex characters except _, ?, *
    let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    // Replace _ and ? with . (one character)
    regexStr = regexStr.replace(/[?_]/g, '.');

    // Replace * with .* (zero or more)
    regexStr = regexStr.replace(/\*/g, '.*');

    return new RegExp(`^${regexStr}$`, 'i');
}

// Search Logic
async function performSearch() {
    const pattern = elements.input.value.trim();
    if (!pattern) return;

    await loadWords(currentLang);

    const regex = patternToRegex(pattern);

    // Build exclude set (case-insensitive for English)
    const excludeRaw = elements.excludeInput.value.trim();
    const excludeChars = excludeRaw
        ? new Set([...excludeRaw].map(c => c.toLowerCase()))
        : null;

    const results = wordLists[currentLang].filter(word => {
        if (!regex.test(word)) return false;
        if (excludeChars) {
            const lower = word.toLowerCase();
            for (const ch of excludeChars) {
                if (lower.includes(ch)) return false;
            }
        }
        return true;
    });

    // Sort and Limit
    const sortedResults = results.sort((a, b) => a.localeCompare(b, currentLang === 'th' ? 'th' : 'en'));
    const displayedResults = sortedResults.slice(0, 100);

    renderResults(displayedResults, results.length);
}

function renderResults(words, totalCount) {
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
        div.textContent = word;
        elements.resultsGrid.appendChild(div);
    });

    if (totalCount > 100) {
        elements.limitMessage.classList.remove('hidden');
    } else {
        elements.limitMessage.classList.add('hidden');
    }
}

elements.searchBtn.addEventListener('click', performSearch);
elements.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});
