---
name: java-spring
description: Patterns and conventions for Java 25 + Spring Boot 4 + MongoDB hexagonal architecture. Load when creating a new module, use case, adapter, GraphQL/REST controller, or MongoDB query.
license: MIT
compatibility: opencode
---

## Stack

Java 25 + Spring Boot 4.0.3 + Spring GraphQL + Spring Security/JWT + Spring Data MongoDB (MongoTemplate + Aggregation) + Spring Data Redis + Lombok + MapStruct 1.6.

La base de datos está configurada como **replica set** (operaciones atómicas a nivel de documento habilitadas por defecto).

---

## Checklist antes de crear un módulo o caso de uso

- [ ] ¿Es lectura? → puerto en `input/Get*.java`, use case en `query/`
- [ ] ¿Es escritura? → puerto en `input/Edit*.java` o `Create*`, use case en `command/`
- [ ] ¿Es operación de admin/root? → puerto en `input/Root*.java`
- [ ] ¿El puerto output necesita MongoDB? → adapter en `dao/*Adapter.java`
- [ ] ¿La query trae datos relacionados? → usar `$lookup` (singular) o `$in` batching (múltiples)
- [ ] ¿Es un listado paginado? → usar `MongoAggregationHelper.executePaginatedAggregation`
- [ ] ¿El model tiene FKs? → `@Field(targetType = FieldType.OBJECT_ID)` en cada FK
- [ ] ¿La query usa IDs? → SIEMPRE convertir con `MongoIdUtils.toObjectIdOrString`
- [ ] ¿El update es de un solo documento? → NO usar transacción (es atómico por defecto)
- [ ] ¿Hay update cross-collection que debe ser atómico? → usar transacción

---

## 1. Modelo de Persistencia

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@Document(collection = "nombre_coleccion")
@CompoundIndex(name = "idx_campo1_campo2", def = "{'campo1': 1, 'campo2': 1}", unique = true)
public class RecursoPersistenceModel {

    @MongoId(FieldType.OBJECT_ID)      // SIEMPRE — nunca @Id simple
    private String id;

    private String nombre;

    @Field(targetType = FieldType.OBJECT_ID)   // TODA FK → ObjectId en BD
    private String relatedId;

    @Field(targetType = FieldType.OBJECT_ID)   // Lista de FKs → ObjectId en BD
    private List<String> otrosIds;

    private SubDocumento subDoc;               // Subdocumento embebido — no @DBRef

    private LocalDate fecha;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdate;          // Obligatorio en todo modelo
}
```

**Reglas críticas:**
- `@MongoId(FieldType.OBJECT_ID)` — NUNCA `@Id`
- `@Field(targetType = FieldType.OBJECT_ID)` en TODA FK — sin excepción
- NUNCA `@Data` — usar `@Getter @Setter` por separado (evita equals/hashCode problemáticos)
- `lastUpdate` siempre presente — actualizar en cada write

---

## 2. Puerto Input (Interface en `application`)

```java
// Lectura
public interface GetRecursoById {
    SingleResponse<RecursoDetailResponse> getRecursoById(String id);
}

// Escritura
public interface CreateRecurso {
    void createRecurso(CreateRecursoRequest request, String createdById);
}

// Admin/Root
public interface RootEditRecurso {
    void editRecurso(String id, EditRecursoInput input);
}
```

---

## 3. Puerto Output (Interface en `application`)

```java
public interface GetRecursoByIdRepository {
    RecursoDetailDTO findRecursoById(String id);
}

public interface CreateRecursoRepository {
    void save(RecursoPersistenceModel model);
    boolean existsByKey(String key);
}
```

---

## 4. Use Case (en `infrastructure/use_cases/`)

```java
@Component
@RequiredArgsConstructor
public class GetRecursoByIdUseCase implements GetRecursoById {

    private final GetRecursoByIdRepository repository;

