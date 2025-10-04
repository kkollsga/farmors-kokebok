// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
const FARMOR_IMAGES = [
    'farmor/farmor_svein_jostein_geirove.jpg',
    'farmor/farmor.jpg',
    'farmor/farmor_2.jpg',
    'farmor/farmor_3.jpg',
    'farmor/farmor_lene_mari.jpg',
    'farmor/farmor_svein_jostein_geirove.jpg',
    // Add more images as needed
];

const CONFIG = {
    BREAKPOINTS: {
        FULLSCREEN_MODAL: 1000,
        SINGLE_COLUMN: 400
    },
    IMAGE_PATHS: {
        LIST: 'images/low/',
        MODAL: 'images/hi/'
    },
    STYLES: {
        TAGGED_SHADOW: 'shadow-[0_4px_6px_-1px_rgba(180,83,9,0.5),0_2px_4px_-1px_rgba(217,119,6,0.35)]',
        TAGGED_HOVER_SHADOW: 'hover:shadow-[0_10px_15px_-3px_rgba(180,83,9,0.5),0_4px_6px_-2px_rgba(217,119,6,0.35)]',
        DEFAULT_SHADOW: 'shadow-md',
        DEFAULT_HOVER_SHADOW: 'hover:shadow-xl'
    },
    DATA_PATHS: {
        UI: 'data/ui-{lang}.json',
        RECIPES: 'data/recipes-{lang}.json'
    },
    DEFAULT_LANGUAGE: 'no',
    SUPPORTED_LANGUAGES: ['no', 'pb']
};

// Global data storage
let UI_TEXT = {};
let RECIPES_DATA = [];
let TAXONOMY = {};
let CURRENT_LANGUAGE = CONFIG.DEFAULT_LANGUAGE;

// ============================================================================
// DAILY IMAGE SELECTOR
// ============================================================================

function getDailyFarmorImage() {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
        hash = hash & hash;
    }
    
    const imageIndex = Math.abs(hash) % FARMOR_IMAGES.length;
    return FARMOR_IMAGES[imageIndex];
}

function displayDailyFarmorImage() {
    const imageUrl = getDailyFarmorImage();
    const img = document.getElementById('farmorImage');
    
    if (img) {
        img.src = imageUrl;
        img.onload = () => {
            img.classList.add('opacity-100');
        };
    }
}


// ============================================================================
// TAXONOMY HELPER FUNCTIONS
// ============================================================================

function extractTaxonomyFromRecipes(recipes) {
    const taxonomy = {
        categories: {},
        meals: {},
        cuisines: {},
        sources: {}
    };

    if (!recipes || !Array.isArray(recipes)) {
        return taxonomy;
    }

    recipes.forEach(recipe => {
        // Extract categories
        if (recipe.category) {
            const key = recipe.category.toLowerCase().replace(/[\s-]+/g, '');
            taxonomy.categories[key] = recipe.category;
        }

        // Extract meals
        if (recipe.meal) {
            const key = recipe.meal.toLowerCase().replace(/[\s-]+/g, '');
            taxonomy.meals[key] = recipe.meal;
        }

        // Extract cuisines
        if (recipe.cuisine) {
            const key = recipe.cuisine.toLowerCase().replace(/[\s-]+/g, '');
            taxonomy.cuisines[key] = recipe.cuisine;
        }

        // Extract sources/references
        if (recipe.reference) {
            const key = recipe.reference.toLowerCase().replace(/[\s-]+/g, '');
            taxonomy.sources[key] = recipe.reference;
        }
    });

    return taxonomy;
}

// ============================================================================
// LANGUAGE HELPER FUNCTIONS
// ============================================================================

function detectLanguageFromURL() {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    
    if (lang && CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
        return lang;
    }
    
    return CONFIG.DEFAULT_LANGUAGE;
}

function getBaseURLWithLanguage() {
    const isLocal = window.location.protocol === 'file:';
    
    if (isLocal) {
        return window.location.href.split('?')[0];
    }
    
    const basePath = 'https://kkollsga.github.io/farmors-kokebok/';
    
    if (CURRENT_LANGUAGE === CONFIG.DEFAULT_LANGUAGE) {
        return basePath;
    }
    
    return `${basePath}?lang=${CURRENT_LANGUAGE}&`;
}

function normalizePathForLanguage(path) {
    // Remove any existing language code from path
    const cleanPath = path.replace(/\/[a-z]{2}\/?/, '/');
    
    if (CURRENT_LANGUAGE === CONFIG.DEFAULT_LANGUAGE) {
        return cleanPath;
    }
    
    // Add language code to path
    return cleanPath.replace('farmors-kokebok/', `farmors-kokebok/${CURRENT_LANGUAGE}/`);
}

function updateHTMLLanguage() {
    // Map your internal codes to proper HTML language codes
    const htmlLangMap = {
        'no': 'no',
        'en': 'en',
        'pb': 'pt-BR'  // Brazilian Portuguese
    };
    
    document.documentElement.lang = htmlLangMap[CURRENT_LANGUAGE] || CURRENT_LANGUAGE;
}

// ============================================================================
// DATA LOADER
// ============================================================================

async function loadAppData() {
    const isLocal = window.location.protocol === 'file:';
    
    // Detect language from URL query parameter
    CURRENT_LANGUAGE = detectLanguageFromURL();

    // Update HTML lang attribute
    updateHTMLLanguage();
    
    if (isLocal) {
        console.log('Running locally - load data from files');

        // For local development, try to load actual data files
        // Fall through to the web loading logic
    }

    // Load data from files (works for both local and web)
    {
        console.log(`Running on web - loading data for language: ${CURRENT_LANGUAGE}`);
        
        try {
            // Load UI text for the selected language
            const uiPath = CONFIG.DATA_PATHS.UI.replace('{lang}', CURRENT_LANGUAGE);
            const uiResponse = await fetch(uiPath);
            UI_TEXT = await uiResponse.json();
            
            // Load recipes for the selected language
            const recipesPath = CONFIG.DATA_PATHS.RECIPES.replace('{lang}', CURRENT_LANGUAGE);
            const recipesResponse = await fetch(recipesPath);
            const recipesData = await recipesResponse.json();

            RECIPES_DATA = recipesData.recipes;

            // Extract taxonomy from loaded recipes
            TAXONOMY = extractTaxonomyFromRecipes(RECIPES_DATA);
            
            updateUIText();
            return true;
        } catch (error) {
            console.error(`Failed to load app data for language ${CURRENT_LANGUAGE}:`, error);
            
            // Try to fallback to default language
            if (CURRENT_LANGUAGE !== CONFIG.DEFAULT_LANGUAGE) {
                console.log(`Falling back to default language: ${CONFIG.DEFAULT_LANGUAGE}`);
                CURRENT_LANGUAGE = CONFIG.DEFAULT_LANGUAGE;
                return loadAppData(); // Recursive call with default language
            }
            
            // If even default language fails, return error
            console.error('Failed to load data files. Please ensure data files are available.');
            return false;
        }
    }
}

function updateUIText() {
    const appTitle = document.getElementById('appTitle');
    if (appTitle) appTitle.textContent = UI_TEXT.header.title;
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = UI_TEXT.search.placeholder;
    
    const filterButton = document.getElementById('filterButtonText');
    if (filterButton) filterButton.textContent = UI_TEXT.filter.button;
    
    const filterMenuTitle = document.getElementById('filterMenuTitle');
    if (filterMenuTitle) filterMenuTitle.textContent = UI_TEXT.filter.title;
    
    const copyURLText = document.getElementById('copyURLText');
    if (copyURLText) copyURLText.textContent = UI_TEXT.copyUrl.button;
    
    const clearFiltersText = document.getElementById('clearFiltersText');
    if (clearFiltersText) clearFiltersText.textContent = UI_TEXT.filter.clear;
    
    document.querySelector('[data-sort="recommendation"]')?.setAttribute('title', UI_TEXT.sort.recommendation);
    document.querySelector('[data-sort="recipebook"]')?.setAttribute('title', UI_TEXT.sort.recipebook);
    document.querySelector('[data-sort="alphabetical"]')?.setAttribute('title', UI_TEXT.sort.alphabetical);
    document.querySelector('[data-sort="madecount"]')?.setAttribute('title', UI_TEXT.sort.madeCount);
    document.querySelector('[data-sort="rating"]')?.setAttribute('title', UI_TEXT.sort.rating);
}

// ============================================================================
// RECIPE DATABASE CLASS
// ============================================================================

class RecipeDatabase {
    constructor() {
        this.recipes = RECIPES_DATA;
    }

    findById(recipeId) {
        return this.recipes.find(recipe => recipe.id === recipeId);
    }

    getAllIds() {
        return this.recipes.map(r => r.id);
    }

    getAll() {
        return [...this.recipes];
    }

    // Simplified version using taxonomy
    getFilters() {
        return {
            categories: Object.values(TAXONOMY.categories).sort(),
            meals: Object.values(TAXONOMY.meals).sort(),
            cuisines: Object.values(TAXONOMY.cuisines).sort()
        };
    }
    
    // New helper methods for getting international keys
    getCategoryKey(categoryValue) {
        return Object.keys(TAXONOMY.categories).find(
            key => TAXONOMY.categories[key] === categoryValue
        );
    }

    getMealKey(mealValue) {
        return Object.keys(TAXONOMY.meals).find(
            key => TAXONOMY.meals[key] === mealValue
        );
    }

    getCuisineKey(cuisineValue) {
        return Object.keys(TAXONOMY.cuisines).find(
            key => TAXONOMY.cuisines[key] === cuisineValue
        );
    }
}

// ============================================================================
// USER DATA MANAGER CLASS
// ============================================================================

class UserDataManager {
    constructor() {
        this.userData = {};
        this.load();
    }

    load() {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            this.userData = JSON.parse(storedUserData);
        }
    }

    save() {
        localStorage.setItem('userData', JSON.stringify(this.userData));
    }

    initializeRecipe(recipeId) {
        if (!this.userData[recipeId]) {
            this.userData[recipeId] = {
                userRating: null,
                madeDates: [],
                lastViewed: null,
                viewCount: 0,
                favorite: false,
                tagged: false,
                taggedAt: null
            };
        }
    }

    getRecipeData(recipeId) {
        return this.userData[recipeId] || {
            userRating: null,
            madeDates: [],
            lastViewed: null,
            viewCount: 0,
            favorite: false,
            tagged: false,
            taggedAt: null
        };
    }

    setRating(recipeId, rating) {
        this.initializeRecipe(recipeId);
        this.userData[recipeId].userRating = rating;
        this.save();
    }

    clearRating(recipeId) {
        if (this.userData[recipeId]) {
            this.userData[recipeId].userRating = null;
            this.save();
        }
    }

    toggleTag(recipeId) {
        this.initializeRecipe(recipeId);
        const isTagged = !this.userData[recipeId].tagged;
        this.userData[recipeId].tagged = isTagged;
        this.userData[recipeId].taggedAt = isTagged ? new Date().toISOString() : null;
        this.save();
        return isTagged;
    }

    toggleMadeToday(recipeId) {
        this.initializeRecipe(recipeId);
        const today = new Date().toISOString().split('T')[0];
        const madeDates = this.userData[recipeId].madeDates || [];
        
        const todayIndex = madeDates.indexOf(today);
        if (todayIndex > -1) {
            madeDates.splice(todayIndex, 1);
        } else {
            madeDates.push(today);
        }
        
        this.userData[recipeId].madeDates = madeDates;
        this.save();
        
        return {
            madeToday: madeDates.includes(today),
            madeCount: madeDates.length
        };
    }

    trackView(recipeId) {
        this.initializeRecipe(recipeId);

        // Cancel any pending view tracking for this recipe
        if (this.viewTrackingTimeouts && this.viewTrackingTimeouts[recipeId]) {
            clearTimeout(this.viewTrackingTimeouts[recipeId]);
        }

        // Initialize timeouts storage if needed
        if (!this.viewTrackingTimeouts) {
            this.viewTrackingTimeouts = {};
        }

        // Delay updating view timestamp by 10 seconds
        // This prevents immediate re-sorting when opening/closing modals
        this.viewTrackingTimeouts[recipeId] = setTimeout(() => {
            this.userData[recipeId].lastViewed = new Date().toISOString();
            this.userData[recipeId].viewCount = (this.userData[recipeId].viewCount || 0) + 1;
            this.save();

            // Update recommendation scores and trigger resort if in recommendation mode
            if (recipeApp && recipeApp.filterManager) {
                // Update the recommendation score for this recipe
                if (recipeApp.modalManager.recommendationEngine) {
                    recipeApp.modalManager.recommendationEngine.updateScoreForRecipe(recipeId);
                }

                // Trigger resort if in recommendation mode
                if (recipeApp.filterManager.sortOrder === 'recommendation') {
                    recipeApp.filterManager.applyFilters();
                }
            }

            delete this.viewTrackingTimeouts[recipeId];
        }, 10000);
    }

    getRecipeWithUserData(recipe) {
        const userInfo = this.getRecipeData(recipe.id);
        return { ...recipe, ...userInfo };
    }
}

// ============================================================================
// URL MANAGER CLASS (UPDATED FOR MULTILINGUAL SUPPORT)
// ============================================================================

class URLManager {
    constructor(filterManager, modalManager, recipeDatabase) {
        this.filterManager = filterManager;
        this.modalManager = modalManager;
        this.recipeDatabase = recipeDatabase;
        this.baseURL = window.location.protocol === 'file:'
            ? window.location.href.split('?')[0]
            : 'https://kkollsga.github.io/farmors-kokebok/';
        this.isUpdatingFromURL = false;
        this.updateURLTimeout = null;
    }

    initializeFromURL() {
        this.isUpdatingFromURL = true;

        const params = new URLSearchParams(window.location.search);

        // Skip language param (already handled)

        // --- Handle filters (already there) ---
        const filterParam = params.get('filter');
        if (filterParam) {
            const filters = filterParam.split(',');
            filters.forEach(filter => {
                if (filter.includes(':')) {
                    const [filterType, filterKey] = filter.split(':');
                    let localizedValue = filterKey;

                    if (filterType === 'category' && TAXONOMY.categories[filterKey]) {
                        localizedValue = TAXONOMY.categories[filterKey];
                    } else if (filterType === 'meal' && TAXONOMY.meals[filterKey]) {
                        localizedValue = TAXONOMY.meals[filterKey];
                    } else if (filterType === 'cuisine' && TAXONOMY.cuisines[filterKey]) {
                        localizedValue = TAXONOMY.cuisines[filterKey];
                    }

                    this.filterManager.activeFilters.set(`${filterType}:${localizedValue}`, true);
                }
            });
            this.filterManager.renderFilterPills();
            this.filterManager.updateFilterButton();
        }

        // --- Handle search parameter (NEW) ---
        const searchParam = params.get('search');
        if (searchParam) {
            this.filterManager.searchQuery = decodeURIComponent(searchParam).toLowerCase();
            if (recipeApp.searchFilterBar) {
                recipeApp.searchFilterBar.setSearch(this.filterManager.searchQuery);
            }
            this.filterManager.applyFilters();
        }

        // --- Handle recipe parameter (already there) ---
        const recipeParam = params.get('recipe');
        if (recipeParam) {
            let recipe = this.recipeDatabase.findById(recipeParam) ||
                this.recipeDatabase.getAll().find(r =>
                    r.title.toLowerCase() === decodeURIComponent(recipeParam).toLowerCase()
                );
            if (recipe) {
                setTimeout(() => {
                    this.modalManager.showRecipe(recipe.id, true); // Skip URL update on initial load
                }, 100);
            }
        }

        // Set initial history state so back button works correctly
        if (!window.history.state) {
            window.history.replaceState({
                filters: Array.from(this.filterManager.activeFilters),
                search: this.filterManager.searchQuery,
                recipeId: null
            }, '', window.location.href);
        }

        this.isUpdatingFromURL = false;
    }

