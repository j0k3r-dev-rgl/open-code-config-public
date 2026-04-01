# Mongo Review Checklist

- [ ] Document ids use `@MongoId(FieldType.OBJECT_ID)`.
- [ ] Foreign keys stored as ids use `@Field(targetType = FieldType.OBJECT_ID)`.
- [ ] Queries convert ids with `MongoIdUtils.toObjectIdOrString(...)` or batch equivalents.
- [ ] Aggregation projections convert ObjectIds back to strings for DTOs/responses.
- [ ] Complex reads use `MongoTemplate` with explicit `Criteria`, `Aggregation`, projection, and batching.
- [ ] `MongoRepository` is not used for aggregation-heavy or relationship-heavy reads.
- [ ] `@DBRef` is not used.
- [ ] Single-document writes avoid unnecessary transactions; cross-collection atomicity is explicit.
