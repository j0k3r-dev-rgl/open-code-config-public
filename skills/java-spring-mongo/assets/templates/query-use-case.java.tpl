package com.acme.modules.${module}.infrastructure.use_cases.query;

import com.acme.modules.${module}.application.ports.input.${portName};
import com.acme.modules.${module}.application.ports.output.${repositoryName};
import com.acme.modules.${module}.infrastructure.persistence.dto.${dtoName};
import com.acme.modules.${module}.infrastructure.web.http.response.${responseName};
import com.acme.shared.response.ResponseStatus;
import com.acme.shared.response.SingleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ${useCaseName} implements ${portName} {

    private final ${repositoryName} repository;

    @Override
    public SingleResponse<${responseName}> ${methodName}(String id) {
        ${dtoName} dto = repository.${repositoryMethod}(id);

        ${responseName} response = ${responseName}.builder()
                .id(dto.getId())
                .name(dto.getName())
                .status(dto.getStatus())
                .createdDate(dto.getCreatedDate())
                .build();

        return SingleResponse.<${responseName}>builder()
                .data(response)
                .responseStatus(ResponseStatus.builder()
                        .code(200)
                        .message("success")
                        .build())
                .build();
    }
}

/*
Notes:
- Use cases orchestrate. They do not know Mongo query details.
- Keep mapping focused on API response construction.
- If business validation is needed, do it here before returning.
*/
