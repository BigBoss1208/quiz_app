package com.quiz.app.config;

import com.quiz.app.entity.NguoiDung;
import com.quiz.app.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!nguoiDungRepository.existsByUsername("admin")) {
            NguoiDung admin = new NguoiDung();
            admin.setUsername("admin");
            admin.setMatKhau(passwordEncoder.encode("admin123"));
            admin.setHoTen("Quản trị viên");
            admin.setVaiTro(NguoiDung.VaiTro.ADMIN);
            nguoiDungRepository.save(admin);
            System.out.println(">>> Đã tạo tài khoản admin mặc định: admin / admin123");
        }
    }
}
