
package sentinelx_backend.detection;

import org.springframework.stereotype.Service;
import sentinelx_backend.model.SecurityEvent;

@Service
public class ThreatDetectionService {

    public String detectThreat(SecurityEvent event) {

        String eventType = event.getEventType();
        String message = event.getMessage();

        if (eventType == null) {
            return "LOW";
        }

        eventType = eventType.toUpperCase();

        if (eventType.contains("BRUTE_FORCE")
                || eventType.contains("RANSOMWARE")) {
            return "CRITICAL";
        }

        if (eventType.contains("FAILED_LOGIN")
                || eventType.contains("SUSPICIOUS")
                || (message != null
                && message.toLowerCase().contains("multiple failed"))) {
            return "HIGH";
        }

        if (eventType.contains("SCAN")
                || eventType.contains("UNAUTHORIZED")) {
            return "MEDIUM";
        }

        return "LOW";
    }
}
