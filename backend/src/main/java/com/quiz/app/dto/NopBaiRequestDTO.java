package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NopBaiRequestDTO {
    private Long chuDeId;
    private String tenNguoiChoi;
    private Long userId;
    private int thoiGianLam;
    private List<CauTraLoiDTO> danhSachTraLoi;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CauTraLoiDTO {
        private Long cauHoiId;
        private Long dapAnId;
        private int thoiGianTraLoi;
    }
}