    @Override
    public SingleResponse<RecursoDetailResponse> getRecursoById(String id) {
        RecursoDetailDTO dto = repository.findRecursoById(id);

        RecursoDetailResponse response = RecursoDetailResponse.builder()
                .id(dto.getId())
                .nombre(dto.getNombre())
                // ... mapear campos
                .build();

        return SingleResponse.<RecursoDetailResponse>builder()
                .data(response)
                .responseStatus(ResponseStatus.builder().code(200).message("success").build())
                .build();
    }
}
```

**Reglas:**
- `@Component` — NUNCA `@Service`
- Recibe DTOs del adapter, construye Response objects en el use case
- Sin lógica de MongoDB — solo orquestación

---

## 5. Adapter — Query Singular con Lookup

```java
@Component
@RequiredArgsConstructor
public class GetRecursoByIdAdapter implements GetRecursoByIdRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public RecursoDetailDTO findRecursoById(String id) {
        // SIEMPRE convertir el ID con MongoIdUtils
        Object idValue = MongoIdUtils.toObjectIdOrString(id);

        MatchOperation match = Aggregation.match(Criteria.where("_id").is(idValue));

        // Lookup para traer datos relacionados en la misma query
        LookupOperation lookupRelated = LookupOperation.newLookup()
                .from("otra_coleccion")
                .localField("relatedId")
                .foreignField("_id")
                .as("relatedData");

        ProjectionOperation projection = buildProjection();

        Aggregation aggregation = Aggregation.newAggregation(match, lookupRelated, projection);

        RecursoDetailDTO result = mongoTemplate
                .aggregate(aggregation, "nombre_coleccion", RecursoDetailDTO.class)
                .getUniqueMappedResult();

        if (result == null) {
            throw new RestRunTimeException(404, 404, "Recurso con ID " + id + " no encontrado");
        }

        return result;
    }

    private ProjectionOperation buildProjection() {
        return Aggregation.project()
                // Convertir _id a String (patrón obligatorio)
                .and(AggregationExpression.from(MongoExpression.create(
                        "{ $cond: { if: { $eq: [ { $type: '$_id' }, 'objectId' ] }, " +
                        "then: { $toString: '$_id' }, else: '$_id' } }")))
                .as("id")
                .andInclude("nombre", "fecha")
                // Convertir FK a String
                .and(AggregationExpression.from(MongoExpression.create(
                        "{ $cond: { if: { $eq: [ { $type: '$relatedId' }, 'objectId' ] }, " +
                        "then: { $toString: '$relatedId' }, else: '$relatedId' } }")))
                .as("relatedId")
                // Mapear related (primer elemento del array de lookup)
                .and(AggregationExpression.from(MongoExpression.create(
                        "{ $let: { vars: { r: { $arrayElemAt: [ '$relatedData', 0 ] } }, " +
                        "in: { $cond: { if: { $eq: [ '$$r', null ] }, then: null, " +
                        "else: { id: { $toString: '$$r._id' }, nombre: '$$r.nombre' } } } } }")))
                .as("related");
    }
}
```

---

## 6. Adapter — Listado Paginado

```java
@Component
@RequiredArgsConstructor
public class SearchRecursoAdapter implements SearchRecursoRepository {

    private final MongoAggregationHelper aggregationHelper;

    @Override
    public PageDTO<RecursoItemDTO> searchRecurso(Integer page, Integer size, RecursoFilter filter) {
        Criteria criteria = buildCriteria(filter);
        ProjectionOperation projection = buildProjection();
        SortOperation sort = aggregationHelper.createSortOperation(
                filter != null ? filter.orderBy() : null,
                filter != null ? filter.direction() : null);

        // UNA sola query — count + datos gracias a $facet
        return aggregationHelper.executePaginatedAggregation(
                "nombre_coleccion", criteria, projection, sort, page, size, RecursoItemDTO.class);
    }

    private Criteria buildCriteria(RecursoFilter filter) {
        Criteria criteria = new Criteria();
        if (filter == null) return criteria;

        if (filter.nombre() != null && !filter.nombre().isBlank()) {
            criteria.and("nombre").regex(filter.nombre(), "i");  // case-insensitive
        }
        if (filter.relatedId() != null && !filter.relatedId().isBlank()) {
            // FK → convertir a ObjectId
            criteria.and("relatedId").is(MongoIdUtils.toObjectIdOrString(filter.relatedId()));
        }
        return criteria;
    }

