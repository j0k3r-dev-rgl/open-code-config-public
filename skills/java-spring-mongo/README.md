# java-spring-mongo

Reusable local skill for Java 25 + Spring Boot 4 backends that use Spring GraphQL, Spring MVC, Spring Security with JWT, and MongoDB through `MongoTemplate`.

## Purpose

This skill helps agents create and review backend modules using a hexagonal, module-first structure. It focuses on practical implementation guidance for:

- input and output ports
- query and command use cases
- thin GraphQL and REST controllers
- MongoDB adapters with `MongoTemplate`
- ObjectId-safe criteria and aggregation projections
- review discipline through concise checklists

## Scope

Use this skill when work involves Java module design, MongoDB query implementation, controller boundaries, or backend architecture reviews. It is especially useful for codebases that intentionally avoid anemic repository abstractions for non-trivial reads.

This skill is opinionated about the following:

- hexagonal architecture by module
- `MongoTemplate` for complex queries and aggregations
- no `@DBRef`
- no `MongoRepository` for complex query paths
- explicit ObjectId conversion in queries
- controllers that only coordinate HTTP/GraphQL boundaries

## Example Prompts

- "Create a new Spring module for titulares with query and command use cases."
- "Review this MongoTemplate aggregation for ObjectId safety and architecture boundaries."
- "Add a GraphQL query and keep the controller thin."
- "Generate a Mongo adapter for a paginated search with lookups and projections."
- "Audit whether this module follows hexagonal architecture."

## Included Files

- `SKILL.md` — core guidance, patterns, examples, commands, and references
- `skill.json` — lightweight metadata manifest
- `assets/templates/module-structure.md` — recommended module layout blueprint
- `assets/templates/query-use-case.java.tpl` — practical query use case template
- `assets/templates/command-use-case.java.tpl` — practical command use case template
- `assets/templates/mongo-adapter.java.tpl` — practical Mongo adapter template
- `assets/checklists/architecture-review.md` — architecture review checklist
- `assets/checklists/mongo-review.md` — MongoDB review checklist

## Roadmap

- Add a template for GraphQL controllers and REST controllers.
- Add examples for paginated aggregation with `$facet` helpers.
- Add a focused guide for write-side validation and error mapping.
- Add sample projections for nested arrays and lookup flattening.
