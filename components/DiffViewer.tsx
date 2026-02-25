import React, { useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  lineNumber?: number;
  originalLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewer {
  isDark?: boolean;
}

/**
 * Parses unified diff format and extracts line-by-line information
 * Handles unified diff format: @@ -oldStart,oldCount +newStart,newCount @@
 */
const parseDiff = (diff: string): DiffLine[] => {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let originalLineNum = 0;
  let newLineNum = 0;
  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header (--- a/file, +++ b/file)
    if (line.startsWith('---') || line.startsWith('+++')) {
      result.push({
        type: 'header',
        content: line,
        lineNumber: result.length + 1
      });
      if (line.startsWith('+++')) {
        currentFile = line.substring(6); // Extract filename
      }
      continue;
    }

    // Hunk header (@@ -oldStart,oldCount +newStart,newCount @@)
    if (line.startsWith('@@')) {
      result.push({
        type: 'header',
        content: line,
        lineNumber: result.length + 1
      });
      
      // Extract line numbers from hunk header
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        originalLineNum = parseInt(match[1], 10) - 1;
        newLineNum = parseInt(match[3], 10) - 1;
      }
      continue;
    }

    // Context line (starts with space)
    if (line.startsWith(' ')) {
      originalLineNum++;
      newLineNum++;
      result.push({
        type: 'context',
        content: line.substring(1),
        originalLineNumber: originalLineNum,
        newLineNumber: newLineNum,
        lineNumber: result.length + 1
      });
      continue;
    }

    // Addition line (starts with +, but not +++)
    if (line.startsWith('+') && !line.startsWith('+++')) {
      newLineNum++;
      result.push({
        type: 'addition',
        content: line.substring(1),
        newLineNumber: newLineNum,
        lineNumber: result.length + 1
      });
      continue;
    }

    // Deletion line (starts with -, but not ---)
    if (line.startsWith('-') && !line.startsWith('---')) {
      originalLineNum++;
      result.push({
        type: 'deletion',
        content: line.substring(1),
        originalLineNumber: originalLineNum,
        lineNumber: result.length + 1
      });
      continue;
    }

    // Regular lines without diff markers (shouldn't happen in proper diff)
    if (line.trim()) {
      result.push({
        type: 'context',
        content: line,
        lineNumber: result.length + 1
      });
    }
  }

  return result;
};

/**
 * Detect language from diff header for syntax highlighting
 */
const detectLanguage = (diff: string): string => {
  // Check for common file extensions in diff headers
  const fileMatch = diff.match(/(?:\+\+\+ b\/)([^\s]+)/);
  if (!fileMatch) return 'plaintext';

  const filename = fileMatch[1];
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const languageMap: { [key: string]: string } = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    sql: 'sql',
    md: 'markdown',
  };

  return languageMap[ext] || 'plaintext';
};

/**
 * Apply syntax highlighting to code
 */
const highlightCode = (code: string, language: string): string => {
  try {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }
  } catch (e) {
    console.warn(`Failed to highlight code for language: ${language}`);
  }
  return code;
};

export const DiffViewer: React.FC<{ diff: string; isDark?: boolean }> = ({ diff, isDark = true }) => {
  const { lines, language } = useMemo(() => {
    const parsedLines = parseDiff(diff);
    const detectedLanguage = detectLanguage(diff);
    return {
      lines: parsedLines,
      language: detectedLanguage
    };
  }, [diff]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    lines.forEach(line => {
      if (line.type === 'addition') additions++;
      if (line.type === 'deletion') deletions++;
    });
    return { additions, deletions };
  }, [lines]);

  const getLineTypeStyles = (type: string): string => {
    switch (type) {
      case 'addition':
        return isDark
          ? 'bg-green-900/20 border-l-4 border-green-500'
          : 'bg-green-50 border-l-4 border-green-400';
      case 'deletion':
        return isDark
          ? 'bg-red-900/20 border-l-4 border-red-500'
          : 'bg-red-50 border-l-4 border-red-400';
      case 'header':
        return isDark
          ? 'bg-slate-800 border-l-4 border-slate-600 font-bold'
          : 'bg-slate-200 border-l-4 border-slate-400 font-bold';
      default:
        return isDark ? 'border-l-4 border-slate-700' : 'border-l-4 border-slate-300';
    }
  };

  const getLineNumberColor = (type: string): string => {
    switch (type) {
      case 'addition':
        return isDark ? 'text-green-400' : 'text-green-600';
      case 'deletion':
        return isDark ? 'text-red-400' : 'text-red-600';
      case 'header':
        return isDark ? 'text-slate-400' : 'text-slate-600';
      default:
        return isDark ? 'text-slate-500' : 'text-slate-600';
    }
  };

  const getTypeIndicator = (type: string): string => {
    switch (type) {
      case 'addition':
        return '+';
      case 'deletion':
        return '−';
      case 'header':
        return '●';
      default:
        return ' ';
    }
  };

  return (
    <div className={`w-full rounded-xl border overflow-hidden shadow-lg transition-colors ${
      isDark
        ? 'bg-slate-950 border-slate-800'
        : 'bg-white border-slate-200'
    }`}>
      {/* Header with stats */}
      <div className={`p-4 border-b flex justify-between items-center ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${isDark ? 'bg-green-500' : 'bg-green-400'}`}></div>
            <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              +{stats.additions} additions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${isDark ? 'bg-red-500' : 'bg-red-400'}`}></div>
            <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              −{stats.deletions} deletions
            </span>
          </div>
          <span className={`text-xs font-mono px-2 py-1 rounded ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {language}
          </span>
        </div>
        <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
          {lines.length} lines
        </span>
      </div>

      {/* Diff content */}
      <div className={`overflow-x-auto font-mono text-sm ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isHeader = line.type === 'header';
              const highlightedContent =
                !isHeader && language !== 'plaintext'
                  ? highlightCode(line.content, language)
                  : line.content;

              return (
                <tr
                  key={idx}
                  className={`${getLineTypeStyles(line.type)} hover:opacity-90 transition-opacity`}
                >
                  {/* Type indicator */}
                  <td className={`w-6 text-center font-bold ${getLineNumberColor(line.type)} select-none`}>
                    {getTypeIndicator(line.type)}
                  </td>

                  {/* Original line number */}
                  <td
                    className={`w-12 px-2 text-right select-none ${
                      isDark ? 'bg-slate-900 text-slate-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {line.originalLineNumber || ''}
                  </td>

                  {/* New line number */}
                  <td
                    className={`w-12 px-2 text-right select-none ${
                      isDark ? 'bg-slate-900 text-slate-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {line.newLineNumber || ''}
                  </td>

                  {/* Code content */}
                  <td className={`px-4 py-1 flex-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {isHeader ? (
                      <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {line.content}
                      </span>
                    ) : (
                      <code
                        dangerouslySetInnerHTML={{ __html: highlightedContent }}
                        className="block whitespace-pre-wrap break-words"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className={`p-3 border-t text-xs ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-400'
          : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex justify-between">
          <span>Unified diff format with syntax highlighting</span>
          <span>Language: {language}</span>
        </div>
      </div>
    </div>
  );
};
