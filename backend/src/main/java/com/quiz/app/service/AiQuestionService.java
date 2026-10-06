package com.quiz.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quiz.app.dto.AiGenerateRequestDTO;
import com.quiz.app.dto.CauHoiCreateDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Service gọi Google Gemini AI API để tạo câu hỏi trắc nghiệm tự động (Prompt Engineering).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiQuestionService {

    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.builder().build();

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    /**
     * Sinh danh sách câu hỏi trắc nghiệm từ Gemini API theo chủ đề và số lượng yêu cầu.
     *
     * @param request chứa chủ đề, số lượng câu, độ khó
     * @return danh sách các câu hỏi DTO để hiển thị Preview trên frontend (chưa lưu vào DB)
     */
    public List<CauHoiCreateDTO> generateQuestions(AiGenerateRequestDTO request) {
        if (request == null || request.getTopic() == null || request.getTopic().trim().isEmpty()) {
            throw new IllegalArgumentException("Chủ đề câu hỏi không được để trống.");
        }

        int count = request.getCount() > 0 ? request.getCount() : 5;
        String topic = request.getTopic().trim();
        String doKho = (request.getDoKho() != null && !request.getDoKho().trim().isEmpty())
                ? request.getDoKho().trim()
                : "Cơ bản";

        // Kiểm tra xem đã có API key hợp lệ chưa
        if (apiKey == null || apiKey.trim().isEmpty() || "your_default_key".equalsIgnoreCase(apiKey.trim())) {
            throw new IllegalStateException("Chưa cấu hình GEMINI_API_KEY hợp lệ. Vui lòng cấu hình biến môi trường GEMINI_API_KEY hoặc cập nhật trong application.properties.");
        }

        // 1. Prompt Engineering: Thiết kế câu lệnh chặt chẽ
        String prompt = xayDungPrompt(topic, count, doKho);

        // 2. Chuẩn bị request body theo format chuẩn của Gemini API
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.7
                )
        );

        String endpointUrl = apiUrl + (apiUrl.contains("?") ? "&key=" : "?key=") + apiKey;

        try {
            log.info("Đang gửi yêu cầu tạo {} câu hỏi chủ đề '{}' đến Gemini API...", count, topic);

            String responseBody = restClient.post()
                    .uri(endpointUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                throw new RuntimeException("Phản hồi từ Gemini API rỗng.");
            }

            // 3. Trích xuất text từ response JSON của Gemini
            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode textNode = rootNode.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            if (textNode.isMissingNode() || textNode.asText().isBlank()) {
                throw new RuntimeException("Gemini API không trả về nội dung câu hỏi hợp lệ.");
            }

            String rawJsonText = textNode.asText();

            // 4. Xử lý chuỗi an toàn: loại bỏ markdown code fences nếu có
            String cleanJson = lamSachJson(rawJsonText);

            // 5. Parse JSON thành List<CauHoiCreateDTO>
            List<CauHoiCreateDTO> danhSach = objectMapper.readValue(
                    cleanJson,
                    new TypeReference<List<CauHoiCreateDTO>>() {}
            );

            // Chuẩn hóa lại đáp án đúng thành chữ in hoa A, B, C, D
            for (CauHoiCreateDTO dto : danhSach) {
                if (dto.getDapAnDung() != null) {
                    dto.setDapAnDung(dto.getDapAnDung().trim().toUpperCase());
                }
            }

            log.info("Gemini đã tạo thành công {} câu hỏi.", danhSach.size());
            return danhSach;

        } catch (Exception e) {
            log.error("Lỗi khi tạo câu hỏi bằng AI: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi tạo câu hỏi bằng AI: " + e.getMessage(), e);
        }
    }

    /**
     * Xây dựng câu Prompt chỉ dẫn chi tiết, ép định dạng đầu ra thành mảng JSON.
     */
    private String xayDungPrompt(String topic, int count, String doKho) {
        return """
                Bạn là một chuyên gia giáo dục và biên soạn đề thi trắc nghiệm chuyên nghiệp.
                Nhiệm vụ của bạn: Tạo chính xác %d câu hỏi trắc nghiệm tiếng Việt về chủ đề: "%s".
                Độ khó: %s.

                YÊU CẦU NỘI DUNG VÀ ĐỊNH DẠNG BẮT BUỘC:
                1. Mỗi câu hỏi phải có nội dung câu hỏi rõ ràng, không trùng lặp và 4 đáp án phân biệt (A, B, C, D).
                2. Chỉ có DUY NHẤT 1 đáp án đúng trong 4 đáp án.
                3. Trường "dapAnDung" bắt buộc chỉ nhận một trong 4 ký tự in hoa: "A", "B", "C", hoặc "D".
                4. KẾT QUẢ TRẢ VỀ DUY NHẤT PHẢI LÀ MỘT MẢNG JSON HỢP LỆ (JSON ARRAY).
                5. TUYỆT ĐỐI KHÔNG thêm bất kỳ lời chào, văn bản giải thích hay thẻ markdown nào ngoài mảng JSON.
                6. Mỗi phần tử trong mảng JSON phải có cấu trúc chính xác với các khóa sau:
                   - "noiDung": chuỗi nội dung câu hỏi
                   - "dapAnA": chuỗi đáp án A
                   - "dapAnB": chuỗi đáp án B
                   - "dapAnC": chuỗi đáp án C
                   - "dapAnD": chuỗi đáp án D
                   - "dapAnDung": chuỗi "A", "B", "C", hoặc "D"

                Ví dụ cấu trúc đầu ra:
                [
                  {
                    "noiDung": "Thủ đô của Việt Nam là thành phố nào?",
                    "dapAnA": "Hà Nội",
                    "dapAnB": "TP. Hồ Chí Minh",
                    "dapAnC": "Đà Nẵng",
                    "dapAnD": "Hải Phòng",
                    "dapAnDung": "A"
                  }
                ]
                """.formatted(count, topic, doKho);
    }

    /**
     * Loại bỏ các thẻ định dạng markdown như ```json hoặc văn bản ngoài lề,
     * chỉ giữ lại phần mảng JSON từ '[' đến ']'.
     */
    private String lamSachJson(String text) {
        if (text == null) {
            return "[]";
        }
        String cleaned = text.trim();

        // Xóa cú pháp bọc code block ```json ... ``` nếu AI trả về
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }

        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }

        cleaned = cleaned.trim();

        // Trích xuất chính xác phần mảng JSON nằm giữa cặp dấu ngoặc vuông '[' và ']'
        int startIndex = cleaned.indexOf('[');
        int endIndex = cleaned.lastIndexOf(']');
        if (startIndex != -1 && endIndex != -1 && endIndex > startIndex) {
            cleaned = cleaned.substring(startIndex, endIndex + 1);
        }

        return cleaned;
    }
}

