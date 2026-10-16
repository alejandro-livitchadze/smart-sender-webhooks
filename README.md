# Smart Sender: Webhooks

A React + TypeScript (strict) app: sign in with a device token, keep a 30-second session alive through rotation, list and edit webhooks. The API is mocked with MSW, implemented against the contract in the task.

Everything in the spec is implemented, including the 419 bonus. Known limits are listed at the end.

## Quick start

Requirements: Node >= 22.22 and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in with `demo@example.com` / `secret123`.

The mock runs in the browser through a service worker, so there is no backend to start. All data lives in memory: a page reload loses the session and you log in again (the spec allows this). You come back to the same URL, with page and search intact.

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Vite dev server, mock API on                   |
| `npm test`          | Vitest, single run                             |
| `npm run typecheck` | `tsc -b`                                       |
| `npm run lint`      | oxlint                                         |
| `npm run build`     | typecheck, then production build into `dist/`  |
| `npm run preview`   | serve the production build (mock API included) |
| `npm run format`    | Prettier, write                                |

## Try the interesting parts

- **Rotation:** log in, wait a little over 30 seconds, click Next. In the Network tab the list request returns 401, one `POST /auth/token/rotate` follows, then the list request is retried and succeeds.
- **Server validation:** edit a webhook, type `ftp://x` as the URL, Save. The server's 422 appears under the field. The client only checks that the fields are not empty.
- **URL state:** reload on `/webhooks?page=2&search=ed`. You land on the login screen and, after signing in, on the same page of the same search. `?page=2&search=pay` shows the out-of-range state instead. Back and forward step through pages and searches, and the search box follows.

## Stack

| Area         | Choice                                             | Why                                                                                                           |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build        | Vite 8, React 19                                   | Plain SPA, no SSR needed.                                                                                     |
| Language     | TypeScript 6, `strict`, `noUncheckedIndexedAccess` | Indexed access returns `T \| undefined`, so missing items are handled.                                        |
| Routing      | React Router 8 (data router)                       | The URL holds list state; `location.state` carries the return path.                                           |
| Server state | TanStack Query 5                                   | Cache, cancellation, `keepPreviousData`. No global store.                                                     |
| HTTP         | Native `fetch`, one wrapper                        | The session logic needs full control of every request. Axios adds nothing.                                    |
| Forms        | react-hook-form + zod 4                            | Uncontrolled inputs, schema-typed values, light client checks.                                                |
| UI           | shadcn/ui on Tailwind 4                            | Components live in the repo (`src/components/ui`), Radix underneath for a11y.                                 |
| API mock     | MSW 3                                              | Intercepts the real `fetch`, so the client runs its production code path. The same handlers run in the tests. |
| Tests        | Vitest 5 + jsdom                                   | Shares the Vite config and the `@/` alias.                                                                    |
| Lint, format | oxlint + Prettier                                  | Fast; hook rules are errors.                                                                                  |

## Project structure

```
src/
  main.tsx            start the mock worker, wire session expiry to router and cache, render
  app/                router.tsx (route table), query-client.ts (no retry on HTTP errors)
  api/                http.ts (transport, CSRF, session), types.ts (contract types), http.test.ts
  features/
    auth/             auth-api.ts, queries.ts, login-page, require-auth, app-layout
    webhooks/         webhooks-api.ts, queries.ts, list params hook, list page + table + search,
                      edit page + form
  lib/                fingerprint.ts, form-errors.ts, location-state.ts, utils.ts
  components/         text-field.tsx, query-error.tsx, ui/ (shadcn, untouched)
  mocks/              db.ts (in-memory state), handlers.ts (the contract), browser.ts
```

Layering: UI, then feature `queries.ts` (TanStack Query), then typed endpoint functions in `*-api.ts`, then `src/api/http.ts`. UI never calls `fetch`. `http.ts` has no React in it; the router and query-client glue lives in `main.tsx`.

## Key decisions

**Session and retries** (`src/api/http.ts`). One `request()` for every call.

- A 401 triggers one `/auth/token/rotate` and a single retry. Parallel 401s await the same `rotation` promise.
- A `generation` counter is bumped after every rotation attempt and read right before each `fetch`. A 401 that lands after a rotation already finished reuses its result instead of rotating again.
- Rotate goes through the CSRF path but never the 401 path, and it ignores the caller's `AbortSignal`, so one cancelled request cannot fail the others.
- A failed rotate, or a retry that is still 401, ends the session. The handler set in `main.tsx` is idempotent: it goes to `/login` once and keeps the original URL (`from`).

