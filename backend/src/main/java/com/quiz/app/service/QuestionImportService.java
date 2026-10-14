package com.quiz.app.service;

import com.quiz.app.entity.*;
import com.quiz.app.dto.CauHoiCreateDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class QuestionImportService {
    private final ExcelCauHoiService excel;
    public record Preview(List<CauHoi> questions, List<String> warnings) {}
    public static void checkFile(MultipartFile file, Set<String> extensions) {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024 || extensions.stream().noneMatch(name::endsWith))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File rỗng, quá 10 MB hoặc sai định dạng");
    }
    public Preview preview(MultipartFile file, Long topicId) {
        checkFile(file, Set.of(".xlsx", ".xls", ".docx", ".pdf"));
        List<CauHoi> questions = new ArrayList<>(); List<String> warnings = new ArrayList<>();
        String name = file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
                try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
                    Sheet sheet = workbook.getSheetAt(0); DataFormatter f = new DataFormatter();
                    if (f.formatCellValue(sheet.getRow(0).getCell(0)).equals("TYPE")) {
                        for (int i=1; i<=sheet.getLastRowNum(); i++) {
                            Row row=sheet.getRow(i); if(row==null) continue;
                            String[] cells=new String[8]; for(int c=0;c<8;c++) cells[c]=f.formatCellValue(row.getCell(c));
                            if(Arrays.stream(cells).allMatch(String::isBlank)) continue;
                            try { questions.add(fromCells(cells,topicId)); } catch(Exception e) { warnings.add("Dòng "+(i+1)+": "+e.getMessage()); }
                        }
                    } else {
                        for (CauHoiCreateDTO dto : excel.docFileExcel(file.getInputStream(),warnings))
                            questions.add(fromCells(new String[]{"TRAC_NGHIEM",dto.getNoiDung(),dto.getDapAnA(),dto.getDapAnB(),dto.getDapAnC(),dto.getDapAnD(),dto.getDapAnDung(),""},topicId));
                    }
                }
            } else {
                String text;
                if (name.endsWith(".docx")) {
                    try (XWPFDocument doc = new XWPFDocument(file.getInputStream()); org.apache.poi.xwpf.extractor.XWPFWordExtractor extractor = new org.apache.poi.xwpf.extractor.XWPFWordExtractor(doc)) { text=extractor.getText(); }
                } else {
                    try (var doc = Loader.loadPDF(file.getBytes())) { text = new PDFTextStripper().getText(doc); }
                }
                if (text.isBlank()) warnings.add("Không tìm thấy lớp chữ. PDF scan cần chuyển thành văn bản trước; hệ thống không dùng OCR.");
                // Each block has explicit keys, so malformed content is never guessed or saved.
                int index=0;
                for(String block:text.split("(?m)^\\s*---\\s*$")) {
                    if(block.isBlank()) continue; index++;
                    try {
                        Map<String,String> values=new HashMap<>();
                        for(String line:block.split("\\R")) {
                            if(line.isBlank()) continue;
                            int colon=line.indexOf(':');
                            if(colon<0) throw new IllegalArgumentException("Dòng phải có dạng KEY: nội dung");
                            String key=line.substring(0,colon).trim();
                            if(!Set.of("TYPE","QUESTION","A","B","C","D","ANSWER","EXPLANATION").contains(key) || values.putIfAbsent(key,line.substring(colon+1).trim())!=null) throw new IllegalArgumentException("Khóa không hợp lệ/trùng: "+key);
                        }
                        questions.add(fromCells(new String[]{values.get("TYPE"),values.get("QUESTION"),values.get("A"),values.get("B"),values.get("C"),values.get("D"),values.get("ANSWER"),values.get("EXPLANATION")},topicId));
                    } catch(Exception e) { warnings.add("Khối "+index+": "+e.getMessage()); }
                }
            }
            for(int i=0;i<questions.size();i++) {
                try { QuestionValidator.validate(questions.get(i)); } catch(Exception e) { warnings.add("Câu "+(i+1)+": "+e.getMessage()); }
            }
            if(questions.isEmpty() && warnings.isEmpty()) warnings.add("File không có câu hỏi");
            return new Preview(questions,warnings);
        } catch(Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không đọc được file theo định dạng đã chọn",e); }
    }
    private CauHoi fromCells(String[] c, Long topicId) {
        CauHoi q=new CauHoi(); ChuDe topic=new ChuDe(); topic.setId(topicId); q.setChuDe(topic);
        q.setLoaiCauHoi(CauHoi.LoaiCauHoi.valueOf(c[0] == null ? "" : c[0].trim())); q.setNoiDungCauHoi(c[1]); q.setGiaiThich(c[7]);
        List<DapAn> answers=new ArrayList<>();
        if(q.getLoaiCauHoi()==CauHoi.LoaiCauHoi.TRAC_NGHIEM) {
            String correct=c[6]==null?"":c[6].trim().toUpperCase(Locale.ROOT);
            for(int i=0;i<4;i++) { DapAn a=new DapAn(); a.setNoiDung(c[i+2]); a.setLaDapAnDung(correct.equals(String.valueOf((char)('A'+i)))); answers.add(a); }
        } else {
            for(String token:(c[6]==null?"":c[6]).split("\\|",-1)) { DapAn a=new DapAn(); a.setNoiDung(token.trim()); a.setLaDapAnDung(q.getLoaiCauHoi()==CauHoi.LoaiCauHoi.DIEN_TU); a.setThuTu(answers.size()); answers.add(a); }
        }
        q.setDanhSachDapAn(answers); return q;
    }
    public byte[] template(String format, String type) throws IOException {
        CauHoi.LoaiCauHoi.valueOf(type);
        String question=type.equals("TRAC_NGHIEM")?"Thủ đô Việt Nam?":type.equals("DIEN_TU")?"中国 nghĩa là gì?":"Sắp xếp câu tiếng Trung";
        String answer=type.equals("TRAC_NGHIEM")?"A":type.equals("DIEN_TU")?"Trung Quốc|中国":"我|学习|中文";
        String[] cells={type,question,"Hà Nội","Huế","Đà Nẵng","Hải Phòng",answer,"Ví dụ Unicode tiếng Việt và chữ Hán"};
        try(ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            if(format.equals("xlsx")) {
                try(Workbook workbook=new XSSFWorkbook()) { Sheet sheet=workbook.createSheet("Questions"); String[] keys={"TYPE","QUESTION","A","B","C","D","ANSWER","EXPLANATION"}; Row header=sheet.createRow(0),row=sheet.createRow(1); for(int i=0;i<8;i++){header.createCell(i).setCellValue(keys[i]);row.createCell(i).setCellValue(cells[i]);sheet.setColumnWidth(i,6000);} workbook.write(out); }
            } else if(format.equals("docx")) {
                try(XWPFDocument doc=new XWPFDocument()) { String[] keys={"TYPE","QUESTION","A","B","C","D","ANSWER","EXPLANATION"}; for(int i=0;i<8;i++){if(i>=2&&i<=5&&!type.equals("TRAC_NGHIEM"))continue;doc.createParagraph().createRun().setText(keys[i]+": "+cells[i]);} doc.write(out); }
            } else throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mẫu hỗ trợ xlsx hoặc docx");
            return out.toByteArray();
        }
    }
}
