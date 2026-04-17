---
name: react-router-7
description: >
  Compact operating rules for React Router 7 SSR with React 19, TypeScript 5, Tailwind CSS 4, Biome, and Bun.
  Trigger: When creating, modifying, reviewing, or investigating routes, loaders, actions, layouts, route config, resource routes, or API layer code in a React Router 7 frontend.
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
- Global stylesheet loaded from `app/app.css`

Preferred structure:

```text
app/
├── app.css
├── root.tsx
├── routes.ts
├── api/
│   ├── auth.server.ts
│   ├── graphql.server.ts
│   ├── links.server.ts
│   ├── [feature]/*.query.server.ts
│   ├── [feature]/*.command.server.ts
│   └── shared/*.server.ts
└── routes/
    ├── [feature]/routes.ts
    ├── [feature]/layout.tsx
    ├── [feature]/[page].tsx
    └── api/*.tsx
```

Project routing convention:

- `app/routes.ts` is the root route registry
- Each feature exposes its own `routes.ts`
- Compose route trees with `route(...)`, `layout(...)`, `index(...)`, and `prefix(...)` from `@react-router/dev/routes`
- Prefer extending the existing feature route tree before inventing a new routing shape

## Non-Negotiable Rules

1. `loader` and `action` are SERVER-SIDE execution points in this project. Any read or mutation that depends on session, cookies, encrypted auth state, `process.env`, backend tokens, or `*.server.ts` helpers MUST run through a `loader`, an `action`, or a resource route.
2. `requireUserToken(request)` is the FIRST protected line in every protected `loader` or `action`.
3. Session cookies are encrypted and only decrypted on the server. Never move session/cookie parsing into client components or browser hooks.
4. `*.server.ts` files stay server-only. Never import them into client-rendered components.
5. `useFetcher` is allowed in client components precisely because it calls a route `loader` or `action` on the server. The component triggers the request; the secure work still happens server-side.
6. Reading goes in `*.query.server.ts`. Writing goes in `*.command.server.ts` or the module service expected by the codebase.
7. `app/app.css` is the global styling source of truth. Keep it imported from `app/root.tsx`, put shared/global classes there, and reuse those classes before adding duplicate inline utility bundles.
8. Async route data used for UI rendering SHOULD follow the existing deferred pattern when the screen already works with promises: return promises from `loader`, then resolve with `Suspense` + `Await` and a fitting skeleton/fallback.
9. Keep skeletons or loading placeholders aligned with the current screen pattern. Reuse existing skeleton components or lightweight inline fallbacks already used by the feature.
10. Route metadata should follow the existing convention: if the section uses `handle.title`, preserve or extend it instead of inventing a different page-title mechanism.
11. No `any`. Use explicit `type` or `interface`.
12. Use `satisfies` for route config and structurally checked objects when useful.
13. Business logic does not belong in components. Keep it in loaders/actions or the API layer.

## Preferred Tools

- Start with `navigation-agent_code_*` tools for route discovery, symbol lookup, flow tracing, endpoint listing, and scoped text search.
- Use `read` only after navigation narrowed the scope to the exact route or API files that matter.
- Use `glob` / `grep` only as fallback when navigation cannot answer directly.
- `navigation-agent_code_list_endpoints` → inspect existing routes/loaders/actions before opening files
- `navigation-agent_code_find_symbol` → locate route helpers, loaders, actions, hooks, or shared utilities
- `navigation-agent_code_trace_flow` → follow route → loader/action → API layer flow
- `navigation-agent_code_trace_callers` → impact analysis when changing helpers or hooks
- `navigation-agent_code_search_text` → detect server/client boundary violations or route patterns
- `navigation-agent_code_inspect_tree` → inspect a focused route or feature module

## Workflow

### 1. Investigate narrowly

- Use navigation tools first; do not open route or API files cold when route listing, symbol lookup, flow tracing, or text search can narrow the scope.
- Inspect route surface first
- Read only the route module and the API layer files actually involved
- Reuse existing route and layout patterns before inventing new ones
- Stay inside the task/spec/design boundaries defined by `sdd-apply`

### 2. Decide the route shape

- Page route → `loader` + component
- Mutating route → `action`
- Shared section → `layout.tsx` + `<Outlet />`
- Server endpoint → resource route under `routes/api/`
- New route branch → register it in the feature `routes.ts` and compose it from `app/routes.ts`

Server-boundary rule:

- If the feature needs session data, auth validation, encrypted cookies, backend tokens, redirects, `process.env`, or `*.server.ts` imports, solve it in `loader`, `action`, or `routes/api/*.tsx`.
- Do NOT fetch sensitive data directly from client components when the same operation can be resolved server-side through the route module.
- Components render UI. Route modules execute secure server work.

`useFetcher` rule:

- Use `useFetcher().load(...)` when a client component needs to invoke a route `loader` without navigation.
- Use `useFetcher().submit(...)` or `<fetcher.Form>` when a client component needs to invoke a route `action` without navigation.
- When the operation is reusable across multiple screens/components, prefer a dedicated resource route under `routes/api/*.tsx`.
- When the operation belongs only to the current page/module, it is fine to target the current route's own `loader` or `action`.
- When a route or resource endpoint supports multiple server operations, distinguish them with query param `?s=` and dispatch inside the `loader` or `action`.
- For reusable component-driven operations, prefer `action: "/api/<resource>?s=<service>"`.
- For page-local operations handled by the current route, it is valid to submit to `"?s=<service>"` so the page's own `action` can branch by service.
- `useFetcher` does NOT move logic to the client; it is the bridge from client UI to server route handlers.

