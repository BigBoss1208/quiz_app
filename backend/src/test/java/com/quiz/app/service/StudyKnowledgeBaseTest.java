package com.quiz.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.ChatRequestDTO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StudyKnowledgeBaseTest {

    private final StudyKnowledgeBase knowledgeBase = new StudyKnowledgeBase(new ObjectMapper());

    @Test
    void loadsNoMoreThanOneHundredVerifiedWebsiteAnswers() {
        assertTrue(knowledgeBase.size() > 0);
        assertTrue(knowledgeBase.size() <= 100);
    }

    @Test
    void findsQuizHelpWithUnaccentedVietnamese() {
        String answer = knowledgeBase.answer("tra loi sai co bi dung bai khong", null);

        assertTrue(answer.contains("Không. Trả lời sai không kết thúc bài"));
    }

    @Test
    void declinesToGuessWhenNoKnowledgeMatches() {
        String answer = knowledgeBase.answer("thoi tiet sao hoa ngay mai", null);

        assertTrue(answer.contains("chưa tìm thấy thông tin phù hợp"));
    }

    @Test
    void onlyExplainsAnAnswerWhenAQuestionContextIsProvidedAfterSubmission() {
        String normalQuestion = knowledgeBase.answer("dap an dung cua cau thu do la gi", null);
        ChatRequestDTO.QuestionContext context = new ChatRequestDTO.QuestionContext(
                "Thủ đô của Việt Nam là gì?", java.util.List.of("Hà Nội", "Đà Nẵng"),
                "Đà Nẵng", "Hà Nội", "SAI", null);
        String submittedQuestion = knowledgeBase.answer("giải thích đáp án giúp tôi", context);

        assertTrue(!normalQuestion.contains("Hà Nội"));
        assertTrue(submittedQuestion.contains("đáp án đúng là: Hà Nội"));
        assertTrue(submittedQuestion.contains("chưa có lời giải được cung cấp"));
    }

    @Test
    void missingSeekAiConfigurationUsesTheKnowledgeBaseWithoutCallingAnExternalService() {
        AiChatService service = new AiChatService(new ObjectMapper(), knowledgeBase);
        ReflectionTestUtils.setField(service, "apiKey", "");
        ReflectionTestUtils.setField(service, "model", "");

        AiChatService.ChatReply reply = service.chat(new ChatRequestDTO("trả lời sai có bị dừng bài không", null));

        assertEquals("KNOWLEDGE_BASE", reply.source());
        assertTrue(reply.reply().contains("Không. Trả lời sai không kết thúc bài"));
        assertEquals(null, reply.notice());
    }

    @Test
    void unavailableSeekAiUsesFallbackAndClearlyIdentifiesTheProviderFailure() {
        AiChatService service = new AiChatService(new ObjectMapper(), knowledgeBase);
        ReflectionTestUtils.setField(service, "apiKey", "unit-test-key");
        ReflectionTestUtils.setField(service, "model", "unit-test-model");
        ReflectionTestUtils.setField(service, "apiBaseUrl", "http://127.0.0.1:1/v1");

        AiChatService.ChatReply reply = service.chat(new ChatRequestDTO("trả lời sai có bị dừng bài không", null));

        assertEquals("KNOWLEDGE_BASE", reply.source());
        assertTrue(reply.reply().contains("Không. Trả lời sai không kết thúc bài"));
        assertTrue(reply.notice().contains("SeekAI tạm thời không phản hồi"));
    }
}
