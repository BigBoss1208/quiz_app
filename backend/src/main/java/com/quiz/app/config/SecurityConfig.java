package com.quiz.app.config;

import com.quiz.app.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Đăng nhập, đăng ký — công khai
                .requestMatchers("/api/auth/**").permitAll()
                // Xem danh sách chủ đề / câu hỏi + chơi quiz — công khai, ai cũng chơi được không cần đăng nhập
                .requestMatchers(HttpMethod.GET, "/api/chude/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/cauhoi/**").permitAll()
                .requestMatchers("/api/choi/**").permitAll()
                // Thêm/sửa/xoá chủ đề, câu hỏi — chỉ ADMIN
                .requestMatchers(HttpMethod.POST, "/api/chude/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/chude/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/chude/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/cauhoi/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/cauhoi/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/cauhoi/**").hasRole("ADMIN")
                // Toàn bộ API dành riêng cho admin (danh sách người dùng, thống kê tổng quan)
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