    updateURL(useReplace = false) {
        if (this.isUpdatingFromURL) return;

        // Debounce to prevent any potential double updates
        if (this.updateURLTimeout) {
            clearTimeout(this.updateURLTimeout);
        }

        this.updateURLTimeout = setTimeout(() => {
            this.performURLUpdate(useReplace);
            this.updateURLTimeout = null;
        }, 0);
    }

    performURLUpdate(useReplace = false) {
        if (this.isUpdatingFromURL) return;

        const parts = [];

        // Add language parameter if not default
        if (CURRENT_LANGUAGE !== CONFIG.DEFAULT_LANGUAGE) {
            parts.push(`lang=${CURRENT_LANGUAGE}`);
        }

        // Build filter parameter with international keys
        if (this.filterManager.activeFilters.size > 0) {
            const activeFilters = [];
            this.filterManager.activeFilters.forEach((value, key) => {
                if (!value) return;

                const [filterType, filterValue] = key.split(':');
                let internationalKey = filterValue;

                if (filterType === 'category') {
                    internationalKey = this.recipeDatabase.getCategoryKey(filterValue) || filterValue;
                } else if (filterType === 'meal') {
                    internationalKey = this.recipeDatabase.getMealKey(filterValue) || filterValue;
                } else if (filterType === 'cuisine') {
                    internationalKey = this.recipeDatabase.getCuisineKey(filterValue) || filterValue;
                }

                activeFilters.push(`${filterType}:${internationalKey}`);
            });

            if (activeFilters.length > 0) {
                parts.push('filter=' + activeFilters.join(','));
            }
        }

        // --- Add search parameter (NEW) ---
        if (this.filterManager.searchQuery && this.filterManager.searchQuery.length > 0) {
            parts.push('search=' + encodeURIComponent(this.filterManager.searchQuery));
        }

        // Build recipe parameter with ID
        if (this.modalManager.currentRecipeId) {
            parts.push('recipe=' + this.modalManager.currentRecipeId);
        }

        const newURL = parts.length > 0 ? '?' + parts.join('&') : '';
        const fullURL = window.location.pathname + newURL;

        const state = {
            filters: Array.from(this.filterManager.activeFilters),
            search: this.filterManager.searchQuery,
            recipeId: this.modalManager.currentRecipeId
        };

        if (useReplace) {
            window.history.replaceState(state, '', fullURL);
        } else {
            window.history.pushState(state, '', fullURL);
        }
    }

    getShareableURL() {
        const parts = [];

        if (CURRENT_LANGUAGE !== CONFIG.DEFAULT_LANGUAGE) {
            parts.push(`lang=${CURRENT_LANGUAGE}`);
        }

        // Filters (same logic as above) ...
        if (this.filterManager.activeFilters.size > 0) {
            const activeFilters = [];
            this.filterManager.activeFilters.forEach((value, key) => {
                if (!value) return;
                const [filterType, filterValue] = key.split(':');
                let internationalKey = filterValue;
                if (filterType === 'category') {
                    internationalKey = this.recipeDatabase.getCategoryKey(filterValue) || filterValue;
                } else if (filterType === 'meal') {
                    internationalKey = this.recipeDatabase.getMealKey(filterValue) || filterValue;
                } else if (filterType === 'cuisine') {
                    internationalKey = this.recipeDatabase.getCuisineKey(filterValue) || filterValue;
                }
                activeFilters.push(`${filterType}:${internationalKey}`);
            });
            if (activeFilters.length > 0) {
                parts.push('filter=' + activeFilters.join(','));
            }
        }

        // --- Add search (NEW) ---
        if (this.filterManager.searchQuery && this.filterManager.searchQuery.length > 0) {
            parts.push('search=' + encodeURIComponent(this.filterManager.searchQuery));
        }

        if (this.modalManager.currentRecipeId) {
            parts.push('recipe=' + this.modalManager.currentRecipeId);
        }

        return parts.length > 0 ? `${this.baseURL}?${parts.join('&')}` : this.baseURL;
    }

    setSearch(query) {
        this.searchQuery = query;
        if (this.searchInput) {
            this.searchInput.value = query;
        }
        if (query && this.clearSearchBtn) {
            this.clearSearchBtn.classList.remove('hidden');
        } else if (this.clearSearchBtn) {
            this.clearSearchBtn.classList.add('hidden');
        }
        this.updateDisplay();
    }

    getRecipeURL(recipeId) {
        const langParam = CURRENT_LANGUAGE !== CONFIG.DEFAULT_LANGUAGE ? `?lang=${CURRENT_LANGUAGE}&` : '?';
        return `${this.baseURL}${langParam}recipe=${recipeId}`;
    }

    async copyToClipboard(url, buttonElement) {
        try {
            await navigator.clipboard.writeText(url);
            
            if (buttonElement) {
                const originalHTML = buttonElement.innerHTML;
                const originalClass = buttonElement.className;
                
                buttonElement.innerHTML = '<i class="fas fa-check"></i>';
                buttonElement.classList.add('text-green-600');
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalHTML;
                    buttonElement.className = originalClass;
                }, 1500);
            }
            
            return true;
        } catch (err) {
            console.error('Failed to copy URL:', err);
            return false;
        }
    }

    setupHistoryListener() {
        window.addEventListener('popstate', (event) => {
            this.isUpdatingFromURL = true;

            if (event.state) {
                this.filterManager.activeFilters.clear();
                if (event.state.filters) {
                    event.state.filters.forEach(([key, value]) => {
                        this.filterManager.activeFilters.set(key, value);
                    });
                }
                this.filterManager.renderFilterPills();
                this.filterManager.updateFilterButton();
                this.filterManager.applyFilters();

                if (event.state.recipeId) {
                    this.modalManager.showRecipe(event.state.recipeId, true); // Skip URL update when triggered by popstate
                } else if (this.modalManager.currentRecipeId) {
                    this.modalManager.closeRecipe(true); // Skip URL update when triggered by popstate
                }
            } else {
                this.filterManager.clearAllFilters();
                if (this.modalManager.currentRecipeId) {
                    this.modalManager.closeRecipe(true); // Skip URL update when triggered by popstate
                }
            }

            this.isUpdatingFromURL = false;
        });
    }
}

// ============================================================================
// FILTER MANAGER CLASS (Updated for unified search/filter bar)
// ============================================================================

class FilterManager {
    constructor(recipeDatabase, uiManager, recommendationEngine, userDataManager) {
        this.recipeDatabase = recipeDatabase;
        this.uiManager = uiManager;
        this.recommendationEngine = recommendationEngine;
        this.userDataManager = userDataManager;
        this.activeFilters = new Map();
        this.searchQuery = '';
        this.sortOrder = 'recommendation';
        this.urlManager = null;
        this.recommendationUpdateTimeout = null;
    }

    setURLManager(urlManager) {
        this.urlManager = urlManager;
    }

    scheduleRecommendationUpdate() {

        // Clear any existing recommendation update timeout
        if (this.recommendationUpdateTimeout) {
            clearTimeout(this.recommendationUpdateTimeout);
        }

        // Schedule new update in 10 seconds
        this.recommendationUpdateTimeout = setTimeout(() => {
            if (this.sortOrder === 'recommendation') {
                this.applyFilters();
            } else {
            }
            this.recommendationUpdateTimeout = null;
        }, 10000);

    }

    hasActiveSearchOrFilters() {
        return this.searchQuery.length > 0 || this.activeFilters.size > 0;
    }

    changeSortOrder(newOrder) {
        const previousOrder = this.sortOrder;
        this.sortOrder = newOrder;
        
        document.querySelectorAll('[data-sort]').forEach(btn => {
            if (btn.getAttribute('data-sort') === newOrder) {
                btn.classList.remove('text-gray-700', 'hover:text-amber-600');
                btn.classList.add('bg-amber-500', 'text-white');
            } else {
                btn.classList.remove('bg-amber-500', 'text-white');
                btn.classList.add('text-gray-700', 'hover:text-amber-600');
            }
        });
        
        if (newOrder === 'recommendation' && previousOrder !== 'recommendation') {
            this.recommendationEngine.calculateAllScores();
        }
        
        this.applyFilters();
    }

