
import type { FilePart } from '../types';

declare const pdfjsLib: any;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:mime/type;base64," part
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const pdfToImagesBase64 = async (file: File): Promise<string[]> => {
  const fileReader = new FileReader();
  
  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Không thể đọc tệp PDF."));
      }
      
      const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      const imagePromises: Promise<string>[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          // Remove "data:image/jpeg;base64,"
          imagePromises.push(Promise.resolve(imageDataUrl.split(',')[1]));
        }
      }
      
      Promise.all(imagePromises).then(resolve).catch(reject);
    };
    
    fileReader.onerror = (error) => reject(error);
    fileReader.readAsArrayBuffer(file);
  });
};


export const processFile = async (file: File): Promise<FilePart[]> => {
  if (file.type.startsWith('image/')) {
    const base64Data = await fileToBase64(file);
    return [{ mimeType: file.type, data: base64Data }];
  } else if (file.type === 'application/pdf') {
    const imageDatas = await pdfToImagesBase64(file);
    return imageDatas.map(data => ({ mimeType: 'image/jpeg', data: data }));
  } else {
    throw new Error('Định dạng tệp không được hỗ trợ.');
  }
};
