package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// DTO trả về khi CHƠI quiz — KHÔNG lộ đáp án đúng
@Getter
@Setter
@AllArgsConstructor
public class CauHoiChoiDTO {
    private Long id;
    private String noiDungCauHoi;
    private String hinhAnh;
    private List<DapAnChoiDTO> danhSachDapAn;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class DapAnChoiDTO {
        private Long id;
        private String noiDung;
    }
}