    activateFilter(filterType, filterValue, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const filterKey = `${filterType}:${filterValue}`;

        // Close modal if it's open
        const modal = document.getElementById('recipeModal');
        const wasModalOpen = !modal.classList.contains('hidden');
        if (wasModalOpen) {
            recipeApp.modalManager.closeRecipe();
        }

        // Add the filter if it's not already active
        if (!this.activeFilters.has(filterKey)) {
            this.activeFilters.set(filterKey, true);

            // Refresh the search filter bar state
            if (recipeApp.searchFilterBar) {
                recipeApp.searchFilterBar.refreshState();
            }

            // Update URL
            if (this.urlManager) {
                this.urlManager.updateURL();
            }

            requestAnimationFrame(() => {
                this.applyFilters();

                if (wasModalOpen) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }

    toggleFilterType(type) {
        if (this.activeFilters.has(type)) {
            this.activeFilters.delete(type);
        } else {
            this.activeFilters.set(type, true);
        }
        this.applyFilters();
        
        if (this.urlManager) {
            this.urlManager.updateURL();
        }
    }

    removeFilter(type) {
        this.activeFilters.delete(type);
        this.applyFilters();
        
        if (this.urlManager) {
            this.urlManager.updateURL();
        }
    }

    clearAllFilters() {
        this.activeFilters.clear();
        this.applyFilters();
        
        // Refresh the search filter bar state
        if (recipeApp.searchFilterBar) {
            recipeApp.searchFilterBar.refreshState();
        }
        
        if (this.urlManager) {
            this.urlManager.updateURL();
        }
    }

    applyFilters() {
        let filtered = this.recipeDatabase.getAll();
        
        const activeCategoryFilters = [];
        const activeMealFilters = [];
        const activeCuisineFilters = [];
        
        this.activeFilters.forEach((isActive, filterKey) => {
            if (!isActive) return;
            
            const [filterType, filterValue] = filterKey.split(':');
            if (filterType === 'category') {
                activeCategoryFilters.push(filterValue);
            } else if (filterType === 'meal') {
                activeMealFilters.push(filterValue);
            } else if (filterType === 'cuisine') {
                activeCuisineFilters.push(filterValue);
            }
        });
        
        if (activeCategoryFilters.length > 0) {
            filtered = filtered.filter(recipe => 
                activeCategoryFilters.includes(recipe.category)
            );
        }
        
        if (activeMealFilters.length > 0) {
            filtered = filtered.filter(recipe => 
                activeMealFilters.includes(recipe.meal)
            );
        }
        
        if (activeCuisineFilters.length > 0) {
            filtered = filtered.filter(recipe => 
                activeCuisineFilters.includes(recipe.cuisine)
            );
        }
        
        if (this.searchQuery) {
            filtered = filtered.filter(recipe => {
                const titleMatch = recipe.title.toLowerCase().includes(this.searchQuery);
                
                let ingredientMatch = false;
                if (recipe.ingredients) {
                    recipe.ingredients.forEach(item => {
                        if (typeof item === 'string') {
                            if (item.toLowerCase().includes(this.searchQuery)) {
                                ingredientMatch = true;
                            }
                        } else if (item.items) {
                            item.items.forEach(ing => {
                                if (ing.toLowerCase().includes(this.searchQuery)) {
                                    ingredientMatch = true;
                                }
                            });
                        }
                    });
                }
                
                return titleMatch || ingredientMatch;
            });
        }
        
        const taggedRecipes = [];
        const untaggedRecipes = [];
        
        filtered.forEach(recipe => {
            const userData = this.userDataManager.getRecipeData(recipe.id);
            if (userData.tagged) {
                taggedRecipes.push({
                    recipe,
                    taggedAt: userData.taggedAt
                });
            } else {
                untaggedRecipes.push(recipe);
            }
        });
        
        taggedRecipes.sort((a, b) => {
            const dateA = new Date(a.taggedAt || 0);
            const dateB = new Date(b.taggedAt || 0);
            return dateB - dateA;
        });
        
        const recipeDataCache = new Map();
        
        const getRecipeData = (recipe) => {
            if (recipeDataCache.has(recipe.id)) {
                return recipeDataCache.get(recipe.id);
            }
            
            const data = {
                recipe: recipe,
                score: this.recommendationEngine.getRecipeScore(recipe.id),
                rating: this.userDataManager.getRecipeData(recipe.id).userRating || 0,
                madeCount: this.userDataManager.getRecipeData(recipe.id).madeDates?.length || 0,
                pageNumber: recipe.pageNumber || Number.MAX_SAFE_INTEGER,
                title: recipe.title
            };
            
            recipeDataCache.set(recipe.id, data);
            return data;
        };
        
        const compareByPageNumber = (dataA, dataB) => {
            if (dataA.pageNumber !== dataB.pageNumber) {
                return dataA.pageNumber - dataB.pageNumber;
            }
            return dataA.recipe.id.localeCompare(dataB.recipe.id);
        };
        
        const compareByRecommendation = (dataA, dataB) => {
            if (dataA.score !== dataB.score) {
                return dataB.score - dataA.score;
            }
            return compareByPageNumber(dataA, dataB);
        };
        
        const enrichedRecipes = untaggedRecipes.map(recipe => getRecipeData(recipe));
        
        switch(this.sortOrder) {
            case 'recommendation':
                enrichedRecipes.sort(compareByRecommendation);
                break;
            
            case 'alphabetical':
                enrichedRecipes.sort((a, b) => {
                    return a.title.localeCompare(b.title, 'no-NO');
                });
                break;
            
            case 'recipebook':
                enrichedRecipes.sort(compareByPageNumber);
                break;
            
            case 'madecount':
                enrichedRecipes.sort((a, b) => {
                    if (a.madeCount !== b.madeCount) {
                        return b.madeCount - a.madeCount;
                    }
                    return compareByRecommendation(a, b);
                });
                break;
            
            case 'rating':
                enrichedRecipes.sort((a, b) => {
                    if (a.rating !== b.rating) {
                        return b.rating - a.rating;
                    }
                    return compareByRecommendation(a, b);
                });
                break;
        }
        
        const sortedUntaggedRecipes = enrichedRecipes.map(data => data.recipe);
        
        const finalFiltered = [
            ...taggedRecipes.map(item => item.recipe),
            ...sortedUntaggedRecipes
        ];
        
        const filteredIds = finalFiltered.map(recipe => recipe.id);
        this.uiManager.renderRecipes(filteredIds, false);
    }

    renderFilterPills() {
        // This method is called by URLManager but the filter pills are now handled by SearchFilterBar
        // Update the search filter bar display to show the current filters
        if (recipeApp && recipeApp.searchFilterBar) {
            recipeApp.searchFilterBar.updateDisplay();
        }
    }

    updateFilterButton() {
        // This method is called by URLManager but the filter button is now handled by SearchFilterBar
        // Update the search filter bar display to show the current filter state
        if (recipeApp && recipeApp.searchFilterBar) {
            recipeApp.searchFilterBar.updateDisplay();
        }
    }
}

// ============================================================================
// SEARCH FILTER BAR CLASS (iOS-style unified component)
// ============================================================================

// ============================================================================
// SEARCH FILTER BAR CLASS (Simplified - iOS-style unified component)
// ============================================================================

class SearchFilterBar {
    constructor(filterManager, recipeDatabase) {
        this.filterManager = filterManager;
        this.recipeDatabase = recipeDatabase;

        // Simplified configuration
        this.config = {
            scrollThreshold: 50, // Pixels to trigger collapse/expand
            debounceDelay: 10
        };

        // State management
        this.state = {
            position: 'standard', // 'standard' | 'fixed'
            view: 'expanded',     // 'expanded' | 'collapsed'
        };

        // Scroll tracking
        this.scrollState = {
            lastY: 0,
            accumulator: 0,
            debounceTimer: null
        };

        // Search and filter state
        this.searchQuery = '';
        this.showFilterMenu = false;
        this.showActiveFiltersMenu = false;

        // DOM element references
        this.container = document.getElementById('searchFilterContainer');
        this.glassBar = document.getElementById('unifiedGlassBar');
        this.standardContent = document.getElementById('standardContent');
        this.minimumContent = document.getElementById('minimumContent');
        this.filterButton = document.getElementById('unifiedFilterBtn');
        this.searchInput = document.getElementById('unifiedSearchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.filterPillsContainer = document.getElementById('filterPillsContainer');
        this.searchPill = document.getElementById('searchPill');
        this.filterPill = document.getElementById('filterPill');
        this.filterCounter = document.getElementById('filterCounter');

        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    // ============================================
    // SIMPLIFIED SCROLL HANDLING
    // ============================================
    setupScrollListener() {
        const handleScroll = () => {
            clearTimeout(this.scrollState.debounceTimer);
            this.scrollState.debounceTimer = setTimeout(() => {
                requestAnimationFrame(() => this.processScroll());
            }, this.config.debounceDelay);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    processScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrollDelta = scrollY - this.scrollState.lastY;
        
        // Define threshold for position transitions (pixels)
        const POSITION_THRESHOLD = 20;
        
        // Determine if we should be fixed based on current state and threshold
        let shouldBeFixed = false;
        
        if (this.state.position === 'standard') {
            // When standard, check if container has scrolled past threshold
            const containerRect = this.container.getBoundingClientRect();
            shouldBeFixed = containerRect.top < -POSITION_THRESHOLD;
        } else {
            // When fixed, check if we've scrolled back above threshold
            const spacer = document.getElementById('searchBarSpacer');
            if (spacer) {
                const spacerRect = spacer.getBoundingClientRect();
                // Return to standard only when spacer is clearly visible again
                shouldBeFixed = spacerRect.bottom < POSITION_THRESHOLD;
            } else {
                shouldBeFixed = true;
            }
        }
        
        // Handle position changes (standard <-> fixed)
        if (this.state.position === 'standard' && shouldBeFixed) {
            this.transitionToFixed();
        } else if (this.state.position === 'fixed' && !shouldBeFixed) {
            this.transitionToStandard();
        }
    
        // Handle view changes when fixed
        if (this.state.position === 'fixed') {
            const hasContent = this.hasActiveContent();
            this.scrollState.accumulator += scrollDelta;
    
            // Check thresholds
            if (this.state.view === 'expanded' && this.scrollState.accumulator > this.config.scrollThreshold) {
                if (hasContent) {
                    this.setCollapsedView();
                } else {
                    // No content - hide immediately
                    this.state.view = 'collapsed';
                    this.container.style.opacity = '0';
                    this.container.style.pointerEvents = 'none';
                }
                this.scrollState.accumulator = 0;
            } else if (this.state.view === 'collapsed' && this.scrollState.accumulator < -this.config.scrollThreshold) {
                // Show the bar when scrolling up
                this.container.style.opacity = '1';
                this.container.style.pointerEvents = '';
                this.setExpandedView();
                this.scrollState.accumulator = 0;
            }
    
            // Reset accumulator on direction change
            if ((scrollDelta > 0 && this.scrollState.accumulator < 0) || 
                (scrollDelta < 0 && this.scrollState.accumulator > 0)) {
                this.scrollState.accumulator = scrollDelta;
            }
        }
    
        this.scrollState.lastY = scrollY;
    }

    refreshState() {
        const hasContent = this.hasActiveContent();
        
        if (this.state.position === 'fixed') {
            if (hasContent && this.container.style.opacity === '0') {
                this.container.style.opacity = '1';
                this.container.style.pointerEvents = '';
                this.setExpandedView();
            } else if (!hasContent && this.state.view === 'collapsed') {
                this.container.style.opacity = '0';
                this.container.style.pointerEvents = 'none';
            }
        }
        
        this.updateDisplay();
    }

    // ============================================
    // STATE TRANSITIONS
    // ============================================
    transitionToFixed() {
        if (this.state.position === 'fixed') return;
    
        // Get current height before transitioning
        const containerHeight = this.container.offsetHeight;
        const computedStyle = window.getComputedStyle(this.container);
        const marginTop = parseFloat(computedStyle.marginTop) || 0;
        const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
        const totalHeight = containerHeight + marginTop + marginBottom;
    
        // Create spacer to prevent content shift
        const spacer = document.createElement('div');
        spacer.id = 'searchBarSpacer';
        spacer.style.cssText = `height: ${totalHeight}px; margin: 0; padding: 0; visibility: hidden;`;
        
        // Insert spacer before changing position
        this.container.parentNode.insertBefore(spacer, this.container);
    
        // Transition to fixed
        this.container.classList.add('search-bar-fixed');
        this.state.position = 'fixed';
        this.state.view = 'collapsed';
        this.scrollState.accumulator = 0;
        
        // Determine initial visibility based on content
        const hasContent = this.hasActiveContent();
        
        if (hasContent) {
            // Has filters/search → show minimum view
            this.container.style.opacity = '1';
            this.container.style.pointerEvents = '';
            this.showMinimumContent();
        } else {
            // No content → hide completely
            this.container.style.opacity = '0';
            this.container.style.pointerEvents = 'none';
        }
    }

    transitionToStandard() {
        if (this.state.position === 'standard') return;
    
        // Remove spacer
        const spacer = document.getElementById('searchBarSpacer');
        if (spacer) {
            spacer.remove();
        }
    
        // Remove fixed class
        this.container.classList.remove('search-bar-fixed');
        this.state.position = 'standard';
        this.state.view = 'expanded';
        this.scrollState.accumulator = 0;
        
        // Ensure visibility
        this.container.style.opacity = '';
        this.container.style.pointerEvents = '';
        
        this.showStandardContent();
    }

    setCollapsedView() {
        if (this.state.view === 'collapsed') return;
        this.state.view = 'collapsed';
        this.showMinimumContent();
    }

    setExpandedView() {
        if (this.state.view === 'expanded') return;
        this.state.view = 'expanded';
        this.showStandardContent();
    }

    showMinimumContent() {
        if (!this.standardContent || !this.minimumContent) return;

        this.standardContent.classList.add('hidden');
        this.minimumContent.classList.remove('hidden');
        this.updateMinimumDisplay();
    }

    showStandardContent() {
        if (!this.standardContent || !this.minimumContent) return;

        this.minimumContent.classList.add('hidden');
        this.standardContent.classList.remove('hidden');
        this.updateStandardDisplay();
    }

    // ============================================
    // DISPLAY UPDATES
    // ============================================
    updateDisplay() {
        if (this.state.view === 'collapsed') {
            this.updateMinimumDisplay();
        } else {
            this.updateStandardDisplay();
        }
    }

    updateStandardDisplay() {
        const hasFilters = this.filterManager.activeFilters.size > 0;
        const filterCount = this.filterManager.activeFilters.size;
        const hasSearch = this.searchQuery.length > 0;

        this.updateFilterButton(hasFilters, filterCount);
        this.updateFilterPills();

        if (this.searchInput) {
            this.searchInput.value = this.searchQuery;
        }
        if (this.clearSearchBtn) {
            this.clearSearchBtn.classList.toggle('hidden', !hasSearch);
        }
    }

    updateMinimumDisplay() {
        if (!this.searchPill || !this.filterPill || !this.filterCounter) return;

        const hasSearch = this.searchQuery.length > 0;
        const hasFilters = this.filterManager.activeFilters.size > 0;
        const filterCount = this.filterManager.activeFilters.size;

        // Hide all pills first
        this.searchPill.classList.add('hidden');
        this.filterPill.classList.add('hidden');
        this.filterCounter.classList.add('hidden');

        if (hasSearch && hasFilters) {
            this.filterCounter.classList.remove('hidden');
            document.getElementById('filterCounterText').textContent = filterCount;
            this.searchPill.classList.remove('hidden');
            document.getElementById('searchPillText').textContent = this.searchQuery;
        } else if (hasSearch) {
            this.searchPill.classList.remove('hidden');
            document.getElementById('searchPillText').textContent = this.searchQuery;
        } else if (hasFilters) {
            this.filterPill.classList.remove('hidden');
            const filterPillText = document.getElementById('filterPillText');
            if (filterCount === 1) {
                const [filterKey] = Array.from(this.filterManager.activeFilters.keys());
                const [, filterName] = filterKey.split(':');
                filterPillText.textContent = filterName;
            } else {
                filterPillText.textContent = `${filterCount} filters`;
            }
        }
    }

    updateFilterButton(hasFilters, filterCount) {
        if (!this.filterButton) return;

        const countSpan = this.filterButton.querySelector('#filterCount');
        const textSpan = this.filterButton.querySelector('#filterButtonText');
        const isMobile = window.innerWidth <= 768;

        if (hasFilters && isMobile) {
            this.filterButton.className = "flex items-center p-1.5 rounded-lg transition-all text-sm font-medium shrink-0 text-amber-700 hover:text-amber-800 hover:bg-amber-50";
            if (countSpan) countSpan.classList.add('hidden');
            if (textSpan) textSpan.classList.add('hidden');
        } else if (hasFilters && !isMobile) {
            this.filterButton.className = "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shrink-0 shadow-sm hover:shadow-md bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700";
            if (countSpan) {
                countSpan.textContent = filterCount;
                countSpan.className = 'bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold';
                countSpan.classList.remove('hidden');
            }
            if (textSpan) textSpan.classList.remove('hidden');
        } else {
            this.filterButton.className = "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shrink-0 shadow-sm hover:shadow-md bg-white text-gray-700 hover:text-amber-600 border border-gray-200";
            if (countSpan) countSpan.classList.add('hidden');
            if (textSpan) textSpan.classList.remove('hidden');
        }
    }

    updateFilterPills() {
        if (!this.filterPillsContainer) return;

        this.filterPillsContainer.innerHTML = '';

        const hasFilters = this.filterManager.activeFilters.size > 0;
        const filterCount = this.filterManager.activeFilters.size;

        if (hasFilters) {
            if (filterCount === 1) {
                const [filterKey] = Array.from(this.filterManager.activeFilters.keys());
                const [, filterName] = filterKey.split(':');
                const pill = document.createElement('div');
                pill.className = "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all shadow-sm max-w-[150px] bg-gradient-to-r from-amber-500 to-amber-600 text-white";
                pill.innerHTML = `
                    <span class="cursor-pointer font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]" onclick="recipeApp.searchFilterBar.togglePillActive('${filterKey}')">${filterName}</span>
                    <button onclick="recipeApp.searchFilterBar.removeFilter('${filterKey}')" class="ml-1 hover:opacity-70 flex-shrink-0">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                `;
                this.filterPillsContainer.appendChild(pill);
            } else {
                const pill = document.createElement('div');
                pill.className = "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white cursor-pointer";
                pill.innerHTML = `
                    <span class="font-medium" onclick="recipeApp.searchFilterBar.toggleActiveFiltersMenu()">${filterCount} filters</span>
                    <button onclick="recipeApp.searchFilterBar.clearAllFilters()" class="ml-1 hover:opacity-70 flex-shrink-0">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                `;
                this.filterPillsContainer.appendChild(pill);
            }
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Setup scroll listener for search bar transitions
        this.setupScrollListener();

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                this.searchQuery = query;
                this.filterManager.searchQuery = query;
                this.filterManager.applyFilters();

                if (this.filterManager.urlManager) {
                    this.filterManager.urlManager.updateURL();
                }

                this.clearSearchBtn.classList.toggle('hidden', query.length === 0);
            });
        }

        // Clear search button
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Filter button
        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => {
                this.toggleFilterMenu();
            });
        }

        // Clear search/filter pills
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearSearchPill')) {
                this.clearSearch();
            }
            if (e.target.closest('#clearFilterPill')) {
                this.clearAllFilters();
            }
        });

