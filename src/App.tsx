import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsTable } from './components/ResultsTable';
import { ComparisonView } from './components/ComparisonView';
import { FileSearch } from 'lucide-react';
import type { SarifLog, Result } from './types/sarif';

function App() {
  const [sarifs, setSarifs] = useState<Array<{
    results: Record<string, Result[]>;
    run: SarifLog['runs'][0];
  } | null>>([null, null, null]);

  const handleFileUpload = (sarifData: SarifLog, index: number) => {
    const run = sarifData.runs[0];
    const results = run.results;
    const grouped = results.reduce((acc, result) => {
      const ruleId = result.ruleId;
      if (!acc[ruleId]) {
        acc[ruleId] = [];
      }
      acc[ruleId].push(result);
      return acc;
    }, {} as Record<string, Result[]>);
    
    setSarifs(prev => {
      const newSarifs = [...prev];
      newSarifs[index] = { results: grouped, run };
      return newSarifs;
    });
  };

  const resetComparison = () => {
    setSarifs([null, null, null]);
  };

  const activeSarifs = sarifs.filter(Boolean);
  const nextUploadIndex = sarifs.findIndex(s => s === null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-full shadow-lg">
              <FileSearch className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              SARIF Compare
            </h1>
          </div>
          <p className="mt-2 text-gray-600 text-center">
            Advanced SARIF Analysis & Comparison Tool
          </p>
          <p className="text-sm text-gray-500 text-center max-w-2xl mt-2">
            Upload and analyze multiple SARIF files to compare security findings, track changes, and identify patterns across different scans
          </p>
        </div>
        
        {activeSarifs.length === 0 && (
          <div className="space-y-8">
            <FileUpload 
              onFileUpload={(data) => handleFileUpload(data, 0)} 
              label="Upload first SARIF file"
            />
          </div>
        )}

        {activeSarifs.length === 1 && (
          <div className="space-y-8">
            <FileUpload 
              onFileUpload={(data) => handleFileUpload(data, 1)} 
              label="Upload second SARIF file for comparison"
            />
            <ResultsTable results={activeSarifs[0].results} run={activeSarifs[0].run} />
          </div>
        )}

        {activeSarifs.length >= 2 && (
          <div className="space-y-8">
            {nextUploadIndex !== -1 && nextUploadIndex < 3 && (
              <FileUpload 
                onFileUpload={(data) => handleFileUpload(data, nextUploadIndex)} 
                label={`Upload ${nextUploadIndex + 1}${nextUploadIndex === 2 ? 'rd' : 'nd'} SARIF file (optional)`}
              />
            )}
            <div className="flex justify-end">
              <button
                onClick={resetComparison}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors duration-200"
              >
                Start New Comparison
              </button>
            </div>
            <ComparisonView sarifs={activeSarifs} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;