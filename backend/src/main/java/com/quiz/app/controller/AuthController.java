package com.quiz.app.controller;

import com.quiz.app.dto.AuthDTO;
import com.quiz.app.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> dangNhap(@jakarta.validation.Valid @RequestBody AuthDTO.LoginRequest req) {
        try {
            return ResponseEntity.ok(authService.dangNhap(req.getUsername(), req.getMatKhau()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(java.util.Map.of("message","Sai tên đăng nhập hoặc mật khẩu"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> dangKy(@jakarta.validation.Valid @RequestBody AuthDTO.RegisterRequest req) {
        try {
            return ResponseEntity.ok(authService.dangKy(req.getUsername(), req.getMatKhau(), req.getHoTen()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(java.util.Map.of("message","Không thể đăng ký; kiểm tra dữ liệu hoặc tên đăng nhập đã tồn tại"));
        }
    }
}
