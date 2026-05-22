# YTŠkola Zitadel Login Customization — Discovery Report

Generated at the start of the customization branch. Pinpoints every file the later tasks touch.

## Tooling
- Package manager: **pnpm 10.28.2** (pinned via root `package.json` → `packageManager`)
- Monorepo: pnpm workspace + Nx (`pnpm-workspace.yaml`, `nx.json`)
- Framework: Next.js 16.1.6 + React 19
- i18n library: **next-intl 4.8.3**
- Login app workspace name: `@zitadel/login`
- Workspace deps used by login: `@zitadel/client`, `@zitadel/proto` (both at `packages/`)

## i18n setup
- **EN_LOCALE_PATH**: `apps/login/locales/en.json`
- **LOCALES_DIR**: `apps/login/locales/` (flat: `ar.json`, `de.json`, `en.json`, `es.json`, `fr.json`, `it.json`, `ja.json`, `nl.json`, `pl.json`, `ru.json`, `tr.json`, `uk.json`, `zh.json`)
- **I18N_CONFIG_PATH (request config)**: `apps/login/src/i18n/request.ts`
- **I18N_LANGS_LIST**: `apps/login/src/lib/i18n.ts` (`LANGS` array — must add `hr` so the loader recognizes it)
- **MIDDLEWARE_PATH**: none — there is no `middleware.ts`. Locale routing is NOT path-prefixed; it's resolved at request time via cookie + Accept-Language + Zitadel admin settings.
- Locale resolution order (in `request.ts`):
  1. `defaultLanguage` from Zitadel admin (`getAllowedLanguages` API call)
  2. Overridden by `Accept-Language` header if its language is in `allowedLanguages`
  3. Overridden by `NEXT_LOCALE` cookie if its value is in `allowedLanguages`
- To force Croatian regardless of all of the above, the surgical change is at the top of `getRequestConfig`: hardcode `allowedLanguages = ['hr']` and `defaultLanguage = 'hr'` before the resolution chain.

## Language switcher
- **LANG_SWITCH_FILE**: `apps/login/src/components/language-switcher.tsx`
- **LANG_SWITCH_USAGES** (rendered): only `apps/login/src/app/(login)/layout.tsx` (lines: imports at L5, render at L74)
- `LanguageProvider` (`apps/login/src/components/language-provider.tsx`) must stay — it wraps `NextIntlClientProvider` which the whole app relies on.

## Login app layout & flow screens
- **LOGIN_LAYOUT_PATH**: `apps/login/src/app/(login)/layout.tsx` (root login layout — wraps every flow screen inside the `(login)` route group). This is where the LanguageSwitcher is rendered.
- **Layout chrome component**: `apps/login/src/components/dynamic-theme.tsx` — the per-page layout each screen renders. Already supports `side-by-side` (left = title block, right = form) via `NEXT_PUBLIC_THEME_LAYOUT=side-by-side`. This is the primary file to modify to apply the ytskola two-column design.
- **Background wrapper**: `apps/login/src/components/background-wrapper.tsx` — used by `(login)/layout.tsx`. Optional themed bg image; left alone here.
- **Theme wrapper (instance branding)**: `apps/login/src/components/theme-wrapper.tsx` — applies Zitadel-admin-driven branding via CSS vars. Left intact; ytskola brand colors override happens in CSS.
- **Logo component**: `apps/login/src/components/logo.tsx` (referenced by dynamic-theme — uses `branding.lightTheme?.logoUrl`). We'll swap to a hardcoded `/ytskola-logo-white.png` in the modified dynamic-theme.

### Flow pages under `src/app/(login)/`
`idp/`, `password/` (+ `change`, `set`), `passkey/` (+ `set`), `verify/` (+ `success`), `otp/[method]` (+ `set`), `logout/` (+ `done`), `mfa/` (+ `set`), `register/` (+ `password`), `loginname/`, `accounts/`, `signedin/`, `device/` (+ `consent`), `authenticator/` (+ `set`), `u2f/` (+ `set`), `idp/[provider]/` (+ `complete-registration`, `account-not-found`, `registration-failed`, `failure`, `linking-failed`, `process`)

