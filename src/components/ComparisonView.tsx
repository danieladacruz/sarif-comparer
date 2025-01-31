import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { Result, Run } from '../types/sarif';
import * as XLSX from 'xlsx';

interface ComparisonViewProps {
  sarifs: Array<{
    results: Record<string, Result[]>;
    run: Run;
  }>;
}

export function ComparisonView({ sarifs }: ComparisonViewProps) {
  const [expandedCWEs, setExpandedCWEs] = useState<Record<string, boolean>>({});

  const toggleCWE = (cwe: string) => {
    setExpandedCWEs(prev => ({
      ...prev,
      [cwe]: !prev[cwe]
    }));
  };

  const getCWEFromTags = (tags: string[]): string | null => {
    const cweTag = tags.find(tag => tag.startsWith('CWE:') || tag.startsWith('CWE-'));
    if (!cweTag) return null;
    
    const match = cweTag.match(/CWE[-:](\d+)/);
    if (!match) return null;
    return `CWE-${match[1]}`;
  };

  const getRuleTags = (run: Run, ruleId: string): string[] => {
    const rule = run.tool.driver.rules?.find(r => r.id === ruleId);
    return rule?.properties?.tags || [];
  };

  // Group results by CWE for each SARIF
  const groupByCWE = (results: Record<string, Result[]>, run: Run) => {
    const cweGroups: Record<string, { ruleId: string; items: Result[] }[]> = {};
    
    Object.entries(results).forEach(([ruleId, items]) => {
      const tags = getRuleTags(run, ruleId);
      const cwe = getCWEFromTags(tags);
      if (cwe) {
        if (!cweGroups[cwe]) {
          cweGroups[cwe] = [];
        }
        cweGroups[cwe].push({ ruleId, items });
      }
    });

    return cweGroups;
  };

  const cweGroups = sarifs.map(sarif => groupByCWE(sarif.results, sarif.run));
  const toolNames = sarifs.map(sarif => sarif.run.tool.driver.name);

  // Get all unique CWEs
  const allCWEs = [...new Set(cweGroups.flatMap(group => Object.keys(group)))].sort();

  // Calculate summary data
  const summaryData = allCWEs.map(cwe => {
    const findings = cweGroups.map(group => 
      group[cwe]?.reduce((sum, { items }) => sum + items.length, 0) || 0
    );
    
    // Calculate deltas between consecutive pairs
    const deltas = findings.slice(1).map((count, i) => count - findings[i]);
    
    // Calculate overlap percentages comparing first SARIF with others
    const overlaps = findings.slice(1).map(count => {
      const firstCount = findings[0];
      // If both counts are 0, return 0 instead of 100
      if (firstCount === 0 && count === 0) {
        return 0;
      }
      const overlap = Math.min(count, firstCount);
      const total = Math.max(count, firstCount);
      return total === 0 ? 0 : (overlap / total) * 100;
    });

    return {
      cwe,
      findings,
      deltas,
      overlaps
    };
  });

  // Calculate average overlap percentages
  const averageOverlaps = summaryData[0]?.overlaps.map((_, index) => {
    const sum = summaryData.reduce((acc, data) => acc + data.overlaps[index], 0);
    return summaryData.length > 0 ? sum / summaryData.length : 0;
  }) || [];

  const exportToExcel = () => {
    const headers = toolNames.map(name => `${name} Findings`);
    const deltaHeaders = toolNames.slice(1).map((name, i) => `Delta ${toolNames[i]} - ${name}`);
    const overlapHeaders = toolNames.slice(1).map(name => `Overlap ${toolNames[0]} - ${name} %`);

    const data = [
      // Header row with tool names
      [{
        'Tools': toolNames.join(' vs '),
        ...Array(headers.length + deltaHeaders.length + overlapHeaders.length - 1).fill('')
      }],
      // Empty row for spacing
      [{}],
      // Column headers
      ['CWE', ...headers, ...deltaHeaders, ...overlapHeaders],
      // Data rows
      ...summaryData.map(({ cwe, findings, deltas, overlaps }) => [
        cwe,
        ...findings,
        ...deltas,
        ...overlaps.map(o => `${o.toFixed(1)}%`)
      ]),
      // Empty row before averages
      [''],
      // Average row
      [
        'Average',
        ...Array(headers.length).fill(''),
        ...Array(deltaHeaders.length).fill(''),
        ...averageOverlaps.map(o => `${o.toFixed(1)}%`)
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparison Summary');

    // Auto-size columns
    const colWidths = [15, ...Array(headers.length + deltaHeaders.length + overlapHeaders.length).fill(15)];
    ws['!cols'] = colWidths.map(width => ({ width }));

    // Set some basic styling
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length + deltaHeaders.length + overlapHeaders.length } }
    ];

    XLSX.writeFile(wb, 'sarif-comparison.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-md rounded-lg p-4 mb-6 overflow-x-auto">
        <div className="grid grid-cols-3 gap-4 min-w-[600px]">
          {toolNames.map((toolName, index) => (
            <div key={index}>
              <h2 className="text-lg font-semibold">Tool {index + 1}</h2>
              <p className="text-sm text-gray-600">{toolName}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Comparison Summary</h2>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CWE
                  </th>
                  {toolNames.map((name, i) => (
                    <th key={`findings-${i}`} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {name} Findings
                    </th>
                  ))}
                  {toolNames.slice(1).map((name, i) => (
                    <th key={`delta-${i}`} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta {toolNames[i]} - {name}
                    </th>
                  ))}
                  {toolNames.slice(1).map((name) => (
                    <th key={`overlap-${name}`} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overlap {toolNames[0]} - {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.map(({ cwe, findings, deltas, overlaps }) => (
                  <tr key={cwe}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {cwe}
                      </span>
                    </td>
                    {findings.map((count, i) => (
                      <td key={`findings-${i}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {count}
                      </td>
                    ))}
                    {deltas.map((delta, i) => (
                      <td key={`delta-${i}`} className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          delta > 0 ? 'bg-red-100 text-red-800' :
                          delta < 0 ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                    ))}
                    {overlaps.map((overlap, i) => (
                      <td key={`overlap-${i}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {overlap.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Average Overlap Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Average
                  </td>
                  {toolNames.map((_, i) => (
                    <td key={`avg-findings-${i}`} className="px-6 py-4"></td>
                  ))}
                  {toolNames.slice(1).map((_, i) => (
                    <td key={`avg-delta-${i}`} className="px-6 py-4"></td>
                  ))}
                  {averageOverlaps.map((overlap, i) => (
                    <td key={`avg-overlap-${i}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {overlap.toFixed(1)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {allCWEs.map(cwe => {
        const isExpanded = expandedCWEs[cwe];
        const findingCounts = cweGroups.map(group => 
          group[cwe]?.reduce((sum, { items }) => sum + items.length, 0) || 0
        );
        
        return (
          <div key={cwe} className="bg-white shadow-md rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCWE(cwe)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none overflow-x-auto"
            >
              <div className="flex items-center">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-2">
                  {cwe}
                </span>
              </div>
              <div className="flex items-center space-x-4 min-w-[600px]">
                {findingCounts.map((count, i) => (
                  <React.Fragment key={i}>
                    <span className="text-sm font-medium">
                      {toolNames[i]}: {count} findings
                    </span>
                    {i < findingCounts.length - 1 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className={`text-sm font-medium ${
                          findingCounts[i + 1] > count ? 'text-red-600' : 
                          findingCounts[i + 1] < count ? 'text-green-600' : 
                          'text-gray-600'
                        }`}>
                          Δ {findingCounts[i + 1] - count}
                        </span>
                        <span className="text-gray-300">|</span>
                      </>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <div className="grid grid-cols-3 divide-x divide-gray-200 min-w-[800px]">
                  {cweGroups.map((group, index) => (
                    <div key={index} className="p-4">
                      <h3 className="text-lg font-semibold mb-4">{toolNames[index]} Findings</h3>
                      {group[cwe]?.map(({ ruleId, items }) => (
                        <div key={ruleId} className="mb-4">
                          <h4 className="text-md font-medium mb-2">Rule: {ruleId}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {items.length} {items.length === 1 ? 'finding' : 'findings'}
                          </p>
                        </div>
                      ))}
                      {!group[cwe] && (
                        <p className="text-sm text-gray-500">No findings for this CWE</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}