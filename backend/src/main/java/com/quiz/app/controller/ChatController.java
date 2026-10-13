package com.quiz.app.controller;

import com.quiz.app.dto.ChatRequestDTO;
import com.quiz.app.dto.ChatResponseDTO;
import com.quiz.app.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

/**
 * Controller xử lý tin nhắn gửi tới Chatbot AI trợ lý ảo QuizVN.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatController {

    private final AiChatService aiChatService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        boolean configured = aiChatService.isSeekAiConfigured();
        return ResponseEntity.ok(Map.of(
                "seekAiConfigured", configured,
                "fallbackAvailable", true,
                "source", configured ? "SEEKAI" : "KNOWLEDGE_BASE"
        ));
    }

    /**
     * Endpoint nhận tin nhắn của người dùng và trả về phản hồi từ AI.
     */
    @PostMapping
    public ResponseEntity<ChatResponseDTO> chat(@RequestBody ChatRequestDTO request, HttpServletRequest httpRequest) {
        try {
            if (!rateLimitAllowed(httpRequest.getRemoteAddr())) {
                return ResponseEntity.status(429)
                        .body(new ChatResponseDTO(null, "Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau một phút.", null, null));
            }
            AiChatService.ChatReply reply = aiChatService.chat(request);
            return ResponseEntity.ok(new ChatResponseDTO(reply.reply(), null, reply.source(), reply.notice()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(new ChatResponseDTO(null, e.getMessage(), null, null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ChatResponseDTO(null, e.getMessage(), null, null));
        }
    }

    private final Map<String, java.util.List<Long>> requestsByClient = new java.util.concurrent.ConcurrentHashMap<>();

    private synchronized boolean rateLimitAllowed(String clientAddress) {
        long now = System.currentTimeMillis();
        requestsByClient.values().forEach(requests ->
                requests.removeIf(timestamp -> now - timestamp >= 60_000));
        requestsByClient.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        java.util.List<Long> requests = requestsByClient.computeIfAbsent(clientAddress, key -> new java.util.ArrayList<>());
        if (requests.size() >= 10) {
            return false;
        }
        requests.add(now);
        return true;
    }
}
