---
alwaysApply: true
---

## Stack Backend

- **Java 25** con Spring Boot 4.0.3
- **Spring MVC + WebFlux** (MVC para REST, WebFlux para SSE/streaming)
- **Spring GraphQL** — controladores GraphQL anotados con `@QueryMapping`, `@MutationMapping`
- **Spring Security + JWT** (Auth0 java-jwt 4.x)
- **Spring Data MongoDB** — `MongoTemplate` + Aggregation Framework (NO `MongoRepository` para queries complejas)
- **Spring Data Redis** — caché y sesiones
- **Lombok** — `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@ToString`, `@RequiredArgsConstructor`, `@Slf4j`
- **MapStruct 1.6.x** — mappers entre dominio y modelos de persistencia/DTOs
- **Bean Validation** (`@Valid`, `@NotBlank`, `@NotNull`, etc.)

---

## Arquitectura Modular — Hexagonal por módulo

### Estructura de un Módulo

```
modules/[nombre]/
├── application/
│   ├── ports/
│   │   ├── input/           # Interfaces hacia el exterior (casos de uso)
│   │   │   ├── Edit*.java
│   │   │   ├── Get*.java
│   │   │   └── Root*.java
│   │   └── output/          # Interfaces hacia servicios externos
│   │       └── *Repository.java
│   └── use_cases/
│       ├── command/          # Casos de uso que modifican estado
│       │   └── *UseCase.java
│       └── query/            # Casos de uso que solo leen
│           └── *UseCase.java
│
└── infrastructure/
    ├── persistence/
    │   ├── dao/              # Implementaciones de puertos output
    │   │   └── *Adapter.java
    │   ├── dto/              # DTOs internos de persistencia (resultado de agregaciones)
    │   │   └── *DTO.java
    │   └── models/           # Modelos de persistencia (MongoDB)
    │       └── *PersistenceModel.java
    ├── web/
    │   ├── graphql/
    │   │   ├── filters/      # Records de filtros para GraphQL (@Argument)
    │   │   └── *GraphQLController.java
    │   ├── http/
    │   │   ├── request/      # Request bodies REST
    │   │   └── response/     # Response objects REST y GraphQL
    │   └── rest/
    │       └── *RestController.java
    └── [Nombre]Mapper.java   # Mapper MapStruct del módulo
```

---

## Convenciones de Nombres

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Puerto input (lectura) | `Get*` | `GetTitularById.java` |
| Puerto input (edición) | `Edit*` | `EditTitular.java` |
| Puerto input (root/admin) | `Root*` | `RootEditTitular.java` |
| Puerto output | `*Repository` | `GetTitularByIdRepository.java` |
| Use case command | `*UseCase` | `CreateTitularUseCase.java` |
| Use case query | `*UseCase` | `GetTitularByIdUseCase.java` |
| Adaptador DAO | `*Adapter` | `GetTitularByIdAdapter.java` |
| Modelo MongoDB | `*PersistenceModel` | `TitularPersistenceModel.java` |
| DTO de agregación | `*DTO` | `TitularDetailDTO.java` |
| Response (HTTP/GraphQL) | `*Response` | `TitularDetailResponse.java` |
| Request (REST) | `*Request` | `CreateTitularRequest.java` |
| Mapper | `[Nombre]Mapper` | `TitularMapper.java` |

---

## Modelos MongoDB

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@Document(collection = "titulares")
@CompoundIndex(name = "idx_documentType_documentNumber",
               def = "{'documentType': 1, 'documentNumber': 1}", unique = true)
public class TitularPersistenceModel {

    @MongoId(FieldType.OBJECT_ID)
    private String id;

    private String names;

    @Field(targetType = FieldType.OBJECT_ID)
    private String promoterId;            // FK almacenada como ObjectId

    @Field(targetType = FieldType.OBJECT_ID)
    private List<String> membersIds;      // Lista de FKs como ObjectId

    @Field(targetType = FieldType.OBJECT_ID)
    private String dependencyId;

    private Location location;            // Subdocumento embebido

    private LocalDate dateOfBirth;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdate;
}
```

**Reglas críticas de persistencia:**
- `@MongoId(FieldType.OBJECT_ID)` en el campo `id` — NUNCA `@Id` simple
- `@Field(targetType = FieldType.OBJECT_ID)` en TODA FK o referencia — se almacena como ObjectId en MongoDB
- `@CompoundIndex` para índices de búsqueda frecuente
- Subdocumentos (Location, Coordinates) como clases separadas embebidas — NO `@DBRef`
- `lastUpdate` obligatorio en todo modelo — actualizar siempre en operaciones de escritura
- NUNCA `@Data` en modelos — usar `@Getter @Setter` explícitos para evitar equals/hashCode problemáticos

---

## ObjectId — Conversión en Queries (CRÍTICO)

`@Field(targetType = FieldType.OBJECT_ID)` solo convierte al **GUARDAR**. Al **CONSULTAR** con `MongoTemplate` o Aggregation Framework, la conversión es manual. Usar siempre `MongoIdUtils`:

```java
// ✅ Correcto
Object idValue = MongoIdUtils.toObjectIdOrString(titularId);
Criteria.where("_id").is(idValue);

