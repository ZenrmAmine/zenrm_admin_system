# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Studio Admin ("ZenRm Admin") is a responsive admin dashboard built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

This repository uses the shadcn `radix-nova` style. The shadcn CLI reports `base: "radix"`, which refers to Radix UI. Always inspect the local components in `src/components/ui/` because individual wrappers may use different primitives.

### Next.js docs

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Training data is outdated — the docs are the source of truth.

### shadcn skill

Use the shadcn skill for all work involving shadcn/ui components, styling, composition, registries, presets, or `components.json`. If it's not available, install it with `npx skills add shadcn/ui`. The skill contains the component, styling, composition, accessibility, and CLI rules — do not duplicate those rules here.

**Never modify files inside `src/components/ui/` or `src/components/calendar/`.** Keep these components intact and apply styling or customization where they are used.

## Commands

This project uses npm.

```bash
npm install
npm run dev            # start dev server
npm run build
npm run lint            # biome lint
npm run format           # biome format --write
npm run check            # biome check
npm run check:fix         # biome check --write
npm run generate:presets      # regenerate src/lib/preferences/theme.ts from src/styles/presets/
```

There is no automated test suite. Run build, lint, check, or other validation commands only when the user explicitly requests that validation.

`npm run generate:presets` runs automatically as part of the pre-commit hook (`.husky/pre-commit`) along with `lint-staged` (biome check --write on staged JS/TS files).

## Architecture

### Auth flow: cookie session against an external ZenRM backend

There is no local user database. Auth is a thin proxy over `https://test.zenrm.co`:

- `POST /api/auth/login` ([src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)) posts credentials to the ZenRM backend, extracts a bearer token from the (loosely-shaped) response body, and sets it as the httpOnly `zenrm_session` cookie.
- `src/lib/auth/session.ts` defines `ZENRM_SESSION_COOKIE` and helpers to get/save/clear/require the session token. `requireZenrmSessionToken()` redirects to `/auth/v2/login` server-side if missing.
- `src/middleware.ts` gates `/dashboard/*` (redirects to `/auth/v2/login` without a cookie) and `/auth/*` (redirects to `/dashboard/events` with one).
- `src/proxy.disabled.ts` is a dormant Next.js Proxy — rename to `proxy.ts` to enable it.

### ZenRM API proxy

`src/app/api/zenrm/route.ts` is a single generic backend proxy: it accepts an `operation` name (query param on GET, body field on POST), maps it to a hardcoded backend URL in `BACKEND_URLS`, attaches the session bearer token, and forwards the request. GET is restricted to read-only operations (`READ_OPERATIONS`). Add new ZenRM backend endpoints here rather than calling `test.zenrm.co` directly from elsewhere.

### Preferences system (theme, layout, sidebar)

User-facing UI preferences (theme mode/preset, font, content layout, navbar style, sidebar variant/collapsible) are centrally declared in `src/lib/preferences/preferences-config.ts` via `PREFERENCE_REGISTRY`. Each entry declares its allowed values, default, persistence strategy, and the `data-*` attribute it maps to.

- Persistence is one of `client-cookie`, `server-cookie`, `localStorage`, or `none`.
- **Layout-critical prefs (`sidebar_variant`, `sidebar_collapsible`) must stay cookie-backed** (`defineSSRPreference`, which excludes `localStorage`) because they need to be consistent during SSR — flipping them to `localStorage` would cause a hydration mismatch.
- `src/server/server-actions.ts` provides the server-cookie read/write actions; `preference-runtime.ts` / `preferences-storage.ts` handle client-side application.
- Theme presets live in `src/styles/presets/`; `npm run generate:presets` regenerates `src/lib/preferences/theme.ts` from them — run it after adding/editing a preset.

### Co-location-based structure

Keep feature code close to the route that owns it:

- Dashboard routes: `src/app/(main)/dashboard/<screen>/page.tsx`
- Screen-specific components, data, and schemas: `src/app/(main)/dashboard/<screen>/_components/`
- Shared dashboard components: `src/app/(main)/dashboard/_components/`
- Shared application components: `src/components/`
- Local shadcn components: `src/components/ui/`
- Shared hooks and utilities: `src/hooks/` and `src/lib/`
- Theme presets: `src/styles/presets/`

Keep a component inside its route until it's reused by another feature. Do not move screen-specific code into a shared directory preemptively.

Routes under `src/app/(main)/dashboard/(legacy)/` are legacy — do not use them as a reference for new screens unless you're maintaining a legacy route.

## Creating or extending a screen

1. Inspect the closest current screen before writing code. Finance, Infrastructure, CRM, and Analytics are useful references.
2. When reproducing a UI from a screenshot or image, follow its visual direction closely (layout, hierarchy, spacing, component structure, details). Implement it with existing components and semantic theme tokens rather than raw color values. If a needed color isn't available through theme tokens, use a named color from Tailwind's default palette — never arbitrary hex/RGB/HSL/OKLCH values.
3. Reuse the existing dashboard shell, local components, layout controls, and theme tokens.
4. Break each new page into focused components inside the route's `_components/` directory. Keep `page.tsx` small and focused on composing those pieces.
5. Keep `page.tsx` as a Server Component by default. Move interactive or browser-dependent code into a dedicated Client Component.
6. Add the screen to `src/navigation/sidebar/sidebar-items.ts` when it should appear in the dashboard navigation.
7. Decide the information hierarchy before choosing widgets. Let the content determine the page structure.
8. Keep the established visual rhythm where it fits: compact spacing, clear typography hierarchy, responsive action rows, and grids that collapse cleanly on smaller screens.
9. Widget selection is not a fixed formula — try different arrangements (cards, resource rows, meters, charts, tabs, empty states, actions) and keep whichever communicates the content clearest and stays consistent with the project.
10. Match nearby screens in card density, borders, radius, spacing, content width, and responsive behavior.
11. Use semantic theme tokens so new screens work with light mode, dark mode, and existing theme presets.
12. Handle relevant loading, empty, error, disabled, and overflow states.
13. Keep screens accessible: semantic HTML, keyboard support, visible focus states, labels, appropriate ARIA attributes.

## Code conventions

- TypeScript strict mode is enabled. Use precise types and avoid `any`.
- Use the existing `@/` import aliases (see `aliases` in `components.json`).
- Follow the Biome configuration: double quotes, semicolons, two-space indentation, sorted imports, 120-character line width.
- Avoid unnecessary dependencies.
- Keep changes focused; do not refactor unrelated files.

## Contributions

- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Include screenshots for new screens and material visual changes (mobile and dark-theme states when relevant).
- Explain new reusable patterns or dependencies in the pull request.
