(function () {
    const SELLER_PRODUCTS_KEY = 'aura_seller_products';
    const SELLER_PROFILE_KEY = 'aura_seller_profile';
    const USD_TO_MWK_RATE = 1750;

    const DEFAULT_PROFILE = {
        sellerName: 'Marketplace Seller',
        shopName: 'My Union Market Shop',
        email: '',
        phone: ''
    };

    const CATEGORY_OPTIONS = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Gaming'];

    function parseJSON(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    }

    function getSellerProfile() {
        const stored = parseJSON(localStorage.getItem(SELLER_PROFILE_KEY), null);
        return { ...DEFAULT_PROFILE, ...(stored || {}) };
    }

    function saveSellerProfile(profilePatch) {
        const next = { ...getSellerProfile(), ...profilePatch };
        localStorage.setItem(SELLER_PROFILE_KEY, JSON.stringify(next));
        return next;
    }

    function getSellerProducts() {
        const items = parseJSON(localStorage.getItem(SELLER_PRODUCTS_KEY), []);
        return Array.isArray(items) ? items : [];
    }

    function saveSellerProducts(items) {
        localStorage.setItem(SELLER_PRODUCTS_KEY, JSON.stringify(items));
    }

    function getMaxKnownProductId() {
        const staticMax = Array.isArray(window.products)
            ? window.products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0)
            : 0;
        const sellerMax = getSellerProducts().reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
        return Math.max(staticMax, sellerMax, 120);
    }

    function toMwk(amount) {
        return Math.round((Number(amount) || 0) * USD_TO_MWK_RATE);
    }

    function fromMwk(amount) {
        return (Number(amount) || 0) / USD_TO_MWK_RATE;
    }

    function discountFromPrices(price, originalPrice) {
        if (!originalPrice || originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    function normalizeSellerProduct(raw, existingId) {
        const profile = getSellerProfile();
        const price = Number(raw.price || 0);
        const guessedOriginal = Number(raw.originalPrice || 0) > 0 ? Number(raw.originalPrice) : Number((price * 1.2).toFixed(2));
        const inventory = Number(raw.inventory || 0);
        const safeCategory = CATEGORY_OPTIONS.includes(raw.category) ? raw.category : 'Electronics';

        return {
            id: existingId || getMaxKnownProductId() + 1,
            name: (raw.name || '').trim(),
            description: (raw.description || '').trim(),
            category: safeCategory,
            price,
            originalPrice: Math.max(guessedOriginal, price),
            discount: discountFromPrices(price, Math.max(guessedOriginal, price)),
            image: raw.image || 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=500&q=80',
            supplier: profile.shopName || profile.sellerName || 'Marketplace Seller',
            rating: Number(raw.rating || 4.5),
            reviews: Number(raw.reviews || 0),
            tag: raw.tag || 'new',
            stock: inventory <= 5 ? 'low-stock' : 'in-stock',
            inventory,
            status: raw.status || 'active',
            sku: (raw.sku || '').trim() || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            shippingDays: Number(raw.shippingDays || 3),
            sellerManaged: true,
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    function addSellerProduct(productInput) {
        const all = getSellerProducts();
        const normalized = normalizeSellerProduct(productInput);
        all.unshift(normalized);
        saveSellerProducts(all);
        return normalized;
    }

    function updateSellerProduct(productId, productInput) {
        const all = getSellerProducts();
        const idx = all.findIndex((item) => String(item.id) === String(productId));
        if (idx < 0) return null;
        const current = all[idx];
        const normalized = normalizeSellerProduct({ ...current, ...productInput, createdAt: current.createdAt }, current.id);
        all[idx] = normalized;
        saveSellerProducts(all);
        return normalized;
    }

    function removeSellerProduct(productId) {
        const all = getSellerProducts();
        const next = all.filter((item) => String(item.id) !== String(productId));
        saveSellerProducts(next);
    }

    function toggleProductStatus(productId) {
        const all = getSellerProducts();
        const item = all.find((entry) => String(entry.id) === String(productId));
        if (!item) return null;
        item.status = item.status === 'active' ? 'paused' : 'active';
        item.updatedAt = new Date().toISOString();
        saveSellerProducts(all);
        return item;
    }

    function getDashboardStats() {
        const items = getSellerProducts();
        const active = items.filter((item) => item.status === 'active');
        const lowStock = active.filter((item) => Number(item.inventory) <= 5);
        const totalValueMwk = active.reduce((sum, item) => sum + toMwk((Number(item.price) || 0) * (Number(item.inventory) || 0)), 0);
        const monthlyEstimateMwk = active.reduce((sum, item) => sum + toMwk((Number(item.price) || 0) * Math.max(1, Math.round((Number(item.reviews) || 0) / 12))), 0);

        return {
            totalListings: items.length,
            activeListings: active.length,
            lowStockCount: lowStock.length,
            inventoryValueMwk: totalValueMwk,
            monthlyEstimateMwk
        };
    }

    function formatMwk(mwk) {
        return new Intl.NumberFormat('en-MW', {
            style: 'currency',
            currency: 'MWK',
            maximumFractionDigits: 0
        }).format(Number(mwk) || 0);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function bootstrapMarketplaceProducts() {
        if (!Array.isArray(window.products)) return;
        const sellerItems = getSellerProducts().filter((item) => item.status === 'active');
        const existingIds = new Set(window.products.map((item) => String(item.id)));

        sellerItems.forEach((item) => {
            if (!existingIds.has(String(item.id))) {
                window.products.push(normalizeSellerProduct(item, item.id));
                existingIds.add(String(item.id));
            }
        });
    }

    function renderDashboard() {
        const stats = getDashboardStats();
        const products = getSellerProducts();

        const statsEl = document.getElementById('seller-stats-grid');
        const productsEl = document.getElementById('seller-products-list');
        const emptyEl = document.getElementById('seller-empty-state');
        const lowStockEl = document.getElementById('seller-low-stock-list');

        if (statsEl) {
            statsEl.innerHTML = `
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Total Listings</p>
                    <p class="text-3xl font-black text-gray-900 dark:text-white mt-2">${stats.totalListings}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Active Listings</p>
                    <p class="text-3xl font-black text-green-600 mt-2">${stats.activeListings}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Low Stock Alerts</p>
                    <p class="text-3xl font-black text-orange-500 mt-2">${stats.lowStockCount}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/50">
                    <p class="text-xs uppercase tracking-wider text-[#FF6A00] font-bold">Inventory Value</p>
                    <p class="text-2xl font-black text-[#FF6A00] mt-2">${formatMwk(stats.inventoryValueMwk)}</p>
                    <p class="text-xs text-gray-500 mt-1">Monthly estimate: ${formatMwk(stats.monthlyEstimateMwk)}</p>
                </article>
            `;
        }

        if (lowStockEl) {
            const lowStockItems = products.filter((item) => item.status === 'active' && Number(item.inventory) <= 5).slice(0, 6);
            if (lowStockItems.length === 0) {
                lowStockEl.innerHTML = '<p class="text-sm text-gray-500">No low-stock products right now.</p>';
            } else {
                lowStockEl.innerHTML = lowStockItems.map((item) => `
                    <li class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        <span class="text-sm text-gray-700 dark:text-gray-300 truncate pr-3">${escapeHtml(item.name)}</span>
                        <span class="text-xs font-bold text-orange-500">${Number(item.inventory)} left</span>
                    </li>
                `).join('');
            }
        }

        if (!productsEl || !emptyEl) return;

        if (products.length === 0) {
            productsEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            return;
        }

        emptyEl.classList.add('hidden');
        productsEl.innerHTML = products.map((item) => {
            const statusClass = item.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

            return `
                <article class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5">
                    <div class="flex flex-col md:flex-row md:items-center gap-4">
                        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full md:w-28 h-28 object-cover rounded-xl border border-gray-100 dark:border-gray-800">
                        <div class="flex-grow min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-base font-bold text-gray-900 dark:text-white truncate">${escapeHtml(item.name)}</h3>
                                <span class="text-[11px] px-2 py-1 rounded-full font-bold ${statusClass}">${item.status.toUpperCase()}</span>
                            </div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${escapeHtml(item.description || 'No description')}</p>
                            <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
                                <span class="font-bold text-[#FF6A00]">${formatMwk(toMwk(item.price))}</span>
                                <span class="text-gray-500">Inventory: ${Number(item.inventory)}</span>
                                <span class="text-gray-500">SKU: ${escapeHtml(item.sku)}</span>
                            </div>
                        </div>
                        <div class="flex gap-2 md:flex-col md:w-28">
                            <button data-seller-action="edit" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors">Edit</button>
                            <button data-seller-action="toggle" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-[#FF6A00] text-white text-xs font-bold hover:bg-[#e65f00] transition-colors">${item.status === 'active' ? 'Pause' : 'Activate'}</button>
                            <button data-seller-action="delete" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">Delete</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function readImageAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read image file.'));
            reader.readAsDataURL(file);
        });
    }

    function fillFormWithProduct(product) {
        const form = document.getElementById('seller-product-form');
        if (!form || !product) return;

        form.dataset.editId = String(product.id);
        form.elements.name.value = product.name || '';
        form.elements.description.value = product.description || '';
        form.elements.category.value = product.category || 'Electronics';
        form.elements.price.value = product.price ? Math.round(toMwk(product.price)) : '';
        form.elements.originalPrice.value = product.originalPrice ? Math.round(toMwk(product.originalPrice)) : '';
        form.elements.inventory.value = product.inventory || 1;
        form.elements.shippingDays.value = product.shippingDays || 3;
        form.elements.sku.value = product.sku || '';

        const preview = document.getElementById('seller-image-preview');
        if (preview && product.image) {
            preview.src = product.image;
            preview.classList.remove('hidden');
        }

        const submitLabel = document.getElementById('seller-submit-label');
        if (submitLabel) submitLabel.textContent = 'Update Product';

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetProductForm() {
        const form = document.getElementById('seller-product-form');
        if (!form) return;
        form.reset();
        delete form.dataset.editId;

        const preview = document.getElementById('seller-image-preview');
        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }

        const submitLabel = document.getElementById('seller-submit-label');
        if (submitLabel) submitLabel.textContent = 'Publish Product';
    }

    async function handleProductSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const editId = form.dataset.editId;

        const payload = {
            name: form.elements.name.value,
            description: form.elements.description.value,
            category: form.elements.category.value,
            price: Number(fromMwk(form.elements.price.value).toFixed(2)),
            originalPrice: Number(fromMwk(form.elements.originalPrice.value || 0).toFixed(2)),
            inventory: Number(form.elements.inventory.value),
            shippingDays: Number(form.elements.shippingDays.value || 3),
            sku: form.elements.sku.value,
            status: 'active'
        };

        if (!payload.name || payload.price <= 0 || payload.inventory < 0) {
            if (typeof showToast === 'function') showToast('Fill in valid product details.', 'error');
            return;
        }

        const file = form.elements.image.files[0];
        if (!editId && !file) {
            if (typeof showToast === 'function') showToast('Please upload a product image.', 'error');
            return;
        }

        if (file) {
            payload.image = await readImageAsDataURL(file);
        }

        if (editId) {
            updateSellerProduct(editId, payload);
            if (typeof showToast === 'function') showToast('Product updated.', 'success');
        } else {
            addSellerProduct(payload);
            if (typeof showToast === 'function') showToast('Product published.', 'success');
        }

        resetProductForm();
        renderDashboard();
    }

    function handleDashboardActions(event) {
        const button = event.target.closest('[data-seller-action]');
        if (!button) return;

        const action = button.getAttribute('data-seller-action');
        const productId = button.getAttribute('data-product-id');
        const products = getSellerProducts();
        const product = products.find((item) => String(item.id) === String(productId));
        if (!product) return;

        if (action === 'edit') {
            fillFormWithProduct(product);
            return;
        }

        if (action === 'toggle') {
            const toggled = toggleProductStatus(productId);
            if (toggled && typeof showToast === 'function') {
                showToast(toggled.status === 'active' ? 'Listing activated.' : 'Listing paused.', 'success');
            }
            renderDashboard();
            return;
        }

        if (action === 'delete') {
            const ok = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
            if (!ok) return;
            removeSellerProduct(productId);
            if (typeof showToast === 'function') showToast('Listing deleted.', 'success');
            renderDashboard();
        }
    }

    function hydrateProfileForm() {
        const form = document.getElementById('seller-profile-form');
        if (!form) return;
        const profile = getSellerProfile();
        form.elements.sellerName.value = profile.sellerName || '';
        form.elements.shopName.value = profile.shopName || '';
        form.elements.email.value = profile.email || '';
        form.elements.phone.value = profile.phone || '';
    }

    function handleProfileSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        saveSellerProfile({
            sellerName: form.elements.sellerName.value.trim(),
            shopName: form.elements.shopName.value.trim(),
            email: form.elements.email.value.trim(),
            phone: form.elements.phone.value.trim()
        });
        if (typeof showToast === 'function') showToast('Seller profile saved.', 'success');
        renderDashboard();
    }

    function initSellerDashboard() {
        const form = document.getElementById('seller-product-form');
        if (!form) return;

        hydrateProfileForm();
        renderDashboard();

        form.addEventListener('submit', (event) => {
            handleProductSubmit(event).catch(() => {
                if (typeof showToast === 'function') showToast('Image upload failed. Try another image.', 'error');
            });
        });

        document.getElementById('seller-products-list')?.addEventListener('click', handleDashboardActions);
        document.getElementById('seller-profile-form')?.addEventListener('submit', handleProfileSubmit);
        document.getElementById('seller-reset-btn')?.addEventListener('click', resetProductForm);

        document.getElementById('seller-image-input')?.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const dataUrl = await readImageAsDataURL(file);
                const preview = document.getElementById('seller-image-preview');
                if (preview) {
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                }
            } catch (_error) {
                if (typeof showToast === 'function') showToast('Could not preview that image.', 'error');
            }
        });
    }

    window.SellerMarketplace = {
        getSellerProfile,
        saveSellerProfile,
        getSellerProducts,
        addSellerProduct,
        updateSellerProduct,
        removeSellerProduct,
        toggleProductStatus,
        getDashboardStats,
        initSellerDashboard,
        bootstrapMarketplaceProducts
    };

    // Make seller listings visible inside storefront product arrays.
    bootstrapMarketplaceProducts();

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('seller-product-form')) {
            initSellerDashboard();
        }
    });
})();
