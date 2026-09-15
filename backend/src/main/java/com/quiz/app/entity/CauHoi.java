package com.quiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

@Entity
@Table(name = "cau_hoi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CauHoi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "noi_dung_cau_hoi", nullable = false, columnDefinition = "TEXT")
    private String noiDungCauHoi;

    @Column(name = "hinh_anh", length = 500)
    private String hinhAnh;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chu_de_id", nullable = false)
    private ChuDe chuDe;

    @OneToMany(mappedBy = "cauHoi", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DapAn> danhSachDapAn;
}
