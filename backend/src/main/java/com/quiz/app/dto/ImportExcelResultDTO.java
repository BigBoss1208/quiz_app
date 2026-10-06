package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO chứa kết quả trả về sau khi import file Excel câu hỏi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportExcelResultDTO {

    /**
     * Số lượng câu hỏi đã import và lưu thành công vào CSDL
     */
    private int soCauThanhCong;

    /**
     * Danh sách thông báo lỗi chi tiết theo từng dòng (nếu có)
     */
    @Builder.Default
    private List<String> danhSachLoi = new ArrayList<>();
}

