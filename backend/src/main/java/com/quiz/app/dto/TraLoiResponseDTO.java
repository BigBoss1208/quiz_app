package com.quiz.app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class TraLoiResponseDTO {
    private boolean dung;          // trả lời đúng hay sai
    private Long dapAnDungId;      // id đáp án đúng (để hiển thị khi sai)
    private boolean daHetCauHoi;   // đã hết câu hỏi trong chủ đề chưa
}
