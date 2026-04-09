---
alwaysApply: true
---

## Stack Frontend

- **React 19** + **React Router 7** (SSR habilitado — `ssr: true`)
- **TypeScript 5** en modo estricto
- **Tailwind CSS 4**
- **Biome** — linter y formatter (NO ESLint, NO Prettier)
- **Vite 7** con `vite-tsconfig-paths`
- **Bun** como package manager

---

## Estructura del Proyecto

```
app/
├── api/                        # Capa de acceso a datos (server-only)
│   ├── auth.server.ts          # Token y autenticación
│   ├── graphql.server.ts       # Cliente GraphQL + tipos base
│   ├── [recurso]/
│   │   ├── *.query.server.ts   # Queries GraphQL (lectura)
│   │   └── *.command.server.ts # Mutaciones REST/GraphQL (escritura)
│   └── modulos/
│       ├── *.query.service.ts  # Queries de módulos
│       └── *.command.service.ts
├── components/                 # Componentes reutilizables
│   ├── skeletons/              # Loading skeletons por componente
│   └── [feature]/              # Componentes agrupados por feature
├── hooks/                      # Custom hooks de React
├── providers/                  # Context providers
├── routes/                     # File-based routing de RR7
│   ├── [feature]/
│   │   ├── layout.tsx          # Layout con <Outlet />
│   │   └── [page].tsx          # Página con loader/action
│   └── api/                    # Resource routes (API endpoints SSR)
├── services/                   # Servicios auxiliares (cliente)
├── types/                      # Tipos TypeScript globales
└── utils/                      # Utilidades puras
```

---

## Convenciones de Nombres — API Layer

| Archivo | Propósito |
|---------|-----------|
| `*.query.server.ts` | Lectura de datos (GraphQL queries) |
| `*.command.server.ts` | Escritura de datos (GraphQL mutations / REST) |
| `*.server.ts` | Cualquier lógica server-only |
| `graphql.server.ts` | Cliente GraphQL centralizado |
| `auth.server.ts` | Token de sesión, `requireUserToken` |

---

## Patrones de Route

### Loader con datos diferidos (Suspense)

```tsx
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireUserToken(request);
  const dataPromise = getResource(token, params.id as string);
  return { dataPromise };
}

export default function Page() {
  const { dataPromise } = useLoaderData<typeof loader>();
  return (
    <Suspense fallback={<SkeletonComponent />}>
      <Await resolve={dataPromise}>
        {({ data }) => <MyComponent data={data} />}
      </Await>
    </Suspense>
  );
}
```

- **MUST** usar `Suspense` + `Await` cuando el loader devuelve datos async para render de UI; solo omitilo en loaders no visuales o respuestas simples donde no haya estado de carga visible
- **SIEMPRE** tener un skeleton correspondiente en `components/skeletons/`
- `requireUserToken` se llama primero en todo loader protegido

### Action (mutación)

```tsx
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireUserToken(request);
  const formData = await request.formData();
  const result = await createResource(token, formData);
  if (result.code !== 200) return { error: result.message };
  return redirect("/ruta-destino");
}
```

### Layout con Outlet

```tsx
export default function LayoutFeature() {
  return (
    <>
      <Header links={[]} title={"Nombre"} />
      <Outlet />
    </>
  );
}
```

---

## Cliente GraphQL

Todas las queries usan `fetchToGraphql<T>` de `~/api/graphql.server`:

```ts
export async function getResource(token: string, id: string) {
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

- `ResponseGraphql<T>` — tipo de respuesta: `data`, `responseStatus`, `pagination?`
- Las queries de lectura van en `*.query.server.ts`
- Las mutaciones REST van en `*.command.server.ts` con `fetch` directo a `BACKEND_URL`

---

## Reglas

1. **Archivos `*.server.ts`** — NUNCA importar en componentes cliente; solo en loaders/actions
2. **`requireUserToken`** — llamar siempre primero en loaders/actions que requieran auth
3. **Biome** — seguir las reglas configuradas en `biome.json`; no deshabilitar sin justificación
4. **Tipos explícitos** — siempre tipar con `type` o `interface`; nunca `any`
5. **`satisfies`** — usar para configs (ej. `export default { ssr: true } satisfies Config`)
6. **Skeletons** — cada componente con datos async tiene su skeleton en `components/skeletons/`
7. **No lógica en componentes** — la lógica de negocio va en loaders/actions o en el api layer
