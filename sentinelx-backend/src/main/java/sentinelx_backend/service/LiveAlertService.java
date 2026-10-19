
package sentinelx_backend.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class LiveAlertService {

    private final SimpMessagingTemplate messagingTemplate;

    public LiveAlertService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcast(String type, String message, String severity) {
        Map<String, Object> alert = new LinkedHashMap<>();

        alert.put("type", type);
        alert.put("message", message);
        alert.put("severity", severity);
        alert.put("timestamp", Instant.now().toString());

        messagingTemplate.convertAndSend(
                "/topic/security-alerts",
                (Object) alert
        );
    }
}