Every flow page invokes `<DynamicTheme>` internally (per Zitadel's documented pattern), so modifying `dynamic-theme.tsx` cascades into all of them.

## Theming system already shipped by Zitadel
- Config via env vars: `NEXT_PUBLIC_THEME_ROUNDNESS`, `NEXT_PUBLIC_THEME_LAYOUT` (`side-by-side` | `top-to-bottom`), `NEXT_PUBLIC_THEME_APPEARANCE`, `NEXT_PUBLIC_THEME_SPACING`, `NEXT_PUBLIC_THEME_BACKGROUND_IMAGE`
- See `apps/login/THEME_ARCHITECTURE.md` and `THEME_CUSTOMIZATION.md`
- Set `NEXT_PUBLIC_THEME_LAYOUT=side-by-side` in `apps/login/.env` (or env.local) to activate the two-column layout that we'll restyle.

## Component library (for Task 8 restyling)
- **Button**: `apps/login/src/components/button.tsx` — primary class uses `bg-primary-light-500` (CSS var driven by branding via `helpers/colors.ts`)
- **Input**: `apps/login/src/components/input.tsx`
- **Card**: `apps/login/src/components/card.tsx`
- Brand color override strategy: override CSS variables in `src/styles/globals.scss` so `bg-primary-light-500` etc. resolve to ytskola purple regardless of Zitadel admin branding. Tighter than editing each component class.

## Dockerfile + build
- **DOCKERFILE_PATH**: `apps/login/Dockerfile` — runtime-only. It expects `apps/login/.next/standalone/` to already exist on the build context (it just `COPY .next/standalone ./` into an `alpine` image and runs `node apps/login/server.js`).
- Implication: the official upstream Dockerfile alone CANNOT be used on the server without first running `pnpm install && pnpm --filter @zitadel/login build` in the build context.
- **Plan**: write a new multi-stage Dockerfile at `apps/login/Dockerfile.build` that does install + build inside Docker (no host tools needed on the server), then `COPY` the standalone artifacts to the runtime stage. Build context = the full repo root.

## Env vars (from `.env.theme.example` + `.env`)
- `ZITADEL_API_URL` — points at the Zitadel core. In prod: `https://auth.ytskola.com`. The service-user PAT is provided via a file mount (`/.env-file/.env`) read by `entrypoint.sh`.
- `NEXT_PUBLIC_BASE_PATH` — login is served under `/ui/v2/login` in prod.
- Other env vars stay at upstream defaults; we do NOT alter the env contract the compose service depends on.

## Build entrypoint
- Build script: `pnpm --filter @zitadel/login build` — runs `next build` with `NEXT_OUTPUT_MODE=standalone` and assembles `.next/standalone/` (see `apps/login/package.json` line 7).
- Production entrypoint: `apps/login/scripts/entrypoint.sh` (already copied into the image by the existing pipeline).

## Summary of files to touch in later tasks

| Task | File | Change |
|------|------|--------|
| 3 | `apps/login/locales/hr.json` | NEW — full Croatian translation |
| 4 | `apps/login/src/lib/i18n.ts` | Add `{ name: "Hrvatski", code: "hr" }` to `LANGS` |
| 4 | `apps/login/src/i18n/request.ts` | Force `locale = 'hr'`, `allowedLanguages = ['hr']` |
| 5 | `apps/login/src/app/(login)/layout.tsx` | Remove `LanguageSwitcher` import + render |
| 6 | `apps/login/public/ytskola-logo.png` + `ytskola-logo-white.png` | NEW assets |
| 7 | `apps/login/src/components/dynamic-theme.tsx` | Skin `isSideBySide` branch with ytskola design |
| 7 | `apps/login/src/styles/globals.scss` | Override brand color CSS vars to ytskola purple/yellow |
| 7 | `apps/login/.env` | Set `NEXT_PUBLIC_THEME_LAYOUT=side-by-side` |
| Deploy | `apps/login/Dockerfile.build` | NEW — multi-stage build Dockerfile for server-side `docker build` |
