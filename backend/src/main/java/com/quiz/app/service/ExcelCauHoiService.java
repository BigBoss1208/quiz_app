package com.quiz.app.service;

import com.quiz.app.dto.CauHoiCreateDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Service xử lý tạo file template mẫu và đọc dữ liệu từ file Excel (.xlsx) bằng Apache POI.
 */
@Service
public class ExcelCauHoiService {

    private static final String[] HEADER_COLUMNS = {
            "Nội dung câu hỏi",
            "Đáp án A",
            "Đáp án B",
            "Đáp án C",
            "Đáp án D",
            "Đáp án đúng (A/B/C/D)"
    };

    private static final Set<String> VALID_ANSWERS = Set.of("A", "B", "C", "D");

    /**
     * Tạo file Excel mẫu (.xlsx) chuẩn gồm Header và dữ liệu ví dụ.
     *
     * @return mảng byte[] chứa toàn bộ nội dung file Excel
     * @throws IOException khi có lỗi ghi dữ liệu
     */
    public byte[] taoFileMauExcel() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("MauCauHoi");

            // 1. Tạo CellStyle cho tiêu đề (Header)
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // 2. Tạo CellStyle cho các dòng dữ liệu mẫu
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Style căn giữa cho cột Đáp án đúng
            CellStyle centerDataStyle = workbook.createCellStyle();
            centerDataStyle.cloneStyleFrom(dataStyle);
            centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

            // 3. Ghi dòng tiêu đề (Dòng 0)
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int i = 0; i < HEADER_COLUMNS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADER_COLUMNS[i]);
                cell.setCellStyle(headerStyle);
            }

            // 4. Dữ liệu ví dụ minh họa để người dùng nắm được quy tắc
            String[][] sampleData = {
                    {"Thủ đô của Việt Nam là thành phố nào?", "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "A"},
                    {"Số nguyên tố chẵn duy nhất là số nào?", "0", "2", "4", "6", "B"},
                    {"Mặt trời mọc ở hướng nào?", "Hướng Tây", "Hướng Nam", "Hướng Đông", "Hướng Bắc", "C"}
            };

            for (int r = 0; r < sampleData.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.setHeightInPoints(20);
                for (int c = 0; c < sampleData[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(sampleData[r][c]);
                    if (c == 5) {
                        cell.setCellStyle(centerDataStyle);
                    } else {
                        cell.setCellStyle(dataStyle);
                    }
                }
            }

            // 5. Căn chỉnh độ rộng các cột cho đẹp mắt
            sheet.setColumnWidth(0, 12000); // Cột Câu hỏi
            sheet.setColumnWidth(1, 6000);  // Đáp án A
            sheet.setColumnWidth(2, 6000);  // Đáp án B
            sheet.setColumnWidth(3, 6000);  // Đáp án C
            sheet.setColumnWidth(4, 6000);  // Đáp án D
            sheet.setColumnWidth(5, 7000);  // Đáp án đúng

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Đọc file Excel tải lên, kiểm tra từng dòng và ghi nhận lỗi vào danh sách lỗi.
     *
     * @param is           InputStream của file tải lên
     * @param danhSachLoi  danh sách chứa các câu thông báo lỗi dòng (được truyền từ controller)
     * @return danh sách các câu hỏi hợp lệ đã được chuẩn hóa DTO
     * @throws IOException khi không đọc được luồng file
     */
    public List<CauHoiCreateDTO> docFileExcel(InputStream is, List<String> danhSachLoi) throws IOException {
        List<CauHoiCreateDTO> danhSachCauHoi = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                danhSachLoi.add("File Excel không có sheet nào.");
                return danhSachCauHoi;
            }

            int totalRows = sheet.getLastRowNum();
            if (totalRows < 1) {
                danhSachLoi.add("File Excel không có dữ liệu câu hỏi (chỉ có tiêu đề hoặc rỗng).");
                return danhSachCauHoi;
            }

            // Bỏ qua dòng Header (dòng 0), duyệt từ dòng 1
            for (int rowIndex = 1; rowIndex <= totalRows; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isRowEmpty(row)) {
                    continue; // Bỏ qua dòng trống
                }

                int displayRowNum = rowIndex + 1; // Số dòng thực tế trên Excel (bắt đầu từ 1)

                String noiDung = getCellValue(row.getCell(0), formatter);
                String dapAnA = getCellValue(row.getCell(1), formatter);
                String dapAnB = getCellValue(row.getCell(2), formatter);
                String dapAnC = getCellValue(row.getCell(3), formatter);
                String dapAnD = getCellValue(row.getCell(4), formatter);
                String dapAnDung = getCellValue(row.getCell(5), formatter).toUpperCase();

                // Hỗ trợ người dùng nếu nhập số 1, 2, 3, 4
                if ("1".equals(dapAnDung)) dapAnDung = "A";
                else if ("2".equals(dapAnDung)) dapAnDung = "B";
                else if ("3".equals(dapAnDung)) dapAnDung = "C";
                else if ("4".equals(dapAnDung)) dapAnDung = "D";

                // Kiểm tra validation
                List<String> loiDong = new ArrayList<>();

                if (noiDung.isEmpty()) {
                    loiDong.add("Thiếu nội dung câu hỏi");
                }
                if (dapAnA.isEmpty() || dapAnB.isEmpty() || dapAnC.isEmpty() || dapAnD.isEmpty()) {
                    loiDong.add("Phải nhập đủ cả 4 đáp án (A, B, C, D)");
                }
                if (!VALID_ANSWERS.contains(dapAnDung)) {
                    loiDong.add("Đáp án đúng '" + dapAnDung + "' không hợp lệ (chỉ chấp nhận A, B, C hoặc D)");
                }

                if (!loiDong.isEmpty()) {
                    danhSachLoi.add("Dòng " + displayRowNum + ": " + String.join(", ", loiDong));
                } else {
                    danhSachCauHoi.add(CauHoiCreateDTO.builder()
                            .noiDung(noiDung)
                            .dapAnA(dapAnA)
                            .dapAnB(dapAnB)
                            .dapAnC(dapAnC)
                            .dapAnD(dapAnD)
                            .dapAnDung(dapAnDung)
                            .build());
                }
            }
        }

        return danhSachCauHoi;
    }

    /**
     * Hàm overload tiện ích: đọc file Excel và ném ngoại lệ nếu có lỗi.
     */
    public List<CauHoiCreateDTO> docFileExcel(InputStream is) throws IOException {
        List<String> danhSachLoi = new ArrayList<>();
        List<CauHoiCreateDTO> ketQua = docFileExcel(is, danhSachLoi);
        if (!danhSachLoi.isEmpty()) {
            throw new IllegalArgumentException(String.join("; ", danhSachLoi));
        }
        return ketQua;
    }

    /**
     * Lấy giá trị ô dưới dạng chuỗi an toàn không lỗi kiểu dữ liệu.
     */
    private String getCellValue(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell).trim();
    }

    /**
     * Kiểm tra xem dòng có rỗng hay không.
     */
    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !cell.toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }
}

