# Apex — Fleet Management Dashboard

Modern refactor of the Apex Fleet dashboard, built with React 19, TypeScript, Vite, TanStack Query, Zustand, shadcn/ui, Tailwind and i18next.

## Architecture

Feature-Sliced Design:

```
src/
├── app/          Bootstrap — entry, providers, router, protected routes
├── entities/     Domain logic — api, queries, schemas (per entity)
│   ├── auth/
│   ├── car/
│   ├── driver/
│   └── fuel-event/
├── pages/        Route components (thin, compose widgets + entities)
├── widgets/      Composite UI blocks (sidebar, header, layout, palette)
└── shared/       The toolkit (api, auth, config, hooks, i18n, lib, types, ui)
```

## What changed from the legacy `falcon-react`

| Legacy | Apex |
|---|---|
| CRA + JS/JSX | Vite + TS |
| Flat `components/` dump | Feature-Sliced Design |
| Manual `useState` + `useEffect` + `fetch` | TanStack Query |
| `AuthContext` | Zustand store |
| Manual `validateForm` | Zod + React Hook Form |
| Custom success/error modal dialogs | Sonner toasts + Radix dialogs |
| Inline Tailwind soup | shadcn/ui primitives |
| No i18n | i18next with EN/AR + RTL |
| No dark mode | next-themes |
| No ⌘K | cmdk palette |
| Hardcoded permission checks | Central permission hooks |

## Scripts

```bash
npm install
npm run dev        # dev server on :5173
npm run build      # typecheck + production bundle
npm run preview    # preview build
npm run lint
npm run format
```

## Backend contract

All field names are preserved so the existing Go backend (`apextransport.ddns.net`) needs **zero changes**. See `src/entities/*/schemas.ts` for the exact shape.

Environment: copy `.env.example` → `.env` and point `VITE_API_BASE_URL` at your backend.

## Permission levels

```
1  Viewer
2  Editor
3  Manager
4  Admin
```

Use `<ProtectedRoute minPermissionLevel={3}>` or `usePermissions().canEdit` in components.

## Adding a new domain

1. Create `src/entities/<name>/{api,queries,schemas}.ts`
2. Create `src/pages/<name>/<name>.tsx`
3. Register in `src/app/router/index.tsx`
4. Add nav item in `src/widgets/sidebar/sidebar.tsx`
5. Add translations to `src/shared/i18n/locales/{en,ar}.json`
