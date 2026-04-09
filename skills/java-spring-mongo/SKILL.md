---
name: java-spring-mongo
description: Compact operating rules for Java 25 + Spring Boot 4 + GraphQL/MVC + Spring Security JWT + MongoTemplate in hexagonal modules.
license: Apache-2.0
compatibility: opencode
metadata:
  author: J0k3r-dev-rgl
  version: "1.1.0"
---

## When to Use

- Creating or modifying backend modules in hexagonal architecture
- Writing query/command use cases
- Implementing Mongo adapters with `MongoTemplate`
- Adding GraphQL or REST controllers
- Reviewing ObjectId handling, lookups, batching, pagination, or projections

When this skill is loaded during `sdd-apply`, it COMPLEMENTS the apply-phase workflow. It does NOT replace the `sdd-apply` contract:
- read assigned tasks, specs, and design first
- implement only the assigned tasks
- update task completion state
- persist `apply-progress`

## Architecture Rules

- Organize by module, not by technical layer at the repository root
- `application` contains ports and use-case contracts only
- `infrastructure` contains Spring wiring, adapters, persistence, controllers, DTOs, mappers
- `infrastructure/use_cases` contains the Spring `@Component` use-case implementations
- Controllers stay thin: receive input, delegate, return response
- Prefer constructor injection with `@RequiredArgsConstructor`
- Use `@Component` for use cases and adapters; avoid vague service layers

## Mongo Rules That Are NOT Optional

1. Use `MongoTemplate` for complex reads, updates, projections, and aggregations.
2. Do NOT use `MongoRepository` for complex query flows.
3. Do NOT use `@DBRef`.
4. Use `@MongoId(FieldType.OBJECT_ID)` for document ids.
5. Use `@Field(targetType = FieldType.OBJECT_ID)` for stored foreign keys.
6. Convert ids in queries with `MongoIdUtils.toObjectIdOrString(...)` or `MongoIdUtils.toObjectIdsOrStrings(...)`.
7. Convert ObjectIds back to strings in aggregation projections.

## Naming Conventions

| Element | Pattern |
| --- | --- |
| Input port, query | `Get*` |
| Input port, command | `Create*`, `Edit*` |
| Input port, admin | `Root*` |
| Output port | `*Repository` |
| Use case | `*UseCase` |
| Mongo adapter | `*Adapter` |
| Persistence model | `*PersistenceModel` |
| Aggregation DTO | `*DTO` |
| API response | `*Response` |
| REST request | `*Request` |
| GraphQL filter | `*Filter` |
| Mapper | `*Mapper` |

## Preferred Tools

- `navigation-agent_code_list_endpoints` → inspect API surface before opening controllers
- `navigation-agent_code_find_symbol` → locate ports, use cases, controllers, adapters, or mappers
- `navigation-agent_code_trace_flow` → follow controller → port → use case → adapter
- `navigation-agent_code_trace_callers` → impact analysis for changing ports or helpers
- `navigation-agent_code_inspect_tree` → inspect module structure with low noise
- `navigation-agent_code_search_text` → detect ObjectId mistakes, annotation usage, or persistence patterns
- `api_test` → verify controller contract when runtime evidence matters

## Workflow

### 1. Investigate structurally first

- Start from the endpoint, use case, or repository port
- Trace the full flow before editing
- Reuse existing module patterns before creating new abstractions
- Stay inside the task/spec/design boundaries defined by `sdd-apply`

### 2. Place code in the correct layer

- Controller → transport only
- Input port → contract
- Use case → orchestration and business rules
- Output port → persistence contract
- Adapter → MongoTemplate / aggregation implementation

### 3. Handle Mongo with explicit control

#### Correct id conversion

```java
Object idValue = MongoIdUtils.toObjectIdOrString(id);
Criteria.where("_id").is(idValue);
```

#### Wrong

```java
Criteria.where("_id").is(id);
```

#### Correct relationship modeling

```java
@Field(targetType = FieldType.OBJECT_ID)
private String promoterId;
```

#### Wrong

```java
@DBRef
private UserPersistenceModel promoter;
```

### 4. Keep reads explicit

- Prefer aggregation for rich read models
- Prefer batching with `$in` to avoid N+1
- Keep projections minimal and intentional
- Convert `_id` and ObjectId references to string in the response projection

### 5. Keep writes minimal and atomic

- Single-document writes are already atomic in MongoDB
- Check `matchedCount` / `modifiedCount` instead of reading first when possible
- Use transactions only for truly cross-collection atomic workflows

## Good Patterns

### Thin GraphQL controller

```java
@Controller
@RequiredArgsConstructor
public class TitularGraphQLController {

    private final GetTitularById getTitularById;

    @QueryMapping
    public SingleResponse<TitularDetailResponse> getTitularById(@Argument String id) {
        return getTitularById.getTitularById(id);
    }
}
```

### Complex read with aggregation

```java
Aggregation aggregation = Aggregation.newAggregation(match, lookup, projection);
return mongoTemplate.aggregate(aggregation, "titulares", TitularDetailDTO.class)
        .getUniqueMappedResult();
```

## Anti-Patterns

- Business logic in controllers
- Persistence logic in controllers or use-case interfaces
- `MongoRepository` for rich Mongo flows
- `@DBRef`
- Querying ObjectId fields with raw strings
- N+1 reads instead of lookup/batching
- Generic service layers that hide the module boundary

## Review Checklist

- [ ] Code is in the correct hexagonal layer
- [ ] Controllers are thin
- [ ] ObjectId conversion is explicit in queries
- [ ] Relationships use stored ids, not `@DBRef`
- [ ] Reads use batching/aggregation where needed
- [ ] Response projections convert ids correctly
- [ ] Naming matches module conventions
- [ ] Changes stay within assigned SDD tasks and design constraints
