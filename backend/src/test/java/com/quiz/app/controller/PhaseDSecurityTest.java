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
import org.springframework.mock.web.MockMultipartFile;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({NhomMonController.class, QuestionImportController.class, CauHoiController.class})
@Import({SecurityConfig.class,JwtAuthFilter.class,JwtUtil.class})
class PhaseDSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwt;
    @MockBean NhomMonService groups;
    @MockBean QuestionImportService imports;
    @MockBean CauHoiService questions;
    @MockBean ExcelCauHoiService excel;
    @MockBean AiQuestionService ai;
    @Test void corsAllowsConfiguredFrontendAndRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/admin/import/preview").header("Origin","https://quiz-app.quangmanh12082005.workers.dev").header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","https://quiz-app.quangmanh12082005.workers.dev"));
        mvc.perform(options("/api/nhom-mon").header("Origin","https://untrusted.invalid").header("Access-Control-Request-Method","GET")).andExpect(status().isForbidden());
    }
    @Test void publicGroupsButAllAdminAliasesRejectCustomerAndGuest() throws Exception {
        mvc.perform(get("/api/nhom-mon")).andExpect(status().isOk());
        for(String path:List.of("/api/admin/nhom-mon","/api/cauhoi","/api/admin/cauhoi","/admin/cauhoi")) {
            mvc.perform(get(path)).andExpect(status().isForbidden());
            mvc.perform(get(path).header("Authorization","Bearer "+jwt.taoToken("customer","USER"))).andExpect(status().isForbidden());
            mvc.perform(get(path).header("Authorization","Bearer "+jwt.taoToken("admin","ADMIN"))).andExpect(status().isOk());
        }
    }
    @Test void importPreviewAndConfirmAreAdminOnlyAndPreviewNeverSaves() throws Exception {
        MockMultipartFile file=new MockMultipartFile("file","test.docx","",new byte[]{1});
        for(String role:List.of("USER","ADMIN")) {
            when(imports.preview(any(),eq(1L))).thenReturn(new QuestionImportService.Preview(List.of(),List.of("test")));
            mvc.perform(multipart("/api/admin/import/preview").file(file).param("chuDeId","1").header("Authorization","Bearer "+jwt.taoToken("user",role))).andExpect(role.equals("ADMIN")?status().isOk():status().isForbidden());
        }
        verify(questions,never()).them(any());
        mvc.perform(post("/api/admin/import/confirm").contentType("application/json").content("[]").header("Authorization","Bearer "+jwt.taoToken("user","USER"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/import/confirm").contentType("application/json").content("[]").header("Authorization","Bearer "+jwt.taoToken("admin","ADMIN"))).andExpect(status().isBadRequest());
    }
}
