package com.quiz.app.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    // Khoá bí mật để ký token — trong thực tế nên đưa vào application.properties / biến môi trường
    private final SecretKey secretKey = Keys.hmacShaKeyFor(
            "quiz-app-secret-key-phai-du-dai-toi-thieu-32-ky-tu-vietnam".getBytes());

    private static final long HAN_TOKEN_MS = 24 * 60 * 60 * 1000; // 24 giờ

    public String taoToken(String username, String vaiTro) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + HAN_TOKEN_MS);

        return Jwts.builder()
                .setSubject(username)
                .claim("vaiTro", vaiTro)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims giaiMaToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean tokenHopLe(String token) {
        try {
            giaiMaToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String layUsername(String token) {
        return giaiMaToken(token).getSubject();
    }

    public String layVaiTro(String token) {
        return giaiMaToken(token).get("vaiTro", String.class);
    }
}
