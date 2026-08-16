# UI state checklist

Verified against the current route components after the cross-cutting polish pass.

## Web PWA

- [x] Landing/home: loading skeletons, empty pickup state, API error fallback
- [x] Pickups list/detail/new: loading, empty, error toast, inline validation
- [x] Wallet/withdraw: loading skeleton, empty transactions, error toast, validation and submit error
- [x] Driver dashboard/route: manifest loading, offline cache fallback, pending-sync state, action errors
- [x] Notifications: loading, empty, error, unread/read and push-permission fallback
- [x] Auth/onboarding/offline: validation, auth error, and offline guidance

## Admin dashboard

- [x] Dashboard metrics/charts: skeleton cards, query error state
- [x] Requests/map: table loading, empty results, error banner
- [x] Routes/build/detail: loading, empty manifest, error banner, confirm failures
- [x] Suppliers/drawer: table loading, empty results, drawer loading, error banner
- [x] Payouts: liability loading, grouped empty queues, action errors
- [x] Inventory: collection loading/empty, batch board empty columns, action errors
- [x] Sales/settings: form defaults loading, empty tables/audit trail, validation and error messages

## Accessibility and consistency

- [x] Shared currency/date formatting uses `en-NG` and `Africa/Lagos`
- [x] Form controls have visible labels or accessible names and shared focus rings
- [x] Admin navigation, table controls, dialogs, and row actions are keyboard reachable
- [x] Admin metadata is `noindex`; web landing metadata includes description and Open Graph fields
