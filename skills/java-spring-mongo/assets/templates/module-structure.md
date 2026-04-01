# Recommended Module Structure

Use a module-first hexagonal layout. Keep business contracts in `application` and implementation details in `infrastructure`.

```text
modules/{module-name}/
├── application/
│   ├── ports/
│   │   ├── input/
│   │   │   ├── Create{Entity}.java
│   │   │   ├── Edit{Entity}.java
│   │   │   ├── Get{Entity}ById.java
│   │   │   └── RootEdit{Entity}.java
│   │   └── output/
│   │       ├── Create{Entity}Repository.java
│   │       ├── Edit{Entity}Repository.java
│   │       └── Get{Entity}ByIdRepository.java
│   └── use_cases/
│       ├── command/
│       │   └── {Action}{Entity}UseCase.java
│       └── query/
│           └── {Action}{Entity}UseCase.java
└── infrastructure/
    ├── persistence/
    │   ├── dao/
    │   │   └── {Action}{Entity}Adapter.java
    │   ├── dto/
    │   │   └── {Entity}DetailDTO.java
    │   └── models/
    │       └── {Entity}PersistenceModel.java
    ├── web/
    │   ├── graphql/
    │   │   ├── filters/
    │   │   │   └── Search{Entity}Filter.java
    │   │   └── {Entity}GraphQLController.java
    │   ├── http/
    │   │   ├── request/
    │   │   │   └── Create{Entity}Request.java
    │   │   └── response/
    │   │       └── {Entity}DetailResponse.java
    │   └── rest/
    │       └── {Entity}RestController.java
    └── {Entity}Mapper.java
```

## Placement Rules

- `application/ports/input`: use case contracts exposed to controllers or other modules.
- `application/ports/output`: persistence or external dependency contracts.
- `application/use_cases`: business orchestration only.
- `infrastructure/persistence/dao`: `MongoTemplate`, `Criteria`, `Aggregation`, `Update`, batching.
- `infrastructure/web`: GraphQL and REST adapters only.
- `infrastructure/persistence/models`: Mongo persistence models, indexes, FK storage definitions.

## Hard Boundaries

- Do not put `MongoTemplate` in controllers.
- Do not put `@QueryMapping`, `@RestController`, or Spring MVC annotations in `application`.
- Do not hide aggregation-heavy reads behind `MongoRepository`.
- Do not use `@DBRef` for relationships.
