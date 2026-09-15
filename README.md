# Bazaro — Firebase E-commerce Starter

A production-shaped, vanilla HTML/CSS/JS storefront + admin panel backed by Firebase
(Auth, Firestore, Storage). No build step — open the files in a browser or deploy as-is
to Firebase Hosting or any static host.

## 1. Firebase project setup

1. In the [Firebase console](https://console.firebase.google.com), open your project
   (this build already points at the `web-app-59b9b` project config in `js/firebase.js` —
   replace it with your own project's config if this isn't your project).
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Enable **Firestore Database** (production mode).
4. Enable **Storage**.
5. Deploy the security rules in this folder:
   - `firestore.rules` → Firestore → Rules tab → paste and publish (or `firebase deploy --only firestore:rules` with the Firebase CLI).
   - `storage.rules` → Storage → Rules tab → paste and publish (or `firebase deploy --only storage`).

## 2. Create your first admin user

The admin panel checks `users/{uid}.role == "admin"` in Firestore — there's no separate
admin password system, it reuses Firebase Auth.

1. Open `register.html` in the browser (or Firebase console → Authentication → Add user)
   and create an account with your own email/password.
2. In Firestore, open the `users` collection, find the document with that user's UID,
   and change its `role` field from `customer` to `admin`.
3. Go to `admin/index.html` and log in with that same email/password.

You can repeat step 2 for any other staff accounts you want to give admin access.

## 3. Seed starter data

The homepage falls back to 5 placeholder slides if `sliders` is empty, so the site works
immediately — but products/categories start empty. From the admin panel:

1. **Categories** → add a few (e.g. Electronics, Fashion, Home, Beauty, Others).
2. **Products** → add products, assign a category, set price/stock, upload or link an
   image, optionally add variants (e.g. Size: S, M, L), then set status to **Published**.
3. **Sliders** (optional) → add up to 5 homepage banners; the site uses these once at
   least one is marked Active.
4. **Payment Methods** → Cash on Delivery is used automatically until you add methods
   here; add bKash/Nagad/etc. once you're ready to accept them (this starter doesn't
   integrate their APIs — it just lists them at checkout as instructions-based options).
5. **Settings** → set your real delivery charges, store name/contact info, and social links.

## 4. Deploying

Any static host works (Firebase Hosting, Netlify, GitHub Pages, etc.) since there's no
build step. For Firebase Hosting:

```
npm install -g firebase-tools
firebase login
firebase init hosting   # point the public directory at this folder
firebase deploy
```

## 5. Known limitations to address before high-volume launch

This is a real, Firebase-connected app (every admin action writes to Firestore, every
customer flow reads/writes real data) — but a few things are simplified because there's
no server/Cloud Functions layer yet:

- **Stock decrement and coupon usage counting happen from the browser** right after an
  order is created. Two customers checking out the same last unit at the same instant
  could both succeed. For guaranteed correctness, move this into a Firestore transaction
  inside a Cloud Function triggered on order creation.
- **Order pricing is re-verified against live Firestore data at checkout** (never trusts
  the cart's cached price/stock), which stops the common "edit price in devtools" attack —
  but a fully hardened setup would also validate the *coupon discount* and *delivery
  charge* server-side in that same Cloud Function before marking the order confirmed.
- **Deleting a customer** removes their Firestore profile but not their Firebase Auth
  account — remove that separately from the Authentication tab (or via the Admin SDK)
  if you need a full erasure.
- Payment methods beyond Cash on Delivery are listed as selectable options with an
  optional instructions field — actually integrating bKash/Nagad/card gateways requires
  their SDKs and a server-side callback, which is out of scope for this starter.

## 6. File map

```
index.html            Homepage
products.html          Product listing + filters/search/sort
product.html            Product detail
cart.html               Cart + wishlist
checkout.html            Checkout
order-success.html        Order confirmation
login.html / register.html  Customer auth
account.html               Profile / order history / wishlist
about.html / contact.html    Static info pages
css/style.css               Design system (light + dark themes)
js/                         Shared logic (firebase, cart, wishlist, products, auth, layout…)
admin/index.html              Admin login (never linked from the customer site)
admin/dashboard.html            Stats
admin/products.html + product-form.html   Product CRUD (variants, images)
admin/categories.html, coupons.html,
  payment-methods.html, sliders.html      Generic CRUD screens
admin/orders.html                 Order management
admin/customers.html                Customer management
admin/settings.html                  Delivery/store/social settings
admin/change-password.html             Admin password change
firestore.rules / storage.rules          Security rules
```

## 7. Manual test checklist

Customer: register → login → browse → search → filter → view product → select variant →
wishlist → add to cart → change quantity → apply coupon → checkout → place COD order →
view order → logout/login → verify order persists → toggle dark/light mode.

Admin: login → dashboard → add/edit/draft/publish/delete product → manage categories →
view/confirm/deliver/delete orders → manage customers → create/edit coupon → manage
payment methods → change delivery charge → manage sliders → change password → logout.

Also check on a real phone: mobile drawer opens/closes correctly (backdrop click, nav
click, Escape key), horizontal product rail swipes, admin sidebar becomes a drawer,
tables become scrollable/stacked, and dark mode has no contrast issues.
