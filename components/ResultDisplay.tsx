
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { EditableTable } from './EditableTable';
import { DownloadIcon, DocsIcon } from './IconComponents'; // Re-import DocsIcon and DownloadIcon
import type { ExtractionOption } from '../types';

declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    }; 
    DOMPurify: {
      sanitize(html: string): string;
    };
    htmlToDocx: (html: string, headerHtml?: string, properties?: object) => Promise<Blob>; // Re-add htmlToDocx
    saveAs: (data: Blob, filename: string) => void; // Re-add saveAs
  }
}

interface ResultDisplayProps {
  markdownContent: string;
  hasTable: boolean; // This prop is not directly used for rendering but can be for conditional logic if needed.
  fileName: string;
  currentExtractionOption: ExtractionOption;
}

interface DocumentPart {
  id: string;
  type: 'markdown' | 'table';
  content: string;
}

const parseMarkdown = (markdown: string): DocumentPart[] => {
    const tableRegex = /(\|.*\|(?:\r?\n|\r)?\|(?:-+\|)+(\r?\n|\r)?(?:\|.*\|(?:\r?\n|\r)?)*)/g;
    const parts: DocumentPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tableRegex.exec(markdown)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                id: `md-${lastIndex}`,
                type: 'markdown',
                content: markdown.substring(lastIndex, match.index),
            });
        }
        parts.push({
            id: `tbl-${match.index}`,
            type: 'table',
            content: match[0],
        });
        lastIndex = tableRegex.lastIndex;
    }

    if (lastIndex < markdown.length) {
        parts.push({
            id: `md-${lastIndex}`,
            type: 'markdown',
            content: markdown.substring(lastIndex),
        });
    }
    return parts;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ markdownContent, fileName, currentExtractionOption }) => {
  const [documentParts, setDocumentParts] = useState<DocumentPart[]>([]);
  const [libsReady, setLibsReady] = useState(false); // State for external libs readiness

  useEffect(() => {
    if (markdownContent) {
        setDocumentParts(parseMarkdown(markdownContent));
    } else {
        setDocumentParts([]);
    }
  }, [markdownContent]);
  
  // Effect to check if external libraries are loaded
  useEffect(() => {
    const checkLibs = () => {
        if (window.htmlToDocx && window.saveAs) {
            setLibsReady(true);
            return true;
        }
        return false;
    };

    if (!checkLibs()) {
        const intervalId = setInterval(() => {
            if (checkLibs()) {
                clearInterval(intervalId);
            }
        }, 200);
        return () => clearInterval(intervalId);
    }
  }, []);

  const handleTableUpdate = useCallback((tableId: string, updatedMarkdown: string) => {
    setDocumentParts(currentParts =>
        currentParts.map(part =>
            part.id === tableId ? { ...part, content: updatedMarkdown } : part
        )
    );
  }, []);

  const handleSaveAsDocx = useCallback(async () => {
    if (!libsReady) {
        alert("Thư viện tải xuống chưa sẵn sàng. Vui lòng thử lại sau giây lát.");
        return;
    }

    try {
        // Combine all markdown parts to get the final content for export
        const combinedMarkdown = documentParts.map(p => p.content).join('\n\n');
        const htmlContent = window.marked.parse(combinedMarkdown);
        const sanitizedHtml = window.DOMPurify.sanitize(htmlContent);

        const docxBlob = await window.htmlToDocx(sanitizedHtml, undefined, {
            orientation: 'portrait',
            margins: { top: 720, right: 720, bottom: 720, left: 720 }, // 1 inch = 720 twips
        });
        window.saveAs(docxBlob, `${fileName}_${currentExtractionOption}.docx`);
    } catch (error) {
        console.error("Lỗi khi tạo và tải xuống tệp Word:", error);
        alert("Không thể tải xuống tệp Word. Vui lòng thử lại.");
    }
  }, [documentParts, libsReady, fileName, currentExtractionOption]);


  const renderPart = (part: DocumentPart) => {
    if (part.type === 'markdown') {
        const sanitizedHtml = window.DOMPurify.sanitize(window.marked.parse(part.content));
        return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }
    if (part.type === 'table') {
        const isTableEditable = !['condensed', 'summary-table'].includes(currentExtractionOption);
        return <EditableTable tableId={part.id} initialMarkdown={part.content} onUpdate={handleTableUpdate} isEditable={isTableEditable} />
    }
    return null;
  }

  const buttonClass = "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold py-1 px-3 rounded-lg text-sm flex items-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-wait";

  return (
    <div className="relative h-full">
      {markdownContent && (
        <div className="absolute top-0 right-0 p-1 flex items-center gap-2 z-10">
            <button
                onClick={handleSaveAsDocx}
                disabled={!libsReady}
                className={buttonClass}
                title="Tải xuống tài liệu dưới dạng tệp Word (.docx)"
            >
                <DocsIcon />
                <span>Word (.docx)</span>
            </button>
        </div>
      )}

      <div className="prose prose-sm max-w-none h-full overflow-y-auto pr-4 pt-10"> {/* Re-added pt-10 for spacing */}
        {documentParts.map(part => <div key={part.id}>{renderPart(part)}</div>)}
      </div>
    </div>
  );
};
