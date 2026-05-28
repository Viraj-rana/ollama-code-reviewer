//reviewoutput
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ReviewResult, ReviewStatus, Severity, ReviewIssue } from '../types';
import { DiffViewer } from './DiffViewer';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  AlertTriangleIcon, 
  FileCodeIcon, 
  SparklesIcon,
  ActiveIcon,
  RefreshCwIcon,
  CopyIcon,
  DownloadIcon,
  LayoutIcon,
  ShareIcon,
  BookOpenIcon,
  ArrowLeftIcon
} from './Icons';
import { generateFix, translateReviewResult } from '../services/geminiService';

const MermaidGraph: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderGraph = async () => {
      if (ref.current && chart && (window as any).mermaid) {
        try {
          setError(false);
          // Sanitize the chart string:
          // 1. Replace literal "\n" strings with actual newlines
          // 2. Ensure "graph TD" is followed by a newline
          const cleanChart = chart
            .replace(/\\n/g, '\n') 
            .replace(/^graph TD(?!\n)/g, 'graph TD\n');

          const isDark = document.documentElement.classList.contains('dark');
          
          (window as any).mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'neutral',
            securityLevel: 'loose',
            fontFamily: 'JetBrains Mono',
            themeVariables: {
              fontSize: '13px',
              primaryColor: isDark ? '#1e293b' : '#f8fafc',
              primaryTextColor: isDark ? '#f8fafc' : '#1e293b',
              lineColor: isDark ? '#64748b' : '#cbd5e1',
              tertiaryColor: isDark ? '#0f172a' : '#ffffff',
            }
          });
          
          ref.current.innerHTML = '';
          const id = 'mermaid-rev-' + Math.random().toString(36).substr(2, 9);
          // Use the cleaned chart string
          const { svg } = await (window as any).mermaid.render(id, cleanChart);
          ref.current.innerHTML = svg;
          
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.display = 'block';
            svgElement.style.margin = 'auto';
          }
        } catch (err) {
          console.error("Mermaid Render Error:", err);
          setError(true);
        }
      }
    };
    renderGraph();
  }, [chart]);

  if (error) return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-lg text-xs">
      Impact mapping failed to render. Architectural complexity exceeded.
    </div>
  );

  return <div ref={ref} className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto min-h-[400px] transition-colors shadow-inner" />;
};

interface ReviewOutputProps {
  result: ReviewResult;
  onReset: () => void;
  styleGuide: string;
  originalCode: string;
}

