package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO đại diện cho dữ liệu tạo câu hỏi mới (từ file Excel hoặc từ AI prompt).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CauHoiCreateDTO {

    /**
     * Nội dung câu hỏi
     */
    private String noiDung;

    /**
     * Nội dung đáp án A
     */
    private String dapAnA;

    /**
     * Nội dung đáp án B
     */
    private String dapAnB;

    /**
     * Nội dung đáp án C
     */
    private String dapAnC;

    /**
     * Nội dung đáp án D
     */
    private String dapAnD;

    /**
     * Đáp án đúng: nhận giá trị "A", "B", "C" hoặc "D"
     */
    private String dapAnDung;
}

