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

    private final SecretKey secretKey;

    public JwtUtil(@org.springframework.beans.factory.annotation.Value("${jwt.secret:}") String configured,
                   @org.springframework.beans.factory.annotation.Value("${app.production:false}") boolean production) {
        if (configured.isBlank()) {
            if (production) throw new IllegalStateException("JWT_SECRET must be configured in production");
            secretKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        } else {
            byte[] bytes = configured.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
            secretKey = Keys.hmacShaKeyFor(bytes);
        }
    }

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
