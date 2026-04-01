# Architecture Review Checklist

- [ ] Module is organized by bounded feature, not by global technical package.
- [ ] Input ports describe use cases clearly and live in `application/ports/input`.
- [ ] Output ports describe persistence or external needs without infrastructure leakage.
- [ ] Use cases orchestrate business rules and do not contain Mongo query code.
- [ ] Controllers delegate only; no business logic, no `MongoTemplate`, no mapping sprawl.
- [ ] Infrastructure adapters implement output ports and hold persistence details.
- [ ] Request and response objects stay at the web boundary.
- [ ] Naming follows `Get*`, `Create*`, `Edit*`, `Root*`, `*Repository`, `*UseCase`, `*Adapter`.