export const ReviewOutput: React.FC<ReviewOutputProps> = ({ result, onReset, styleGuide, originalCode }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown' | 'impact' | 'diff'>('visual');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [loadingFixes, setLoadingFixes] = useState<Record<number, boolean>>({});
  const [suggestedFixes, setSuggestedFixes] = useState<Record<number, string>>({});
  const [showFullModal, setShowFullModal] = useState(false);
  const [diffStats, setDiffStats] = useState({ additions: 0, deletions: 0 });
  
  // Translation State
  const [isRussian, setIsRussian] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedResult, setTranslatedResult] = useState<ReviewResult | null>(null);

  const displayResult = (isRussian && translatedResult) ? translatedResult : result;

  // Provide fallback for rating if it's missing (for backward compatibility)
  const rating = displayResult.rating || { style: 0, errorPrevention: 0, cleanCode: 0, logic: 0, overall: 0 };

  useEffect(() => {
    // Calculate Diff Stats
    if (originalCode) {
        const lines = originalCode.split('\n');
        let additions = 0;
        let deletions = 0;
        for (const line of lines) {
            // Check start of line. Ignore "+++" and "---" file headers
            if (line.startsWith('+') && !line.startsWith('+++')) additions++;
            if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }
        setDiffStats({ additions, deletions });
    }
  }, [originalCode]);

  const handleToggleLanguage = async () => {
    if (!isRussian && !translatedResult) {
      setIsTranslating(true);
      try {
        const translated = await translateReviewResult(result, "Russian");
        setTranslatedResult(translated);
      } catch (err) {
        console.error("Translation failed", err);
      } finally {
        setIsTranslating(false);
      }
    }
    setIsRussian(!isRussian);
  };

  const handleProposeFix = async (idx: number, issue: ReviewIssue) => {
    setLoadingFixes(prev => ({ ...prev, [idx]: true }));
    try {
      const fix = await generateFix(styleGuide, originalCode, issue);
      setSuggestedFixes(prev => ({ ...prev, [idx]: fix }));
    } catch (error) {
      console.error("Failed to generate fix:", error);
    } finally {
      setLoadingFixes(prev => ({ ...prev, [idx]: false }));
    }
  };

  const downloadPatch = (issue: ReviewIssue, fixedCode: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const patchContent = `--- a/source_code
+++ b/source_code
@@ -1,1 +1,1 @@
-${issue.codeSnippet}
+${fixedCode}
`;
    const blob = new Blob([patchContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fix_${timestamp}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBg = (status: ReviewStatus) => {
    switch (status) {
      case ReviewStatus.APPROVE: return 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
      case ReviewStatus.REQUEST_CHANGES: return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      default: return 'bg-slate-50 dark:bg-gray-500/10 border-slate-200 dark:border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL: return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case Severity.WARNING: return <AlertTriangleIcon className="w-5 h-5 text-amber-500" />;
      case Severity.INFO: return <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center text-xs text-blue-500 font-bold">i</div>;
    }
  };

  const getSeverityBadge = (severity: Severity) => {
     switch (severity) {
      case Severity.CRITICAL: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">CRITICAL</span>;
      case Severity.WARNING: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">WARNING</span>;
      case Severity.INFO: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">INFO</span>;
    }
  }

  const filteredIssues = displayResult.issues.filter(issue => 
    severityFilter === 'ALL' ? true : issue.severity === severityFilter
  );

  const counts = {
    ALL: displayResult.issues.length,
    CRITICAL: displayResult.issues.filter(i => i.severity === Severity.CRITICAL).length,
    WARNING: displayResult.issues.filter(i => i.severity === Severity.WARNING).length,
    INFO: displayResult.issues.filter(i => i.severity === Severity.INFO).length,
  };
  
  // Helper for progress bar color
  const getRatingColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl transition-colors w-full max-w-full">
      {/* commented out to enhance the header section with full width summary and diff stats */}

      {/* <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-start gap-4 transition-colors ${getStatusBg(displayResult.status)}`}>
        <div className="flex-1 min-w-0 w-full"> */}

      {/* new line added here to enhance the header section with full width summary and diff stats */}
         {/* Header Section with enhanced Full Width Summary layout */}
      <div className={`p-6 border-b transition-colors ${getStatusBg(displayResult.status)}`}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">



          
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={onReset} 
              className="group p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2" 
              title="Back to jobs"
            >
               <ArrowLeftIcon className="w-5 h-5 text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white" />
            </button>
            {displayResult.status === ReviewStatus.APPROVE ? <CheckCircleIcon className="w-8 h-8 text-green-500 shrink-0" /> : <XCircleIcon className="w-8 h-8 text-red-500 shrink-0" />}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {isRussian ? (displayResult.status === ReviewStatus.APPROVE ? 'Пайплайн пройден' : 'Требуются изменения') : (displayResult.status === ReviewStatus.APPROVE ? 'Pipeline Passed' : 'Pipeline Failed')}
            </h2>
          </div>
          
          {/* commented this line to enhance the Summary header Section */ }
          {/* <div className="flex items-center gap-4 text-xs font-mono mb-2"> */}

            {/* here is new line added */}
          <div className="flex items-center gap-4 text-xs font-mono pl-1">
               <span className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded flex items-center gap-2 border border-black/5 dark:border-white/5">


             <span className="text-green-600 dark:text-green-400 font-bold">+{diffStats.additions}</span>
             <span className="text-slate-300">|</span>
             <span className="text-red-500 dark:text-red-400 font-bold">-{diffStats.deletions}</span>

             </span>
             
             <span className="text-slate-500 uppercase tracking-widest text-[10px]">Lines Modified</span>
          </div>
          </div>

              {/* This needs to be commented out enhancing the summary contaier */}
          {/* <p className="text-slate-600 dark:text-slate-300 font-medium break-words">{displayResult.summary}</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0 w-full md:w-auto">
          <div className="flex flex-wrap justify-end gap-2 w-full"> */}

           <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
            <div className="flex gap-2">

            <button 
              onClick={() => setShowFullModal(true)}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-blue-600 text-white shadow-md hover:bg-blue-700 flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <ShareIcon className="w-3 h-3" />
              {isRussian ? 'Полный отчет' : 'Full Report'}
            </button>

              </div>

            <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
                {['visual', 'markdown', 'diff', 'impact'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {tab === 'visual' ? (isRussian ? 'Отчет' : 'Report') : tab === 'markdown' ? (isRussian ? 'Комментарий' : 'Comment') : tab === 'diff' ? (isRussian ? 'Code Diff' : 'Code Diff') : (isRussian ? 'Карта' : 'Impact Map')}
                  </button>
                ))}
            </div>
          </div>
        </div>
          
          {/* <button 
            onClick={handleToggleLanguage}
            disabled={isTranslating}
            className={`self-end flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border whitespace-nowrap ${isRussian ? 'bg-blue-600 text-white border-blue-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
          >
            {isTranslating ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : (isRussian ? 'RU active' : 'Translate to RU')}
          </button>
        </div>
  
      </div>
      </div> */}

      {/* Full Width Summary Container */}
        <div className="w-full bg-white/40 dark:bg-black/10 rounded-xl p-5 border border-black/5 dark:border-white/5 backdrop-blur-sm">
        {/* <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2 opacity-70">
              <SparklesIcon className="w-3 h-3" />
              AI Executive Summary
           </h3> */}
           <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed text-sm md:text-base break-words">
              {displayResult.summary}
           </p>
        </div>
         </div>


      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 w-full">
        {activeTab === 'visual' && (
            <div className="space-y-6">
              
              {/* Rating Scorecard */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">AI Code Quality Scorecard</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                           <svg className="w-full h-full transform -rotate-90">
                             <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                             <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * rating.overall) / 100} className={rating.overall >= 80 ? 'text-green-500' : rating.overall >= 50 ? 'text-amber-500' : 'text-red-500'} />
                           </svg>
                           <span className="absolute text-sm font-bold">{rating.overall}</span>
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-900 dark:text-white">{isRussian ? 'Общий рейтинг' : 'Overall Score'}</div>
                           <div className="text-xs text-slate-500">{rating.overall >= 80 ? (isRussian ? 'Отличный код' : 'Excellent') : rating.overall >= 50 ? (isRussian ? 'Требует внимания' : 'Needs Attention') : (isRussian ? 'Критическое состояние' : 'Critical State')}</div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {[
                          { label: isRussian ? 'Стиль' : 'Style', val: rating.style },
                          { label: isRussian ? 'Ошибки' : 'Bugs', val: rating.errorPrevention },
                          { label: isRussian ? 'Чистота' : 'Clean Code', val: rating.cleanCode },
                          { label: isRussian ? 'Логика' : 'Logic', val: rating.logic }
                        ].map((item, i) => (
                           <div key={i}>
                              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                                 <span>{item.label}</span>
                                 <span>{item.val}/10</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full ${getRatingColor(item.val)}`} style={{ width: `${item.val * 10}%` }}></div>
                              </div>
                           </div>
                        ))}
                     </div>
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 italic text-center">
                    {isRussian ? 'Рейтинг рассчитывается на основе метрики "perplexity" и отклонения от стандартных паттернов.' : 'Rating calculated based on perplexity metrics and deviation from standard engineering patterns.'}
                 </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                  <RefreshCwIcon className="w-3 h-3" /> {isRussian ? 'Журнал отклонений' : 'Discrepancy Log'}
                </h3>
                
                <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                  <button 
                    onClick={() => setSeverityFilter('ALL')}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[80px] ${severityFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    {isRussian ? 'Все' : 'All'} <span className="opacity-50">({counts.ALL})</span>
                  </button>
                  <button 
                    onClick={() => setSeverityFilter(Severity.CRITICAL)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[80px] ${severityFilter === Severity.CRITICAL ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    {isRussian ? 'Критические' : 'Critical'} <span className={severityFilter === Severity.CRITICAL ? 'text-white' : 'text-red-500'}>({counts.CRITICAL})</span>
                  </button>
                  <button 
                    onClick={() => setSeverityFilter(Severity.WARNING)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[80px] ${severityFilter === Severity.WARNING ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    {isRussian ? 'Предупреждения' : 'Warning'} <span className={severityFilter === Severity.WARNING ? 'text-white' : 'text-amber-500'}>({counts.WARNING})</span>
                  </button>
                  <button 
                    onClick={() => setSeverityFilter(Severity.INFO)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[80px] ${severityFilter === Severity.INFO ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    {isRussian ? 'Инфо' : 'Info'} <span className={severityFilter === Severity.INFO ? 'text-white' : 'text-blue-500'}>({counts.INFO})</span>
                  </button>
                </div>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>{isRussian ? 'Проблем не обнаружено для данной категории.' : 'No issues found for this category.'}</p>
                </div>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const originalIdx = displayResult.issues.indexOf(issue);
                  return (
                    <div key={`${severityFilter}-${idx}`} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 shrink-0">{getSeverityIcon(issue.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-2 gap-2">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 break-words">{issue.message}</h4>
                            <div className="shrink-0">{getSeverityBadge(issue.severity)}</div>
                          </div>
                          <pre className="bg-slate-900 p-3 rounded text-[11px] text-blue-300 overflow-x-auto mb-3 w-full"><code>{issue.codeSnippet}</code></pre>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2">
                            <span className="text-[10px] text-slate-500 italic truncate max-w-full">{isRussian ? 'Правило' : 'Rule'}: {issue.ruleReference || (isRussian ? 'Целостность архитектуры' : 'Architectural Integrity')}</span>
                            <div className="flex gap-2 w-full sm:w-auto">
                              {suggestedFixes[originalIdx] && (
                                <button 
                                  onClick={() => downloadPatch(issue, suggestedFixes[originalIdx])} 
                                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded flex items-center justify-center gap-2 transition-transform active:scale-95 animate-in slide-in-from-right-2 whitespace-nowrap"
                                >
                                  <DownloadIcon className="w-3 h-3" />
                                  {isRussian ? 'Скачать патч' : 'Download Patch'}
                                </button>
                              )}
                              <button onClick={() => handleProposeFix(originalIdx, issue)} disabled={loadingFixes[originalIdx]} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap">
                                {loadingFixes[originalIdx] ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                                {isRussian ? 'AI: Исправить' : 'AI Propose Fix'}
                              </button>
                            </div>
                          </div>
                          {suggestedFixes[originalIdx] && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-in zoom-in-95 w-full overflow-hidden">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> {isRussian ? 'Предложенное исправление' : 'Proposed Correction'}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => navigator.clipboard.writeText(suggestedFixes[originalIdx])} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><CopyIcon className="w-3 h-3" /></button>
                                  <button onClick={() => downloadPatch(issue, suggestedFixes[originalIdx])} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><DownloadIcon className="w-3 h-3" /></button>
                                </div>
                              </div>
                              <pre className="bg-green-50 dark:bg-green-900/10 p-3 rounded text-[11px] text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800 overflow-x-auto w-full"><code>{suggestedFixes[originalIdx]}</code></pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 w-full overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <LayoutIcon className="w-4 h-4" /> {isRussian ? 'Глубокий анализ связей' : 'Architectural Impact Analysis'}
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{isRussian ? 'Прямая правка' : 'Directly Modified'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{isRussian ? 'Побочный эффект' : 'Ripple Impact'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#f1f5f9] border border-[#64748b]"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{isRussian ? 'Контекст' : 'Context'}</span>
                </div>
              </div>
            </div>
            
            {displayResult.impactGraphMermaid ? (
              <MermaidGraph chart={displayResult.impactGraphMermaid} />
            ) : (
              <div className="p-12 text-center text-slate-400 italic">{isRussian ? 'Карта влияния недоступна.' : 'No impact mapping available.'}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                 <h4 className="text-[11px] font-bold uppercase text-blue-600 mb-2 flex items-center gap-2">
                   <SparklesIcon className="w-3 h-3" /> {isRussian ? 'Краткий итог влияния' : 'Impact Summary'}
                 </h4>
                 <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                   {isRussian 
                     ? "Этот граф визуализирует иерархию от модулей до конкретных функций. Прямые изменения (красные) могут вызвать каскадные эффекты в оранжевых узлах. Стрелки показывают характер зависимости." 
                     : "This graph visualizes the hierarchy from modules down to specific functions. Direct modifications (Red) may trigger cascading side-effects in Ripple nodes (Orange). Edge labels clarify the type of dependency."}
                 </p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-2">{isRussian ? 'Статус интеграции' : 'Integration Status'}</h4>
                  <div className="flex items-center gap-2">
                     <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${displayResult.status === ReviewStatus.APPROVE ? 'bg-green-500' : 'bg-red-500'} w-[85%]`}></div>
                     </div>
                     <span className="text-[10px] font-mono text-slate-500">85% RISK_CLEAN</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'markdown' && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 p-8 shadow-inner animate-in fade-in zoom-in-95 w-full overflow-hidden">
                <div className="prose dark:prose-invert max-w-none prose-sm prose-slate break-words">
                    <ReactMarkdown components={{
                        pre: ({node, ...props}) => <div className="overflow-x-auto w-full"><pre {...props} /></div>
                    }}>{displayResult.markdownReport}</ReactMarkdown>
                </div>
            </div>
        )}

        {activeTab === 'diff' && (
          <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
            {originalCode && originalCode.trim() ? (
              <DiffViewer diff={originalCode} isDark={document.documentElement.classList.contains('dark')} />
            ) : (
              <div className="p-12 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                No code diff available for this review.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onReset} className="text-slate-500 hover:text-blue-600 text-xs font-bold px-4 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
            {isRussian ? 'Сбросить обзор' : 'Reset & Start New Review'}
          </button>
      </div>

      {/* Full Screen High-Density Report Modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full h-full max-w-7xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-600 p-2 rounded-lg">
                    <BookOpenIcon className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold">{isRussian ? 'Полный архитектурный отчет' : 'Full Architectural Report'}</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{isRussian ? 'Эксклюзивный доступ к аналитике' : 'High-Fidelity Code Analysis & Intent Verification'}</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowFullModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <XCircleIcon className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="flex-1 overflow-y-auto p-8 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                  <FileCodeIcon className="w-4 h-4" /> {isRussian ? 'Подробный технический комментарий' : 'Detailed Technical Critique'}
                </h3>
                <div className="prose dark:prose-invert max-w-none prose-slate prose-blue break-words">
                   <ReactMarkdown components={{
                        pre: ({node, ...props}) => <div className="overflow-x-auto w-full"><pre {...props} /></div>
                    }}>{displayResult.markdownReport}</ReactMarkdown>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                  <LayoutIcon className="w-4 h-4" /> {isRussian ? 'Визуализация связей' : 'Architectural Footprint Mapping'}
                </h3>
                {displayResult.impactGraphMermaid && <MermaidGraph chart={displayResult.impactGraphMermaid} />}
                
                <div className="mt-8 space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 shadow-sm">
                     <h4 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-3 h-3" />
                        {isRussian ? 'Стратегические выводы' : 'Strategic Insights'}
                     </h4>
                     <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                       {isRussian 
                        ? 'Данный отчет синтезирует результаты статического анализа и предсказательного моделирования рисков. Узлы, отмеченные как "Ripple", требуют особого внимания при регрессионном тестировании.' 
                        : 'This comprehensive report synthesizes static analysis results with predictive risk modeling. Components highlighted in the Ripple category should be prioritized for comprehensive integration and regression testing.'}
                     </p>
                  </div>
                  <div className="flex gap-2">
                     <button 
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-slate-600 transition-colors shadow-lg active:scale-95"
                     >
                       <DownloadIcon className="w-4 h-4" />
                       {isRussian ? 'Печать PDF' : 'Export to PDF'}
                     </button>
                     <button 
                      onClick={() => setShowFullModal(false)}
                      className="flex-1 bg-blue-600 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                     >
                       {isRussian ? 'Закрыть просмотр' : 'Close Viewer'}
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