    private ProjectionOperation buildProjection() {
        return aggregationHelper.createIdConversionProjection("nombre", "estado");
    }
}
```

---

## 7. Adapter — Batching (`$in`)

```java
@Override
public List<RecursoBasicResponse> findByIds(Set<String> ids) {
    if (ids == null || ids.isEmpty()) return List.of();

    // Convertir todos los IDs a ObjectId
    List<Object> objectIds = MongoIdUtils.toObjectIdsOrStrings(ids);
    Criteria criteria = Criteria.where("_id").in(objectIds);
    ProjectionOperation projection = aggregationHelper.createIdConversionProjection("nombre");

    return aggregationHelper.executeSimpleAggregation(
            "nombre_coleccion", criteria, projection, null, RecursoBasicResponse.class);
}
```

---

## 8. Adapter — Escritura (Command)

```java
@Override
public void updateRecurso(String id, String nombre) {
    Object idValue = MongoIdUtils.toObjectIdOrString(id);
    Query query = new Query(Criteria.where("_id").is(idValue));

    Update update = new Update()
            .set("nombre", nombre)
            .set("lastUpdate", LocalDateTime.now());  // SIEMPRE actualizar lastUpdate

    // update atómico — SIN transacción para 1 documento
    UpdateResult result = mongoTemplate.updateFirst(query, update, "nombre_coleccion");

    // Validar con matchedCount — NO hacer findOne previo
    if (result.getMatchedCount() == 0) {
        throw new GraphRunTimeException(404, 404, "Recurso no encontrado");
    }
}

// Para asignar una FK (convertir a ObjectId al escribir)
@Override
public void assignRelated(String id, String relatedId) {
    Object idValue = MongoIdUtils.toObjectIdOrString(id);
    Object relatedIdValue = MongoIdUtils.toObjectIdOrString(relatedId);  // FK → ObjectId

    Query query = new Query(Criteria.where("_id").is(idValue));
    Update update = new Update()
            .set("relatedId", relatedIdValue)
            .set("lastUpdate", LocalDateTime.now());

    UpdateResult result = mongoTemplate.updateFirst(query, update, "nombre_coleccion");
    if (result.getMatchedCount() == 0) {
        throw new GraphRunTimeException(404, 404, "Recurso no encontrado");
    }
}
```

---

## 9. Controller GraphQL

```java
@Controller
@RequiredArgsConstructor
public class RecursoGraphQLController {

    private final GetRecursoById getRecursoById;
    private final SearchRecurso searchRecurso;

    @QueryMapping
    public SingleResponse<RecursoDetailResponse> getRecursoById(@Argument String id) {
        return getRecursoById.getRecursoById(id);
    }

    @QueryMapping
    public PageResponse<RecursoItemResponse> searchRecurso(
            @Argument Integer page,
            @Argument Integer size,
            @Argument RecursoFilter filter) {
        return searchRecurso.searchRecurso(page, size, filter);
    }
}
```

---

## 10. Controller REST

```java
@RestController
@RequestMapping("/recursos")
@RequiredArgsConstructor
public class RecursoRestController {

    private final CreateRecurso createRecurso;

    @PostMapping
    public ResponseEntity<ResponseStatus> create(
            @Valid @RequestBody CreateRecursoRequest request,
            @AuthenticationPrincipal UserDetails user) {
        createRecurso.createRecurso(request, user.getUsername());
        return ResponseEntity.ok(ResponseStatus.ok());
    }
}
```

---

## Gotchas críticos

1. **`@Field(targetType = FieldType.OBJECT_ID)` solo aplica al GUARDAR** — al consultar con `MongoTemplate` o Aggregation, SIEMPRE usar `MongoIdUtils`. Sin esto la query devuelve vacío sin error.

2. **Proyecciones deben convertir ObjectIds a String explícitamente** — el tipo en BD es `ObjectId`, el DTO espera `String`. Sin la conversión en `$project`, el mapeo falla silenciosamente.

3. **Un adapter puede implementar múltiples puertos** — si comparten `MongoTemplate` y operan sobre la misma colección, es válido y reduce clases innecesarias.

4. **`$facet` requiere que el match venga ANTES** — el orden del pipeline es `match → sort → facet`. Sort sin match previo escanea toda la colección.

5. **Los updates de listas (push/pull) también son atómicos** — `$push`, `$pull`, `$addToSet` en un documento no necesitan transacción.
