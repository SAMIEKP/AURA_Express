# Union Market Smoke Checklist

## Navigation
- Open `index.html`, `products.html`, `cart.html`, `messages.html`, `seller-dashboard.html`.
- Verify no broken links in header/footer.

## Product Discovery
- Set filters (category/rating/stock/price), refresh page, confirm filters persist.
- Change sort + items per page, refresh page, confirm persistence.
- Search by keyword and verify result count updates.

## Cart & Checkout
- Add item with stock > 0 to cart.
- Try increasing quantity beyond stock and confirm validation error.
- Apply invalid promo code and verify error.
- Apply valid promo code with insufficient subtotal and verify min-subtotal error.
- Apply valid promo code with sufficient subtotal and verify discount row appears.
- Attempt checkout with empty cart and verify blocked.

## Seller Dashboard
- Upload valid image (<4MB, JPG/PNG/WEBP) and confirm preview appears.
- Upload invalid/oversized image and confirm validation error.
- Enter duplicate SKU and confirm uniqueness validation blocks submit.
- Publish product and verify listing appears + stats update.
- Edit product and verify updates persist.

## Messaging
- Open a conversation, refresh page, confirm same thread remains open.
- Press `Enter` to send and `Shift+Enter` for newline.
- Use thread search to filter visible messages.
- Pin and archive a conversation; verify list updates.

## Analytics/Audit
- Trigger add-to-cart, promo apply, checkout submit, seller publish/update.
- Verify events are stored in `localStorage.aura_analytics_events`.
