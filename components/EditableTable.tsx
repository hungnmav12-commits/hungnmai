
import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, TrashIcon } from './IconComponents';

declare global {
  interface Window {
    DOMPurify: {
      sanitize(html: string): string;
    };
  }
}

interface EditableTableProps {
    tableId: string;
    initialMarkdown: string;
    onUpdate: (tableId: string, newMarkdown: string) => void;
    isEditable?: boolean; // New prop, defaults to true
}

const parseTableMarkdown = (markdown: string): { header: string[], rows: string[][] } => {
    const lines = markdown.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return { header: [], rows: [] };

    const parseRow = (rowString: string) => 
        rowString.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());

    const header = parseRow(lines[0]);
    // The second line is the separator, we can ignore its content for data parsing
    const rows = lines.slice(2).map(parseRow);
    
    return { header, rows };
};

const toTableMarkdown = (header: string[], rows: string[][]): string => {
    const headerLine = `| ${header.join(' | ')} |`;
    const separatorLine = `| ${header.map(() => '---').join(' | ')} |`;
    const rowLines = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
    return `${headerLine}\n${separatorLine}\n${rowLines}`;
};


export const EditableTable: React.FC<EditableTableProps> = ({ tableId, initialMarkdown, onUpdate, isEditable = true }) => {
    const [header, setHeader] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);

    useEffect(() => {
        const { header: initialHeader, rows: initialRows } = parseTableMarkdown(initialMarkdown);
        setHeader(initialHeader);
        setRows(initialRows);
    }, [initialMarkdown]);

    const handleDataChange = useCallback(() => {
        const newMarkdown = toTableMarkdown(header, rows);
        onUpdate(tableId, newMarkdown);
    }, [header, rows, tableId, onUpdate]);

    useEffect(() => {
        // This effect triggers the update when the component is not in its initial state
        // and only if the table is editable
        if (isEditable && initialMarkdown !== toTableMarkdown(header, rows)) {
            handleDataChange();
        }
    }, [header, rows, handleDataChange, initialMarkdown, isEditable]);


    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        if (!isEditable) return;
        setRows(currentRows => {
            const newRows = [...currentRows];
            newRows[rowIndex][colIndex] = value;
            return newRows;
        });
    };

    const handleHeaderChange = (colIndex: number, value: string) => {
        if (!isEditable) return;
        setHeader(currentHeader => {
            const newHeader = [...currentHeader];
            newHeader[colIndex] = value;
            return newHeader;
        })
    }

    const addRow = (rowIndex: number) => {
        if (!isEditable) return;
        setRows(currentRows => {
            const newRow = Array(header.length).fill('');
            const newRows = [...currentRows];
            newRows.splice(rowIndex + 1, 0, newRow);
            return newRows;
        });
    };

    const deleteRow = (rowIndex: number) => {
        if (!isEditable) return;
        setRows(currentRows => currentRows.filter((_, i) => i !== rowIndex));
    };

    const addColumn = (colIndex: number) => {
        if (!isEditable) return;
        setHeader(currentHeader => {
            const newHeader = [...currentHeader];
            newHeader.splice(colIndex + 1, 0, 'New Column');
            return newHeader;
        });
        setRows(currentRows => 
            currentRows.map(row => {
                const newRow = [...row];
                newRow.splice(colIndex + 1, 0, '');
                return newRow;
            })
        );
    };

    const deleteColumn = (colIndex: number) => {
        if (!isEditable) return;
        if (header.length <= 1) return; // Don't delete the last column
        setHeader(currentHeader => currentHeader.filter((_, i) => i !== colIndex));
        setRows(currentRows => currentRows.map(row => row.filter((_, i) => i !== colIndex)));
    };

    return (
        <div className="my-6 overflow-x-auto not-prose relative group">
            <table className="min-w-full text-sm border border-slate-300">
                <thead>
                    <tr className="bg-slate-50">
                        {header.map((col, colIndex) => (
                            <th key={colIndex} className="p-0 border border-slate-300 relative">
                                {isEditable ? (
                                    <input
                                        type="text"
                                        value={col}
                                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                                        className="w-full h-full p-2 font-bold bg-transparent focus:outline-none focus:bg-indigo-50"
                                    />
                                ) : (
                                    <div className="w-full h-full p-2 font-bold text-slate-800">
                                        <div dangerouslySetInnerHTML={{ __html: window.DOMPurify.sanitize(col) }} />
                                    </div>
                                )}
                                {isEditable && (
                                    <>
                                        <button onClick={() => deleteColumn(colIndex)} title="Xóa cột" className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity">
                                            <TrashIcon />
                                        </button>
                                        <button onClick={() => addColumn(colIndex)} title="Thêm cột" className="absolute top-1/2 right-4 -translate-y-1/2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-green-600 transition-opacity mr-2">
                                            <PlusIcon />
                                        </button>
                                    </>
                                )}
                            </th>
                        ))}
                        <th className="w-10 p-0 border-l border-slate-300"></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="group/row hover:bg-slate-50">
                            {row.map((cell, colIndex) => (
                                <td key={colIndex} className="p-0 border border-slate-200">
                                    {isEditable ? (
                                        <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            className="w-full h-full p-2 bg-transparent focus:outline-none focus:bg-indigo-50"
                                        />
                                    ) : (
                                        <div className="w-full h-full p-2 text-slate-700">
                                            <div dangerouslySetInnerHTML={{ __html: window.DOMPurify.sanitize(cell) }} />
                                        </div>
                                    )}
                                </td>
                            ))}
                            <td className="border-l border-slate-300 p-1 bg-slate-50">
                                {isEditable && (
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => addRow(rowIndex)} title="Thêm hàng" className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-green-600 transition-opacity">
                                            <PlusIcon />
                                        </button>
                                        <button onClick={() => deleteRow(rowIndex)} title="Xóa hàng" className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-red-600 transition-opacity">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