        // Filter counter click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#filterCounter')) {
                this.toggleActiveFiltersMenu();
            }
        });

        // Click outside to close menus
        document.addEventListener('click', (e) => {
            if (!this.container?.contains(e.target)) {
                this.closeAllMenus();
            }
        });
    }

    // ============================================
    // FILTER MANAGEMENT
    // ============================================
    toggleFilterMenu() {
        const menu = document.getElementById('unifiedFilterMenu');
        const activeMenu = document.getElementById('unifiedActiveFiltersMenu');

        if (menu) {
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                menu.innerHTML = this.getFilterMenuHTML();
                activeMenu?.classList.add('hidden');
            } else {
                menu.classList.add('hidden');
            }
        }
    }

    toggleActiveFiltersMenu() {
        const menu = document.getElementById('unifiedActiveFiltersMenu');
        const filterMenu = document.getElementById('unifiedFilterMenu');

        if (menu) {
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                menu.innerHTML = this.getActiveFiltersMenuHTML();
                filterMenu?.classList.add('hidden');
            } else {
                menu.classList.add('hidden');
            }
        }
    }

    closeAllMenus() {
        document.getElementById('unifiedFilterMenu')?.classList.add('hidden');
        document.getElementById('unifiedActiveFiltersMenu')?.classList.add('hidden');
    }

    toggleFilter(filterKey) {
        this.filterManager.toggleFilterType(filterKey);
        this.updateDisplay();
    }

    removeFilter(filterKey) {
        this.filterManager.removeFilter(filterKey);

        if (this.searchInput) {
            this.searchInput.value = this.searchQuery;
        }

        const allSearchInputs = document.querySelectorAll('#unifiedSearchInput');
        allSearchInputs.forEach(input => {
            input.value = this.searchQuery;
        });

        this.updateDisplay();
    }

    togglePillActive(filterKey) {
        this.toggleFilterMenu();
    }

    setSearch(query) {
        this.searchQuery = query;
        this.filterManager.searchQuery = query;
        
        if (this.searchInput) {
            this.searchInput.value = query;
        }
        
        const allSearchInputs = document.querySelectorAll('#unifiedSearchInput');
        allSearchInputs.forEach(input => {
            input.value = query;
        });
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.classList.toggle('hidden', !query || query.length === 0);
        }
        
        this.updateDisplay();
    }

    clearSearch() {
        this.searchQuery = '';
        this.filterManager.searchQuery = '';

        if (this.searchInput) {
            this.searchInput.value = '';
        }

        const allSearchInputs = document.querySelectorAll('#unifiedSearchInput');
        allSearchInputs.forEach(input => {
            input.value = '';
        });

        this.filterManager.applyFilters();
        this.updateDisplay();
        
        if (this.filterManager.urlManager) {
            this.filterManager.urlManager.updateURL();
        }
    }

    clearAllFilters() {
        this.filterManager.clearAllFilters();
        this.updateDisplay();
    }

    // ============================================
    // HTML GENERATION
    // ============================================
    getFilterMenuHTML() {
        const filters = this.recipeDatabase.getFilters();
        let html = `
            <div class="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-100 min-w-[280px] max-h-[400px] overflow-y-auto">
                <div class="text-sm font-semibold text-gray-700 px-4 pt-4 pb-2 border-b border-gray-100">
                    ${UI_TEXT.filter.title}
                </div>
                <div class="p-2">
        `;

        // Categories
        if (filters.categories && filters.categories.length > 0) {
            html += `<div class="mb-3">
                <button onclick="this.parentNode.querySelector('.filter-section-content').classList.toggle('hidden'); this.querySelector('.chevron').classList.toggle('rotate-180')"
                        class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors">
                    <span>${UI_TEXT.filter.categories.category}</span>
                    <i class="fas fa-chevron-down text-xs chevron transition-transform duration-200"></i>
                </button>
                <div class="filter-section-content hidden">`;
            filters.categories.forEach(category => {
                const isActive = this.filterManager.activeFilters.has(`category:${category}`);
                html += `
                    <label class="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors ml-2">
                        <span class="text-sm text-gray-700">${category}</span>
                        <input type="checkbox"
                               ${isActive ? 'checked' : ''}
                               onchange="recipeApp.searchFilterBar.toggleFilter('category:${category}')"
                               class="rounded border-gray-300 text-amber-600 focus:ring-amber-500">
                    </label>`;
            });
            html += `</div></div>`;
        }

        // Meals
        if (filters.meals && filters.meals.length > 0) {
            html += `<div class="mb-3">
                <button onclick="this.parentNode.querySelector('.filter-section-content').classList.toggle('hidden'); this.querySelector('.chevron').classList.toggle('rotate-180')"
                        class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors">
                    <span>${UI_TEXT.filter.categories.meal}</span>
                    <i class="fas fa-chevron-down text-xs chevron transition-transform duration-200"></i>
                </button>
                <div class="filter-section-content hidden">`;
            filters.meals.forEach(meal => {
                const isActive = this.filterManager.activeFilters.has(`meal:${meal}`);
                html += `
                    <label class="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors ml-2">
                        <span class="text-sm text-gray-700">${meal}</span>
                        <input type="checkbox"
                               ${isActive ? 'checked' : ''}
                               onchange="recipeApp.searchFilterBar.toggleFilter('meal:${meal}')"
                               class="rounded border-gray-300 text-amber-600 focus:ring-amber-500">
                    </label>`;
            });
            html += `</div></div>`;
        }

        // Cuisines
        if (filters.cuisines && filters.cuisines.length > 0) {
            html += `<div class="mb-3">
                <button onclick="this.parentNode.querySelector('.filter-section-content').classList.toggle('hidden'); this.querySelector('.chevron').classList.toggle('rotate-180')"
                        class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors">
                    <span>${UI_TEXT.filter.categories.cuisine}</span>
                    <i class="fas fa-chevron-down text-xs chevron transition-transform duration-200"></i>
                </button>
                <div class="filter-section-content hidden">`;
            filters.cuisines.forEach(cuisine => {
                const isActive = this.filterManager.activeFilters.has(`cuisine:${cuisine}`);
                html += `
                    <label class="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors ml-2">
                        <span class="text-sm text-gray-700">${cuisine}</span>
                        <input type="checkbox"
                               ${isActive ? 'checked' : ''}
                               onchange="recipeApp.searchFilterBar.toggleFilter('cuisine:${cuisine}')"
                               class="rounded border-gray-300 text-amber-600 focus:ring-amber-500">
                    </label>`;
            });
            html += `</div></div>`;
        }

        html += `</div></div>`;
        return html;
    }

    getActiveFiltersMenuHTML() {
        let html = `
            <div class="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-100 min-w-[250px]">
                <div class="text-sm font-semibold text-gray-700 px-4 pt-4 pb-2 border-b border-gray-100">
                    Active Filters
                </div>
                <div class="p-2">
        `;

        this.filterManager.activeFilters.forEach((value, key) => {
            const [filterType, filterName] = key.split(':');
            html += `
                <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group transition-colors">
                    <span class="text-sm text-gray-700">${filterName}</span>
                    <button onclick="recipeApp.searchFilterBar.removeFilter('${key}')" 
                            class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            `;
        });

        html += `
                    <button onclick="recipeApp.searchFilterBar.clearAllFilters()" 
                            class="w-full mt-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        Clear All Filters
                    </button>
                </div>
            </div>
        `;
        return html;
    }

    // ============================================
    // HELPER METHODS
    // ============================================
    hasActiveContent() {
        return this.searchQuery.length > 0 || this.filterManager.activeFilters.size > 0;
    }
}

// ============================================================================
// IMAGE LOADER CLASS
// ============================================================================

class ImageLoader {
    constructor() {
        this.loadingRows = new Set();
        this.loadedImages = new Set();
        this.bufferRows = 20;
        this.scrollTimer = null;
        this.resizeTimer = null;
    }
    
    getColumnCount() {
        const grid = document.getElementById('recipeGrid');
        if (!grid || !grid.firstElementChild) return 1;
        
        const gridWidth = grid.offsetWidth;
        const cardWidth = grid.firstElementChild.offsetWidth;
        const gap = 24;
        
        const columns = Math.round((gridWidth + gap) / (cardWidth + gap));
        return Math.max(1, columns);
    }
    
    getVisibleRowRange() {
        const grid = document.getElementById('recipeGrid');
        const cards = Array.from(grid.children).filter(card => 
            card.style.display !== 'none'
        );
        
        if (cards.length === 0) return { start: 0, end: 0, totalRows: 0 };
        
        const columnCount = this.getColumnCount();
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + window.innerHeight;
        
        let firstVisibleRow = null;
        let lastVisibleRow = null;
        
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const absoluteBottom = absoluteTop + rect.height;
            const row = Math.floor(index / columnCount);
            
            if (absoluteBottom > viewportTop && absoluteTop < viewportBottom) {
                if (firstVisibleRow === null) firstVisibleRow = row;
                lastVisibleRow = row;
            }
        });
        
        const totalRows = Math.ceil(cards.length / columnCount);
        
        return {
            start: Math.max(0, (firstVisibleRow ?? 0) - this.bufferRows),
            end: Math.min(totalRows - 1, (lastVisibleRow ?? 0) + this.bufferRows),
            totalRows: totalRows
        };
    }
    
    async loadRow(rowIndex) {
        if (this.loadingRows.has(rowIndex)) return;
        
        this.loadingRows.add(rowIndex);
        
        const grid = document.getElementById('recipeGrid');
        const cards = Array.from(grid.children).filter(card => 
            card.style.display !== 'none'
        );
        
        const columnCount = this.getColumnCount();
        const startIdx = rowIndex * columnCount;
        const endIdx = Math.min(startIdx + columnCount, cards.length);
        
        const loadPromises = [];
        
        for (let i = startIdx; i < endIdx; i++) {
            const card = cards[i];
            const img = card.querySelector('img[data-src]');
            
            if (img && !this.loadedImages.has(img)) {
                loadPromises.push(this.loadImage(img));
            }
        }
        
        await Promise.all(loadPromises);
    }
    
    loadImage(img) {
        return new Promise((resolve) => {
            const src = img.getAttribute('data-src');
            if (!src || this.loadedImages.has(img)) {
                resolve();
                return;
            }
            
            this.loadedImages.add(img);
            const tempImg = new Image();
            
            tempImg.onload = () => {
                img.src = src;
                img.classList.add('opacity-100');
                img.removeAttribute('data-src');
                resolve();
            };
            
            tempImg.onerror = () => {
                img.removeAttribute('data-src');
                resolve();
            };
            
            tempImg.src = src;
        });
    }
    
    async loadVisibleRows() {
        const { start, end } = this.getVisibleRowRange();
        
        for (let row = start; row <= end; row++) {
            await this.loadRow(row);
        }
    }
    
    setupScrollHandler() {
        const handleScroll = () => {
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                this.loadVisibleRows();
            }, 100);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.loadingRows.clear();
                this.loadVisibleRows();
            }, 250);
        });
    }
    
    reset() {
        this.loadedImages.clear();
        this.loadingRows.clear();
    }
}

// ============================================================================
// UI MANAGER CLASS
// ============================================================================

class UIManager {
    constructor(recipeDatabase, userDataManager) {
        this.recipeDatabase = recipeDatabase;
        this.userDataManager = userDataManager;
        this.modalCallback = null;
        this.imageLoader = null;
    }

    setModalCallback(callback) {
        this.modalCallback = callback;
    }

    formatSource(recipe) {
        let parts = [];
        if (recipe.provider) {
            parts.push(recipe.provider);
        }
        if (recipe.reference) {
            parts.push(recipe.reference);
        }
        if (recipe.pageNumber) {
            parts.push(`${UI_TEXT.recipe.page} ${recipe.pageNumber}`);
        }
        return parts.join(' • ');
    }

    isFromMainCookbook(recipe) {
        return recipe.reference && recipe.reference.toLowerCase().includes('oppskriftsbok') && recipe.pageNumber;
    }

