---
name: react-router-7
description: Compact operating rules for React Router 7 SSR with React 19, TypeScript 5, Tailwind CSS 4, Biome, and Bun. Load for routes, loaders, actions, layouts, and API layer work.
license: MIT
compatibility: opencode
---

## When to Use

- Creating or modifying route modules under `app/routes/`
- Working on `loader`, `action`, route layouts, or resource routes
- Changing server-only API layer files under `app/api/`
- Reviewing React Router 7 SSR boundaries, deferred data, auth, or route structure

When this skill is loaded during `sdd-apply`, it COMPLEMENTS the apply-phase workflow. It does NOT replace the `sdd-apply` contract:
- read assigned tasks, specs, and design first
- implement only the assigned tasks
- update task completion state
- persist `apply-progress`

## Stack and Structure

- React 19 + React Router 7 SSR
- TypeScript 5 strict
- Tailwind CSS 4
- Biome
- Vite 7
- Bun

Preferred structure:

```text
app/
├── api/
│   ├── auth.server.ts
│   ├── graphql.server.ts
│   ├── [feature]/*.query.server.ts
│   ├── [feature]/*.command.server.ts
│   └── modulos/*.{query,command}.service.ts
├── components/
│   └── skeletons/
└── routes/
    ├── [feature]/layout.tsx
    ├── [feature]/[page].tsx
    └── api/
```

## Non-Negotiable Rules

1. `requireUserToken(request)` is the FIRST protected line in every `loader` or `action`.
2. `*.server.ts` files stay server-only. Never import them into client-rendered components.
3. Reading goes in `*.query.server.ts`. Writing goes in `*.command.server.ts` or the module service expected by the codebase.
4. Async route data SHOULD use deferred patterns: return the promise from `loader`, then resolve with `Suspense` + `Await`.
5. Every async visual state MUST have a matching skeleton in `components/skeletons/`.
6. No `any`. Use explicit `type` or `interface`.
7. Use `satisfies` for configs and structurally checked objects when useful.
8. Business logic does not belong in components. Keep it in loaders/actions or the API layer.

## Preferred Tools

- `navigation-agent_code_list_endpoints` → inspect existing routes/loaders/actions before opening files
- `navigation-agent_code_find_symbol` → locate route helpers, loaders, actions, hooks, or shared utilities
- `navigation-agent_code_trace_flow` → follow route → loader/action → API layer flow
- `navigation-agent_code_trace_callers` → impact analysis when changing helpers or hooks
- `navigation-agent_code_search_text` → detect server/client boundary violations or route patterns
- `navigation-agent_code_inspect_tree` → inspect a focused route or feature module

## Workflow

### 1. Investigate narrowly

- Inspect route surface first
- Read only the route module and the API layer files actually involved
- Reuse existing route and layout patterns before inventing new ones
- Stay inside the task/spec/design boundaries defined by `sdd-apply`

### 2. Decide the route shape

- Page route → `loader` + component
- Mutating route → `action`
- Shared section → `layout.tsx` + `<Outlet />`
- Server endpoint → resource route under `routes/api/`

### 3. Implement with the house pattern

#### Protected loader

```tsx
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireUserToken(request);
  const resourcePromise = getResourceById(token, params.id as string);
  return { resourcePromise };
}
```

#### Deferred UI

```tsx
export default function ResourcePage() {
  const { resourcePromise } = useLoaderData<typeof loader>();
  return (
    <Suspense fallback={<ResourceSkeleton />}>
      <Await resolve={resourcePromise}>
        {({ data }) => <ResourceComponent data={data} />}
      </Await>
    </Suspense>
  );
}
```

#### Action

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireUserToken(request);
  const formData = await request.formData();
  const result = await createResource(token, formData);
  if (result.code !== 200) return { error: result.message };
  return redirect("/destino");
}
```

#### Layout

```tsx
export default function FeatureLayout() {
  return (
    <>
      <Header links={[]} title={"Feature"} />
      <Outlet />
    </>
  );
}
```

## API Layer Rules

### Query files — `*.query.server.ts`

- Use `fetchToGraphql<T>` through `~/api/graphql.server`
- Keep query strings near the server call
- Return typed responses, not raw `unknown`

### Command files — `*.command.server.ts`

- Use `fetch` against `BACKEND_URL` or the existing backend client
- Normalize error handling
- Accept structured inputs (`FormData`, DTO-like object, or explicit params) based on existing project pattern

Example:

```ts
export async function getResourceById(token: string, id: string) {
  const query = `
    query {
      getResourceById(id: "${id}") {
        data { id name }
        responseStatus { code message }
      }
    }
  `;
  return fetchToGraphql<Resource>(token, query, "getResourceById");
}
```

## Anti-Patterns

- Importing `*.server.ts` into client components
- Awaiting everything inside the `loader` when deferred data is expected
- Putting fetch/business logic directly inside route components
- Skipping skeletons for async UI
- Adding auth checks after other loader/action work
- Creating custom route structures when the existing feature layout already fits

## Review Checklist

- [ ] Auth check first where required
- [ ] Server/client boundary respected
- [ ] Query vs command separation respected
- [ ] Deferred pattern used when data is async
- [ ] Matching skeleton exists
- [ ] Types are explicit
- [ ] Route follows existing module conventions
- [ ] Changes stay within assigned SDD tasks and design constraints
