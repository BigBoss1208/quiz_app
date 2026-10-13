package com.quiz.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.ChatRequestDTO;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class StudyKnowledgeBase {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "ai", "anh", "ban", "bao", "bi", "cac", "cho", "co", "cua",
            "gi", "giup", "hay", "la", "lam", "minh", "mot", "nao", "nhu",
            "o", "sao", "the", "toi", "trong", "tu", "va", "voi", "vay"
    );
    private static final String NO_MATCH =
            "Mình chưa tìm thấy thông tin phù hợp trong kho hướng dẫn Quiz. Bạn thử hỏi cụ thể hơn về cách dùng website nhé.";

    private final List<KnowledgeEntry> entries;

    public StudyKnowledgeBase(ObjectMapper objectMapper) {
        try {
            this.entries = objectMapper.readValue(
                    new ClassPathResource("study-knowledge.json").getInputStream(),
                    new TypeReference<List<KnowledgeEntry>>() { }
            );
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tải kho hướng dẫn chatbot Quiz.", e);
        }
        if (entries.isEmpty() || entries.size() > 100) {
            throw new IllegalStateException("Kho hướng dẫn chatbot phải có từ 1 đến 100 mục.");
        }
    }

    public String answer(String message, ChatRequestDTO.QuestionContext context) {
        if (context != null) {
            return answerForSubmittedQuestion(context);
        }
        Set<String> queryTokens = tokens(message);
        if (queryTokens.size() < 2) {
            return NO_MATCH;
        }

        KnowledgeEntry best = null;
        double bestScore = 0;
        for (KnowledgeEntry entry : entries) {
            List<String> phrases = new ArrayList<>();
            phrases.add(entry.question());
            phrases.addAll(entry.aliases());
            for (String phrase : phrases) {
                Set<String> phraseTokens = tokens(phrase);
                long matches = queryTokens.stream().filter(phraseTokens::contains).count();
                double score = matches / (double) Math.max(queryTokens.size(), phraseTokens.size());
                if (matches >= 2 && score > bestScore) {
                    best = entry;
                    bestScore = score;
                }
            }
        }
        return best != null && bestScore >= 0.45 ? best.answer() : NO_MATCH;
    }

    private String answerForSubmittedQuestion(ChatRequestDTO.QuestionContext context) {
        if (context.getQuestion() == null || context.getCorrectAnswer() == null
                || context.getCorrectAnswer().isBlank()) {
            return "Mình chưa nhận đủ nội dung và đáp án đã chấm để giải thích câu này.";
        }
        StringBuilder response = new StringBuilder("Sau khi nộp bài, đáp án đúng là: ")
                .append(context.getCorrectAnswer()).append('.');
        if (context.getSelectedAnswer() != null && !context.getSelectedAnswer().isBlank()) {
            response.append(" Lựa chọn của bạn: ").append(context.getSelectedAnswer()).append('.');
        }
        if (context.getExplanation() != null && !context.getExplanation().isBlank()) {
            response.append(" Giải thích được cung cấp: ").append(context.getExplanation());
        } else {
            response.append(" Câu hỏi chưa có lời giải được cung cấp; kho hướng dẫn không tự suy đoán lời giải cho nội dung này.");
        }
        return response.toString();
    }

    public int size() {
        return entries.size();
    }

    private static Set<String> tokens(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return Set.of();
        }
        Set<String> result = new HashSet<>();
        Arrays.stream(normalized.split("\\s+"))
                .filter(token -> token.length() > 1 && !STOP_WORDS.contains(token))
                .forEach(result::add);
        return result;
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replace('đ', 'd');
        return NON_WORD.matcher(DIACRITICS.matcher(normalized).replaceAll("")).replaceAll(" ").trim();
    }

    public record KnowledgeEntry(
            String id,
            String category,
            String question,
            List<String> aliases,
            String answer
    ) {
    }
}