    renderSourceInfo(recipe, isMobile = false) {
        if (!recipe.provider && !recipe.reference && !recipe.pageNumber) return '';

        const isMainCookbook = this.isFromMainCookbook(recipe);

        if (isMainCookbook) {
            // Show provider and clickable book reference inline
            return `
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                    ${recipe.provider ? `<span class="text-xs text-gray-600">${recipe.provider}</span>` : ''}
                    <button onclick="recipeApp.kokebokViewer.open(${recipe.pageNumber})"
                            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 transition-all duration-200 group">
                        <i class="fas fa-book text-amber-600 text-xs group-hover:scale-110 transition-transform"></i>
                        <span class="text-amber-700 font-medium text-xs">${recipe.reference} ${UI_TEXT.recipe.page} ${recipe.pageNumber}</span>
                        <i class="fas fa-external-link-alt text-amber-500 opacity-70 group-hover:opacity-100 transition-opacity" style="font-size: 10px;"></i>
                    </button>
                </div>
            `;
        } else {
            // Regular source info for non-cookbook recipes
            const sourceInfo = this.formatSource(recipe);
            return `
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-info-circle text-gray-400 text-xs"></i>
                    <p class="text-xs text-gray-600">${sourceInfo}</p>
                </div>
            `;
        }
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star text-amber-400 transition-all duration-200 hover:scale-125"></i>';
            } else {
                stars += '<i class="far fa-star text-gray-300 transition-all duration-200 hover:scale-125"></i>';
            }
        }
        return stars;
    }

    updateRecipeCardTag(recipeId, isTagged) {
        const cards = document.querySelectorAll(`[data-recipe-id="${recipeId}"]`);
        cards.forEach(card => {
            if (isTagged) {
                card.classList.remove(CONFIG.STYLES.DEFAULT_SHADOW, CONFIG.STYLES.DEFAULT_HOVER_SHADOW);
                card.classList.add(...CONFIG.STYLES.TAGGED_SHADOW.split(' '), ...CONFIG.STYLES.TAGGED_HOVER_SHADOW.split(' '));
                
                const imageContainer = card.querySelector('.h-48');
                if (imageContainer && !imageContainer.querySelector('.fa-tag')) {
                    const tagBadge = document.createElement('span');
                    tagBadge.className = 'absolute top-2 left-2 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full';
                    tagBadge.innerHTML = '<i class="fas fa-tag"></i>';
                    imageContainer.appendChild(tagBadge);
                }
            } else {
                card.classList.remove(...CONFIG.STYLES.TAGGED_SHADOW.split(' '), ...CONFIG.STYLES.TAGGED_HOVER_SHADOW.split(' '));
                card.classList.add(CONFIG.STYLES.DEFAULT_SHADOW, CONFIG.STYLES.DEFAULT_HOVER_SHADOW);
                
                const tagBadge = card.querySelector('.fa-tag')?.parentElement;
                if (tagBadge && tagBadge.classList.contains('absolute')) {
                    tagBadge.remove();
                }
            }
        });
    }

    createRecipeCard(recipe) {
        const card = document.createElement('div');
        const isTagged = recipe.tagged || false;
        
        const shadowClass = isTagged 
            ? `${CONFIG.STYLES.TAGGED_SHADOW} ${CONFIG.STYLES.TAGGED_HOVER_SHADOW}` 
            : `${CONFIG.STYLES.DEFAULT_SHADOW} ${CONFIG.STYLES.DEFAULT_HOVER_SHADOW}`;

        card.className = `bg-white rounded-xl ${shadowClass} overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1`;
        card.setAttribute('data-recipe-id', recipe.id);
        card.setAttribute('data-recipe-click', recipe.id);
        
        const imageUrl = recipe.image ? CONFIG.IMAGE_PATHS.LIST + recipe.image : null;
        const sourceInfo = this.formatSource(recipe);
        
        card.innerHTML = `
            <div class="h-48 bg-gradient-to-br from-amber-100 to-orange-100 relative overflow-hidden">
                ${recipe.image ? 
                    `<img data-src="${imageUrl}"
                        loading="lazy"
                        alt="${recipe.title}" 
                        class="w-full h-full object-cover opacity-0 transition-opacity duration-300">` : 
                    `<div class="w-full h-full flex items-center justify-center">
                        <span class="text-6xl opacity-30">${UI_TEXT.recipe.noImage}</span>
                    </div>`}
                ${isTagged ? `<span class="absolute top-2 left-2 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    <i class="fas fa-tag"></i>
                </span>` : ''}
                ${recipe.category ? `<span onclick="recipeApp.filterManager.activateFilter('category', '${recipe.category}', event)" 
                    class="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs font-medium px-2 py-1 rounded-full text-amber-700 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-amber-50 hover:shadow-xl hover:text-amber-800">
                    ${recipe.category}
                </span>` : ''}
            </div>
            <div class="p-5">
                <h3 class="font-display text-xl text-gray-800 ${sourceInfo ? 'mb-0' : 'mb-2'}">${recipe.title}</h3>
                ${sourceInfo ? `<p class="text-xs text-amber-600 mb-2">${sourceInfo}</p>` : ''}
                ${recipe.description ? `<p class="text-gray-500 text-xs mb-3 overflow-hidden line-clamp-2">${recipe.description}</p>` : ''}
                <div class="flex items-center justify-between gap-2">
                    <div class="recipe-stars flex items-center space-x-1 flex-shrink-0">
                        ${this.renderStars(recipe.userRating || 0)}
                    </div>
                    <div class="flex items-center gap-2 flex-wrap justify-end">
                        ${recipe.cuisine ? 
                            `<span onclick="recipeApp.filterManager.activateFilter('cuisine', '${recipe.cuisine}', event)" 
                                class="inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-md hover:text-amber-800">
                                ${recipe.cuisine}
                            </span>` : ''}
                        ${recipe.meal ? 
                            `<span onclick="recipeApp.filterManager.activateFilter('meal', '${recipe.meal}', event)" 
                                class="inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-md hover:text-amber-800">
                                ${recipe.meal}
                            </span>` : ''}
                        <div class="flex items-center ml-2 text-sm text-gray-600">
                            <i class="fas fa-utensils mr-1"></i>
                            <span class="recipe-counter">${recipe.madeDates ? recipe.madeDates.length : 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    renderRecipes(recipesToRender = null, forceFullRender = false) {
        const grid = document.getElementById('recipeGrid');
        const recipeIds = recipesToRender || this.recipeDatabase.getAllIds();
        
        if (forceFullRender || grid.children.length === 0) {
            grid.innerHTML = '';
            recipeIds.forEach(recipeId => {
                const recipe = this.recipeDatabase.findById(recipeId);
                if (recipe) {
                    const recipeWithUserData = this.userDataManager.getRecipeWithUserData(recipe);
                    const card = this.createRecipeCard(recipeWithUserData);
                    grid.appendChild(card);
                }
            });
            this.setupLazyLoading();
            this.setupCardClickHandlers();
            return;
        }
        
        const existingCards = new Map();
        Array.from(grid.children).forEach(card => {
            const id = card.getAttribute('data-recipe-id');
            existingCards.set(id, card);
        });
        
        existingCards.forEach((card, id) => {
            if (!recipeIds.includes(id)) {
                card.style.display = 'none';
            } else {
                card.style.display = '';
            }
        });
        
        const fragment = document.createDocumentFragment();
        recipeIds.forEach(recipeId => {
            if (existingCards.has(recipeId)) {
                const card = existingCards.get(recipeId);
                card.style.display = '';
                fragment.appendChild(card);
            } else {
                const recipe = this.recipeDatabase.findById(recipeId);
                if (recipe) {
                    const recipeWithUserData = this.userDataManager.getRecipeWithUserData(recipe);
                    const card = this.createRecipeCard(recipeWithUserData);
                    fragment.appendChild(card);
                }
            }
        });
        
        grid.innerHTML = '';
        grid.appendChild(fragment);
        
        requestAnimationFrame(() => {
            if (this.imageLoader) {
                this.imageLoader.reset();
                this.imageLoader.loadVisibleRows();
            }
        });
        
        this.setupCardClickHandlers();
    }

    setupCardClickHandlers() {
        document.querySelectorAll('[data-recipe-click]').forEach(card => {
            card.onclick = (e) => {
                if (e.target.closest('[onclick*="activateFilter"]')) {
                    return;
                }
                const recipeId = card.getAttribute('data-recipe-click');
                if (this.modalCallback) {
                    this.modalCallback(recipeId);
                }
            };
        });
    }

    setupLazyLoading() {
        if (!this.imageLoader) {
            this.imageLoader = new ImageLoader();
            this.imageLoader.setupScrollHandler();
        }
        
        this.imageLoader.loadVisibleRows();
    }

    updateRecipeCardRating(recipeId, rating) {
        const cards = document.querySelectorAll(`[data-recipe-id="${recipeId}"]`);
        cards.forEach(card => {
            const stars = card.querySelectorAll('.recipe-stars i');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.remove('far', 'text-gray-300');
                    star.classList.add('fas', 'text-amber-400');
                } else {
                    star.classList.remove('fas', 'text-amber-400');
                    star.classList.add('far', 'text-gray-300');
                }
            });
        });
    }

    updateRecipeCardCounter(recipeId, count) {
        const cards = document.querySelectorAll(`[data-recipe-id="${recipeId}"]`);
        cards.forEach(card => {
            const counterElement = card.querySelector('.recipe-counter');
            if (counterElement && counterElement.textContent !== count.toString()) {
                counterElement.textContent = count;
                counterElement.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    counterElement.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }
}

// ============================================================================
// KOKEBOK VIEWER CLASS
// ============================================================================

class KokebokViewer {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 121;
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 5;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.touchStartDistance = 0;
        this.initialZoom = 1;
        this.initialPanX = 0;
        this.initialPanY = 0;
        this.modalElement = null;
        this.imageElement = null;
        this.containerElement = null;
        this.isOpen = false;
        this.eventListenersAttached = false;
        this.loadedImageUrls = new Set();
        this.currentLoadingImage = null;
        this.loadRequestId = 0;
        this.createModal();
        
        this.boundHandlers = {
            wheel: null,
            mousedown: null,
            mousemove: null,
            mouseup: null,
            touchstart: null,
            touchmove: null,
            touchend: null,
            keydown: null,
            orientationchange: null,
            resize: null
        };
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'kokebokViewer';
        modal.className = 'absolute inset-0 top-20 bg-white hidden z-[60] flex flex-col rounded-t-2xl overflow-hidden shadow-2xl border border-amber-200';
        
        modal.innerHTML = `
            <button onclick="recipeApp.kokebokViewer.close()" 
                    class="absolute top-3 right-3 z-10 text-amber-700 hover:text-amber-500 transition-all duration-200 p-2"
                    style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                <i class="fas fa-times text-xl"></i>
            </button>
            
            <div id="kokebokContainer" class="flex-1 overflow-hidden relative bg-gradient-to-br from-amber-50/30 to-orange-50/30">
                <div id="kokebokImageWrapper" class="w-full h-full flex items-center justify-center">
                    <img id="kokebokImage" 
                        class="max-w-none cursor-move select-none shadow-lg"
                        draggable="false"
                        style="transform-origin: center center;">
                </div>
                <div id="kokebokLoadingSpinner" class="absolute inset-0 flex items-center justify-center bg-white/70 hidden z-20">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-spinner fa-spin text-4xl text-amber-600 mb-2"></i>
                        <span id="kokebokLoadingText" class="text-amber-700 text-sm font-medium"></span>
                    </div>
                </div>
            </div>
            
            <div class="bg-white border-t border-amber-200 px-4 py-2">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="recipeApp.kokebokViewer.previousPage()" 
                            class="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 rounded-lg border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            id="prevPageBtn">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="px-4 py-1.5 bg-amber-100 text-amber-800 rounded-lg min-w-[100px] text-center font-medium text-sm border border-amber-300">
                        <span id="pageIndicator"></span>
                    </div>
                    <button onclick="recipeApp.kokebokViewer.nextPage()" 
                            class="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 rounded-lg border border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            id="nextPageBtn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        this.modalElement = modal;
    }

    updateModalPosition() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isLandscape = windowWidth > windowHeight;
        const isFullscreen = windowWidth <= 1000;
        
        if (isLandscape && windowWidth <= 900) {
            this.modalElement.className = 'absolute inset-0 bg-white hidden z-[60] flex flex-col overflow-hidden shadow-2xl border border-amber-200';
        } else if (isFullscreen) {
            this.modalElement.className = 'absolute inset-0 top-20 bg-white hidden z-[60] flex flex-col rounded-t-2xl overflow-hidden shadow-2xl border border-amber-200';
        } else {
            this.modalElement.className = 'absolute inset-0 top-20 bg-white hidden z-[60] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-amber-200';
        }
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return;
        this.eventListenersAttached = true;

        this.boundHandlers.wheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta, e.clientX, e.clientY);
        };

        this.boundHandlers.mousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startPanning(e.clientX, e.clientY);
        };

        this.boundHandlers.mousemove = (e) => {
            if (this.isPanning && this.imageElement) {
                this.pan(e.clientX, e.clientY);
            }
        };

        this.boundHandlers.mouseup = () => {
            if (this.isPanning) {
                this.stopPanning();
            }
        };

        this.boundHandlers.touchstart = (e) => {
            e.stopPropagation();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.startPanning(touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                e.preventDefault();
                this.isPanning = false;
                
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                this.touchStartDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                this.initialZoom = this.zoomLevel;
                this.initialPanX = this.panX;
                this.initialPanY = this.panY;
                
                const rect = this.containerElement.getBoundingClientRect();
                this.pinchCenterX = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
                this.pinchCenterY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;
            }
        };

        this.boundHandlers.touchmove = (e) => {
            if (e.touches.length === 1 && this.isPanning) {
                const touch = e.touches[0];
                this.pan(touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (this.touchStartDistance > 0) {
                    const scale = currentDistance / this.touchStartDistance;
                    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.initialZoom * scale));
                    
                    const zoomDelta = newZoom / this.zoomLevel;
                    
                    this.panX = this.pinchCenterX - (this.pinchCenterX - this.panX) * zoomDelta;
                    this.panY = this.pinchCenterY - (this.pinchCenterY - this.panY) * zoomDelta;
                    
                    this.zoomLevel = newZoom;
                    this.updateTransform();
                }
            }
        };

        this.boundHandlers.touchend = (e) => {
            if (e.touches.length === 0) {
                this.stopPanning();
                this.touchStartDistance = 0;
            } else if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.startPanning(touch.clientX, touch.clientY);
            }
        };

        this.boundHandlers.keydown = (e) => {
            if (this.modalElement && !this.modalElement.classList.contains('hidden')) {
                switch(e.key) {
                    case 'Escape':
                        e.stopPropagation();
                        this.close();
                        break;
                    case 'ArrowLeft':
                        this.previousPage();
                        break;
                    case 'ArrowRight':
                        this.nextPage();
                        break;
                }
            }
        };

        this.boundHandlers.orientationchange = () => {
            if (this.isOpen) {
                setTimeout(() => {
                    this.updateModalPosition();
                    this.fitToPage();
                }, 100);
            }
        };

        this.boundHandlers.resize = () => {
            if (this.isOpen) {
                this.updateModalPosition();
                if (Math.abs(this.zoomLevel - this.minZoom) < 0.01) {
                    this.fitToPage();
                }
            }
        };

        this.containerElement?.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        this.imageElement?.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.imageElement?.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
        this.imageElement?.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
        this.imageElement?.addEventListener('touchend', this.boundHandlers.touchend);
        
        document.addEventListener('mousemove', this.boundHandlers.mousemove);
        document.addEventListener('mouseup', this.boundHandlers.mouseup);
        document.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('orientationchange', this.boundHandlers.orientationchange);
        window.addEventListener('resize', this.boundHandlers.resize);

        this.modalElement?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    cleanupEventListeners() {
        if (!this.eventListenersAttached) return;
        
        this.containerElement?.removeEventListener('wheel', this.boundHandlers.wheel);
        this.imageElement?.removeEventListener('mousedown', this.boundHandlers.mousedown);
        this.imageElement?.removeEventListener('touchstart', this.boundHandlers.touchstart);
        this.imageElement?.removeEventListener('touchmove', this.boundHandlers.touchmove);
        this.imageElement?.removeEventListener('touchend', this.boundHandlers.touchend);
        
        document.removeEventListener('mousemove', this.boundHandlers.mousemove);
        document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        window.removeEventListener('orientationchange', this.boundHandlers.orientationchange);
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        this.eventListenersAttached = false;
    }

    clearImageCache() {
        if (this.imageElement) {
            this.imageElement.onload = null;
            this.imageElement.onerror = null;
            this.imageElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
        
        this.loadedImageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
            img.src = '';
        });
        
        this.loadedImageUrls.clear();
        
        if (window.gc) {
            window.gc();
        }
    }

    open(pageNumber) {
        const recipeModal = document.getElementById('recipeModal');
        const modalContent = recipeModal?.querySelector('#modalContent') || recipeModal?.querySelector('.flex.flex-col');
        
        if (modalContent && !modalContent.contains(this.modalElement)) {
            modalContent.appendChild(this.modalElement);
            this.imageElement = document.getElementById('kokebokImage');
            this.containerElement = document.getElementById('kokebokContainer');
            this.setupEventListeners();
        }
        
        const loadingText = document.getElementById('kokebokLoadingText');
        if (loadingText) {
            loadingText.textContent = UI_TEXT.kokebok.loading;
        }
        
        const spinner = document.getElementById('kokebokLoadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
        
        this.currentPage = pageNumber || 1;
        this.isOpen = true;
        this.updateModalPosition();
        this.loadPage(this.currentPage);
        this.modalElement.classList.remove('hidden');
    }

    close() {
        if (this.currentLoadingImage) {
            this.currentLoadingImage.onload = null;
            this.currentLoadingImage.onerror = null;
            this.currentLoadingImage.src = '';
            this.currentLoadingImage = null;
        }
        
        this.modalElement.classList.add('hidden');
        this.isOpen = false;
        this.isPanning = false;
        
        this.cleanupEventListeners();
        this.clearImageCache();
        
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
    }

    loadPage(pageNumber) {
        const paddedNumber = String(pageNumber).padStart(3, '0');
        const imageUrl = `images/kokebok/kokebok-page-${paddedNumber}.jpg`;
        
        this.loadRequestId++;
        const thisRequestId = this.loadRequestId;
        
        if (this.currentLoadingImage) {
            this.currentLoadingImage.onload = null;
            this.currentLoadingImage.onerror = null;
            this.currentLoadingImage.src = '';
            this.currentLoadingImage = null;
        }
        
        this.loadedImageUrls.add(imageUrl);
        
        this.updatePageIndicator();
        this.updateNavigationButtons();
        
        if (this.imageElement) {
            const errorMsg = document.querySelector('#kokebokImageWrapper .error-message');
            if (errorMsg) {
                errorMsg.remove();
                this.imageElement.style.display = '';
            }
            
            const spinner = document.getElementById('kokebokLoadingSpinner');
            if (spinner) {
                spinner.classList.remove('hidden');
            }
            
            const tempImg = new Image();
            this.currentLoadingImage = tempImg;
            
            tempImg.onload = () => {
                if (thisRequestId !== this.loadRequestId) {
                    return;
                }
                
                this.imageElement.src = imageUrl;
                this.fitToPage();
                
                if (spinner) {
                    spinner.classList.add('hidden');
                }
                
                this.currentLoadingImage = null;
            };
            
            tempImg.onerror = () => {
                if (thisRequestId !== this.loadRequestId) {
                    return;
                }
                
                console.error(`Failed to load page ${pageNumber}`);
                
                if (spinner) {
                    spinner.classList.add('hidden');
                }
                
                this.imageElement.style.display = 'none';
                const wrapper = document.getElementById('kokebokImageWrapper');
                if (wrapper && !wrapper.querySelector('.error-message')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message text-center text-amber-700';
                    errorDiv.innerHTML = `
                        <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                        <p>${UI_TEXT.kokebok.errorLoading} ${pageNumber}</p>
                    `;
                    wrapper.appendChild(errorDiv);
                }
                
                this.currentLoadingImage = null;
            };
            
            tempImg.src = imageUrl;
        }
    }

    fitToPage() {
        if (!this.imageElement || !this.containerElement) return;
        
        const containerWidth = this.containerElement.clientWidth;
        const containerHeight = this.containerElement.clientHeight;
        const imageWidth = this.imageElement.naturalWidth || 1949;
        const imageHeight = this.imageElement.naturalHeight || 2456;
        
        const padding = 20;
        const scaleX = (containerWidth - padding) / imageWidth;
        const scaleY = (containerHeight - padding) / imageHeight;
        const scale = Math.min(scaleX, scaleY);
        
        this.zoomLevel = scale;
        this.minZoom = scale;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadPage(this.currentPage);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadPage(this.currentPage);
        }
    }

    zoom(delta, clientX, clientY) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * delta));
        
        if (newZoom !== this.zoomLevel && this.containerElement) {
            const rect = this.containerElement.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            
            const zoomRatio = newZoom / this.zoomLevel;
            this.panX = x - (x - this.panX) * zoomRatio;
            this.panY = y - (y - this.panY) * zoomRatio;
            
            this.zoomLevel = newZoom;
            this.updateTransform();
        }
    }

    startPanning(x, y) {
        this.isPanning = true;
        this.startX = x - this.panX;
        this.startY = y - this.panY;
        if (this.imageElement) {
            this.imageElement.style.cursor = 'grabbing';
        }
    }

    pan(x, y) {
        if (this.isPanning) {
            this.panX = x - this.startX;
            this.panY = y - this.startY;
            this.updateTransform();
        }
    }

    stopPanning() {
        this.isPanning = false;
        if (this.imageElement) {
            this.imageElement.style.cursor = 'move';
        }
    }

    updateTransform() {
        if (this.imageElement) {
            this.imageElement.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
        }
    }

    updatePageIndicator() {
        const indicator = document.getElementById('pageIndicator');
        if (indicator) {
            indicator.textContent = `${UI_TEXT.kokebok.page} ${this.currentPage}`;
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }
}

