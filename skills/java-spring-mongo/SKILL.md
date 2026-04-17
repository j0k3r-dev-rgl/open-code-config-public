---
name: java-spring-mongo
description: >
  Compact operating rules for Java 25 + Spring Boot 4 + MongoDB hexagonal modules with Spring GraphQL/MVC, Spring Security JWT, MongoTemplate, and project-specific persistence conventions.
  Trigger: When creating, modifying, reviewing, or investigating Java/Spring Boot backend code, including modules, use cases, adapters, GraphQL/REST controllers, MongoTemplate queries, aggregations, projections, ObjectId handling, or hexagonal architecture decisions.
license: Apache-2.0
compatibility: opencode
metadata:
  author: J0k3r-dev-rgl
  version: "2.0.0"
---

## When to Use

- Creating or modifying backend modules in hexagonal architecture
- Writing query or command use cases
- Implementing Mongo adapters with `MongoTemplate`
- Adding GraphQL or REST controllers
- Reviewing ObjectId handling, lookups, batching, pagination, projections, or atomic writes

When this skill is loaded during `sdd-apply`, it COMPLEMENTS the apply-phase workflow. It does NOT replace the `sdd-apply` contract:
- read assigned tasks, specs, and design first
- implement only the assigned tasks
- update task completion state
- persist `apply-progress`

## Stack

Java 25 + Spring Boot 4.0.3 + Spring GraphQL + Spring MVC + Spring Security/JWT + Spring Data MongoDB (`MongoTemplate` + Aggregation) + Spring Data Redis + Lombok + MapStruct 1.6.

MongoDB runs as a replica set, so single-document writes are already atomic by default.

## Architecture Rules

- Organize by module, not by technical layer at the repository root
- `application` contains ports and use-case contracts only
- `application/ports/input` contains `Get*`, `Create*`, `Edit*`, `Root*`
- `application/ports/output` contains `*Repository`
- `infrastructure/use_cases/query` contains read use cases
- `infrastructure/use_cases/command` contains write use cases
- `infrastructure` contains Spring wiring, adapters, persistence, controllers, DTOs, mappers
- Controllers stay thin: receive input, delegate, return response
- Prefer constructor injection with `@RequiredArgsConstructor`
- Use `@Component` for use cases and adapters; avoid vague service layers

## Checklist Before Creating a Module or Use Case

- [ ] Is it a read? Use an input port like `Get*` and place the use case in `infrastructure/use_cases/query/`
- [ ] Is it a write? Use an input port like `Create*` or `Edit*` and place the use case in `infrastructure/use_cases/command/`
- [ ] Is it an admin/root action? Use an input port like `Root*`
- [ ] Does the output port need MongoDB? Implement an adapter in `dao/*Adapter.java`
- [ ] Does the query need related data? Prefer `$lookup` for singular joins or `$in` batching for multiple ids
- [ ] Is it a paginated list? Prefer `MongoAggregationHelper.executePaginatedAggregation(...)` when the helper exists in the codebase
- [ ] Does the persistence model store foreign keys? Add `@Field(targetType = FieldType.OBJECT_ID)` to each FK field
- [ ] Does the query filter by ids? Always convert ids with `MongoIdUtils.toObjectIdOrString(...)` or `MongoIdUtils.toObjectIdsOrStrings(...)`
- [ ] Is the write only for one document? Do not add a transaction
- [ ] Is a cross-collection workflow required to be atomic? Then use a transaction deliberately

## Mongo Rules That Are NOT Optional

1. Use `MongoTemplate` for complex reads, updates, projections, and aggregations.
2. Do NOT use `MongoRepository` for complex query flows.
3. Do NOT use `@DBRef`.
4. Use `@MongoId(FieldType.OBJECT_ID)` for document ids.
5. Use `@Field(targetType = FieldType.OBJECT_ID)` for stored foreign keys.
6. Convert ids in queries with `MongoIdUtils.toObjectIdOrString(...)` or `MongoIdUtils.toObjectIdsOrStrings(...)`.
7. Convert ObjectIds back to strings in aggregation projections.
8. Keep `lastUpdate` in persistence models and update it on every write.
9. Prefer `matchedCount` / `modifiedCount` validation instead of doing a previous read when possible.

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

