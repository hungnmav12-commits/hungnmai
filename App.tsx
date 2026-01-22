
import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { analyzeDocument } from './services/geminiService';
import { processFile } from './utils/fileUtils';
import { HeaderIcon } from './components/IconComponents';
import type { FilePart, ExtractionOption, AnalysisResult } from './types';

interface ProcessedFileResult {
  file: File;
  analysis: AnalysisResult;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [hasTable, setHasTable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [extractionOption, setExtractionOption] = useState<ExtractionOption>('standard');

  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setAnalysisResult('');
    setHasTable(false);
    setError('');
  };

  const handleGenerate = useCallback(async () => {
    if (files.length === 0) {
      setError('Vui lòng chọn một hoặc nhiều tệp để phân tích.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisResult('');
    setHasTable(false);

    try {
      let finalResult = '';
      let detectedTable = false;
      const tableFlag = '---TABLE_DETECTED---';
      const tableHeader = '| Nội dung | Số hiệu | Ngày tháng | Cơ quan ban hành | Nội dung chính |\n|---|---|---|---|---|\n';

      const processedFileResults: ProcessedFileResult[] = [];

      // Process each file individually to get its analysis result and date
      for (const file of files) {
        const parts = await processFile(file);
        const analysis = await analyzeDocument(parts, extractionOption);
        processedFileResults.push({ file, analysis });
      }

      // Sort files by date in ascending order, null dates go to the end
      processedFileResults.sort((a, b) => {
        if (a.analysis.date === null && b.analysis.date === null) return 0;
        if (a.analysis.date === null) return 1; // a has no date, goes after b
        if (b.analysis.date === null) return -1; // b has no date, goes after a
        return a.analysis.date.getTime() - b.analysis.date.getTime();
      });

      if (extractionOption === 'condensed' || extractionOption === 'summary-table') {
        let allProcessedRows = '';
        
        for (const { analysis } of processedFileResults) {
          if (analysis.content.includes(tableFlag)) {
            detectedTable = true;
            const rowContent = analysis.content.replace(tableFlag, '').trim();
            allProcessedRows += rowContent + '\n';
          } else {
            // Fallback for when AI doesn't return a table row as expected
            allProcessedRows += `| Lỗi trích xuất | | | | Không có dữ liệu |\n`;
          }
        }
        finalResult = tableHeader + allProcessedRows.trim();
        setHasTable(true); // Always a table in condensed or summary-table mode
      } else { // Standard or Summary mode
        for (const { file, analysis } of processedFileResults) {
          // Add a header for each file's result, now bold and yellow-highlighted
          finalResult += `## **<span style="background-color: #fcfc0a;">Kết quả cho tệp: ${file.name}</span>**\n\n`;

          if (extractionOption === 'standard') {
            if (analysis.content.includes(tableFlag)) {
              detectedTable = true; // Set to true if any file has a table
              finalResult += analysis.content.replace(tableFlag, '').trim();
            } else {
              finalResult += analysis.content;
            }
          } else { // Summary mode
            finalResult += analysis.content;
          }
          finalResult += '\n\n---\n\n'; // Separator between file results
        }
        setHasTable(detectedTable);
      }

      setAnalysisResult(finalResult.trim());

    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi trong quá trình phân tích. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [files, extractionOption]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 font-sans">
      <div className="w-full max-w-7xl mx-auto"> {/* Increased max-w to 7xl */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <HeaderIcon />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Trình Phân Tích Tài Liệu AI</h1>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Tải lên hình ảnh hoặc PDF. AI sẽ trích xuất văn bản, giữ nguyên bố cục và cấu trúc bảng, sau đó bạn có thể tải về dưới dạng tệp Word.
          </p>
        </header>
        
        <main className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-8"> {/* Changed md:flex to md:flex-row for clarity, but the core change is in child widths */}
            <div className="w-full md:w-80 flex-shrink-0"> {/* Fixed width for uploader */}
              <h2 className="text-lg font-semibold text-slate-700 mb-3">1. Tải lên tệp của bạn</h2>
              <FileUploader 
                files={files} 
                onFilesChange={handleFilesChange} 
                extractionOption={extractionOption}
                onExtractionOptionChange={setExtractionOption}
              />
              <button
                onClick={handleGenerate}
                disabled={files.length === 0 || isLoading}
                className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? 'Đang xử lý...' : 'Tạo kết quả'}
              </button>
            </div>
            
            <div className="w-full md:flex-1"> {/* Result display takes remaining space */}
              <h2 className="text-lg font-semibold text-slate-700 mb-3">2. Kết quả</h2>
              <div className="w-full h-[96rem] min-h-[96rem] border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50/50">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    <p>{error}</p>
                  </div>
                ) : analysisResult ? (
                  <ResultDisplay 
                    markdownContent={analysisResult} 
                    hasTable={hasTable} 
                    fileName={files.length === 1 ? files[0].name : 'combined_document'}
                    currentExtractionOption={extractionOption} // Pass the current extraction option
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Kết quả phân tích sẽ hiển thị ở đây.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