// ============================================================================
// MODAL MANAGER CLASS (Continued...)
// ============================================================================

class ModalManager {
    constructor(recipeDatabase, userDataManager, uiManager, recommendationEngine) {
        this.recipeDatabase = recipeDatabase;
        this.userDataManager = userDataManager;
        this.uiManager = uiManager;
        this.recommendationEngine = recommendationEngine;
        this.scrollPosition = 0;
        this.isFullscreen = false;
        this.isMobileLayout = false;
        this.isNarrowWidth = false; 
        this.currentRecipeId = null;
        this.completedSteps = new Map();
        this.activeStep = null;
        this.urlManager = null;
        
        this.imagePreloadCache = new Map();
        this.MAX_CACHE_SIZE = 5;

        this.pendingTimeouts = [];
        this.recommendationUpdateTimeout = null;

        this.boundHandlers = {
            modalClick: null,
            resize: null,
            orientationchange: null,
            resizeTimer: null,
            orientationTimer: null
        };
        
        this.setupEventListeners();
    }

    setURLManager(urlManager) {
        this.urlManager = urlManager;
    }

    setupEventListeners() {
        this.boundHandlers.modalClick = (e) => {
            const currentlyFullscreen = window.innerWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL;
            if (!currentlyFullscreen) {
                const modalWrapper = e.currentTarget.firstElementChild?.firstElementChild;
                if (modalWrapper && !modalWrapper.contains(e.target)) {
                    this.closeRecipe();
                }
            }
        };
        
        document.getElementById('recipeModal').addEventListener('click', this.boundHandlers.modalClick);
        
        this.boundHandlers.resize = () => {
        if (this.currentRecipeId) {
            clearTimeout(this.boundHandlers.resizeTimer);
            this.boundHandlers.resizeTimer = setTimeout(() => {
                this.updateModalLayout();
                
                const windowWidth = window.innerWidth;
                const newIsFullscreen = windowWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL;
                const newIsMobileLayout = windowWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
                const newIsNarrowWidth = windowWidth >= 700 && windowWidth <= 1000;
                
                // Check if any breakpoint was crossed
                if (newIsFullscreen !== this.isFullscreen || 
                    newIsMobileLayout !== this.isMobileLayout ||
                    newIsNarrowWidth !== this.isNarrowWidth) {
                    this.isFullscreen = newIsFullscreen;
                    this.isMobileLayout = newIsMobileLayout;
                    this.isNarrowWidth = newIsNarrowWidth;
                    this.updateModalContent();
                }
            }, 250);
        }
    };
        
        this.boundHandlers.orientationchange = (e) => {
            if (this.currentRecipeId) {
                e.preventDefault();
                const viewport = document.querySelector('meta[name="viewport"]');
                viewport.setAttribute('content', 
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
                );
                
                clearTimeout(this.boundHandlers.orientationTimer);
                this.boundHandlers.orientationTimer = setTimeout(() => {
                    this.updateModalLayout();
                    this.updateModalContent();
                }, 100);
            }
        };
        
        window.addEventListener('resize', this.boundHandlers.resize);
        window.addEventListener('orientationchange', this.boundHandlers.orientationchange);
    }

