package com.quiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

@Entity
@Table(name = "chu_de")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChuDe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ten_chu_de", nullable = false, length = 255)
    private String tenChuDe;

    @Column(name = "hinh_anh", length = 500)
    private String hinhAnh;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "do_kho", length = 50)
    private String doKho; // DE / TRUNG_BINH / KHO

    @Column(name = "danh_muc", length = 50)
    private String danhMuc; // "Khoa học" | "Xã hội" | "Nghệ thuật" ...

    @OneToMany(mappedBy = "chuDe", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<CauHoi> danhSachCauHoi;

    @OneToMany(mappedBy = "chuDe", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<KetQua> danhSachKetQua;
}
