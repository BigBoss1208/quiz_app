package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận yêu cầu tạo câu hỏi tự động bằng AI từ Client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiGenerateRequestDTO {

    /**
     * Chủ đề câu hỏi (ví dụ: Lịch sử Việt Nam, Lập trình Java, Địa lý thế giới...)
     */
    private String topic;

    /**
     * Số lượng câu hỏi muốn AI sinh (ví dụ: 5, 10)
     */
    private int count;

    /**
     * Độ khó của câu hỏi (ví dụ: Cơ bản, Trung bình, Nâng cao)
     */
    private String doKho;
}

