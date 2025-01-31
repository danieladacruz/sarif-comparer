import React, { useState } from 'react';
import { AlertTriangle, Download, Info, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { Result, Run } from '../types/sarif';
import * as XLSX from 'xlsx';

interface ResultsTableProps {
  results: Record<string, Result[]>;
  run?: Run;
}

type TabType = 'summary' | 'cwe' | 'details';

export function ResultsTable({ results, run }: ResultsTableProps) {
  const [expandedCWEs, setExpandedCWEs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const toggleCWE = (cwe: string) => {
    setExpandedCWEs(prev => ({
      ...prev,
      [cwe]: !prev[cwe]
    }));
  };

  const ruleConfigurations = run?.tool.driver.rules?.reduce((acc, rule) => {
    if (rule.id && rule.defaultConfiguration?.level) {
      acc[rule.id] = rule.defaultConfiguration.level;
    }
    return acc;
  }, {} as Record<string, string>) || {};

  const getSeverityIcon = (level?: string) => {
    const normalizedLevel = level?.toLowerCase() || 'none';
    switch (normalizedLevel) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      case 'note':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEffectiveLevel = (result: Result): string => {
    if (result.level) {
      return result.level.toLowerCase();
    }
    if (ruleConfigurations[result.ruleId]) {
      return ruleConfigurations[result.ruleId].toLowerCase();
    }
    return 'none';
  };

  const getRuleTags = (ruleId: string): string[] => {
    const rule = run?.tool.driver.rules?.find(r => r.id === ruleId);
    return rule?.properties?.tags || [];
  };

  const getCWEFromTags = (tags: string[]): string | null => {
    const cweTag = tags.find(tag => tag.startsWith('CWE:') || tag.startsWith('CWE-'));
    if (!cweTag) return null;
    return cweTag.replace('CWE:', 'CWE-').trim();
  };

  const getSeverityWeight = (severity: string): number => {
    switch (severity.toLowerCase()) {
      case 'error': return 0;
      case 'warning': return 1;
      case 'info': return 2;
      case 'note': return 3;
      default: return 4;
    }
  };

  const sortedEntries = Object.entries(results).sort(([ruleIdA, itemsA], [ruleIdB, itemsB]) => {
    const severityA = itemsA[0]?.level || ruleConfigurations[ruleIdA] || 'none';
    const severityB = itemsB[0]?.level || ruleConfigurations[ruleIdB] || 'none';
    return getSeverityWeight(severityA) - getSeverityWeight(severityB);
  });

  const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0);

  // Group results by CWE
  const cweGroups = sortedEntries.reduce((acc, [ruleId, items]) => {
    const tags = getRuleTags(ruleId);
    const cwe = getCWEFromTags(tags);
    if (cwe) {
      if (!acc[cwe]) {
        acc[cwe] = [];
      }
      acc[cwe].push({ ruleId, items });
    }
    return acc;
  }, {} as Record<string, { ruleId: string; items: Result[] }[]>);

  const exportToExcel = () => {
    const data = [
      ...sortedEntries.map(([ruleId, items]) => {
        const tags = getRuleTags(ruleId);
        const severity = items[0]?.level || ruleConfigurations[ruleId] || 'none';
        const cwe = getCWEFromTags(tags);
        return {
          'Rule ID': ruleId,
          'CWE': cwe || '',
          'Tags': tags.join(', '),
          'Count': items.length,
          'Severity': severity
        };
      }),
      {
        'Rule ID': 'TOTAL',
        'CWE': '',
        'Tags': '',
        'Count': totalResults,
        'Severity': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, 'sarif-summary.xlsx');
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
        activeTab === tab
          ? 'bg-white text-indigo-600 border-t border-x border-gray-200'
          : 'text-gray-500 hover:text-gray-700 bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Tool Name */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Tool: {run?.tool.driver.name || 'Unknown'}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100">
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-2 px-6">
            <TabButton tab="summary" label="Summary" />
            <TabButton tab="cwe" label="CWE Analysis" />
            <TabButton tab="details" label="Detailed Results" />
          </div>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Summary (Total: {totalResults})</h2>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rule ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CWE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEntries.map(([ruleId, items]) => {
                  const tags = getRuleTags(ruleId);
                  const cwe = getCWEFromTags(tags);
                  const severity = items[0]?.level || ruleConfigurations[ruleId] || 'none';
                  return (
                    <tr key={ruleId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ruleId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cwe && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {cwe}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {items.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getSeverityIcon(severity)}
                          <span className="ml-2 text-sm capitalize text-gray-900">
                            {severity}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {totalResults}
                    </span>
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* CWE Tab */}
        {activeTab === 'cwe' && (
          <div className="space-y-4">
            {Object.entries(cweGroups).map(([cwe, groupedResults]) => {
              const isExpanded = expandedCWEs[cwe];
              const totalFindings = groupedResults.reduce((sum, { items }) => sum + items.length, 0);
              
              return (
                <div key={cwe} className="bg-white shadow-md rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCWE(cwe)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none"
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
                      <span className="text-gray-600">
                        ({totalFindings} {totalFindings === 1 ? 'finding' : 'findings'})
                      </span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {groupedResults.map(({ ruleId, items }) => (
                        <div key={ruleId} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
                          <h3 className="text-md font-semibold mb-4">Rule ID: {ruleId}</h3>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Level
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Message
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Location
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {items.map((result, index) => {
                                const effectiveLevel = getEffectiveLevel(result);
                                return (
                                  <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {getSeverityIcon(effectiveLevel)}
                                        <span className="ml-2 text-sm text-gray-900 capitalize">
                                          {effectiveLevel}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">{result.message.text}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">
                                        {result.locations?.[0]?.physicalLocation?.artifactLocation?.uri}
                                        {result.locations?.[0]?.physicalLocation?.region && (
                                          <span className="text-gray-500">
                                            :{result.locations[0].physicalLocation.region.startLine}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Results</h2>
            </div>
            {sortedEntries.map(([ruleId, items]) => (
              <div key={ruleId} className="border-b border-gray-200">
                <h3 className="text-lg font-semibold px-6 py-4">Rule ID: {ruleId}</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((result, index) => {
                      const effectiveLevel = getEffectiveLevel(result);
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getSeverityIcon(effectiveLevel)}
                              <span className="ml-2 text-sm text-gray-900 capitalize">
                                {effectiveLevel}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{result.message.text}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {result.locations?.[0]?.physicalLocation?.artifactLocation?.uri}
                              {result.locations?.[0]?.physicalLocation?.region && (
                                <span className="text-gray-500">
                                  :{result.locations[0].physicalLocation.region.startLine}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}