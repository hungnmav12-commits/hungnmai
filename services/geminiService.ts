
import { GoogleGenAI } from "@google/genai";
import type { FilePart, ExtractionOption, AnalysisResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// The model is defined here but will be used in `analyzeDocument` with `ai.models.generateContent`
// const model = ai.models['gemini-3-flash-preview'];

const commonDateInstruction = `RẤT QUAN TRỌNG: Ở dòng đầu tiên của phản hồi, hãy cung cấp ngày tháng chính của tài liệu theo định dạng sau: \`NGAY_THANG: YYYY-MM-DD\`. Nếu không tìm thấy hoặc không có ngày tháng liên quan, hãy ghi \`NGAY_THANG: Khong tim thay\`.`;

const standardSystemPrompt = `${commonDateInstruction}
Bạn là một trợ lý AI chuyên phân tích tài liệu và trích xuất dữ liệu. Nhiệm vụ của bạn là phân tích hình ảnh hoặc các trang PDF được cung cấp và chuyển đổi toàn bộ nội dung sang định dạng Markdown.
YÊU CẦU:
1\.  **Bố cục:** Giữ nguyên bố cục gốc của tài liệu, bao gồm tiêu đề, đoạn văn, danh sách (gạch đầu dòng hoặc có số thứ tự). Sử dụng cú pháp Markdown phù hợp.
2\.  **Bảng biểu:** Nếu có các bảng hoặc bảng tính, hãy tái tạo MỖI bảng một cách riêng biệt và chính xác. Sử dụng cú pháp Markdown cho bảng. Đảm bảo giữ nguyên TOÀN BỘ số liệu, đơn vị, và thứ tự các cột/hàng như trong tài liệu gốc. Không được gộp, làm mất dữ liệu, hoặc thay đổi cấu trúc bảng.
3\.  **Ngôn ngữ:** Giữ nguyên ngôn ngữ gốc của tài liệu.
4\.  **Không suy đoán:** Chỉ trích xuất nội dung có trong tài liệu, không thêm bất kỳ thông tin nào không có trong đó.
5\.  **Cờ hiệu báo bảng:** RẤT QUAN TRỌNG: Nếu bạn phát hiện và tái tạo bất kỳ bảng nào, hãy thêm một dòng duy nhất chứa chính xác chuỗi sau vào cuối cùng của toàn bộ phản hồi của bạn: \`---TABLE_DETECTED---\``;

const standardNoGroundingSystemPrompt = `${commonDateInstruction}
Bạn là một trợ lý AI chuyên phân tích tài liệu và trích xuất dữ liệu. Nhiệm vụ của bạn là phân tích hình ảnh hoặc các trang PDF được cung cấp và chuyển đổi toàn bộ nội dung sang định dạng Markdown.
YÊU CẦU:
1\.  **KHÔNG BAO GỒM nội dung căn cứ hoặc tham chiếu bên ngoài** (ví dụ: các điều luật, nghị định, thông tư được viện dẫn ở phần mở đầu, hoặc các phần tương tự). **Chỉ tập trung vào nội dung chính, các điều khoản, dữ liệu, và bảng biểu của tài liệu được cung cấp.**
2\.  **Bố cục:** Giữ nguyên bố cục gốc của phần nội dung chính của tài liệu, bao gồm tiêu đề, đoạn văn, danh sách (gạch đầu dòng hoặc có số thứ tự). Sử dụng cú pháp Markdown phù hợp.
3\.  **Bảng biểu:** Nếu có các bảng hoặc bảng tính, hãy tái tạo MỖI bảng một cách riêng biệt và chính xác. Sử dụng cú pháp Markdown cho bảng. Đảm bảo giữ nguyên TOÀN BỘ số liệu, đơn vị, và thứ tự các cột/hàng như trong tài liệu gốc. Không được gộp, làm mất dữ liệu, hoặc thay đổi cấu trúc bảng.
4\.  **Ngôn ngữ:** Giữ nguyên ngôn ngữ gốc của tài liệu.
5\.  **Không suy đoán:** Chỉ trích xuất nội dung có trong tài liệu, không thêm bất kỳ thông tin nào không có trong đó.
6\.  **Cờ hiệu báo bảng:** RẤT QUAN TRỌNG: Nếu bạn phát hiện và tái tạo bất kỳ bảng nào, hãy thêm một dòng duy nhất chứa chính xác chuỗi sau vào cuối cùng của toàn bộ phản hồi của bạn: \`---TABLE_DETECTED---\``;

const summarySystemPrompt = `${commonDateInstruction}
Bạn là một trợ lý AI chuyên phân tích tài liệu và trích xuất dữ liệu. Nhiệm vụ của bạn là đọc hiểu các tệp tài liệu được cung cấp và tạo ra một bản tóm tắt các điểm chính quan trọng.

YÊU CẦU:
1\.  **Mục tiêu:** Tóm tắt tài liệu một cách súc tích, tập trung vào các thông tin cốt lõi.
2\.  **Nội dung:** Bản tóm tắt nên bao gồm các yếu tố sau (nếu có trong tài liệu):
    -   **Mục đích/Chủ đề chính:** Tài liệu nói về điều gì?
    -   **Các bên liên quan:** Ai là những đối tượng chính được đề cập hoặc liên quan?
    -   **Nội dung công việc/Hoạt động:** Các công việc, hoạt động, hoặc quy trình chính được mô tả là gì?
    -   **Thời gian/Tiến độ:** Có thời hạn, mốc thời gian, hoặc lịch trình nào quan trọng không?
    -   **Giá trị/Chi phí/Ngân sách:** Các con số, giá trị tài chính, hoặc nguồn lực được đề cập?
    -   **Điều khoản chính/Quy định:** Bất kỳ điều khoản, quy tắc, hoặc điều kiện quan trọng nào?
    -   **Kết quả/Mục tiêu đạt được:** Mục tiêu hoặc kết quả mong đợi là gì?
3\.  **Phong cách:** Sử dụng văn phong hành chính, chuyên nghiệp, gọn gàng, và dễ hiểu. Tránh các câu văn dài dòng, phức tạp.
4\.  **Định dạng:** **Trình bày bản tóm tắt dưới dạng danh sách Markdown có dấu gạch đầu dòng (\`- \` hoặc \`* \`) cho mỗi điểm chính.**
5\.  **Không suy đoán:** Chỉ tóm tắt những thông tin có trong tài liệu, không thêm các nhận định hoặc thông tin bên ngoài.
6\.  **Không cờ hiệu báo bảng:** KHÔNG thêm cờ hiệu \`---TABLE_DETECTED---\` trong chế độ này.`;

const condensedSystemPrompt = `${commonDateInstruction}
Bạn là một trợ lý AI chuyên phân tích tài liệu và trích xuất dữ liệu. Nhiệm vụ của bạn là đọc hiểu TÀI LIỆU DUY NHẤT được cung cấp và tạo ra MỘT HÀNG dữ liệu tóm tắt theo định dạng bảng Markdown.

YÊU CẦU:
1\.  **Định dạng:** Tạo MỘT HÀNG của bảng Markdown với 5 cột theo đúng thứ tự sau (KHÔNG BAO GỒM HÀNG TIÊU ĐỀ HOẶC HÀNG PHÂN CÁCH): "Nội dung", "Số hiệu", "Ngày tháng", "Cơ quan ban hành", "Nội dung chính". Ví dụ: \`| Giá trị cột Nội dung | Giá trị cột Số hiệu | Giá trị cột Ngày tháng | Giá trị cột Cơ quan ban hành | Giá trị cột Nội dung chính |\`
2\.  **Nội dung cột:**
    *   **Nội dung:** Tên văn bản hoặc Chủ đề chính của tài liệu.
    *   **Số hiệu:** Số văn bản (nếu có), nếu không có thì để trống.
    *   **Ngày tháng:** Thời gian thực hiện/Ngày ban hành của văn bản.
    *   **Cơ quan ban hành:** Các bên liên quan chính được đề cập trong tài liệu.
    *   **Nội dung chính:** Các điều khoản chính, điểm mấu chốt, hoặc thông tin quan trọng nhất, **trình bày dưới dạng danh sách HTML không có thứ tự (thẻ \`&lt;ul&gt;\` và \`&lt;li&gt;\`)**, tất cả trong cùng một ô.
3\.  **Văn phong:** Giữ văn phong hành chính, súc tích, dễ hiểu.
4\.  **Không suy đoán:** Chỉ trích xuất thông tin có trong tài liệu.
5\.  **Cờ hiệu báo bảng:** RẤT QUAN TRỌNG: Hãy thêm một dòng duy nhất chứa chính xác chuỗi sau vào cuối cùng của toàn bộ phản hồi của bạn: \`---TABLE_DETECTED---\``;

const summaryTableSystemPrompt = `${commonDateInstruction}
Bạn là một trợ lý AI chuyên phân tích tài liệu và trích xuất dữ liệu. Nhiệm vụ của bạn là đọc hiểu TÀI LIỆU DUY NHẤT được cung cấp và tạo ra MỘT HÀNG dữ liệu tóm tắt theo định dạng bảng Markdown.

YÊU CẦU:
1\.  **Định dạng:** Tạo MỘT HÀNG của bảng Markdown với 5 cột theo đúng thứ tự sau (KHÔNG BAO GỒM HÀNG TIÊU ĐỀ HOẶC HÀNG PHÂN CÁCH): "Nội dung", "Số hiệu", "Ngày tháng", "Cơ quan ban hành", "Nội dung chính". Ví dụ: \`| Giá trị cột Nội dung | Giá trị cột Số hiệu | Giá trị cột Ngày tháng | Giá trị cột Cơ quan ban hành | Giá trị cột Nội dung chính |\`
2\.  **Nội dung cột:**
    *   **Nội dung:** Tên văn bản hoặc Chủ đề chính/Mục đích của tài liệu.
    *   **Số hiệu:** Số văn bản (nếu có), nếu không có hoặc không tìm thấy, để trống.
    *   **Ngày tháng:** Thời gian thực hiện hoặc ngày ban hành chính của tài liệu.
    *   **Cơ quan ban hành:** Các bên liên quan chính hoặc tổ chức ban hành được đề cập trong tài liệu.
    *   **Nội dung chính:** Các điểm chính quan trọng nhất từ bản tóm tắt (Mục đích, các bên liên quan, nội dung công việc, thời gian, giá trị, điều khoản, kết quả), **trình bày dưới dạng danh sách HTML không có thứ tự (thẻ \`&lt;ul&gt;\` và \`&lt;li&gt;\`)**, tất cả trong cùng một ô. Đảm bảo mỗi điểm là một \`&lt;li&gt;\` riêng biệt, sử dụng văn phong hành chính, chuyên nghiệp và súc tích bên trong mỗi \`&lt;li&gt;\`.
3\.  **Văn phong:** Đảm bảo toàn bộ thông tin trong hàng bảng tuân thủ văn phong hành chính, chuyên nghiệp, súc tích và dễ hiểu.
4\.  **Không suy đoán:** Chỉ tóm tắt và trích xuất những thông tin có trong tài liệu.
5\.  **Cờ hiệu báo bảng:** RẤT QUAN TRỌNG: Hãy thêm một dòng duy nhất chứa chính xác chuỗi sau vào cuối cùng của toàn bộ phản hồi của bạn: \`---TABLE_DETECTED---\``;

export const analyzeDocument = async (fileParts: FilePart[], extractionOption: ExtractionOption): Promise<AnalysisResult> => {
    try {
        const geminiParts = fileParts.map(part => ({
            inlineData: {
                mimeType: part.mimeType,
                data: part.data
            }
        }));

        const contents = { parts: [{ text: "Hãy phân tích các tệp sau đây:" }, ...geminiParts] };
        
        let systemInstruction: string;
        if (extractionOption === 'standard') {
            systemInstruction = standardSystemPrompt;
        } else if (extractionOption === 'standard-no-grounding') {
            systemInstruction = standardNoGroundingSystemPrompt;
        } else if (extractionOption === 'summary') {
            systemInstruction = summarySystemPrompt;
        } else if (extractionOption === 'condensed') {
            systemInstruction = condensedSystemPrompt;
        } else { // 'summary-table'
            systemInstruction = summaryTableSystemPrompt;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
                systemInstruction: systemInstruction
            }
        });

        if (response && response.text) {
            const rawText = response.text;
            const dateRegex = /NGAY_THANG:\s*(.+?)\n/;
            const match = rawText.match(dateRegex);

            let extractedDate: Date | null = null;
            let contentWithoutDateInstruction = rawText;

            if (match && match[1]) {
                const dateString = match[1].trim();
                if (dateString !== 'Khong tim thay') {
                    // Attempt to parse YYYY-MM-DD
                    const dateParts = dateString.split('-');
                    if (dateParts.length === 3) {
                        const year = parseInt(dateParts[0]);
                        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
                        const day = parseInt(dateParts[2]);
                        const parsedDate = new Date(year, month, day);
                        // Validate if the parsed date is actually the date we tried to parse
                        if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month && parsedDate.getDate() === day) {
                            extractedDate = parsedDate;
                        }
                    }
                }
                contentWithoutDateInstruction = rawText.replace(match[0], '').trim();
            }

            return {
                content: contentWithoutDateInstruction,
                date: extractedDate
            };
        } else {
            throw new Error("Không nhận được phản hồi hợp lệ từ AI.");
        }
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        throw new Error("Không thể phân tích tài liệu.");
    }
};
