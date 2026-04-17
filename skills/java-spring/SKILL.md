---
name: java-spring
description: >
  Compatibility alias for the canonical `java-spring-mongo` skill.
  Trigger: When creating, modifying, reviewing, or investigating Java/Spring Boot backend code, including modules, use cases, adapters, GraphQL/REST controllers, MongoTemplate queries, aggregations, projections, ObjectId handling, or hexagonal architecture decisions.
license: Apache-2.0
compatibility: opencode
metadata:
  author: J0k3r-dev-rgl
  version: "2.0.0"
---

## Compatibility Alias

This skill is kept only for backward compatibility.

Canonical source of truth:
- `skills/java-spring-mongo/SKILL.md`

When this alias is selected, apply the same conventions as `java-spring-mongo`, especially:
- module-first hexagonal structure
- thin GraphQL/REST controllers
- `@Component` for use cases and adapters
- `MongoTemplate` for non-trivial Mongo reads and updates
- `@MongoId(FieldType.OBJECT_ID)` for ids
- `@Field(targetType = FieldType.OBJECT_ID)` for stored foreign keys
- `MongoIdUtils.toObjectIdOrString(...)` / `toObjectIdsOrStrings(...)` for query-side id conversion
- explicit ObjectId-to-string conversion in aggregation projections
- `MongoAggregationHelper.executePaginatedAggregation(...)` for paginated lists when the helper already exists in the project
- no `@DBRef`
- no generic service layer between controller, use case, and adapter

If you are editing this guidance, update `java-spring-mongo` first and keep this alias aligned.
