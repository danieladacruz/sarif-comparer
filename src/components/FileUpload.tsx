import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (content: any) => void;
  label?: string;
}

export function FileUpload({ onFileUpload, label = "Click to upload SARIF file" }: FileUploadProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        onFileUpload(content);
      } catch (error) {
        alert('Error parsing SARIF file. Please ensure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-xl mx-auto p-6">
      <label 
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">{label}</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">SARIF file (.json)</p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".json,.sarif"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}