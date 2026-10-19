
package sentinelx_backend.repository;

import sentinelx_backend.model.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends MongoRepository<Incident, String> {

    List<Incident> findByStatusIgnoreCase(String status);

    List<Incident> findBySeverityIgnoreCase(String severity);

    // Find an incident already linked to a security event
    Optional<Incident> findByEventId(String eventId);
}
