
package sentinelx_backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import sentinelx_backend.model.SecurityEvent;

public interface SecurityEventRepository
        extends MongoRepository<SecurityEvent, String> {
}
