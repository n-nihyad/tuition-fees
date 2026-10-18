# Shared code boundaries

This directory holds code used across features. It must not import `app/` or
`features/`, Redux feature slices, or page components. Features may import shared
code directly. Keep dependency direction from features toward shared.

- `api/`: HTTP transport, API errors and their display translations. Request
  endpoints belong in each feature's `api/` directory.
- `auth/`: session token storage and the shared expiry mechanism. Login requests
  and login form state belong to `features/auth/`.
- `providers/`: locale context and the application-wide Ant Design theme.
- `types/models.ts`: existing API contracts consumed by multiple features. Profile
  and wallet are used by payment and dashboard; payment/history contracts are
  shared by dashboard, payment and history. Feature-local types should stay local.
- `utils/formatters.ts`: shared money, date and transaction-status presentation.
- `components/brand/`: shared icons and tuition illustrations.
- `components/feedback/`: loading/error views and transaction status tags.
  `PaymentStatusTag` intentionally stays here because dashboard and history both
  use it; it only renders a status and does not initiate payment operations.
- `components/layout/`: shared portal shell and navigation.

The maintenance review retains the current paths and exports. No UI, request,
state, timing, translation or formatting behavior is changed. Styles are organized
separately in [`../styles/`](../styles/README.md).
