// Advanced Products Page Features

// Signal that products.html is managed by the advanced controller.
window.__advancedProductsActive = true;

// Initialize allProducts from the global products array
let allProducts = typeof products !== 'undefined' ? products : [];

// Ensure all products have required properties
function normalizeProducts() {
    allProducts = allProducts.map(product => ({
        ...product,
        stock: product.stock || 'in-stock',
        seller: product.seller || 'Union Market',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        discount: product.discount || 0
    }));
}

// ===========================
// SIDEBAR & UI CONTROLS
// ===========================

function toggleSidebar() {
    const sidebar = document.getElementById('filters-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// ===========================
// FILTER STATE MANAGEMENT
// ===========================

let currentFilters = {
    search: '',
    categories: [],
    priceMin: 0,
    priceMax: 1000,
    ratings: [],
    stockStatus: [],
    sort: 'newest',
    viewPerPage: 40,
    view: 'grid'
};
const PRODUCTS_FILTERS_KEY = 'aura_products_filters_v1';

function saveFiltersState() {
    localStorage.setItem(PRODUCTS_FILTERS_KEY, JSON.stringify(currentFilters));
}

function loadFiltersState() {
    try {
        const stored = JSON.parse(localStorage.getItem(PRODUCTS_FILTERS_KEY) || 'null');
        if (!stored || typeof stored !== 'object') return;
        currentFilters = { ...currentFilters, ...stored };
    } catch (_error) {
        // no-op
    }
}

// ===========================
// SEARCH & FILTER HANDLERS
// ===========================

function handleProductSearch() {
    const searchInput = document.getElementById('product-search') || document.getElementById('product-search-mobile');
    currentFilters.search = searchInput ? searchInput.value.toLowerCase() : '';
    applyAllFilters();
}

function handleSort() {
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        currentFilters.sort = sortSelect.value;
        applyAllFilters();
    }
}

function handleItemsPerPage() {
    const itemsSelect = document.getElementById('items-per-page');
    if (itemsSelect) {
        currentFilters.viewPerPage = parseInt(itemsSelect.value);
        applyAllFilters();
    }
}

function updateCategoryFilters() {
    const checkboxes = document.querySelectorAll('.category-filter:checked');
    const selectedValues = Array.from(checkboxes).map(cb => cb.value);
    
    // If "All" is selected, clear other selections
    if (selectedValues.includes('All')) {
        currentFilters.categories = [];
    } else {
        currentFilters.categories = selectedValues;
    }
}

function updateRatingFilters() {
    const checkboxes = document.querySelectorAll('.rating-filter:checked');
    currentFilters.ratings = Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function updateStockFilters() {
    const checkboxes = document.querySelectorAll('.stock-filter:checked');
    currentFilters.stockStatus = Array.from(checkboxes).map(cb => cb.value);
}

// ===========================
// APPLY FILTERS
// ===========================

function applyAllFilters() {
    // Sync state from DOM before filtering to catch programmatic changes (like Clear Filters)
    updateCategoryFilters();
    updateRatingFilters();
    updateStockFilters();
    
    const priceSlider = document.getElementById('price-slider');
    if (priceSlider) currentFilters.priceMax = parseInt(priceSlider.value);
    
    const searchInput = document.getElementById('product-search') || document.getElementById('product-search-mobile');
    currentFilters.search = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = allProducts.filter(product => {
        // Search filter
        if (currentFilters.search) {
            const searchWords = currentFilters.search.split(/\s+/).filter(word => word.length > 0);
            const searchableText = `${product.name} ${product.category} ${product.description || ''} ${product.supplier || ''}`.toLowerCase();
            const matchesAllWords = searchWords.every(word => searchableText.includes(word));
            if (!matchesAllWords) return false;
        }
        
        // Category filter
        if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(product.category)) {
            return false;
        }
        
        // Price filter
        if (product.price < currentFilters.priceMin || product.price > currentFilters.priceMax) {
            return false;
        }
        
        // Rating filter
        if (currentFilters.ratings.length > 0 && !currentFilters.ratings.some(r => product.rating >= r)) {
            return false;
        }
        
        // Stock filter
        if (currentFilters.stockStatus.length > 0 && !currentFilters.stockStatus.includes(product.stock)) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    filtered = sortProducts(filtered, currentFilters.sort);
    
    renderProductsGallery(filtered);
    saveFiltersState();
}

function sortProducts(products, sortType) {
    const sorted = [...products];
    
    switch(sortType) {
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'rating':
            return sorted.sort((a, b) => b.rating - a.rating);
        case 'best-sellers':
            return sorted.sort((a, b) => (b.tag === 'bestseller' ? 1 : 0) - (a.tag === 'bestseller' ? 1 : 0));
        case 'trending':
            return sorted.sort((a, b) => (b.reviews * b.rating) - (a.reviews * a.rating));
        case 'newest':
        default:
            return sorted;
    }
}

// ===========================
// QUICK VIEW MODAL
// ===========================

function openQuickView(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('quick-view-modal');
    if (!modal) return;
    
    modal.querySelector('.modal-image').src = typeof getOptimizedImageURL === 'function'
        ? getOptimizedImageURL(product.image, 720, 75)
        : product.image;
    modal.querySelector('.modal-name').textContent = product.name;
    modal.querySelector('.modal-rating').textContent = product.rating.toFixed(1);
    modal.querySelector('.modal-reviews').textContent = `(${product.reviews || 0} reviews)`;
    modal.querySelector('.modal-price').textContent = typeof formatPrice === 'function'
        ? formatPrice(product.price)
        : `${product.price}`;
    modal.querySelector('.modal-description').textContent = product.description || 'No description available';
    
    modal.classList.remove('hidden');
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) modal.classList.add('hidden');
}

// ===========================
// CART & WISHLIST FUNCTIONS
// ===========================

function addToCartQuick(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({...product, quantity: 1});
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Show notification
    if (typeof showToast === 'function') {
        showToast(`${product.name} added to cart!`, 'success');
    }
    if (typeof trackEvent === 'function') {
        trackEvent('add_to_cart', { productId, source: 'products-advanced', category: product.category });
    }
}

function addToWishlistQuick(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const exists = wishlist.find(item => item.id === productId);
    
    if (!exists) {
        wishlist.push(product);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        if (typeof showToast === 'function') {
            showToast(`${product.name} added to wishlist!`, 'success');
        }
        if (typeof trackEvent === 'function') {
            trackEvent('add_to_wishlist', { productId, source: 'products-advanced' });
        }
    } else {
        if (typeof showToast === 'function') {
            showToast(`${product.name} is already in your wishlist!`);
        }
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

// ===========================
// CLEAR FILTERS
// ===========================

function clearAllFilters() {
    // Clear category filters
    document.querySelectorAll('.category-filter').forEach(cb => cb.checked = false);
    if (document.querySelector('.category-filter[value="All"]')) {
        document.querySelector('.category-filter[value="All"]').checked = true;
    }
    
    // Clear rating filters
    document.querySelectorAll('.rating-filter').forEach(cb => cb.checked = false);
    
    // Clear stock filters
    document.querySelectorAll('.stock-filter').forEach(cb => cb.checked = false);
    
    // Reset price slider and inputs
    const priceSlider = document.getElementById('price-slider');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceDisplay = document.getElementById('price-display');
    const priceMinDisplay = document.getElementById('price-min-display');
    
    if (priceSlider) priceSlider.value = 1000;
    if (priceMinInput) priceMinInput.value = 0;
    if (priceMaxInput) priceMaxInput.value = 1000;
    if (priceDisplay) priceDisplay.textContent = '1000';
    if (priceMinDisplay) priceMinDisplay.textContent = '0';
    
    // Clear search
    const searchInput = document.getElementById('product-search');
    if (searchInput) searchInput.value = '';
    const mobileSearchInput = document.getElementById('product-search-mobile');
    if (mobileSearchInput) mobileSearchInput.value = '';
    
    // Hide active filters badge
    const badge = document.getElementById('active-filters-badge');
    if (badge) badge.classList.add('hidden');
    
    // Reset state and re-render
    currentFilters.categories = [];
    currentFilters.ratings = [];
    currentFilters.stockStatus = [];
    currentFilters.priceMin = 0;
    currentFilters.priceMax = 1000;
    currentFilters.search = '';
    
    applyAllFilters();
    
    if (typeof showToast === 'function') {
        showToast('Filters cleared!', 'success');
    }
}

// ===========================
// COMPARE FUNCTIONALITY
// ===========================

// ===========================
// RECENTLY VIEWED PRODUCTS
// ===========================

function updateRecentlyViewedWidget() {
    const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    const widget = document.getElementById('recently-viewed-list');
    
    if (!widget) return;

    if (recentlyViewedIds.length === 0) {
        widget.innerHTML = '<p class="text-xs text-gray-500 italic px-2">No recently viewed items</p>';
        return;
    }
    
    const viewedProducts = recentlyViewedIds
        .map(id => allProducts.find(p => p.id == id))
        .filter(p => p);
    
    widget.innerHTML = viewedProducts.slice(0, 3).map(product => `
        <div class="border dark:border-gray-800 rounded-lg p-2 hover:shadow-md transition-all cursor-pointer mb-3 bg-white dark:bg-gray-900 group" onclick="viewProduct(${product.id})">
            <img src="${typeof getOptimizedImageURL === 'function' ? getOptimizedImageURL(product.image, 220, 70) : product.image}" alt="${product.name}" loading="lazy" decoding="async" fetchpriority="low" class="w-full h-16 object-cover rounded group-hover:opacity-80 transition-opacity">
            <p class="text-[10px] mt-1 truncate font-medium text-gray-900 dark:text-white group-hover:text-[#FF6A00]">${product.name}</p>
            <p class="text-[10px] text-[#FF6A00] font-bold">${typeof formatPrice === 'function' ? formatPrice(product.price) : `MWK ${Math.round(product.price * 1750).toLocaleString('en-MW')}`}</p>
        </div>
    `).join('');
}

// ===========================
// RENDER PRODUCTS
// ===========================

function renderSkeletonGrid() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    const count = currentFilters.viewPerPage || 20;
    const skeletonHTML = `
        <div class="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md border border-gray-100 dark:border-gray-800">
            <div class="aspect-square skeleton"></div>
            <div class="p-4 space-y-4">
                <div class="h-4 skeleton rounded w-3/4"></div>
                <div class="h-3 skeleton rounded w-1/2"></div>
                <div class="flex items-center gap-2">
                    <div class="h-6 skeleton rounded w-1/4"></div>
                    <div class="h-4 skeleton rounded w-1/4"></div>
                </div>
                <div class="h-10 skeleton rounded w-full"></div>
            </div>
        </div>
    `;
    
    grid.innerHTML = Array(count).fill(skeletonHTML).join('');
    
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    if (noResults) noResults.classList.add('hidden');
    if (resultsCount) resultsCount.textContent = 'Filtering products...';
}

function renderProductsGallery(products) {
    const grid = document.getElementById('products-grid');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    
    if (!grid) return;
    
    const paginated = products.slice(0, currentFilters.viewPerPage);

    if (paginated.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
        if (resultsCount) resultsCount.textContent = 'No products found';
        return;
    }

    if (noResults) noResults.classList.add('hidden');
    if (resultsCount) resultsCount.textContent = `Showing ${paginated.length} of ${products.length} products`;
    
    // Reuse the standardized card rendering from script.js
    grid.innerHTML = paginated.map(createProductCard).join('');
}

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    loadFiltersState();
    // Ensure allProducts is initialized and normalized
    if (typeof products !== 'undefined' && allProducts.length === 0) {
        allProducts = products;
    }
    normalizeProducts();
    
    updateCartCount();
    updateRecentlyViewedWidget();
    applyAllFilters();
    
    // Price slider and inputs
    const priceSlider = document.getElementById('price-slider');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceDisplay = document.getElementById('price-display');
    const priceMinDisplay = document.getElementById('price-min-display');
    
    if (priceSlider) {
        priceSlider.value = String(currentFilters.priceMax);
    }
    if (priceMinInput) {
        priceMinInput.value = String(currentFilters.priceMin);
    }
    if (priceMaxInput) {
        priceMaxInput.value = String(currentFilters.priceMax);
    }
    if (priceDisplay) {
        priceDisplay.textContent = String(currentFilters.priceMax);
    }
    if (priceMinDisplay) {
        priceMinDisplay.textContent = String(currentFilters.priceMin);
    }

    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) sortSelect.value = currentFilters.sort;
    const itemsSelect = document.getElementById('items-per-page');
    if (itemsSelect) itemsSelect.value = String(currentFilters.viewPerPage);
    const searchDesktop = document.getElementById('product-search');
    const searchMobile = document.getElementById('product-search-mobile');
    if (searchDesktop) searchDesktop.value = currentFilters.search || '';
    if (searchMobile) searchMobile.value = currentFilters.search || '';

    document.querySelectorAll('.category-filter').forEach((checkbox) => {
        checkbox.checked = currentFilters.categories.includes(checkbox.value)
            || (currentFilters.categories.length === 0 && checkbox.value === 'All');
    });
    document.querySelectorAll('.rating-filter').forEach((checkbox) => {
        checkbox.checked = currentFilters.ratings.includes(parseInt(checkbox.value, 10));
    });
    document.querySelectorAll('.stock-filter').forEach((checkbox) => {
        checkbox.checked = currentFilters.stockStatus.includes(checkbox.value);
    });

    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            currentFilters.priceMax = parseInt(this.value);
            if (priceDisplay) priceDisplay.textContent = this.value;
            if (priceMaxInput) priceMaxInput.value = this.value;
            applyAllFilters();
        });
    }
    
    if (priceMinInput) {
        priceMinInput.addEventListener('change', function() {
            let value = Math.max(0, Math.min(parseInt(this.value) || 0, currentFilters.priceMax - 1));
            this.value = value;
            currentFilters.priceMin = value;
            if (priceMinDisplay) priceMinDisplay.textContent = value;
            applyAllFilters();
        });
    }
    
    if (priceMaxInput) {
        priceMaxInput.addEventListener('change', function() {
            let value = Math.min(1000, Math.max(parseInt(this.value) || 1000, currentFilters.priceMin + 1));
            this.value = value;
            currentFilters.priceMax = value;
            if (priceDisplay) priceDisplay.textContent = value;
            if (priceSlider) priceSlider.value = value;
            applyAllFilters();
        });
    }

    // Search inputs filtering
    const searchInputs = [document.getElementById('product-search'), document.getElementById('product-search-mobile')];
    const debouncedFilter = debounce(() => handleProductSearch(), 300);

    searchInputs.forEach(input => {
        if (!input) return;

        // Live filtering as user types
        input.addEventListener('input', () => {
            renderSkeletonGrid();
            debouncedFilter();
        });

        // Filter on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleProductSearch();
            }
        });
    });

    // Category filters
    document.querySelectorAll('.category-filter').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateCategoryFilters();
            applyAllFilters();
        });
    });

    // Rating filters
    document.querySelectorAll('.rating-filter').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateRatingFilters();
            applyAllFilters();
        });
    });

    // Stock filters
    document.querySelectorAll('.stock-filter').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateStockFilters();
            applyAllFilters();
        });
    });

    // Quick view modal close
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeQuickView();
        });
    }
});
