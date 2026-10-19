
package sentinelx_backend.controller;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import sentinelx_backend.model.SecurityEvent;
import sentinelx_backend.service.SecurityEventService;
import sentinelx_backend.investigation.ThreatInvestigationService;

@RestController
@RequestMapping("/api/events")
public class SecurityEventController {

    private final SecurityEventService service;
    private final ThreatInvestigationService investigationService;

    public SecurityEventController(
            SecurityEventService service,
            ThreatInvestigationService investigationService) {
        this.service = service;
        this.investigationService = investigationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SecurityEvent createEvent(
            @Valid @RequestBody SecurityEvent event) {
        return service.createEvent(event);
    }

    @GetMapping
    public List<SecurityEvent> getAllEvents() {
        return service.getAllEvents();
    }

    @GetMapping("/count/severity")
    public Map<String, Long> countBySeverity() {
        Map<String, Long> stats = new LinkedHashMap<>();

        stats.put("total", service.countEvents());
        stats.put("critical", service.countBySeverity("CRITICAL"));
        stats.put("high", service.countBySeverity("HIGH"));
        stats.put("medium", service.countBySeverity("MEDIUM"));
        stats.put("low", service.countBySeverity("LOW"));

        return stats;
    }

    @GetMapping("/{id}/investigate")
    public Map<String, Object> investigateEvent(
            @PathVariable String id) {
        return investigationService.investigate(id);
    }
}
