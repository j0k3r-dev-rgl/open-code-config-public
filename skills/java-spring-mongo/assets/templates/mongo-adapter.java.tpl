package com.acme.modules.${module}.infrastructure.persistence.dao;

import com.acme.modules.${module}.application.ports.output.${repositoryName};
import com.acme.modules.${module}.infrastructure.persistence.dto.${dtoName};
import com.acme.shared.exceptions.RestRunTimeException;
import com.acme.shared.mongo.MongoIdUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationExpression;
import org.springframework.data.mongodb.core.aggregation.LookupOperation;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.aggregation.ProjectionOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.MongoExpression;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ${adapterName} implements ${repositoryName} {

    private final MongoTemplate mongoTemplate;

    @Override
    public ${dtoName} ${methodName}(String id) {
        Object idValue = MongoIdUtils.toObjectIdOrString(id);

        MatchOperation match = Aggregation.match(Criteria.where("_id").is(idValue));

        LookupOperation lookupOwner = LookupOperation.newLookup()
                .from("owners")
                .localField("ownerId")
                .foreignField("_id")
                .as("ownerData");

        Aggregation aggregation = Aggregation.newAggregation(match, lookupOwner, buildProjection());

        ${dtoName} result = mongoTemplate
                .aggregate(aggregation, "${collectionName}", ${dtoName}.class)
                .getUniqueMappedResult();

        if (result == null) {
            throw new RestRunTimeException(404, 404, "Resource with id " + id + " was not found");
        }

        return result;
    }

    private ProjectionOperation buildProjection() {
        return Aggregation.project()
                .and(AggregationExpression.from(MongoExpression.create(
                        "{ $cond: { if: { $eq: [ { $type: '$_id' }, 'objectId' ] }, then: { $toString: '$_id' }, else: '$_id' } }")))
                .as("id")
                .andInclude("name", "status", "createdDate")
                .and(AggregationExpression.from(MongoExpression.create(
                        "{ $let: { vars: { owner: { $arrayElemAt: [ '$ownerData', 0 ] } }, in: { $cond: { if: { $eq: [ '$$owner', null ] }, then: null, else: { id: { $toString: '$$owner._id' }, name: '$$owner.name' } } } } }")))
                .as("owner");
    }
}

/*
Notes:
- Keep all Mongo query mechanics in the adapter.
- Convert inbound ids before matching.
- Convert ObjectIds to String in the projection.
- Replace lookups and projection fields to match your real read model.
*/
