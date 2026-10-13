package com.quiz.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.ChatRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private static final String SYSTEM_INSTRUCTION =
            "Bạn là trợ lý học tập của QuizVN. Hãy trả lời bằng tiếng Việt, thân thiện và rõ ràng; "
                + "giải thích kiến thức và hướng dẫn cách suy luận. Không bịa thông tin. "
                + "Nếu người dùng đang làm bài kiểm tra hoặc hỏi đáp án của câu chưa nộp, "
                + "không đưa đáp án trực tiếp; chỉ hướng dẫn khái niệm và cách suy nghĩ.";

    private final ObjectMapper objectMapper;
    private final StudyKnowledgeBase knowledgeBase;

    @Value("${seekai.api.key:}")
    private String apiKey;

    @Value("${seekai.api.base-url:}")
    private String apiBaseUrl;

    @Value("${seekai.api.model:}")
    private String model;

    public boolean isSeekAiConfigured() {
        return apiKey != null && !apiKey.isBlank()
                && model != null && !model.isBlank()
                && apiBaseUrl != null && !apiBaseUrl.isBlank();
    }

    public ChatReply chat(ChatRequestDTO request) {
        validate(request);
        String notice = null;
        if (isSeekAiConfigured()) {
            try {
                return new ChatReply(hoiSeekAi(request), "SEEKAI", null);
            } catch (RestClientException | JsonProcessingException | IllegalStateException e) {
                log.warn("SeekAI request failed; answering from the verified knowledge base ({})",
                        e.getClass().getSimpleName());
                notice = "SeekAI tạm thời không phản hồi; câu trả lời dùng kho hướng dẫn Quiz dự phòng.";
            }
        }

        String reply = knowledgeBase.answer(request.getMessage(), request.getQuestionContext());
        return new ChatReply(reply, "KNOWLEDGE_BASE", notice);
    }

    private String hoiSeekAi(ChatRequestDTO request) throws JsonProcessingException {
        String prompt = taoPrompt(request);
        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_INSTRUCTION),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4,
                "max_tokens", 500
        );
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(12000);

        String baseUrl = apiBaseUrl == null ? "" : apiBaseUrl.trim().replaceAll("/+$", "");
        if (baseUrl.isEmpty()) {
            throw new IllegalStateException("SeekAI base URL is not configured.");
        }
        String body = RestClient.builder()
                .requestFactory(requestFactory)
                .build()
                .post()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        if (body == null || body.isBlank()) {
            throw new IllegalStateException("SeekAI returned an empty response.");
        }
        JsonNode content = objectMapper.readTree(body)
                .path("choices")
                .path(0)
                .path("message")
                .path("content");
        if (content.isMissingNode() || !content.isTextual() || content.asText().isBlank()) {
            throw new IllegalStateException("SeekAI returned no message content.");
        }
        return content.asText().trim();
    }

    private String taoPrompt(ChatRequestDTO request) {
        StringBuilder prompt = new StringBuilder(request.getMessage().trim());
        ChatRequestDTO.QuestionContext context = request.getQuestionContext();
        if (context != null) {
            prompt.append("\n\nNgữ cảnh câu hỏi đã được chấm sau khi nộp bài:")
                    .append("\nCâu hỏi: ").append(context.getQuestion())
                    .append("\nCác lựa chọn: ").append(context.getOptions())
                    .append("\nLựa chọn của người học: ").append(context.getSelectedAnswer())
                    .append("\nĐáp án đúng: ").append(context.getCorrectAnswer())
                    .append("\nKết quả: ").append(context.getOutcome());
            if (context.getExplanation() != null && !context.getExplanation().isBlank()) {
                prompt.append("\nGiải thích có sẵn: ").append(context.getExplanation());
            } else {
                prompt.append("\nCâu hỏi không có lời giải được lưu; hãy tự suy luận từ nội dung và nêu rõ đây là giải thích suy luận.");
            }
        }
        return prompt.toString();
    }

    private void validate(ChatRequestDTO request) {
        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            throw new IllegalArgumentException("Tin nhắn không được để trống.");
        }
        if (request.getMessage().length() > 2000) {
            throw new IllegalArgumentException("Tin nhắn không được vượt quá 2000 ký tự.");
        }
        if (request.getQuestionContext() != null
                && (request.getQuestionContext().getQuestion() == null
                || request.getQuestionContext().getQuestion().length() > 2000)) {
            throw new IllegalArgumentException("Ngữ cảnh câu hỏi không hợp lệ.");
        }
        ChatRequestDTO.QuestionContext context = request.getQuestionContext();
        if (context != null && (context.getOptions() == null || context.getOptions().size() > 8
                || context.getOptions().stream().anyMatch(option -> option == null || option.length() > 500)
                || tooLong(context.getSelectedAnswer(), 500)
                || tooLong(context.getCorrectAnswer(), 500)
                || tooLong(context.getExplanation(), 2000))) {
            throw new IllegalArgumentException("Ngữ cảnh câu hỏi vượt quá giới hạn cho phép.");
        }
    }

    private boolean tooLong(String value, int limit) {
        return value != null && value.length() > limit;
    }

    public record ChatReply(String reply, String source, String notice) {
    }
}
