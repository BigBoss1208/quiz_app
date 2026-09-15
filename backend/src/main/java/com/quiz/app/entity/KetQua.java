package com.quiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ket_qua")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KetQua {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ten_nguoi_choi", nullable = false, length = 255)
    private String tenNguoiChoi;

    // liên kết user thật nếu hệ thống có bảng User/đăng nhập
    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chu_de_id", nullable = false)
    private ChuDe chuDe;

    @Column(name = "diem_so", nullable = false)
    private Integer diemSo = 0;

    @Column(name = "so_cau_da_tra_loi")
    private Integer soCauDaTraLoi = 0;

    @Column(name = "thoi_gian_lam")
    private LocalDateTime thoiGianLam = LocalDateTime.now();
}
