package com.quiz.app.controller;

import com.quiz.app.config.SecurityConfig;
import com.quiz.app.security.*;
import com.quiz.app.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtUtil.class})
class AdminSubmissionSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwt;
    @MockBean NguoiDungAdminService users;
    @MockBean ThongKeService stats;
    @MockBean BaiLamAdminService submissions;
    @Test void onlyAdminCanReadAnySubmissionIncludingOwnUserSubmission() throws Exception {
        mvc.perform(get("/api/admin/ketqua/1/bai-lam")).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/ketqua/1/bai-lam").header("Authorization", "Bearer " + jwt.taoToken("customer", "USER"))).andExpect(status().isForbidden());
        verifyNoInteractions(submissions);
        mvc.perform(get("/api/admin/ketqua/1/bai-lam").header("Authorization", "Bearer " + jwt.taoToken("admin", "ADMIN"))).andExpect(status().isOk());
        verify(submissions).xem(1L);
    }
}
