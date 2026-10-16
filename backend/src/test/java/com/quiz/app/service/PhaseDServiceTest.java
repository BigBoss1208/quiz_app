package com.quiz.app.service;

import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import com.quiz.app.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockMultipartFile;
import java.util.*;
import java.io.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class PhaseDServiceTest {
    CauHoiRepository questions=mock(CauHoiRepository.class);
    ChuDeRepository topics=mock(ChuDeRepository.class);
    KetQuaRepository results=mock(KetQuaRepository.class);
    CauHoiService crud=new CauHoiService(questions,topics);
    QuizPlayService play=new QuizPlayService(topics,questions,mock(DapAnRepository.class),results,mock(BaiLamAdminService.class));
    QuestionImportService imports=new QuestionImportService(new ExcelCauHoiService());
    ChuDe topic() { ChuDe t=new ChuDe();t.setId(1L);when(topics.findById(1L)).thenReturn(Optional.of(t)); return t; }
    CauHoi question(CauHoi.LoaiCauHoi type) {
        CauHoi q=new CauHoi();q.setId(10L);q.setChuDe(topic());q.setLoaiCauHoi(type);q.setNoiDungCauHoi("中国 / Việt Nam");q.setGiaiThich("Giải thích bí mật");
        List<DapAn> answers=new ArrayList<>();
        for(int i=0;i<(type==CauHoi.LoaiCauHoi.TRAC_NGHIEM?4:2);i++) answers.add(new DapAn(100L+i,i==0?"中国":"Trung Quốc",type==CauHoi.LoaiCauHoi.DIEN_TU||i==0,i,q));
        q.setDanhSachDapAn(answers);return q;
    }
    @Test void createUpdateDeleteThreeKinds() {
        for(var kind:CauHoi.LoaiCauHoi.values()) {
            CauHoi input=question(kind);
            when(questions.save(any())).thenAnswer(i->i.getArgument(0));
            CauHoi saved=crud.them(input);
            assertEquals(kind,saved.getLoaiCauHoi());assertTrue(saved.getDanhSachDapAn().stream().allMatch(a->a.getCauHoi()==saved && a.getId()==null));
            CauHoi old=question(CauHoi.LoaiCauHoi.TRAC_NGHIEM);when(questions.findById(10L)).thenReturn(Optional.of(old));
            CauHoi updated=crud.capNhat(10L,input);assertEquals(kind,updated.getLoaiCauHoi());assertEquals(input.getGiaiThich(),updated.getGiaiThich());
            crud.xoa(10L);
        }
        verify(questions,times(3)).deleteById(10L);
    }
    @Test void invalidQuestionsNeverSaved() {
        for(var kind:CauHoi.LoaiCauHoi.values()) {
            CauHoi q=question(kind);q.getDanhSachDapAn().get(0).setNoiDung(" ");assertThrows(ResponseStatusException.class,()->crud.them(q));
        }
        CauHoi mc=question(CauHoi.LoaiCauHoi.TRAC_NGHIEM);mc.getDanhSachDapAn().get(1).setLaDapAnDung(true);assertThrows(ResponseStatusException.class,()->crud.them(mc));
        CauHoi tokens=question(CauHoi.LoaiCauHoi.SAP_XEP);tokens.getDanhSachDapAn().get(1).setThuTu(0);assertThrows(ResponseStatusException.class,()->crud.them(tokens));
        verify(questions,never()).save(any());
    }
    @Test void adminCreatedQuestionsAreGradedAndScoreOnlyReturnsNoSecrets() {
        for(var kind:CauHoi.LoaiCauHoi.values()) {
            CauHoi q=question(kind); doAnswer(i->{CauHoi saved=i.getArgument(0);saved.setId(10L);for(int n=0;n<saved.getDanhSachDapAn().size();n++)saved.getDanhSachDapAn().get(n).setId(100L+n);return saved;}).when(questions).save(any());
            crud.them(q);q.getChuDe().setHienDapAnSauNop(false);
            when(questions.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(q));when(results.save(any())).thenAnswer(i->i.getArgument(0));
            NopBaiRequestDTO.CauTraLoiDTO answer=new NopBaiRequestDTO.CauTraLoiDTO();answer.setCauHoiId(10L);answer.setDapAnId(100L);answer.setCauTraLoiText("中国");answer.setThuTuTokenIds(List.of(100L,101L));answer.setThoiGianTraLoi(5);
            NopBaiRequestDTO request=new NopBaiRequestDTO(1L,"Admin test",null,5,List.of(answer));
            var result=play.nopBai(request);assertEquals(250,result.getDiemSo());assertEquals(1,result.getSoCauDung());assertTrue(result.getDanhSachCauHoi().isEmpty());
            q.getChuDe().setHienDapAnSauNop(true);assertEquals("Giải thích bí mật",play.nopBai(request).getDanhSachCauHoi().get(0).getGiaiThich());
        }
    }
    @Test void practicePermissionAndSafePlayPayloadForThreeKinds() {
        for(var kind:CauHoi.LoaiCauHoi.values()) {
            CauHoi q=question(kind);when(questions.findById(10L)).thenReturn(Optional.of(q));when(questions.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(q));
            assertThrows(ResponseStatusException.class,()->play.practice(10L,new NopBaiRequestDTO.CauTraLoiDTO()));
            q.getChuDe().setChoPhepXemDapAn(true);assertNotNull(play.practice(10L,new NopBaiRequestDTO.CauTraLoiDTO()).dapAnDungText());
            var payload=play.layCauHoiDeChoi(1L).get(0); if(kind==CauHoi.LoaiCauHoi.DIEN_TU)assertTrue(payload.getDanhSachDapAn().isEmpty());else assertEquals(q.getDanhSachDapAn().size(),payload.getDanhSachDapAn().size());
        }
    }
    @Test void legacyExcelAndEveryNewTemplateRoundTripWithoutPersistence() throws Exception {
        var legacy=imports.preview(new MockMultipartFile("file","old.xlsx","",new ExcelCauHoiService().taoFileMauExcel()),1L);assertEquals(3,legacy.questions().size());assertTrue(legacy.warnings().isEmpty());
        for(String format:List.of("xlsx","docx")) for(var kind:CauHoi.LoaiCauHoi.values()) {
            var preview=imports.preview(new MockMultipartFile("file","test."+format,"",imports.template(format,kind.name())),1L);
            assertEquals(1,preview.questions().size());assertTrue(preview.warnings().isEmpty(),preview.warnings().toString());assertEquals(kind,preview.questions().get(0).getLoaiCauHoi());QuestionValidator.validate(preview.questions().get(0));
        }
        verify(questions,never()).save(any());
    }
    @Test void pdfTextAndScanAndCorruptFile() throws Exception {
        try(PDDocument doc=new PDDocument();ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            PDPage page=new PDPage();doc.addPage(page);
            try(PDPageContentStream content=new PDPageContentStream(doc,page)) {content.beginText();content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);content.newLineAtOffset(30,700);for(String line:List.of("TYPE: DIEN_TU","QUESTION: Country?","ANSWER: China|PRC")){content.showText(line);content.newLineAtOffset(0,-20);}content.endText();}
            doc.save(out);var preview=imports.preview(new MockMultipartFile("file","text.pdf","",out.toByteArray()),1L);assertEquals(1,preview.questions().size());assertTrue(preview.warnings().isEmpty());
        }
        try(PDDocument doc=new PDDocument();ByteArrayOutputStream out=new ByteArrayOutputStream()) {doc.addPage(new PDPage());doc.save(out);var scan=imports.preview(new MockMultipartFile("file","scan.pdf","",out.toByteArray()),1L);assertTrue(scan.questions().isEmpty());assertTrue(scan.warnings().get(0).contains("OCR"));}
        assertThrows(ResponseStatusException.class,()->imports.preview(new MockMultipartFile("file","bad.pdf","",new byte[]{1,2,3}),1L));
        assertThrows(ResponseStatusException.class,()->imports.preview(new MockMultipartFile("file","bad.exe","",new byte[]{1}),1L));
        assertThrows(ResponseStatusException.class,()->imports.preview(new MockMultipartFile("file","big.xlsx","",new byte[10*1024*1024+1]),1L));
    }
    @Test void groupCrudVisibilityReservedNameAndTopicLinks() {
        NhomMonRepository repo=mock(NhomMonRepository.class);NhomMonService service=new NhomMonService(repo,topics);when(topics.findAll()).thenReturn(List.of());when(repo.save(any())).thenAnswer(i->i.getArgument(0));
        NhomMon group=new NhomMon();group.setTen("Nghệ thuật");group.setId(7L);service.save(null,group);
        when(repo.findById(7L)).thenReturn(Optional.of(group));when(repo.findAllByOrderByThuTuAscIdAsc()).thenReturn(List.of(group));
        group.setHienThi(false);service.save(7L,group);assertTrue(service.list(false).isEmpty());assertEquals(1,service.list(true).size());
        ChuDe t=topic();t.setNhomMon(group);service.link(t);assertEquals("Nghệ thuật",t.getDanhMuc());when(topics.findAll()).thenReturn(List.of(t));assertThrows(ResponseStatusException.class,()->service.delete(7L));
        when(topics.findAll()).thenReturn(List.of());service.delete(7L);verify(repo).delete(group);
        group.setTen("Tất cả");assertThrows(ResponseStatusException.class,()->service.save(null,group));
    }

    @Test void shuffleSettingsPreserveQuestionAndAnswerIdentitiesWithoutLeakingKeys() throws Exception {
        CauHoi first=question(CauHoi.LoaiCauHoi.TRAC_NGHIEM);CauHoi second=question(CauHoi.LoaiCauHoi.DIEN_TU);second.setId(11L);second.setChuDe(first.getChuDe());
        when(questions.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(first,second));
        assertEquals(List.of(10L,11L),play.layCauHoiDeChoi(1L).stream().map(CauHoiChoiDTO::getId).toList());
        first.getChuDe().setXaoTronCauHoi(true);first.getChuDe().setXaoTronLuaChon(true);
        var payload=play.layCauHoiDeChoi(1L);assertEquals(Set.of(10L,11L),new HashSet<>(payload.stream().map(CauHoiChoiDTO::getId).toList()));
        var mc=payload.stream().filter(q->q.getId()==10L).findFirst().orElseThrow();assertEquals(Set.of(100L,101L,102L,103L),new HashSet<>(mc.getDanhSachDapAn().stream().map(CauHoiChoiDTO.DapAnChoiDTO::getId).toList()));
        String json=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);assertFalse(json.contains("laDapAnDung"));assertFalse(json.contains("thuTu"));assertFalse(json.contains("giaiThich"));
    }
}
