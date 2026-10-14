package com.quiz.app.service;
import com.quiz.app.security.JwtUtil;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
class JwtConfigurationTest {
    @Test void productionRequiresStrongSecretAndTokensCannotCrossDifferentKeys() {
        assertThrows(IllegalStateException.class,()->new JwtUtil("",true));
        assertThrows(IllegalStateException.class,()->new JwtUtil("short",true));
        String secret=UUID.randomUUID().toString()+UUID.randomUUID();
        JwtUtil first=new JwtUtil(secret,true),same=new JwtUtil(secret,true),other=new JwtUtil("",false);
        String token=first.taoToken("qa","USER");assertTrue(same.tokenHopLe(token));assertFalse(other.tokenHopLe(token));assertEquals("USER",same.layVaiTro(token));
    }
}
