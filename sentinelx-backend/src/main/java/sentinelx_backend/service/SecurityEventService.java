
package sentinelx_backend.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import sentinelx_backend.model.SecurityEvent;
import sentinelx_backend.model.Incident;
import sentinelx_backend.repository.SecurityEventRepository;
import sentinelx_backend.repository.IncidentRepository;
import sentinelx_backend.detection.ThreatDetectionService;

@Service
public class SecurityEventService {

    private final SecurityEventRepository repository;
    private final IncidentRepository incidentRepository;
    private final ThreatDetectionService threatDetectionService;
    private final LiveAlertService liveAlertService;

    public SecurityEventService(
            SecurityEventRepository repository,
            IncidentRepository incidentRepository,
            ThreatDetectionService threatDetectionService,
            LiveAlertService liveAlertService) {

        this.repository = repository;
        this.incidentRepository = incidentRepository;
        this.threatDetectionService = threatDetectionService;
        this.liveAlertService = liveAlertService;
    }

    public SecurityEvent createEvent(SecurityEvent event) {

        if (event.getTimestamp() == null) {
            event.setTimestamp(Instant.now());
        }

        // Step 1: Analyze the incoming security event
        String detectedSeverity =
                threatDetectionService.detectThreat(event);

        event.setSeverity(detectedSeverity);

        // Step 2: Save the event to MongoDB
        SecurityEvent savedEvent = repository.save(event);

        // Step 3: Automatically create an incident for CRITICAL events
        if ("CRITICAL".equalsIgnoreCase(savedEvent.getSeverity())) {
            createIncidentIfMissing(savedEvent);
        }

        // Step 4: Broadcast the saved event to connected dashboards
        try {
            String alertMessage =
                    "Event ID: " + savedEvent.getId()
                    + " | " + savedEvent.getMessage();

            liveAlertService.broadcast(
                    savedEvent.getEventType(),
                    alertMessage,
                    savedEvent.getSeverity()
            );
        } catch (Exception exception) {
            // A notification failure should not undo a saved event.
            System.err.println(
                    "Live alert broadcast failed: "
                    + exception.getMessage()
            );
        }

        return savedEvent;
    }

    private void createIncidentIfMissing(SecurityEvent event) {

        // Prevent duplicate incidents for the same event
        if (event.getId() == null ||
                incidentRepository.findByEventId(event.getId()).isPresent()) {
            return;
        }

        Incident incident = new Incident();

        incident.setTitle(
                "Critical Security Event: " + event.getEventType());

        incident.setDescription(
                "Automatically created by SentinelX.\n" +
                "Event type: " + event.getEventType() + "\n" +
                "Message: " + event.getMessage() + "\n" +
                "Source IP: " + event.getSourceIp());

        incident.setEventId(event.getId());
        incident.setSourceIp(event.getSourceIp());
        incident.setSeverity("CRITICAL");
        incident.setStatus("OPEN");
        incident.setCreatedAt(Instant.now());
        incident.setUpdatedAt(Instant.now());

        incidentRepository.save(incident);
    }

    public List<SecurityEvent> getAllEvents() {
        return repository.findAll();
    }

    public long countEvents() {
        return repository.count();
    }

    public long countBySeverity(String severity) {
        return repository.findAll()
                .stream()
                .filter(event -> severity.equalsIgnoreCase(
                        event.getSeverity()))
                .count();
    }
}
