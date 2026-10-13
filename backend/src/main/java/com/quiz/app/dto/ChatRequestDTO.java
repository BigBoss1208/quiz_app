package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO nhận tin nhắn chat từ người dùng gửi tới AI Chatbot.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequestDTO {
    private String message;
    private QuestionContext questionContext;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionContext {
        private String question;
        private List<String> options;
        private String selectedAnswer;
        private String correctAnswer;
        private String outcome;
        private String explanation;
    }
}