### 3. Implement with the house pattern

#### Protected loader

```tsx
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireUserToken(request);
  const resourcePromise = getResourceById(token, params.id as string);
  return { resourcePromise };
}
```

#### Server-only session access

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await getUserIdAndTokenFromSession(request);
  if (!token) throw redirect("/");
  return { token: "" };
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

#### Client component using `useFetcher` to call a server route

```tsx
function ChangeRoleButton() {
  const rolesFetcher = useFetcher();
  const changeRoleFetcher = useFetcher();

  useEffect(() => {
    rolesFetcher.load("/api/role?s=get_all_roles");
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeRoleFetcher.submit(event.currentTarget, {
      method: "post",
      action: "/api/user?s=change_role_user",
    });
  }

  return <form onSubmit={handleSubmit}>{/* UI only */}</form>;
}
```

#### Current page `action` multiplexed by `?s=`

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireUserToken(request);
  const url = new URL(request.url);
  const service = url.searchParams.get("s");

  switch (service) {
    case "edit_password":
      return await editPassword(token, request);
    case "delete_item": {
      const formData = await request.formData();
      return await deleteItem(token, formData);
    }
    default:
      return { success: false, message: "Service not found" };
  }
}

function PageComponent() {
  const fetcher = useFetcher();

  function handleDelete(formData: FormData) {
    fetcher.submit(formData, { method: "post", action: "?s=delete_item" });
  }

  return null;
}
```

#### Feature route config

```ts
import { layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  layout("routes/promotor/layout.tsx", [
    route("inicio", "routes/promotor/inicio.tsx"),
  ]),
] satisfies RouteConfig;
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
- Reuse session helpers from `~/api/auth.server` instead of duplicating auth/session parsing

### Command files — `*.command.server.ts`

- Use `fetch` against `BACKEND_URL` or the existing backend client
- Normalize error handling
- Accept structured inputs (`FormData`, DTO-like object, or explicit params) based on existing project pattern

### Resource routes — `routes/api/*.tsx`

- Keep them thin: parse `request`, resolve the service/action, delegate to `~/api/**`
- Follow the existing project pattern when one endpoint multiplexes operations with query param `?s=`
- Return simple JSON-like objects for frontend actions unless the route already uses a different response contract
- They are the preferred server entrypoint for reusable `useFetcher.load(...)` and `useFetcher.submit(...)` calls from client components

### Service dispatch pattern — `?s=`

- It is valid for one route `action` to handle multiple operations distinguished by `?s=`.
- It is valid for one resource route under `routes/api/*.tsx` to do the same.
- Choose the current page `action` when the operation is local to that page.
- Choose `/api/<resource>?s=<service>` when the operation should be reusable from multiple pages or components.
- Keep dispatch logic thin: read `const service = new URL(request.url).searchParams.get("s")`, branch, and delegate to `~/api/**/*.query.server.ts` or `~/api/**/*.command.server.ts`.

### Naming convention for `s`

- For NEW service names, prefer `snake_case`.
- Use explicit action-oriented names such as `create_user`, `edit_permission`, `get_all_roles`, `mark_all_as_read`, `change_dependency`.
- Avoid vague names like `run`, `handle`, `process`, `default_action`, or `doStuff`.
- If you are editing an EXISTING route that already uses a different naming style, preserve the current service names unless the task explicitly includes normalizing them.
- Keep the same naming style within the same route file; do not mix new `snake_case` names with ad hoc aliases in one dispatcher.
- Read operations should still be descriptive (`get_*`, `validate_*`, `search_*`) and write operations should use clear verbs (`create_*`, `edit_*`, `delete_*`, `assign_*`, `change_*`, `send_*`, `mark_*`).

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

- Reading or decrypting session cookies from the client side
- Calling `*.server.ts` helpers from client-rendered components
- Bypassing `loader`/`action` for protected reads or writes
- Using `useFetcher` to call backend URLs directly when a route `loader`/`action` should own the server work
- Creating separate route handlers for every tiny variant when an existing page/action or resource route already uses the project `?s=` dispatch pattern cleanly
- Importing `*.server.ts` into client components
- Creating route files without wiring them into the feature `routes.ts` / `app/routes.ts`
- Adding a second global stylesheet or moving shared globals out of `app/app.css`
- Rebuilding shared card/button/surface styling ad hoc instead of reusing classes from `app.css`
- Awaiting everything inside the `loader` when deferred data is already the established pattern for that screen
- Putting fetch/business logic directly inside route components
- Skipping skeletons for async UI
- Adding auth checks after other loader/action work
- Creating custom route structures when the existing feature layout already fits

## Review Checklist

- [ ] Auth check first where required
- [ ] Server-only session/cookie work stays in `loader`, `action`, or resource routes
- [ ] `useFetcher` targets a route handler, not raw server-only code from the component
- [ ] `?s=` dispatch is used consistently when one route/action handles multiple services
- [ ] Server/client boundary respected
- [ ] Query vs command separation respected
- [ ] `app/app.css` remains the global styling source of truth
- [ ] Shared visual primitives reuse existing global classes before adding new ad hoc styles
- [ ] Deferred pattern used when the route follows async UI flow
- [ ] Matching skeleton or loading fallback exists
- [ ] Route was wired through feature `routes.ts` / `app/routes.ts`
- [ ] `handle.title` convention preserved where applicable
- [ ] Types are explicit
- [ ] Route follows existing module conventions
- [ ] Changes stay within assigned SDD tasks and design constraints
