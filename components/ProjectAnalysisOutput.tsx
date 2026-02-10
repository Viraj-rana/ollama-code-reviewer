import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ProjectAnalysisResult } from '../types';
import { BookOpenIcon, LayoutIcon, FileCodeIcon, RefreshCwIcon, AlertTriangleIcon, DownloadIcon } from './Icons';

interface ProjectAnalysisOutputProps {
  result: ProjectAnalysisResult;
  onReset: () => void;
}

const MermaidGraph: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderGraph = async () => {
      if (ref.current && chart && (window as any).mermaid) {
        try {
          setError(false);
          const isDark = document.documentElement.classList.contains('dark');
          (window as any).mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'JetBrains Mono',
          });
          
          ref.current.innerHTML = '';
          const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
          const { svg } = await (window as any).mermaid.render(id, chart);
          ref.current.innerHTML = svg;
          
          // Make SVG responsive
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        } catch (err) {
          console.error("Mermaid Render Error:", err);
          setError(true);
        }
      }
    };

    renderGraph();
  }, [chart]);

  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex items-center gap-3 text-amber-700 dark:text-amber-400 text-sm">
        <AlertTriangleIcon className="w-4 h-4" />
        <span>Complexity too high for visualization engine. Refer to Architectural Insights text.</span>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto min-h-[200px] transition-colors"
    />
  );
};

export const ProjectAnalysisOutput: React.FC<ProjectAnalysisOutputProps> = ({ result, onReset }) => {
  const downloadReadme = () => {
    const blob = new Blob([result.suggestedReadme], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl transition-colors">
      {/* Header */}
      <div className="p-6 border-b border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
             <LayoutIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.projectName}</h2>
            <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">Project Intelligence Report</p>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">{result.description}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-slate-900 transition-colors">
        
        {/* Tech Stack */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4 flex items-center gap-2">
             <FileCodeIcon className="w-4 h-4" /> Tech Stack Detection
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.techStack.map((tech, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Visual Impact Graph */}
        {result.impactGraphMermaid && (
          <section className="animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4 flex items-center gap-2">
              <RefreshCwIcon className="w-4 h-4" /> Module Dependency Graph
            </h3>
            <MermaidGraph chart={result.impactGraphMermaid} />
            <p className="mt-2 text-[10px] text-slate-500 italic">Visualizing logical flow between high-level modules and directories.</p>
          </section>
        )}

        {/* Architecture */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4 flex items-center gap-2">
             <LayoutIcon className="w-4 h-4" /> Structural Insights
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed transition-colors">
            {result.architecture}
          </div>
        </section>

        {/* README */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold flex items-center gap-2">
               <BookOpenIcon className="w-4 h-4" /> Documentation Artifact
            </h3>
            <button 
              onClick={downloadReadme}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 transition-all shadow-md shadow-blue-500/10 active:scale-95"
            >
              <DownloadIcon className="w-3 h-3" />
              Create README.md
            </button>
          </div>
          <div className="prose dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-950 p-8 rounded-lg border border-slate-200 dark:border-slate-800 font-sans shadow-inner transition-colors">
            <ReactMarkdown>{result.suggestedReadme}</ReactMarkdown>
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-center">
               <button 
                onClick={downloadReadme}
                className="bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-3 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
              >
                <DownloadIcon className="w-4 h-4" />
                Download Complete README.md
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button 
              onClick={onReset}
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white text-sm font-medium flex items-center gap-2 px-4 py-2 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
          >
              New Analysis
          </button>
      </div>
    </div>
  );
};