    cleanupEventListeners() {
        clearTimeout(this.boundHandlers.resizeTimer);
        clearTimeout(this.boundHandlers.orientationTimer);

        // Cleanup visual viewport listener
        if (this.visualViewportListener && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.visualViewportListener);
            this.visualViewportListener = null;
        }
    }

    preloadHighResImage(recipe) {
        if (!recipe.image) return null;
        
        const highResUrl = CONFIG.IMAGE_PATHS.MODAL + recipe.image;
        
        if (this.imagePreloadCache.has(highResUrl)) {
            const cachedPromise = this.imagePreloadCache.get(highResUrl);
            this.imagePreloadCache.delete(highResUrl);
            this.imagePreloadCache.set(highResUrl, cachedPromise);
            return cachedPromise;
        }
        
        if (this.imagePreloadCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.imagePreloadCache.keys().next().value;
            this.imagePreloadCache.delete(firstKey);
        }
        
        const imagePromise = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(highResUrl);
            img.onerror = () => resolve(null);
            img.src = highResUrl;
        });
        
        this.imagePreloadCache.set(highResUrl, imagePromise);
        return imagePromise;
    }

    addPendingTimeout(fn, delay = 0) {
        const timeoutId = setTimeout(() => {
            const index = this.pendingTimeouts.indexOf(timeoutId);
            if (index > -1) {
                this.pendingTimeouts.splice(index, 1);
            }
            fn();
        }, delay);
        
        this.pendingTimeouts.push(timeoutId);
        return timeoutId;
    }

    cancelPendingTimeouts() {
        this.pendingTimeouts.forEach(id => clearTimeout(id));
        this.pendingTimeouts = [];
    }


    clearStepsForRecipe(recipeId) {
        Array.from(this.completedSteps.keys()).forEach(key => {
            if (key.startsWith(recipeId + '-')) {
                this.completedSteps.delete(key);
            }
        });
        if (this.activeStep && this.activeStep.startsWith(recipeId + '-')) {
            this.activeStep = null;
        }
    }

    showRecipe(recipeId, skipURLUpdate = false) {
        const recipe = this.recipeDatabase.findById(recipeId);
        if (!recipe) return;

        this.currentRecipeId = recipeId;

        // Initialize layout states
        const windowWidth = window.innerWidth;
        this.isFullscreen = windowWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL;
        this.isMobileLayout = windowWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
        this.isNarrowWidth = windowWidth >= 700 && windowWidth <= 1000;

        this.scrollPosition = window.pageYOffset;
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'relative';
        document.documentElement.style.overflow = 'hidden';

        this.setupModalLayout();

        const modal = document.getElementById('recipeModal');
        const modalWrapper = modal.querySelector('#modalContent') || modal.querySelector('.flex.flex-col');

        modalWrapper.innerHTML = `
            <div class="flex items-center justify-center h-full bg-gradient-to-br from-amber-100 to-orange-100 ${
                window.innerWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL ? '' : 'rounded-2xl'
            }">
                <div class="text-amber-600 animate-pulse">
                    <i class="fas fa-spinner fa-spin text-3xl"></i>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        const recipeWithUserData = this.userDataManager.getRecipeWithUserData(recipe);
        this.preloadHighResImage(recipeWithUserData);

        this.clearStepsForRecipe(recipeId);

        requestAnimationFrame(() => {
            this.updateModalContent();

            // Track view with delayed update (trackView handles the 10s delay and resort)
            this.userDataManager.trackView(recipeId);

            // Update recommendation scores since viewing affects recommendations
            this.recommendationEngine.updateScoreForRecipe(recipeId);

            this.addPendingTimeout(() => {
                if (this.urlManager && !skipURLUpdate) {
                    this.urlManager.updateURL(); // Use pushState so modal opening is in history
                }
            });
        });
    }

    setupModalLayout() {
        const modal = document.getElementById('recipeModal');
        const flexContainer = modal.firstElementChild;
        const modalWrapper = flexContainer ? flexContainer.firstElementChild : null;

        const windowWidth = window.innerWidth;
        this.isFullscreen = windowWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL;
        const isPortrait = window.innerHeight > window.innerWidth;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (this.isFullscreen) {
            modal.className = 'fixed inset-0 z-50 bg-gradient-to-br from-amber-100 to-orange-100';
            if (flexContainer) {
                flexContainer.className = 'h-full';
                if (isIOS && isPortrait) {
                    // Force reflow to ensure safe area is applied correctly
                    flexContainer.style.paddingTop = '';
                    void flexContainer.offsetHeight; // Trigger reflow
                    flexContainer.style.paddingTop = 'env(safe-area-inset-top, 0)';
                } else {
                    flexContainer.style.paddingTop = '';
                }
            }
            if (modalWrapper) {
                modalWrapper.className = 'h-full w-full flex flex-col relative';
            }
        } else {
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50';
            if (flexContainer) {
                flexContainer.className = 'flex items-center justify-center min-h-screen p-4';
                flexContainer.style.paddingTop = '';
            }
            if (modalWrapper) {
                modalWrapper.className = 'bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl relative overflow-hidden';
            }
        }

        // Setup visual viewport listener for iOS keyboard handling
        if (isIOS && window.visualViewport && !this.visualViewportListener) {
            this.visualViewportListener = () => {
                // iOS Safari bug fix: force scroll/layout update when keyboard dismisses
                const currentScroll = window.scrollY;
                window.scrollTo(0, currentScroll);
            };
            window.visualViewport.addEventListener('resize', this.visualViewportListener);
        }
    }

    updateModalLayout() {
        if (this.currentRecipeId) {
            this.setupModalLayout();
        }
    }

    generateHeroSection(recipe) {
        const imageLowUrl = recipe.image ? CONFIG.IMAGE_PATHS.LIST + recipe.image : null;
        const imageHighUrl = recipe.image ? CONFIG.IMAGE_PATHS.MODAL + recipe.image : null;
        const isMobile = window.innerWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
        const heroImageHeight = isMobile ? 'h-56' : 'h-[500px]';
        const isFullscreen = window.innerWidth <= CONFIG.BREAKPOINTS.FULLSCREEN_MODAL;
        
        return `
            <div class="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 ${!isFullscreen ? 'rounded-2xl' : ''} z-0">
                <div class="absolute inset-x-0 top-0 ${heroImageHeight} ${!isFullscreen ? 'rounded-t-2xl overflow-hidden' : ''}">
                    ${recipe.image ? 
                        `<div class="relative w-full h-full">
                            <img src="${imageLowUrl}" 
                                alt="${recipe.title}" 
                                class="w-full h-full object-cover absolute inset-0">
                            <img src="${imageHighUrl}" 
                                alt="${recipe.title}" 
                                class="w-full h-full object-cover absolute inset-0 opacity-0"
                                onload="this.style.transition='opacity 0.3s ease-in-out'; this.style.opacity='1';">
                        </div>` : 
                        `<div class="w-full h-full flex items-center justify-center">
                            <span class="text-8xl opacity-30">${UI_TEXT.recipe.noImage}</span>
                        </div>`}
                </div>
            </div>
        `;
    }

    generateCloseButton() {
        return `
            <button onclick="event.stopPropagation(); recipeApp.modalManager.closeRecipe()"
                    class="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur rounded-full p-2 md:p-2.5 hover:bg-white shadow-lg transition-transform hover:scale-110">
                <i class="fas fa-times text-gray-600 text-lg md:text-xl"></i>
            </button>
        `;
    }

    generateCategoryButton(recipe) {
        if (!recipe.category) return '';

        return `
            <button onclick="recipeApp.filterManager.activateFilter('category', '${recipe.category}', event)" 
                class="bg-white/90 backdrop-blur text-xs md:text-sm font-medium px-2 py-1 md:px-3 md:py-1.5 rounded-full text-amber-700 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-amber-50 hover:shadow-xl hover:text-amber-800">
                ${recipe.category}
            </button>
        `;
    }

    updateModalContent() {
        if (!this.currentRecipeId) return;
        
        const recipe = this.recipeDatabase.findById(this.currentRecipeId);
        if (!recipe) return;
        
        const recipeWithUserData = this.userDataManager.getRecipeWithUserData(recipe);
        const modalWrapper = document.querySelector('#recipeModal > div > div');
        
        if (!modalWrapper) return;
        
        const scrollContainer = modalWrapper.querySelector('#scrollableContent');
        const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
        
        const windowWidth = window.innerWidth;
        const isMobileLayout = windowWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
        const isNarrowWidth = windowWidth >= 700 && windowWidth <= 1000; // Add this line
        
        modalWrapper.innerHTML = `
            <div class="relative w-full h-full">
                ${this.generateHeroSection(recipeWithUserData)}
                ${this.generateCloseButton()}

                <!-- Scrollable content -->
                <div id="scrollableContent" class="absolute inset-0 overflow-y-auto z-10">
                    <!-- Invisible spacer -->
                    <div class="${isMobileLayout ? 'h-48' : 'h-72'} pointer-events-none"></div>

                    <!-- Actual content -->
                    <div class="min-h-full bg-white rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                        ${
                            isMobileLayout 
                                ? this.generateMobileContent(recipeWithUserData) 
                                : this.generateDesktopContent(recipeWithUserData, isNarrowWidth)
                        }
                    </div>        
                </div>

                <!-- Category button with adjusted left position for narrow desktop -->
                <div class="absolute top-4 left-4 z-0">
                    ${this.generateCategoryButton(recipeWithUserData)}
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            const newScrollContainer = modalWrapper.querySelector('#scrollableContent');
            if (newScrollContainer && currentScrollTop > 0) {
                newScrollContainer.scrollTop = currentScrollTop;
            }
        });
    }

    generateMobileContent(recipe) {
        const sourceInfo = this.uiManager.formatSource(recipe);
        const today = new Date().toISOString().split('T')[0];
        const madeToday = recipe.madeDates && recipe.madeDates.includes(today);
        const madeCount = recipe.madeDates ? recipe.madeDates.length : 0;

        return `
            <div class="px-4 py-6">
                <div class="mb-4">
                    <div class="flex items-start gap-2">
                        <h2 class="font-display text-2xl text-gray-800 ${sourceInfo ? 'mb-1' : 'mb-2'}">${recipe.title}</h2>
                        <button onclick="recipeApp.modalManager.copyRecipeURL('${recipe.id}', event)"
                                class="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 flex-shrink-0">
                            <i class="fas fa-copy text-sm"></i>
                        </button>
                    </div>
                    ${this.uiManager.renderSourceInfo(recipe, true)}
                    ${this.renderTags(recipe)}
                </div>
                
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <button id="eraser-${recipe.id}" 
                                onclick="recipeApp.modalManager.clearRating('${recipe.id}', event)" 
                                class="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 ${recipe.userRating ? 'opacity-100' : 'opacity-0 pointer-events-none'}">
                            <i class="fas fa-eraser text-lg"></i>
                        </button>
                        <div class="flex items-center">
                            ${this.renderInteractiveStars(recipe)}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="recipeApp.modalManager.toggleTag('${recipe.id}', event)" 
                                class="flex items-center space-x-1 px-3 py-1.5 rounded-lg transition text-xs font-medium
                                    ${recipe.tagged ? 'bg-yellow-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}">
                            <i class="fas fa-tag"></i>
                        </button>
                        <button onclick="recipeApp.modalManager.toggleMadeToday('${recipe.id}', event)" 
                                class="flex items-center space-x-1 px-3 py-1.5 rounded-lg transition text-xs font-medium
                                    ${madeToday ? 'bg-amber-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}">
                            <i class="fas fa-check"></i>
                            <span>${UI_TEXT.recipe.made} (${madeCount})</span>
                        </button>
                    </div>
                </div>
                
                ${recipe.description ? `
                    <div class="pb-4 mb-6 border-b border-amber-600">
                        <p class="text-gray-700 text-sm leading-relaxed">${recipe.description}</p>
                    </div>
                ` : ''}
                
                <div class="mb-6 pb-6 border-b border-amber-600">
                    <h3 class="font-display text-xl text-amber-800 mb-3">${UI_TEXT.recipe.ingredients}</h3>
                    ${this.renderIngredients(recipe.ingredients)}
                    <div class="mt-4 flex items-center gap-2 text-amber-600 rounded-lg px-3 py-2 inline-flex">
                        <i class="fas fa-users text-sm"></i>
                        <span class="text-sm font-medium">${recipe.servings}</span>
                    </div>
                </div>
                
                <div class="mb-8">
                    <h3 class="font-display text-xl text-amber-800 mb-3">${UI_TEXT.recipe.instructions}</h3>
                    ${this.renderInstructions(recipe.instructions, true)}
                </div>
            </div>
        `;
    }

    generateDesktopContent(recipe, isNarrowWidth = false) {
        const sourceInfo = this.uiManager.formatSource(recipe);
        const today = new Date().toISOString().split('T')[0];
        const madeToday = recipe.madeDates && recipe.madeDates.includes(today);
        const madeCount = recipe.madeDates ? recipe.madeDates.length : 0;

        return `
            <div class="${isNarrowWidth ? 'px-[50px]' : 'px-8'} py-8">
                <div class="border-b border-gray-100 pb-4 mb-6">
                    <div class="flex items-start gap-3">
                        <h2 class="font-display text-3xl text-gray-800 ${sourceInfo ? 'mb-1' : 'mb-2'}">${recipe.title}</h2>
                        <button onclick="recipeApp.modalManager.copyRecipeURL('${recipe.id}', event)"
                                class="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1.5 flex-shrink-0">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    ${this.uiManager.renderSourceInfo(recipe, false)}
                    ${this.renderTags(recipe)}
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2">
                                <button id="eraser-${recipe.id}" 
                                        onclick="recipeApp.modalManager.clearRating('${recipe.id}', event)" 
                                        class="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 ${recipe.userRating ? 'opacity-100' : 'opacity-0 pointer-events-none'}">
                                    <i class="fas fa-eraser text-xl"></i>
                                </button>
                                <div class="flex items-center gap-1">
                                    ${this.renderInteractiveStars(recipe)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <button onclick="recipeApp.modalManager.toggleTag('${recipe.id}', event)" 
                                    class="flex items-center space-x-2 px-4 py-2 rounded-lg transition text-sm font-medium
                                        ${recipe.tagged ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}">
                                <i class="fas fa-tag"></i>
                                <span>${UI_TEXT.recipe.mark}</span>
                            </button>
                            
                            <button onclick="recipeApp.modalManager.toggleMadeToday('${recipe.id}', event)" 
                                    class="flex items-center space-x-2 px-4 py-2 rounded-lg transition text-sm font-medium
                                        ${madeToday ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}">
                                <i class="fas fa-check"></i>
                                <span>${UI_TEXT.recipe.made} (${madeCount})</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                ${recipe.description ? `
                    <div class="pb-6 mb-6 border-b border-amber-600">
                        <p class="text-gray-700 leading-relaxed">${recipe.description}</p>
                    </div>
                ` : ''}
                
                <div class="grid md:grid-cols-[2fr,3fr] gap-8">
                    <div class="pr-8 border-r border-amber-600">
                        <h3 class="font-display text-xl text-amber-800 mb-4">${UI_TEXT.recipe.ingredients}</h3>
                        ${this.renderIngredients(recipe.ingredients)}
                        <div class="mt-4 flex items-center gap-2 text-amber-600 rounded-lg px-3 py-2 inline-flex">
                            <i class="fas fa-users"></i>
                            <span class="font-medium">${recipe.servings}</span>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="font-display text-xl text-amber-800 mb-4">${UI_TEXT.recipe.instructions}</h3>
                        ${this.renderInstructions(recipe.instructions, false)}
                    </div>
                </div>
            </div>
        `;
    }

    renderTags(recipe) {
        if (!recipe.cuisine && !recipe.meal) return '';
        
        return `
            <div class="flex gap-2 mb-4">
                ${recipe.cuisine ? 
                    `<span onclick="recipeApp.filterManager.activateFilter('cuisine', '${recipe.cuisine}', event)" 
                        class="inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-md hover:text-amber-800">
                        ${recipe.cuisine} ${UI_TEXT.meta.cuisineSuffix}
                    </span>` : ''}
                ${recipe.meal ? 
                    `<span onclick="recipeApp.filterManager.activateFilter('meal', '${recipe.meal}', event)" 
                        class="inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-amber-50 hover:shadow-md hover:text-amber-800">
                        ${recipe.meal}
                    </span>` : ''}
            </div>
        `;
    }

    renderIngredients(ingredients) {
        if (!ingredients || ingredients.length === 0) return '';
        
        const hasGroups = ingredients.some(item => typeof item === 'object' && item.group);
        
        if (!hasGroups) {
            return `
                <ul class="space-y-2">
                    ${ingredients.map(ing => `
                        <li class="flex items-start">
                            <span class="text-amber-600 mr-2">•</span>
                            <span class="text-gray-700">${ing}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            return ingredients.map((group, index) => {
                if (typeof group === 'string') {
                    return `
                        <ul class="space-y-2 ${index > 0 ? 'mt-4' : ''}">
                            <li class="flex items-start">
                                <span class="text-amber-600 mr-2">•</span>
                                <span class="text-gray-700">${group}</span>
                            </li>
                        </ul>
                    `;
                }
                
                return `
                    <div class="${index > 0 ? 'mt-5' : ''}">
                        <h4 class="font-semibold text-sm text-amber-700 mb-2">${group.group}:</h4>
                        <ul class="space-y-2">
                            ${group.items.map(ing => `
                                <li class="flex items-start">
                                    <span class="text-amber-600 mr-2">•</span>
                                    <span class="text-gray-700">${ing}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }).join('');
        }
    }

    toggleInstructionStep(recipeId, stepIndex) {
        const key = `${recipeId}-${stepIndex}`;
        const isCompleted = this.completedSteps.get(key) || false;
        const isActive = this.activeStep === key;
        
        const stepElement = document.querySelector(`[data-step="${key}"]`);
        if (!stepElement) return;
        
        if (this.activeStep && this.activeStep !== key) {
            const prevElement = document.querySelector(`[data-step="${this.activeStep}"]`);
            if (prevElement && !this.completedSteps.get(this.activeStep)) {
                prevElement.parentElement.classList.remove('bg-amber-50', 'border-l-4', 'border-amber-500', 'pl-4', 'pr-0');
                prevElement.parentElement.classList.add('pr-2');
                prevElement.classList.remove('text-black');
                prevElement.classList.add('text-gray-700');
            }
        }
        
        if (!isActive && !isCompleted) {
            this.activeStep = key;
            this.completedSteps.delete(key);
            stepElement.classList.remove('line-through', 'text-gray-400');
            stepElement.classList.remove('text-gray-700');
            stepElement.classList.add('text-black');
            stepElement.parentElement.classList.add('bg-amber-50', 'border-l-4', 'border-amber-500', 'pl-4', 'pr-0');
            stepElement.parentElement.classList.remove('pr-2');
        } else if (isActive && !isCompleted) {
            this.completedSteps.set(key, true);
            this.activeStep = null;
            stepElement.classList.add('line-through', 'text-gray-400');
            stepElement.classList.remove('text-black');
            stepElement.parentElement.classList.remove('bg-amber-50', 'border-l-4', 'border-amber-500', 'pl-4', 'pr-0');
            stepElement.parentElement.classList.add('pr-2');
        } else if (isCompleted) {
            this.completedSteps.delete(key);
            this.activeStep = key;
            stepElement.classList.remove('line-through', 'text-gray-400');
            stepElement.classList.add('text-black');
            stepElement.parentElement.classList.add('bg-amber-50', 'border-l-4', 'border-amber-500', 'pl-4', 'pr-0');
            stepElement.parentElement.classList.remove('pr-2');
        }
    }

    renderTip(tipText, isMobile) {
        const textSizeClass = isMobile ? 'text-sm' : '';
        return `
            <li class="bg-gradient-to-r from-yellow-100 to-yellow-50 border-l-[3px] border-amber-500 rounded-lg ${isMobile ? 'px-3 py-2.5' : 'p-3'} animate-[tipHighlight_0.3s_ease-out]">
                <div class="flex items-start">
                    <span class="text-amber-600 mr-2 flex-shrink-0">
                        <i class="fas fa-lightbulb"></i>
                    </span>
                    <div>
                        <span class="font-semibold text-amber-700 mr-2 text-sm">${UI_TEXT.recipe.tip}</span>
                        <span class="text-gray-700 ${textSizeClass}">${tipText}</span>
                    </div>
                </div>
            </li>
        `;
    }

    renderInstructionStep(instruction, stepNumber, globalIndex, isMobile) {
        const recipeId = this.currentRecipeId;
        const textSizeClass = isMobile ? 'text-sm' : '';
        const stepKey = `${recipeId}-${globalIndex}`;
        const isCompleted = this.completedSteps.get(stepKey) || false;
        const isActive = this.activeStep === stepKey;
        
        return `
            <li class="flex items-start cursor-pointer select-none transition-all duration-200 hover:opacity-80 rounded-lg py-2 pl-2 ${isActive ? 'pr-0' : 'pr-2'} -m-2 
                ${isActive ? 'bg-amber-50 border-l-4 border-amber-500 pl-4' : ''}"
                onclick="recipeApp.modalManager.toggleInstructionStep('${recipeId}', ${globalIndex})">
                <span class="font-semibold text-amber-600 mr-3 flex-shrink-0">${stepNumber}.</span>
                <span data-step="${stepKey}" 
                    class="${textSizeClass} ${isCompleted ? 'line-through text-gray-400' : (isActive ? 'text-black' : 'text-gray-700')} transition-all duration-200">
                    ${instruction}
                </span>
            </li>
        `;
    }

    renderInstructionItem(instruction, stepNumber, globalIndex, isMobile) {
        if (typeof instruction === 'string' && (instruction.startsWith('TIP:') || instruction.startsWith('TIPS:'))) {
            const tipText = instruction.replace(/^TIPS?:\s*/i, '');
            return { 
                html: this.renderTip(tipText, isMobile), 
                stepNumber: stepNumber,
                globalIndex: globalIndex 
            };
        }
        
        return { 
            html: this.renderInstructionStep(instruction, stepNumber, globalIndex, isMobile),
            stepNumber: stepNumber + 1,
            globalIndex: globalIndex + 1
        };
    }

    renderInstructions(instructions, isMobile = false) {
        if (!instructions || instructions.length === 0) return '';
        
        let stepNumber = 1;
        let globalIndex = 0;
        
        const hasGroups = instructions.some(item => typeof item === 'object' && item.group);
        
        if (!hasGroups) {
            const items = [];
            instructions.forEach(inst => {
                const result = this.renderInstructionItem(inst, stepNumber, globalIndex, isMobile);
                items.push(result.html);
                stepNumber = result.stepNumber;
                globalIndex = result.globalIndex;
            });
            
            return `<ol class="space-y-3">${items.join('')}</ol>`;
        }
        
        const sections = [];
        
        instructions.forEach((item, index) => {
            if (typeof item === 'string') {
                const result = this.renderInstructionItem(item, stepNumber, globalIndex, isMobile);
                sections.push(`<ol class="space-y-3 ${index > 0 ? 'mt-3' : ''}">${result.html}</ol>`);
                stepNumber = result.stepNumber;
                globalIndex = result.globalIndex;
            } else if (item.group && item.steps) {
                const groupItems = [];
                item.steps.forEach(inst => {
                    const result = this.renderInstructionItem(inst, stepNumber, globalIndex, isMobile);
                    groupItems.push(result.html);
                    stepNumber = result.stepNumber;
                    globalIndex = result.globalIndex;
                });
                
                sections.push(`
                    <div class="${index > 0 ? 'mt-4' : ''}">
                        <h4 class="font-semibold text-sm text-amber-700 mb-2">${item.group}:</h4>
                        <ol class="space-y-2 ${isMobile ? 'pl-3' : 'pl-4'}">
                            ${groupItems.join('')}
                        </ol>
                    </div>
                `);
            }
        });
        
        return sections.join('');
    }

    renderInteractiveStars(recipe) {
        let stars = '';
        const userRating = recipe.userRating || 0;
        for (let i = 1; i <= 5; i++) {
            const filled = i <= userRating;
            stars += `<button onclick="recipeApp.modalManager.rateRecipe('${recipe.id}', ${i}, event)" 
                            class="text-2xl transition-all duration-200 hover:scale-125 hover:text-amber-500">
                <i class="${filled ? 'fas' : 'far'} fa-star ${filled ? 'text-amber-400' : 'text-gray-300'}"></i>
            </button>`;
        }
        return stars;
    }

    closeRecipe(skipURLUpdate = false) {
        const modal = document.getElementById('recipeModal');

        this.cancelPendingTimeouts();
        this.cleanupEventListeners();

        this.currentRecipeId = null;
        this.isFullscreen = false;
        this.isMobileLayout = false;
        this.isNarrowWidth = false;

        modal.classList.add('hidden');

        if (this.urlManager && !skipURLUpdate) {
            // Use pushState to create new history entry when manually closing
            // This allows back/forward navigation to work correctly
            this.urlManager.updateURL(false); // false = use pushState, not replaceState
        }

        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';

        requestAnimationFrame(() => {
            window.scrollTo(0, this.scrollPosition);
        });

        this.resetModalToDefault();
    }

    copyRecipeURL(recipeId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        if (this.urlManager) {
            const url = this.urlManager.getRecipeURL(recipeId);
            const button = event ? event.currentTarget : null;
            this.urlManager.copyToClipboard(url, button);
        }
    }

    resetModalToDefault() {
        const modal = document.getElementById('recipeModal');
        const flexContainer = modal.firstElementChild;
        const modalWrapper = flexContainer ? flexContainer.firstElementChild : null;
        
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50';
        
        if (flexContainer) {
            flexContainer.className = 'flex items-start justify-center min-h-screen sm:pt-8';
        }
        
        if (modalWrapper) {
            modalWrapper.className = 'sm:rounded-2xl max-w-5xl w-full sm:h-[92vh] modal-height-mobile flex flex-col modal-content-mobile';
            modalWrapper.innerHTML = '';
        }
    }

    rateRecipe(recipeId, rating, event) {
        if (event) {
            event.stopPropagation();
        }
        
        this.userDataManager.setRating(recipeId, rating);
        
        const button = event ? event.currentTarget : null;
        if (button && button.parentElement) {
            const stars = button.parentElement.querySelectorAll('i');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.remove('far', 'text-gray-300');
                    star.classList.add('fas', 'text-amber-400');
                } else {
                    star.classList.remove('fas', 'text-amber-400');
                    star.classList.add('far', 'text-gray-300');
                }
            });
            
            const eraserBtn = document.getElementById(`eraser-${recipeId}`);
            if (eraserBtn && !eraserBtn.classList.contains('opacity-100')) {
                eraserBtn.classList.remove('opacity-0', 'pointer-events-none');
                eraserBtn.classList.add('opacity-100');
            }
        }
        
        this.uiManager.updateRecipeCardRating(recipeId, rating);
        this.recommendationEngine.updateScoreForRecipe(recipeId);

        const filterManager = recipeApp.filterManager;
        if (filterManager.sortOrder === 'recommendation') {
            filterManager.scheduleRecommendationUpdate();
        } else if (filterManager.sortOrder === 'rating') {
            this.addPendingTimeout(() => filterManager.applyFilters());
        }
    }

    clearRating(recipeId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        this.userDataManager.clearRating(recipeId);
        
        const eraserBtn = document.getElementById(`eraser-${recipeId}`);
        if (eraserBtn) {
            eraserBtn.classList.remove('opacity-100');
            eraserBtn.classList.add('opacity-0', 'pointer-events-none');
            const starsContainer = eraserBtn.nextElementSibling;
            if (starsContainer) {
                const stars = starsContainer.querySelectorAll('button');
                stars.forEach(star => {
                    star.innerHTML = '<i class="far fa-star text-gray-300"></i>';
                });
            }
        }
        
        this.uiManager.updateRecipeCardRating(recipeId, 0);
        this.recommendationEngine.updateScoreForRecipe(recipeId);

        const filterManager = recipeApp.filterManager;
        if (filterManager.sortOrder === 'recommendation') {
            filterManager.scheduleRecommendationUpdate();
        } else if (filterManager.sortOrder === 'rating') {
            this.addPendingTimeout(() => filterManager.applyFilters());
        }
    }

    toggleMadeToday(recipeId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const result = this.userDataManager.toggleMadeToday(recipeId);
        
        const button = event ? event.currentTarget : document.querySelector(`button[onclick*="toggleMadeToday('${recipeId}'"]`);
        
        if (button) {
            const isMobileLayout = window.innerWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
            
            button.className = `flex items-center ${isMobileLayout ? 'space-x-1' : 'space-x-2'} px-3 py-1.5 rounded-lg transition ${isMobileLayout ? 'text-xs' : 'text-sm'} font-medium ${
                result.madeToday 
                    ? 'bg-amber-600 text-white' + (!isMobileLayout ? ' hover:bg-amber-700' : '')
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`;
            
            button.innerHTML = `
                <i class="fas fa-check"></i>
                <span>${UI_TEXT.recipe.made} (${result.madeCount})</span>
            `;
        }
        
        this.uiManager.updateRecipeCardCounter(recipeId, result.madeCount);
        this.recommendationEngine.updateScoreForRecipe(recipeId);

        const filterManager = recipeApp.filterManager;
        if (filterManager.sortOrder === 'recommendation') {
            filterManager.scheduleRecommendationUpdate();
        } else if (filterManager.sortOrder === 'madecount') {
            this.addPendingTimeout(() => filterManager.applyFilters());
        }
    }

    toggleTag(recipeId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const isTagged = this.userDataManager.toggleTag(recipeId);
        
        const button = event ? event.currentTarget : document.querySelector(`button[onclick*="toggleTag('${recipeId}'"]`);
        
        if (button) {
            const isMobileLayout = window.innerWidth <= CONFIG.BREAKPOINTS.SINGLE_COLUMN;
            
            button.className = `flex items-center ${isMobileLayout ? 'space-x-1' : 'space-x-2'} px-3 py-1.5 rounded-lg transition ${isMobileLayout ? 'text-xs' : 'text-sm'} font-medium ${
                isTagged 
                    ? 'bg-yellow-600 text-white' + (!isMobileLayout ? ' hover:bg-yellow-700' : '')
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`;
            
            button.innerHTML = `
                <i class="fas fa-tag"></i>
                ${!isMobileLayout ? `<span>${UI_TEXT.recipe.mark}</span>` : ''}
            `;
        }
        
        this.uiManager.updateRecipeCardTag(recipeId, isTagged);

        const filterManager = recipeApp.filterManager;
        if (filterManager.sortOrder === 'recommendation') {
            filterManager.scheduleRecommendationUpdate();
        } else {
            this.addPendingTimeout(() => filterManager.applyFilters());
        }
    }
}

