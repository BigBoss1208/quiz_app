package com.quiz.app.service;

import com.quiz.app.dto.AuthDTO;
import com.quiz.app.entity.NguoiDung;
import com.quiz.app.repository.NguoiDungRepository;
import com.quiz.app.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthDTO.AuthResponse dangNhap(String username, String matKhau) {
        NguoiDung nguoiDung = nguoiDungRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Sai tên đăng nhập hoặc mật khẩu"));

        if (!passwordEncoder.matches(matKhau, nguoiDung.getMatKhau())) {
            throw new RuntimeException("Sai tên đăng nhập hoặc mật khẩu");
        }

        String token = jwtUtil.taoToken(nguoiDung.getUsername(), nguoiDung.getVaiTro().name());
        return new AuthDTO.AuthResponse(token, nguoiDung.getId(), nguoiDung.getUsername(),
                nguoiDung.getHoTen(), nguoiDung.getVaiTro().name());
    }

    // Đăng ký — luôn tạo tài khoản role USER (người chơi thường)
    public AuthDTO.AuthResponse dangKy(String username, String matKhau, String hoTen) {
        if (nguoiDungRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        NguoiDung nguoiDung = new NguoiDung();
        nguoiDung.setUsername(username);
        nguoiDung.setMatKhau(passwordEncoder.encode(matKhau));
        nguoiDung.setHoTen(hoTen);
        nguoiDung.setVaiTro(NguoiDung.VaiTro.USER);
        nguoiDungRepository.save(nguoiDung);

        String token = jwtUtil.taoToken(nguoiDung.getUsername(), nguoiDung.getVaiTro().name());
        return new AuthDTO.AuthResponse(token, nguoiDung.getId(), nguoiDung.getUsername(),
                nguoiDung.getHoTen(), nguoiDung.getVaiTro().name());
    }
}
