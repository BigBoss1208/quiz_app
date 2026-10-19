package com.quiz.app.service;

import com.quiz.app.dto.*;
import com.quiz.app.entity.*;
import com.quiz.app.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MultiAnswerServiceTest {
    final ChuDeRepository topics = mock(ChuDeRepository.class);
    final CauHoiRepository questions = mock(CauHoiRepository.class);
    final KetQuaRepository results = mock(KetQuaRepository.class);
    final BaiLamAdminService snapshots = mock(BaiLamAdminService.class);
    final QuizPlayService play = new QuizPlayService(topics, questions, mock(DapAnRepository.class), results, snapshots);
    final QuestionImportService imports = new QuestionImportService(new ExcelCauHoiService());
    CauHoi fixture() {
        ChuDe topic = new ChuDe(); topic.setId(1L); topic.setChoPhepXemDapAn(true);
        CauHoi q = new CauHoi(); q.setId(10L); q.setChuDe(topic); q.setNoiDungCauHoi("Chọn số chẵn 中国");
        q.setDanhSachDapAn(new ArrayList<>());
        for (int i=0;i<4;i++) q.getDanhSachDapAn().add(new DapAn(100L+i, "Option " + i, i<2, i, q));
        when(topics.findById(1L)).thenReturn(Optional.of(topic));
        when(questions.findById(10L)).thenReturn(Optional.of(q));
        when(questions.findByChuDeIdOrderByThuTuAsc(1L)).thenReturn(List.of(q));
        when(results.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return q;
    }
    NopBaiRequestDTO input(List<Long> ids) {
        var a = new NopBaiRequestDTO.CauTraLoiDTO(); a.setCauHoiId(10L); a.setDapAnIds(ids); a.setThoiGianTraLoi(5);
        return new NopBaiRequestDTO(1L,"QA",null,5,List.of(a));
    }
    @Test void exactSetGradesAndSnapshotsAllSelectionsWithoutPreSubmitLeak() {
        CauHoi q = fixture(); QuestionValidator.validate(q);
        assertTrue(play.layCauHoiDeChoi(1L).get(0).isNhieuDapAn());
        var result = play.nopBai(input(List.of(101L,100L)));
        assertEquals(250,result.getDiemSo()); assertEquals(1,result.getSoCauDung());
        var review = result.getDanhSachCauHoi().get(0);
        assertEquals(List.of(101L,100L), review.getDapAnDaChonIds());
        assertEquals(List.of(100L,101L), review.getDapAnDungIds());
        assertNull(review.getDapAnDungId());
        verify(snapshots).luu(any(), argThat(saved -> saved.getDanhSachCauHoi().get(0).getDapAnDungIds().equals(List.of(100L,101L))));
        assertTrue(play.practice(10L,input(List.of(101L,100L)).getDanhSachTraLoi().get(0)).dung());
        for (List<Long> selected : List.of(List.of(100L),List.of(100L,101L,102L),List.of(102L))) {
            assertEquals(1,play.nopBai(input(selected)).getSoCauSai());
            assertFalse(play.practice(10L,input(selected).getDanhSachTraLoi().get(0)).dung());
        }
        assertEquals(1,play.nopBai(input(List.of())).getSoCauChuaTraLoi());
        q.getChuDe().setHienDapAnSauNop(false);
        assertTrue(play.nopBai(input(List.of(100L,101L))).getDanhSachCauHoi().isEmpty());
        q.getChuDe().setChoPhepXemDapAn(false);
        assertThrows(ResponseStatusException.class,()->play.practice(10L,input(List.of(100L,101L)).getDanhSachTraLoi().get(0)));
    }
    @Test void rejectsDuplicateForeignNullAndConflictingIdsAndSupportsLegacySingle() {
        CauHoi q = fixture();
        for (List<Long> ids : List.of(List.of(100L,100L),List.of(999L),Arrays.asList(100L,null)))
            assertThrows(ResponseStatusException.class,()->play.nopBai(input(ids)));
        var conflicting = input(List.of(100L,101L)); conflicting.getDanhSachTraLoi().get(0).setDapAnId(100L);
        assertThrows(ResponseStatusException.class,()->play.nopBai(conflicting));
        var legacy = input(null); legacy.getDanhSachTraLoi().get(0).setDapAnId(100L);
        assertEquals(1,play.nopBai(legacy).getSoCauSai());
        q.getDanhSachDapAn().get(1).setLaDapAnDung(false);
        assertEquals(1,play.nopBai(legacy).getSoCauDung());
    }
    @Test void parsesStrictMultipleLetterSyntax() {
        for (String value : List.of("a,c", "A; C", "A|C")) assertEquals(Set.of("A","C"),QuestionValidator.parseCorrectLetters(value));
        for (String value : List.of("", "A,E", "A,A", "A,", "AC")) assertThrows(ResponseStatusException.class,()->QuestionValidator.parseCorrectLetters(value));
    }
    @Test void adminCanCreateEditAndBulkSaveMultipleCorrectAnswers() {
        CauHoi q=fixture();
        when(questions.save(any())).thenAnswer(inv->inv.getArgument(0));
        var crud=new CauHoiService(questions,topics);
        var saved=crud.them(q);
        assertEquals(2,saved.getDanhSachDapAn().stream().filter(DapAn::getLaDapAnDung).count());
        var edited=new CauHoi();edited.setChuDe(q.getChuDe());edited.setNoiDungCauHoi("Edited multiple choices");
        edited.setDanhSachDapAn(new ArrayList<>());
        for(int i=0;i<4;i++)edited.getDanhSachDapAn().add(new DapAn(null,"Choice "+i,i>=2,i,null));
        var updated=crud.capNhat(10L,edited);
        assertFalse(updated.getDanhSachDapAn().get(0).getLaDapAnDung());
        assertTrue(updated.getDanhSachDapAn().get(2).getLaDapAnDung());
        QuestionValidator.validate(updated);
        when(questions.saveAll(any())).thenAnswer(inv->inv.getArgument(0));
        var dto=CauHoiCreateDTO.builder().noiDung("Bulk multiple").dapAnA("2").dapAnB("3").dapAnC("4").dapAnD("5").dapAnDung("A,C").build();
        var bulk=crud.themHangLoat(1L,List.of(dto));
        assertEquals(2,bulk.get(0).getDanhSachDapAn().stream().filter(DapAn::getLaDapAnDung).count());
    }
    @Test void importsMultipleCorrectChoicesFromExcelDocxAndTextPdf() throws Exception {
        for (String format : List.of("xlsx","docx","pdf")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            String[] keys={"TYPE","QUESTION","A","B","C","D","ANSWER","EXPLANATION"};
            String[] values={"TRAC_NGHIEM","Even numbers?","2","3","4","5","A,C","Choose both"};
            if (format.equals("xlsx")) {
                try(var wb=new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
                    var sheet=wb.createSheet(); var header=sheet.createRow(0); var row=sheet.createRow(1);
                    for(int i=0;i<8;i++){header.createCell(i).setCellValue(keys[i]);row.createCell(i).setCellValue(values[i]);} wb.write(out);
                }
            } else if (format.equals("docx")) {
                try(var doc=new org.apache.poi.xwpf.usermodel.XWPFDocument()) {
                    for(int i=0;i<8;i++) doc.createParagraph().createRun().setText(keys[i]+": "+values[i]); doc.write(out);
                }
            } else {
                try(var doc=new org.apache.pdfbox.pdmodel.PDDocument()) {
                    var page=new org.apache.pdfbox.pdmodel.PDPage();doc.addPage(page);
                    try(var stream=new org.apache.pdfbox.pdmodel.PDPageContentStream(doc,page)) {
                        stream.beginText();stream.setFont(new org.apache.pdfbox.pdmodel.font.PDType1Font(org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName.HELVETICA),12);stream.newLineAtOffset(40,740);
                        for(int i=0;i<8;i++){stream.showText(keys[i]+": "+values[i]);stream.newLineAtOffset(0,-20);}stream.endText();
                    }doc.save(out);
                }
            }
            var preview=imports.preview(new MockMultipartFile("file","multi."+format,"application/octet-stream",out.toByteArray()),1L);
            assertTrue(preview.warnings().isEmpty(), preview.warnings().toString());
            assertEquals(2,preview.questions().get(0).getDanhSachDapAn().stream().filter(DapAn::getLaDapAnDung).count());
            QuestionValidator.validate(preview.questions().get(0));
        }
    }
}
