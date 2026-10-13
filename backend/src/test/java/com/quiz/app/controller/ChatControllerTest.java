package com.quiz.app.controller;

import com.quiz.app.dto.ChatRequestDTO;
import com.quiz.app.dto.ChatResponseDTO;
import com.quiz.app.service.AiChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatControllerTest {

    private final AiChatService aiChatService = mock(AiChatService.class);
    private final ChatController controller = new ChatController(aiChatService);

    @Test
    void statusShowsKnowledgeFallbackWhenSeekAiIsNotConfigured() {
        when(aiChatService.isSeekAiConfigured()).thenReturn(false);

        var status = controller.status().getBody();

        assertFalse((Boolean) status.get("seekAiConfigured"));
        assertTrue((Boolean) status.get("fallbackAvailable"));
        assertEquals("KNOWLEDGE_BASE", status.get("source"));
    }

    @Test
    void chatReturnsSeekAiReplyAndItsSource() {
        when(aiChatService.chat(any())).thenReturn(new AiChatService.ChatReply("SeekAI reply", "SEEKAI", null));

        ResponseEntity<ChatResponseDTO> response = controller.chat(
                new ChatRequestDTO("Giải thích giúp tôi.", null), request("192.0.2.1"));

        assertEquals(200, response.getStatusCode().value());
        assertEquals("SeekAI reply", response.getBody().getReply());
        assertEquals("SEEKAI", response.getBody().getSource());
    }

    @Test
    void chatReturnsKnowledgeBaseReplyWhenProviderIsUnavailable() {
        when(aiChatService.chat(any()))
                .thenReturn(new AiChatService.ChatReply("Theo kho hướng dẫn Quiz", "KNOWLEDGE_BASE", null));

        ResponseEntity<ChatResponseDTO> response = controller.chat(
                new ChatRequestDTO("Trả lời sai có bị dừng bài không?", null), request("192.0.2.2"));

        assertEquals(200, response.getStatusCode().value());
        assertEquals("KNOWLEDGE_BASE", response.getBody().getSource());
        assertNull(response.getBody().getError());
    }

    @Test
    void rateLimitReturns429InsteadOfCallingProviderAgain() {
        when(aiChatService.chat(any())).thenReturn(new AiChatService.ChatReply("Answer", "SEEKAI", null));
        HttpServletRequest request = request("192.0.2.3");

        for (int index = 0; index < 10; index++) {
            assertEquals(200, controller.chat(new ChatRequestDTO("Quiz?", null), request).getStatusCode().value());
        }
        ResponseEntity<ChatResponseDTO> limited = controller.chat(new ChatRequestDTO("Quiz?", null), request);

        assertEquals(429, limited.getStatusCode().value());
        assertTrue(limited.getBody().getError().contains("quá nhanh"));
    }

    private static HttpServletRequest request(String address) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn(address);
        return request;
    }
}
