package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

public class AuthDTO {

    @Getter @Setter
    public static class LoginRequest {
        private String username;
        private String matKhau;
    }

    @Getter @Setter
    public static class RegisterRequest {
        private String username;
        private String matKhau;
        private String hoTen;
    }

    @Getter @Setter @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private Long id;
        private String username;
        private String hoTen;
        private String vaiTro;
    }
}