- `navigation-agent_code_list_endpoints` -> inspect API surface before opening controllers
- `navigation-agent_code_find_symbol` -> locate ports, use cases, controllers, adapters, or mappers
- `navigation-agent_code_trace_flow` -> follow controller -> port -> use case -> adapter
- `navigation-agent_code_trace_callers` -> impact analysis for changing ports or helpers
- `navigation-agent_code_inspect_tree` -> inspect module structure with low noise
- `navigation-agent_code_search_text` -> detect ObjectId mistakes, annotation usage, or persistence patterns
- `api_test` -> verify controller contract when runtime evidence matters

## Workflow

### 1. Investigate structurally first

- Start from the endpoint, use case, or repository port
- Trace the full flow before editing
- Reuse existing module patterns before creating new abstractions
- Stay inside the task/spec/design boundaries defined by `sdd-apply`

### 2. Place code in the correct layer

- Controller -> transport only
- Input port -> contract
- Use case -> orchestration and business rules
- Output port -> persistence contract
- Adapter -> `MongoTemplate` / aggregation implementation

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
@MongoId(FieldType.OBJECT_ID)
private String id;

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
- For paginated lists, prefer one aggregation with `match -> sort -> facet`

### 5. Keep writes minimal and atomic

- Single-document writes are already atomic in MongoDB
- Use transactions only for truly cross-collection atomic workflows
- Do not add a transaction to a single-document update just because the code is a command

## Good Patterns

### Thin use case

```java
@Component
@RequiredArgsConstructor
public class GetTitularByIdUseCase implements GetTitularById {

    private final GetTitularByIdRepository repository;

    @Override
    public SingleResponse<TitularDetailResponse> getTitularById(String id) {
        TitularDetailDTO dto = repository.findTitularById(id);

        TitularDetailResponse response = TitularDetailResponse.builder()
                .id(dto.getId())
                .nombre(dto.getNombre())
                .build();

        return SingleResponse.<TitularDetailResponse>builder()
                .data(response)
                .responseStatus(ResponseStatus.builder().code(200).message("success").build())
                .build();
    }
}
```

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

### Rich Mongo read with aggregation

```java
Object idValue = MongoIdUtils.toObjectIdOrString(id);

Aggregation aggregation = Aggregation.newAggregation(
        Aggregation.match(Criteria.where("_id").is(idValue)),
        lookup,
        projection);

return mongoTemplate.aggregate(aggregation, "titulares", TitularDetailDTO.class)
        .getUniqueMappedResult();
```

### Paginated list with helper

```java
return aggregationHelper.executePaginatedAggregation(
        "titulares", criteria, projection, sort, page, size, TitularItemDTO.class);
```

### Atomic write without previous read

```java
UpdateResult result = mongoTemplate.updateFirst(query, update, "titulares");
if (result.getMatchedCount() == 0) {
    throw new GraphRunTimeException(404, 404, "Titular no encontrado");
}
```

## Anti-Patterns

- Business logic in controllers
- Persistence logic in controllers or use-case interfaces
- `MongoRepository` for rich Mongo flows
- `@DBRef`
- Querying ObjectId fields with raw strings
- N+1 reads instead of lookup/batching
- Generic service layers that hide the module boundary
- Forgetting `lastUpdate` on writes
- Doing a `findOne` before an update only to check existence

## Critical Gotchas

1. `@Field(targetType = FieldType.OBJECT_ID)` only applies when saving. For `MongoTemplate` queries and aggregations, you still must convert ids explicitly with `MongoIdUtils`.
2. Projection must convert `ObjectId` values to `String` explicitly or DTO mapping will fail silently.
3. One adapter may implement multiple output ports if it shares the same collection and dependencies cleanly.
4. In paginated aggregations, `match` must come before `sort` and `facet` to avoid unnecessary scans.
5. List updates such as `$push`, `$pull`, and `$addToSet` on a single document are still atomic.

## Review Checklist

- [ ] Code is in the correct hexagonal layer
- [ ] Controllers are thin
- [ ] ObjectId conversion is explicit in queries
- [ ] Relationships use stored ids, not `@DBRef`
- [ ] Reads use batching or aggregation where needed
- [ ] Response projections convert ids correctly
- [ ] Naming matches module conventions
- [ ] `lastUpdate` is maintained on writes
- [ ] Changes stay within assigned SDD tasks and design constraints
