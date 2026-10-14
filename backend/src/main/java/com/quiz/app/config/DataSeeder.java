package com.quiz.app.config;

import com.quiz.app.entity.NguoiDung;
import com.quiz.app.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.seed.enabled", havingValue="true")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;
    @org.springframework.beans.factory.annotation.Value("${SEED_ADMIN_PASSWORD:}")
    private String initialPassword;

    @Override
    public void run(String... args) {
        if (!nguoiDungRepository.existsByUsername("admin")) {
            if (initialPassword.isBlank()) throw new IllegalStateException("SEED_ADMIN_PASSWORD is required when seeding an admin");
            NguoiDung admin = new NguoiDung();
            admin.setUsername("admin");
            admin.setMatKhau(passwordEncoder.encode(initialPassword));
            admin.setHoTen("Quản trị viên");
            admin.setVaiTro(NguoiDung.VaiTro.ADMIN);
            nguoiDungRepository.save(admin);
            System.out.println(">>> Đã tạo tài khoản admin theo cấu hình seed");
        }
    }
}
