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

### Iteration 3 (Feb 2026) — Guest checkout + Bengali
- Guest checkout (no login), public tracking, PDF receipt page, LocalStorage guest orders, Login/Signup hint, admin pricing controls, Bengali UI across all pages.

### Iteration 4 (Feb 2026) — Branding
- Custom logo everywhere (mobile header replaced login greeting), home Order Tracker card, jsPDF+html2canvas true PDF download, favicon.

### Iteration 5 (Feb 2026) — Full admin control + de-branding
- **"Made with Emergent" badge + posthog + emergent scripts REMOVED** from `public/index.html` — no trace site-wide.
- **Admin Branding tab** (default): upload site logo, brand color pickers (primary + dark), applied as `--brand` CSS variable.
- **Admin Features tab**: toggle Chat widget, Home Order Tracker card, Newsletter section on/off.
- **Category image upload**: file upload replaces URL input in admin.
- **Product image upload**: 2 MB size hint + URL fallback removed; unlimited (subject to Mongo 16MB doc limit).
- **Product unit dropdown**: Bengali presets — ওজন (১০০ গ্রাম … ১০ কেজি), তরল (১০০ মিলি … ৫ লিটার), পিস (১ পিস … ১ ডজন), plus "🖋 কাস্টম" free-text option.
- **Product images transparent + object-contain** on cards & detail — images blend with page background.
- **PDF links stay in same tab** (`target="_blank"` removed from Track & Checkout receipt links).
- **SiteContext** provides logo, brand color, feature toggles globally to every page.

## Test Results
- **Iteration 5**: Backend 5/5 pytest passed; frontend 100%. See `/app/test_reports/iteration_5.json`.
- **Iteration 4**: 100% (logo + tracker + PDF).
- **Iteration 3**: 15/15 backend + full frontend green.

## Backlog / P1+
- **Settings.jsx refactor** — 350+ lines, 6 tabs — split into `BrandingTab.jsx`, `PaymentTab.jsx` etc.
- **Server-side image cap** — reject > 500KB base64 or migrate to `/api/uploads` static hosting to avoid Mongo 16MB doc limit.
- **SiteContext live refresh** — currently admin brand-color/logo change requires hard reload; add auto-refresh or optimistic mutation.
- **Full theme cascade** — most `emerald-*` Tailwind classes still hard-coded; brand color CSS variable only affects components that read it explicitly.
- Split `server.py` into routers (`orders/`, `settings/`, `admin/`, `auth/`) for maintainability.
- Validate Bangladeshi phone format on guest checkout (`^01[3-9]\d{8}$`).
- Rate-limit `/api/orders/track` to prevent enumeration.
- Email/SMS notification on order confirmation.
- Optional: provide a fallback "Continue as guest" button below the Login page.

## Files of Reference
- Backend: `/app/backend/server.py`
- Frontend pages: `/app/frontend/src/pages/{Checkout,Track,Receipt,Profile,Cart}.jsx`
- Admin: `/app/frontend/src/pages/admin/Settings.jsx`
- Cart: `/app/frontend/src/contexts/CartContext.jsx`
- Routes: `/app/frontend/src/App.js`
- Tests: `/app/backend/tests/test_guest_checkout.py`
