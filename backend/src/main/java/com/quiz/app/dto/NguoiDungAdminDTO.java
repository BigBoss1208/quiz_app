package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class NguoiDungAdminDTO {

    @Getter @Setter @AllArgsConstructor
    public static class DanhSach {
        private Long id;
        private String username;
        private String hoTen;
        private String vaiTro;
        private long tongLuotChoi;
        private long tongDiem;
        private int diemCaoNhat;
    }

    @Getter @Setter @AllArgsConstructor
    public static class LichSuChoi {
        private Long ketQuaId;
        private String tenChuDe;
        private int diemSo;
        private int soCauDaTraLoi;
        private LocalDateTime thoiGianLam;
    }
}