**CSRF** (`src/api/http.ts`). The token is fetched lazily, once, before the first request, and shared by all callers. It is sent on POST and PUT only. On 419 there is one shared refresh and a single retry. `X-Requested-With` is set in `send()`, so every request carries it.

**Tokens** (`src/features/auth/queries.ts`, `src/lib/fingerprint.ts`).

- `device_session_token` lives only in a local variable inside the login mutation.
- The fingerprint (32 hex) is created once and kept in `localStorage`.
- The session is the HttpOnly-cookie analogue and is held by the mock; the client never sees it.
- Login variables are not cached (`gcTime: 0`), so the password does not stay in the mutation cache.

**Ending a session** (`src/features/auth/queries.ts`, `src/main.tsx`).

- Logout clears local state only after revoke succeeds. The client cannot delete an HttpOnly cookie, so after a failed revoke the user is still logged in on the server and sees an error instead.
- Expiry and logout navigate with `flushSync` before `queryClient.clear()`. Otherwise the page's mounted queries are still observing, re-create `['me']` after the clear and refetch it, which sends a stray request (and a rotate) after logout.

**URL as the single source of list state** (`src/features/webhooks/use-webhook-list-params.ts`, `webhook-search.tsx`).

- Search params are parsed with zod and fall back to safe defaults (`?page=abc` is page 1). Defaults are omitted from the URL, and a search change resets the page.
- The search input is debounced (300 ms). It ignores the URL echo of its own push but follows back and forward.
- `keepPreviousData` keeps old rows on screen, dimmed, while the next page loads. Loading, empty and error states are all handled.

**Forms and errors** (`src/lib/form-errors.ts`).

- Client checks are light: required fields, email format. The server owns URL validation.
- `setServerErrors` maps the 422 payload onto the fields. One helper serves both forms. Unknown keys and non-validation errors go to a form-level alert.

**Edit on its own page** (`/webhooks/:id`), not a modal. It is deep-linkable, survives reload, and a missing webhook is a real 404 screen. Save, Cancel and Back return to the list page you came from.

**Mock** (`src/mocks/handlers.ts`, `db.ts`).

- Typed against the same contract types as the client.
- Request bodies are validated as untrusted input.
- CSRF is checked before anything else on POST and PUT.
- An expired session stays rotatable. Only revoke ends it.

## Tests

`npm test` runs `src/api/http.test.ts` against the real client and the same MSW handlers, in Node.

- **Required case:** two parallel requests get 401, one rotate goes out, both are retried and succeed. It also asserts that each endpoint is hit twice, the expiry handler is not called, and every request, rotate and CSRF fetch included, carries `X-Requested-With`.
- **Late 401:** a 401 that arrives after the rotation finished reuses it. Still one rotate.
- **Failed rotate:** the session ends once and both requests fail with 401.
- **Still-401 retry:** the session ends once.
- **419:** one CSRF refetch, one retry.

To prove the promise is shared, and not just the late-401 path, the rotate handler is held until the server has answered both requests with 401. The second 401 can only join a rotation already in flight. Only `Date` is faked, to expire the session without waiting 30 seconds.

## Cross-origin note

This runs same-origin. Against a real API on another origin you would add `credentials: 'include'` to `fetch`. The server would need `Access-Control-Allow-Credentials: true`, an explicit allowed origin (no wildcard), and `Access-Control-Expose-Headers: X-CSRF-TOKEN` so the client can read the token. The session cookie would need `SameSite=None; Secure`, or the API stays same-site behind a proxy. `X-Requested-With` is not a CORS-safelisted header, so it also forces a preflight on every request.

## Known limitations and next steps

- The captcha token is a fixed stub (the `shortcut:` comment in `src/features/auth/auth-api.ts`). A real widget goes there.
- After a reload or a session expiry on the edit page, Save and Back return to `/webhooks` instead of the previous list page. The list params survive everywhere else.
- MSW is bundled in production builds, hence Vite's chunk-size warning, because there is no backend. Against a real API the mock is dropped.
- No UI or end-to-end tests. Next would be Playwright for login, list, edit.
- API types in `src/api/types.ts` are hand-written. Derive them from the OpenAPI spec (openapi-typescript).
- No i18n: UI strings are inline.
