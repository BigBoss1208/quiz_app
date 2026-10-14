package com.quiz.app.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.fontbox.ttf.*;
import org.springframework.mock.web.MockMultipartFile;
import java.io.*;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;
class PdfUnicodeTest {
    @Test void extractsVietnameseAndHanFromEmbeddedFontTextLayer() throws Exception {
        Path cjk=Path.of(System.getenv().getOrDefault("QA_CJK_FONT","C:/Windows/Fonts/msyh.ttc"));
        Path latin=Path.of(System.getenv().getOrDefault("QA_LATIN_FONT","C:/Windows/Fonts/arial.ttf"));
        Assumptions.assumeTrue(Files.exists(cjk)&&Files.exists(latin),"Unicode PDF fixture requires local CJK/Latin font files; no proprietary fonts are committed");
        try(PDDocument doc=new PDDocument();TrueTypeCollection collection=new TrueTypeCollection(cjk.toFile());ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            TrueTypeFont[] first=new TrueTypeFont[1];collection.processAllFonts(font->{if(first[0]==null)first[0]=font;});
            var cjkFont=PDType0Font.load(doc,first[0],true);var latinFont=PDType0Font.load(doc,latin.toFile());PDPage page=new PDPage();doc.addPage(page);
            try(PDPageContentStream text=new PDPageContentStream(doc,page)){text.beginText();text.setFont(cjkFont,12);text.newLineAtOffset(30,700);for(String line:new String[]{"TYPE: DIEN_TU","QUESTION: 中国?","ANSWER: 中国"}){text.showText(line);text.newLineAtOffset(0,-20);}text.setFont(latinFont,12);text.showText("EXPLANATION: Giải thích tiếng Việt");text.endText();}
            doc.save(out);
            var preview=new QuestionImportService(new ExcelCauHoiService()).preview(new MockMultipartFile("file","unicode.pdf","application/pdf",out.toByteArray()),1L);
            assertTrue(preview.warnings().isEmpty(),preview.warnings().toString());assertEquals("中国?",preview.questions().get(0).getNoiDungCauHoi());assertEquals("中国",preview.questions().get(0).getDanhSachDapAn().get(0).getNoiDung());assertEquals("Giải thích tiếng Việt",preview.questions().get(0).getGiaiThich());
        }
    }
}
