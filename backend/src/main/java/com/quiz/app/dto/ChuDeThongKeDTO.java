package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class ChuDeThongKeDTO {
    private Long id;
    private String tenChuDe;
    private String hinhAnh;
    private String moTa;
    private String doKho;
    private String danhMuc;
    private long soCauHoi;
    private long luotChoi;
    private List<TopDiemDTO> topDiemCao;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class TopDiemDTO {
        private String tenNguoiChoi;
        private Integer diemSo;
    }
}
