
package sentinelx_backend.controller;

import sentinelx_backend.model.Incident;
import sentinelx_backend.repository.IncidentRepository;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "http://localhost:5173")
public class IncidentController {

    private final IncidentRepository incidentRepository;

    public IncidentController(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    // Get all incidents
    @GetMapping
    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    // Get one incident by ID
    @GetMapping("/{id}")
    public Incident getIncidentById(@PathVariable String id) {
        return findIncident(id);
    }

    // Create a new incident
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Incident createIncident(@RequestBody Incident incident) {
        incident.setId(null);

        if (incident.getStatus() == null || incident.getStatus().isBlank()) {
            incident.setStatus("OPEN");
        }

        incident.setCreatedAt(Instant.now());
        incident.setUpdatedAt(Instant.now());

        return incidentRepository.save(incident);
    }

    // Update incident status
    @PatchMapping("/{id}/status")
    public Incident updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {

        Incident incident = findIncident(id);
        String status = request.get("status");

        if (status == null ||
                !List.of("OPEN", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE")
                        .contains(status.toUpperCase())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be OPEN, INVESTIGATING, RESOLVED, or FALSE_POSITIVE");
        }

        incident.setStatus(status.toUpperCase());
        incident.setUpdatedAt(Instant.now());

        return incidentRepository.save(incident);
    }

    // Add an analyst note
    @PostMapping("/{id}/notes")
    public Incident addAnalystNote(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {

        Incident incident = findIncident(id);
        String note = request.get("note");

        if (note == null || note.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Note cannot be empty");
        }

        incident.getAnalystNotes().add(note.trim());
        incident.setUpdatedAt(Instant.now());

        return incidentRepository.save(incident);
    }

    // Find an incident or return 404
    private Incident findIncident(String id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Incident not found"));
    }
}
