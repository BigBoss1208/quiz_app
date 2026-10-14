package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

public class AuthDTO {

    @Getter @Setter
    public static class LoginRequest {
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Size(max=100)
        private String username;
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Size(max=72)
        private String matKhau;
    }

    @Getter @Setter
    public static class RegisterRequest {
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Pattern(regexp="[A-Za-z0-9_.-]{3,100}")
        private String username;
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Size(min=8,max=72)
        private String matKhau;
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Size(max=255)
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