// ✅ Para listas ($in)
List<Object> ids = MongoIdUtils.toObjectIdsOrStrings(titularIds);
Criteria.where("membersIds").in(ids);

// ❌ NUNCA — falla silenciosamente, devuelve vacío
Criteria.where("_id").is(titularId);
Criteria.where("dependencyId").is(dependencyId);
```

---

## Estrategias de Consulta MongoDB

### 1. Singular con lookup — datos relacionados en una sola query
```java
Aggregation.newAggregation(
    Aggregation.match(criteria),
    LookupOperation.newLookup().from("users").localField("promoterId")
                               .foreignField("_id").as("promoterData"),
    LookupOperation.newLookup().from("titulares").localField("membersIds")
                               .foreignField("_id").as("membersData"), // self-join
    buildProjection()
);
```

### 2. Listados paginados — `$facet` con `MongoAggregationHelper`
```java
// Una sola query obtiene count + datos (reducción del 50% de queries)
return aggregationHelper.executePaginatedAggregation(
    "titulares", criteria, projection, sort, page, size, TitularItemDTO.class
);
```

### 3. Batching — `$in` para múltiples IDs (evitar N+1)
```java
List<Object> objectIds = MongoIdUtils.toObjectIdsOrStrings(ids);
Criteria criteria = Criteria.where("_id").in(objectIds);
return aggregationHelper.executeSimpleAggregation(
    "titulares", criteria, projection, null, ResponseDTO.class
);
```

### 4. Proyección mínima — consultas ligeras
```java
// Verificar existencia
mongoTemplate.exists(new Query(Criteria.where("_id").is(idValue)), TitularPersistenceModel.class);

// Traer un solo campo
Query query = new Query(Criteria.where("_id").is(idValue));
query.fields().include("dependencyId");
mongoTemplate.findOne(query, TitularPersistenceModel.class);
```

---

## Proyecciones en Aggregation

Siempre convertir ObjectIds a String en la proyección:

```java
// _id → String
.and(AggregationExpression.from(MongoExpression.create(
    "{ $cond: { if: { $eq: [ { $type: '$_id' }, 'objectId' ] }, " +
    "then: { $toString: '$_id' }, else: '$_id' } }")))
.as("id")

// Array de subdocumentos con conversión
.and(AggregationExpression.from(MongoExpression.create(
    "{ $map: { input: { $ifNull: [ '$membersData', [] ] }, as: 'member', " +
    "in: { id: { $toString: '$$member._id' }, names: '$$member.names' } } }")))
.as("members")

// Fecha a String ISO
.and(AggregationExpression.from(MongoExpression.create(
    "{ $dateToString: { format: '%Y-%m-%d', date: '$dateOfBirth', onNull: null } }")))
.as("dateOfBirth")

// Atajo para id + campos simples
aggregationHelper.createIdConversionProjection("names", "surnames", "email");
```

---

## Operaciones de Escritura

Updates de un solo documento son **atómicos por defecto** en MongoDB con replica set. NO usar transacciones explícitas para esos casos:

```java
// ✅ Correcto — atómico sin transacción
Update update = new Update().set("names", names).set("lastUpdate", LocalDateTime.now());
UpdateResult result = mongoTemplate.updateFirst(query, update, "titulares");

// Validar con matchedCount — NO hacer findOne previo (evita 1 query extra)
if (result.getMatchedCount() == 0) {
    throw new GraphRunTimeException(404, 404, "Titular no encontrado");
}

// ✅ Transacción solo para updates cross-collection que deben ser atómicos
```

---

## Controllers

### GraphQL
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

### REST
```java
@RestController
@RequestMapping("/titulares")
@RequiredArgsConstructor
public class TitularRestController {
    private final CreateTitular createTitular;

    @PostMapping
    public ResponseEntity<ResponseStatus> create(
            @Valid @RequestBody CreateTitularRequest request,
            @AuthenticationPrincipal UserDetails user) {
        createTitular.createTitular(request, user.getUsername());
        return ResponseEntity.ok(ResponseStatus.ok());
    }
}
```

---

## Flujo de una Request

```
1. Controller (GraphQL o REST) recibe la request — sin lógica, solo delega
   ↓
2. Puerto input (interface en application/ports/input) — contrato del caso de uso
   ↓
3. UseCase (@Component en infrastructure) implementa el puerto
   ↓
4. UseCase llama puertos output y orquesta la lógica de negocio
   ↓
5. Adapter (@Component en infrastructure/persistence/dao) implementa el puerto output
   — toda la lógica MongoDB está acá
```

---

## Lo que VA y lo que NO VA

✅ **VA en `application`**:
- Interfaces de puertos (input y output)
- Casos de uso con lógica de orquestación y negocio

❌ **NO VA en `application`**:
- `@Component`, `@Service`, `@Repository`
- Imports de Spring, MongoDB, Redis, o cualquier infraestructura

✅ **VA en `infrastructure`**:
- `@Component` en adapters y use cases
- Toda la lógica de MongoDB (Template, Aggregation, Criteria, Update)
- Controllers, DTOs, modelos, mappers

❌ **NO VA en `infrastructure`**:
- Lógica de negocio (validaciones de dominio van en `application`)