// ============================================================================
// RECOMMENDATION ENGINE CLASS
// ============================================================================

class RecommendationEngine {
    constructor(recipeDatabase, userDataManager, uiManager) {
        this.recipeDatabase = recipeDatabase;
        this.userDataManager = userDataManager;
        this.uiManager = uiManager;
        this.recipeScores = new Map();
    }

    calculateAllScores() {
        this.recipeScores.clear();
        
        const recipeIds = this.recipeDatabase.getAllIds();
        
        recipeIds.forEach(id => {
            const score = this.calculateRecipeScore(id);
            this.recipeScores.set(id, score);
        });
    }

    calculateRecipeScore(recipeId) {
        const recipe = this.recipeDatabase.findById(recipeId);
        const userData = this.userDataManager.getRecipeData(recipeId);
        
        const WEIGHTS = {
            BASE: 20,
            USER_RATING: 10,
            NEVER_VIEWED: 30,
            MADE_COUNT: 5,
            NOSTALGIA_BONUS: 10,

            RECENCY_TODAY: 0.5,        // Viewed today - mild penalty
            RECENCY_RECENT: 0.7,       // Viewed in last 3 days
            RECENCY_WEEK: 0.85,        // Viewed in last week
            RECENCY_NORMAL: 1.0,       // Normal (not recently viewed)

            CHRISTMAS_SEASON: 1.5,      // November-December - small boost
            CHRISTMAS_JANUARY: 1.2,     // January - slight boost
            CHRISTMAS_OFF_SEASON: 0.05, // Rest of year - strong penalty (bottom of list)
            BUTCHERY: 0.01,             // Butchery guide weight (below Christmas off-season)
        };
        
        let score = WEIGHTS.BASE;
        
        if (userData.userRating) {
            score += userData.userRating * WEIGHTS.USER_RATING;
        }
        
        if (!userData.lastViewed) {
            score += WEIGHTS.NEVER_VIEWED;
        }
        
        let recencyMultiplier = WEIGHTS.RECENCY_NORMAL;
        
        if (userData.lastViewed) {
            const now = new Date();
            const viewedDate = new Date(userData.lastViewed);
            const daysSinceView = (now - viewedDate) / (1000 * 60 * 60 * 24);
            
            if (daysSinceView < 1) {
                recencyMultiplier = WEIGHTS.RECENCY_TODAY;
            } else if (daysSinceView < 3) {
                recencyMultiplier = WEIGHTS.RECENCY_RECENT;
            } else if (daysSinceView < 7) {
                recencyMultiplier = WEIGHTS.RECENCY_WEEK;
            } else if (daysSinceView > 30) {
                score += WEIGHTS.NOSTALGIA_BONUS;
            }
        }
        
        score *= recencyMultiplier;
        
        if (userData.madeDates && userData.madeDates.length > 0) {
            const madeBonus = Math.min(userData.madeDates.length, 10) * (WEIGHTS.MADE_COUNT / 10);
            score += madeBonus;
        }
        
        if (recipe) {
            // Get the international category key
            const categoryKey = this.recipeDatabase.getCategoryKey(recipe.category);
            // Christmas recipes (using international key)
            if (categoryKey === 'julekaker') {  // Changed from 'christmas' to 'julekaker'
                const now = new Date();
                const month = now.getMonth();
                
                if (month === 10 || month === 11) {  // November or December
                    score *= WEIGHTS.CHRISTMAS_SEASON;
                } else if (month === 0) {  // January
                    score *= WEIGHTS.CHRISTMAS_JANUARY;
                } else {
                    score *= WEIGHTS.CHRISTMAS_OFF_SEASON;  // This should apply in September
                }
            }
            
            // Butchery guide (using international key)
            if (categoryKey === 'slakteveiledning') {  // Or whatever the Norwegian key would be
                score *= WEIGHTS.BUTCHERY;
            }
        }
        
        return Math.max(score, 0);
    }

    getRecipeScore(recipeId) {
        if (this.recipeScores.has(recipeId)) {
            return this.recipeScores.get(recipeId);
        }
        
        const score = this.calculateRecipeScore(recipeId);
        this.recipeScores.set(recipeId, score);
        return score;
    }

    updateScoreForRecipe(recipeId) {
        const score = this.calculateRecipeScore(recipeId);
        this.recipeScores.set(recipeId, score);
    }
}

// ============================================================================
// MAIN APPLICATION CLASS
// ============================================================================

class RecipeApp {
    constructor() {
        this.initialized = false;
    }

    async init() {
        // Load data first
        await loadAppData();
        
        // Initialize core components
        this.recipeDatabase = new RecipeDatabase();
        this.userDataManager = new UserDataManager();
        this.uiManager = new UIManager(this.recipeDatabase, this.userDataManager);
        this.recommendationEngine = new RecommendationEngine(
            this.recipeDatabase, 
            this.userDataManager, 
            this.uiManager
        );
        
        // Initialize managers that depend on other components
        this.filterManager = new FilterManager(
            this.recipeDatabase, 
            this.uiManager,
            this.recommendationEngine,
            this.userDataManager
        );
        
        // Initialize the new unified search/filter bar
        this.searchFilterBar = new SearchFilterBar(this.filterManager, this.recipeDatabase);
        
        this.kokebokViewer = new KokebokViewer();
        this.modalManager = new ModalManager(
            this.recipeDatabase, 
            this.userDataManager, 
            this.uiManager,
            this.recommendationEngine
        );
        
        // Initialize URL Manager
        this.urlManager = new URLManager(
            this.filterManager,
            this.modalManager,
            this.recipeDatabase
        );
        
        // Connect URL manager to other managers
        this.filterManager.setURLManager(this.urlManager);
        this.modalManager.setURLManager(this.urlManager);
        
        // Set up the modal callback in UIManager
        this.uiManager.setModalCallback((recipeId) => {
            this.modalManager.showRecipe(recipeId);
        });
        
        // Setup event listeners (remove filter manager's search listener since it's now in searchFilterBar)
        this.urlManager.setupHistoryListener();
        
        // Calculate initial recommendation scores
        this.recommendationEngine.calculateAllScores();
        
        // Initialize from URL parameters
        this.urlManager.initializeFromURL();
        
        // Initial render with recommendation sorting
        this.filterManager.applyFilters();
        this.uiManager.setupLazyLoading();
        
        this.initialized = true;
    }
}

// ============================================================================
// INITIALIZE APPLICATION
// ============================================================================

// Create global instance for onclick handlers
let recipeApp;

// Initialize when DOM is ready
async function initApp() {
    recipeApp = new RecipeApp();
    await recipeApp.init();
    
    // Display the daily farmor image
    displayDailyFarmorImage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}