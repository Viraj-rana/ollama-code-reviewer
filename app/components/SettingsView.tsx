//settingpageview
import React, { useState, useEffect } from 'react';
import { 
  GitHubIcon, 
  GitLabIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  LockIcon,
  RefreshCwIcon, 
  SettingsIcon,
  SparklesIcon,
  PlayIcon
} from './Icons';
import { verifyGitHubToken, verifyGitLabToken } from '../services/gitPlatformService';

export const SettingsView: React.FC = () => {
  const [githubToken, setGithubToken] = useState('');
  const [gitlabToken, setGitlabToken] = useState('');
  
  const [ghStatus, setGhStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [glStatus, setGlStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');

  // Auto-Pilot State
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string>('Never');

  useEffect(() => {
    const storedGh = localStorage.getItem('winsolution_github_token');
    const storedGl = localStorage.getItem('winsolution_gitlab_token');
    const storedAutoPilot = localStorage.getItem('winsolution_autopilot_enabled');
    const storedLastRun = localStorage.getItem('winsolution_last_autopilot_run');
    
    if (storedGh) {
      setGithubToken(storedGh);
      setGhStatus('valid'); // Assume valid on load, user can re-verify
    }
    if (storedGl) {
      setGitlabToken(storedGl);
      setGlStatus('valid');
    }
    if (storedAutoPilot) {
        setAutoPilotEnabled(storedAutoPilot === 'true');
    }
    if (storedLastRun) {
        setLastRunTime(new Date(parseInt(storedLastRun)).toLocaleTimeString());
    }
  }, []);

  const handleVerifyGithub = async () => {
    setGhStatus('verifying');
    const isValid = await verifyGitHubToken(githubToken);
    if (isValid) {
      setGhStatus('valid');
      localStorage.setItem('winsolution_github_token', githubToken);
    } else {
      setGhStatus('invalid');
    }
  };

  const handleVerifyGitlab = async () => {
    setGlStatus('verifying');
    const isValid = await verifyGitLabToken(gitlabToken);
    if (isValid) {
      setGlStatus('valid');
      localStorage.setItem('winsolution_gitlab_token', gitlabToken);
    } else {
      setGlStatus('invalid');
    }
  };

  const handleClear = () => {
    if(confirm("Are you sure you want to clear all secure tokens from this browser?")) {
        localStorage.removeItem('winsolution_github_token');
        localStorage.removeItem('winsolution_gitlab_token');
        localStorage.removeItem('winsolution_autopilot_enabled');
        setGithubToken('');
        setGitlabToken('');
        setGhStatus('idle');
        setGlStatus('idle');
        setAutoPilotEnabled(false);
    }
  };

  const toggleAutoPilot = () => {
      const newState = !autoPilotEnabled;
      setAutoPilotEnabled(newState);
      localStorage.setItem('winsolution_autopilot_enabled', String(newState));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-blue-600 p-2.5 rounded-lg">
             <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Platform Integrations</h2>
            <p className="text-slate-500 text-sm">Manage secure access tokens and automation settings.</p>
          </div>
        </div>

        {/* Auto-Pilot Configuration */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 mb-8 relative overflow-hidden">
             <div className="flex justify-between items-start relative z-10">
                 <div className="flex gap-4">
                     <div className={`p-3 w-12 h-12 rounded-xl transition-colors ${autoPilotEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                         <SparklesIcon className={`w-6 h-6 ${autoPilotEnabled ? 'animate-pulse' : ''}`} />
                     </div>
                     <div>
                         <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                             Auto-Pilot Reviewer
                             {autoPilotEnabled && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                         </h3>
                         <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
                             Automatically scans for new Merge Requests every 5-10 minutes. 
                             It performs an AI review, notifies Telegram, and records the history.
                             <br/><span className="text-xs opacity-75 font-semibold mt-1 block">Requires browser tab to remain open.</span>
                         </p>
                     </div>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                    <button 
                        onClick={toggleAutoPilot}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${autoPilotEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${autoPilotEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">Last run: {lastRunTime}</span>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* GitHub Card */}
          <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <GitHubIcon className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <GitHubIcon className="w-6 h-6 text-slate-900 dark:text-white" />
              <h3 className="font-bold text-lg">GitHub</h3>
              {ghStatus === 'valid' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Connected</span>}
            </div>
            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
              Required for fetching private repositories and Pull Request diffs.
            </p>
            
            <div className="space-y-4 relative z-10">
               <div className="relative">
                 <input 
                    type="password" 
                    value={githubToken}
                    onChange={(e) => { setGithubToken(e.target.value); setGhStatus('idle'); }}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-4 py-3 text-sm outline-none transition-all ${ghStatus === 'invalid' ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'}`}
                 />
                 <LockIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
               </div>
               
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium">Generate Token -</a>
                 <button 
                   onClick={handleVerifyGithub}
                   disabled={ghStatus === 'verifying' || !githubToken}
                   className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${ghStatus === 'valid' ? 'bg-green-600 text-white' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600'}`}
                 >
                   {ghStatus === 'verifying' ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : (ghStatus === 'valid' ? <CheckCircleIcon className="w-3 h-3" /> : 'Verify & Save')}
                   {ghStatus === 'verifying' ? 'Verifying...' : (ghStatus === 'valid' ? 'Verified' : '  Token')}
                 </button>
               </div>
               {ghStatus === 'invalid' && <p className="text-xs text-red-500 font-bold flex items-center gap-1 animate-in fade-in"><XCircleIcon className="w-3 h-3" /> Invalid Token</p>}
            </div>
          </div>

          {/* GitLab Card */}
          <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <GitLabIcon className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <GitLabIcon className="w-6 h-6 text-orange-600" />
              <h3 className="font-bold text-lg">GitLab</h3>
               {glStatus === 'valid' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Connected</span>}
            </div>
            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
              Required for syncing Merge Requests across your projects and groups.
            </p>
            
            <div className="space-y-4 relative z-10">
               <div className="relative">
                 <input 
                    type="password" 
                    value={gitlabToken}
                    onChange={(e) => { setGitlabToken(e.target.value); setGlStatus('idle'); }}
                    placeholder="glpat-xxxxxxxxxxxx"
                    className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-4 py-3 text-sm outline-none transition-all ${glStatus === 'invalid' ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'}`}
                 />
                 <LockIcon className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
               </div>
               
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <a href="https://gitlab.com/-/profile/personal_access_tokens" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium">Generate Token -</a>
                 <button 
                   onClick={handleVerifyGitlab}
                   disabled={glStatus === 'verifying' || !gitlabToken}
                   className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${glStatus === 'valid' ? 'bg-green-600 text-white' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600'}`}
                 >
                   {glStatus === 'verifying' ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : (glStatus === 'valid' ? <CheckCircleIcon className="w-3 h-3" /> : 'Verify & Save')}
                   {glStatus === 'verifying' ? 'Verifying...' : (glStatus === 'valid' ? 'Verified' : '  Token')}
                 </button>
               </div>
               {glStatus === 'invalid' && <p className="text-xs text-red-500 font-bold flex items-center gap-1 animate-in fade-in"><XCircleIcon className="w-3 h-3" /> Invalid Token</p>}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
           <button onClick={handleClear} className="text-red-500 hover:text-red-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Clear All Credentials
           </button>
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-6 flex gap-4">
         <LockIcon className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
         <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-1">Security Architecture</h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
               Tokens provided here are stored exclusively in your browser's <code>localStorage</code>. 
               They are never transmitted to our servers or stored in any database. 
               They are used directly from your client to the GitHub/GitLab APIs via CORS requests.
            </p>
         </div>
      </div>
    </div>
  );
};
