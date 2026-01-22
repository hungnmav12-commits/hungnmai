
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, FileIcon, XIcon } from './IconComponents';
import type { ExtractionOption } from '../types';

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  extractionOption: ExtractionOption;
  onExtractionOptionChange: (option: ExtractionOption) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  files, 
  onFilesChange,
  extractionOption,
  onExtractionOptionChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
    );
      
    const uniqueNewFiles = validFiles.filter(newFile => 
        !files.some(existingFile => 
            existingFile.name === newFile.name && existingFile.size === newFile.size
        )
    );
    
    if (uniqueNewFiles.length > 0) {
        onFilesChange([...files, ...uniqueNewFiles]);
    }
  }, [files, onFilesChange]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const addedFiles = event.target.files ? Array.from(event.target.files) : [];
    addFiles(addedFiles);
     if (inputRef.current) {
        inputRef.current.value = "";
    }
  };

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const droppedFiles = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    addFiles(droppedFiles);
  }, [addFiles]);

  const removeFile = (indexToRemove: number) => {
    onFilesChange(files.filter((_, index) => index !== indexToRemove));
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFile = Array.from(items)
        .find(item => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile();

    if (imageFile) {
        event.preventDefault();
        const fileExtension = imageFile.type.split('/')[1] || 'png';
        const newFile = new File([imageFile], `pasted-image-${Date.now()}.${fileExtension}`, {
            type: imageFile.type,
        });
        addFiles([newFile]);
    }
  }, [addFiles]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,application/pdf"
        multiple
      />
      
       <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
      >
        <UploadIcon />
        <p className="mt-2 text-sm text-slate-600 text-center">
          <span className="font-semibold text-indigo-600">Dán ảnh (Ctrl+V)</span>
          , nhấn, hoặc kéo thả tệp
        </p>
        <p className="text-xs text-slate-500">Hỗ trợ ảnh và PDF</p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-600">Tệp đã chọn ({files.length}):</h3>
            {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="p-2 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon />
                        <span className="text-sm text-slate-800 font-medium truncate" title={file.name}>{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(index)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-shrink-0">
                        <XIcon />
                    </button>
                </div>
            ))}
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Chọn chế độ trích xuất</h3>
        <div className="flex flex-col gap-3">
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="radio" 
              className="form-radio h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              name="extractionOption" 
              value="standard"
              checked={extractionOption === 'standard'}
              onChange={() => onExtractionOptionChange('standard')}
            />
            <span className="ml-2 text-slate-700 font-medium">Tiêu chuẩn (Trích xuất đầy đủ)</span>
            <p className="text-sm text-slate-500 ml-4 hidden md:block">Chuyển đổi toàn bộ nội dung tài liệu sang Markdown, giữ nguyên bố cục và cấu trúc bảng.</p>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="radio" 
              className="form-radio h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              name="extractionOption" 
              value="standard-no-grounding"
              checked={extractionOption === 'standard-no-grounding'}
              onChange={() => onExtractionOptionChange('standard-no-grounding')}
            />
            <span className="ml-2 text-slate-700 font-medium">Tiêu chuẩn (Bỏ căn cứ)</span>
            <p className="text-sm text-slate-500 ml-4 hidden md:block">Chuyển đổi nội dung chính của tài liệu sang Markdown, bỏ qua các phần căn cứ/tham chiếu.</p>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="radio" 
              className="form-radio h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              name="extractionOption" 
              value="summary"
              checked={extractionOption === 'summary'}
              onChange={() => onExtractionOptionChange('summary')}
            />
            <span className="ml-2 text-slate-700 font-medium">Tóm tắt (Các điểm chính)</span>
            <p className="text-sm text-slate-500 ml-4 hidden md:block">Tổng hợp các điểm chính (mục đích, các bên liên quan, công việc, thời gian, v.v.) bằng văn phong hành chính.</p>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="radio" 
              className="form-radio h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              name="extractionOption" 
              value="summary-table"
              checked={extractionOption === 'summary-table'}
              onChange={() => onExtractionOptionChange('summary-table')}
            />
            <span className="ml-2 text-slate-700 font-medium">Tóm tắt (Dạng bảng)</span>
            <p className="text-sm text-slate-500 ml-4 hidden md:block">Tóm tắt các điểm chính của mỗi tài liệu và trình bày dưới dạng một hàng trong bảng tổng hợp.</p>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="radio" 
              className="form-radio h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" 
              name="extractionOption" 
              value="condensed"
              checked={extractionOption === 'condensed'}
              onChange={() => onExtractionOptionChange('condensed')}
            />
            <span className="ml-2 text-slate-700 font-medium">Rút gọn (Dạng bảng)</span>
            <p className="text-sm text-slate-500 ml-4 hidden md:block">Trích xuất tên văn bản, số hiệu, ngày tháng, cơ quan ban hành, nội dung chính vào một hàng bảng cho mỗi tệp.</p>
          </label>
        </div>
      </div>
    </div>
  );
};
