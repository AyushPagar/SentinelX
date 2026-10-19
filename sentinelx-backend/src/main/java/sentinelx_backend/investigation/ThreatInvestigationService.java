
package sentinelx_backend.investigation;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import sentinelx_backend.model.SecurityEvent;
import sentinelx_backend.repository.SecurityEventRepository;

@Service
public class ThreatInvestigationService {

    private final SecurityEventRepository repository;

    public ThreatInvestigationService(
            SecurityEventRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> investigate(String id) {

        SecurityEvent event = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Security event not found: " + id));

        String eventType = event.getEventType() == null
                ? "UNKNOWN"
                : event.getEventType().toUpperCase(Locale.ROOT);

        String message = event.getMessage() == null
                ? ""
                : event.getMessage().toLowerCase(Locale.ROOT);

        String severity = event.getSeverity() == null
                ? "LOW"
                : event.getSeverity().toUpperCase(Locale.ROOT);

        String riskLevel = severity;
        String summary;
        String reasoning;
        String attackHypothesis;
        List<String> actions;

        if (eventType.contains("BRUTE_FORCE")) {
            riskLevel = "CRITICAL";
            summary = "Possible brute-force login attack";
            reasoning = "The event type indicates repeated attempts "
                    + "to gain access to an account.";
            attackHypothesis = "An attacker may be trying multiple "
                    + "passwords to compromise an account.";

            actions = List.of(
                    "Review authentication logs for repeated failures.",
                    "Check whether any login attempt succeeded.",
                    "Apply rate limiting and appropriate account protections.",
                    "Block the source IP if malicious activity is confirmed."
            );

        } else if (eventType.contains("RANSOMWARE")) {
            riskLevel = "CRITICAL";
            summary = "Possible ransomware-related activity";
            reasoning = "The event type matches a ransomware indicator. "
                    + "The event alone does not confirm an infection.";
            attackHypothesis = "A system may be experiencing activity "
                    + "associated with file encryption or ransomware.";

            actions = List.of(
                    "Follow your organization's incident response procedure.",
                    "Isolate the affected host if compromise is suspected.",
                    "Preserve relevant security logs and evidence.",
                    "Check endpoint alerts and backup integrity."
            );

        } else if (eventType.contains("FAILED_LOGIN")
                || eventType.contains("SUSPICIOUS")
                || message.contains("multiple failed")) {
            riskLevel = "HIGH";
            summary = "Suspicious authentication or system activity";
            reasoning = "The event contains indicators of repeated "
                    + "failed authentication or suspicious behavior.";
            attackHypothesis = "The activity may indicate unauthorized "
                    + "access attempts or abnormal system behavior.";

            actions = List.of(
                    "Review related authentication and system logs.",
                    "Check for successful logins from the same source IP.",
                    "Verify the activity with the system owner.",
                    "Escalate if additional indicators are discovered."
            );

        } else if (eventType.contains("SCAN")
                || eventType.contains("UNAUTHORIZED")) {
            riskLevel = "MEDIUM";
            summary = "Possible network scanning or unauthorized access";
            reasoning = "The event type matches a network scanning "
                    + "or access-control indicator.";
            attackHypothesis = "A host may be probing services or "
                    + "attempting to access a restricted resource.";

            actions = List.of(
                    "Review firewall and network logs.",
                    "Identify the destination services involved.",
                    "Check whether the source host is authorized.",
                    "Investigate repeated or related events."
            );

        } else {
            summary = "General security event review";
            reasoning = "No specific high-risk rule matched this event. "
                    + "Additional logs and context may be needed.";
            attackHypothesis = "The event may be routine activity "
                    + "or an indicator that needs further review.";

            actions = List.of(
                    "Verify the event with its system owner.",
                    "Review related events and timestamps.",
                    "Check whether the source IP is expected.",
                    "Escalate if suspicious evidence is found."
            );
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("eventId", event.getId());
        result.put("eventType", event.getEventType());
        result.put("sourceIp", event.getSourceIp());
        result.put("destinationIp", event.getDestinationIp());
        result.put("originalSeverity", event.getSeverity());
        result.put("riskLevel", riskLevel);
        result.put("summary", summary);
        result.put("reasoning", reasoning);
        result.put("attackHypothesis", attackHypothesis);
        result.put("recommendedActions", actions);
        result.put("analysisType", "RULE_BASED");
        result.put("disclaimer",
                "This is an automated preliminary assessment, "
                + "not confirmation of an actual attack.");

        return result;
    }
}
