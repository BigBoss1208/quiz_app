package com.quiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "nguoi_dung")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NguoiDung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false)
    private String matKhau; // đã mã hoá bằng BCrypt

    @Column(name = "ho_ten", length = 255)
    private String hoTen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VaiTro vaiTro = VaiTro.USER;

    public enum VaiTro {
        ADMIN, USER
    }
}
