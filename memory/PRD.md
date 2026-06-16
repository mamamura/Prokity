# প্রকৃতির ঘ্রাণ (Prokritir Ghran) — Organic Shop PRD

## Original Problem Statement
User wants a Bengali-first organic-products e-commerce experience with:
1. **Guest checkout** — no mandatory signup/login to purchase; users buy by giving address + phone.
2. **PDF receipt download** after order confirmation.
3. **Tracker number** so users can track their products (without an account).
4. **Login/Signup hint** kept on Checkout & Profile pages.
5. **Wishlist, Saved Addresses, Notifications, Messages** remain login-dependent.
6. **Admin panel & admin login unchanged.**
7. **Admin dashboard control** for product discount, delivery fee, and other site settings.
8. **Full Bengali UI.**

User language: **Bengali (বাংলা)** — agent responds in Bengali.

## Architecture
```
/app/
├── backend/server.py          # FastAPI single-file API (~1370 lines)
├── backend/tests/             # pytest backend tests
└── frontend/src/
    ├── App.js                 # Routes
    ├── contexts/CartContext.jsx       # Cart + pricing rules from /settings/site
    ├── pages/
    │   ├── Checkout.jsx       # Guest + logged-in unified
    │   ├── Track.jsx          # Public /track
    │   ├── Receipt.jsx        # Public /receipt/:orderNo (PDF via window.print)
    │   ├── Profile.jsx        # Guest sees localStorage guest orders + /track link
    │   ├── Cart.jsx, Auth.jsx, Home.jsx, ...
    │   └── admin/Settings.jsx # Admin Pricing tab (discount, tax, min-order)
    └── components/
        ├── ChatWidget, BottomNav, DesktopNav, MobileHeader (Bengali)
        └── ui/ (shadcn)
```

## Tech Stack
- **Frontend**: React (CRA), TailwindCSS, Axios, lucide-react
- **Backend**: FastAPI + Motor (async MongoDB) + JWT auth
- **DB**: MongoDB

## Key Data Models
- `orders`: `{id, orderNo, user_id (nullable for guests), items, address, paymentMethod, paymentStatus, paymentPhone, paymentTxn, subtotal, delivery, discount, total, couponCode, status, history[], createdAt}`
- `site_settings` (singleton): `{deliveryFee, freeDeliveryAbove, globalDiscountPercent, globalDiscountLabel, taxPercent, minOrderAmount, siteName, tagline, contactPhone, ...}`

## Key API Endpoints
- `POST /api/orders` — accepts both authed users and guests (`user=Depends(get_optional_user)`).
- `GET /api/orders/track/{orderNo}?phone=...` — **public** tracking; matches by `orderNo` + last-6-digit phone fuzzy match.
- `GET /api/settings/site` — public site settings (includes pricing).
- `PUT /api/admin/settings/site` — admin updates pricing/delivery/etc.
- `GET /api/settings/payment` — public payment methods.

## What's Been Implemented

### Iteration 1–2 (carry-over)
- Catalog, cart, search, product details, admin panel, payment manual flow (bKash/Nagad), coupons.

### Iteration 3 — current session (Feb 2026)
- **Guest checkout** — backend `POST /api/orders` accepts unauthenticated requests; sets `user_id=null`.
- **Public order tracking** — `GET /api/orders/track/{orderNo}?phone=...` with phone match; wrong phone rejects.
- **Receipt page** — `/receipt/:orderNo?phone=...` renders a Bengali printable invoice; **PDF via browser print** (`window.print()`) with print stylesheet for clean output.
- **Login/Signup hint** — Visible banner on `/checkout` for guests with `লগইন` + `সাইনআপ` buttons.
- **LocalStorage guest orders** — On guest checkout success, orderNo+phone saved to `os_guest_orders`. Profile page (guest mode) lists these with `ট্র্যাক` buttons.
- **Profile guest mode** — "গেস্ট অপশন" section with `/track` link + guest-orders list.
- **Admin pricing controls** — New `Pricing` tab in admin Settings:
  - Global Discount % (applies to cart subtotal)
  - Promo label (shown as banner in cart/checkout)
  - VAT/Tax %
  - Minimum order amount
- **CartContext** auto-fetches `/settings/site`, applies `siteDiscount`, `tax`, `delivery` reactively.
- **Bengali UI** — Translated: Home, Cart, Checkout, Track, Receipt, Profile, Auth (login/signup), Search, Categories, Product, Wishlist, Orders, Notifications, EditProfile, Addresses, ChatWidget, BottomNav, MobileHeader, DesktopNav.
- **Protected routes** still gated: `/wishlist`, `/notifications`, `/messages`, `/orders`, `/profile/addresses`, `/profile/edit` — redirect to `/login`.
- **Admin login** — unchanged at `/portal-7x9k2m4p8q3z6n1v`.

## Test Results
- **Iteration 3**: 15/15 backend pytest passed (`/app/backend/tests/test_guest_checkout.py`); full frontend E2E green.
- See `/app/test_reports/iteration_3.json`.

## Backlog / P1+
- Split `server.py` into routers (orders / settings / admin / auth) for maintainability.
- Validate Bangladeshi phone format on guest checkout (e.g. `^01[3-9]\d{8}$`).
- Rate-limit `/api/orders/track` to prevent enumeration.
- Add admin-controlled `bnText` content per category for full localization of DB-driven content.
- Email/SMS notification on order confirmation (using contactPhone in settings).
- Optional: provide a fallback "Continue as guest" button below the Login page.

## Files of Reference
- Backend: `/app/backend/server.py`
- Frontend pages: `/app/frontend/src/pages/{Checkout,Track,Receipt,Profile,Cart}.jsx`
- Admin: `/app/frontend/src/pages/admin/Settings.jsx`
- Cart: `/app/frontend/src/contexts/CartContext.jsx`
- Routes: `/app/frontend/src/App.js`
- Tests: `/app/backend/tests/test_guest_checkout.py`
