package com.acme.modules.${module}.infrastructure.use_cases.command;

import com.acme.modules.${module}.application.ports.input.${portName};
import com.acme.modules.${module}.application.ports.output.${repositoryName};
import com.acme.modules.${module}.infrastructure.persistence.models.${modelName};
import com.acme.modules.${module}.infrastructure.web.http.request.${requestName};
import com.acme.shared.exceptions.GraphRunTimeException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ${useCaseName} implements ${portName} {

    private final ${repositoryName} repository;

    @Override
    public void ${methodName}(${requestName} request, String actorId) {
        if (repository.existsByBusinessKey(request.getBusinessKey())) {
            throw new GraphRunTimeException(409, 409, "Resource already exists for key: " + request.getBusinessKey());
        }

        ${modelName} model = ${modelName}.builder()
                .name(request.getName())
                .businessKey(request.getBusinessKey())
                .createdBy(actorId)
                .createdDate(LocalDateTime.now())
                .lastUpdate(LocalDateTime.now())
                .build();

        repository.save(model);
    }
}

/*
Notes:
- Validate business invariants in the use case, not in the controller.
- For single-document writes, avoid unnecessary transactions.
- Always set lastUpdate on writes.
*/
