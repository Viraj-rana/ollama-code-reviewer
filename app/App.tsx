//mainapp systems
import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangleIcon, 
  BookOpenIcon, 
  GitPullRequestIcon, 
  PlayIcon, 
  RefreshCwIcon, 
  SettingsIcon, 
  GitHubIcon, 
  GitLabIcon, 
  CheckCircleIcon, 
  SearchIcon, 
  LayoutIcon, 
  XCircleIcon, 
  LockIcon,
  ShareIcon,
  DownloadIcon,
  LinkIcon,
  InfoIcon,
  SparklesIcon,
  ActiveIcon,
   //active mr here
} from './components/Icons';
import { ReviewOutput } from './components/ReviewOutput';
import { ProjectAnalysisOutput } from './components/ProjectAnalysisOutput';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { analyzeCode, analyzeRepository, translateTextToRussian } from './services/geminiService';
import { sendReviewToTelegram } from './services/telegramService';
import { fetchOpenMrs, fetchMergeRequestDiff } from './services/gitPlatformService';
import { ReviewResult, ProjectAnalysisResult, HistoryEntry, ReviewStatus, ExternalMR } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { debugLog, debugError, debugWarn } from './utils/secureLogger';
import { saveHistoryToLocalStorage, loadHistoryFromLocalStorage, validateHistoryEntry } from './utils/storageUtils';

/** 
 * INTERNAL SYSTEM CONFIGURATION
 * SECURITY UPDATE: Bot token removed. It is now stored securely in Supabase Secrets.
 */
const DEFAULT_SYSTEM_AUTHOR = 'usernametg';
const TELEGRAM_CONFIG = {
  chatId: '-000000000', // Publicly knowing the destination channel ID is generally safe
  enabled: false //make it true with real keys
};

const HistoryIcon = ({ className }: { className?: string }) => (
     <svg viewBox="0 0 1024 1024"
      width="24"
      height="24"
   xmlns="http://www.w3.org/2000/svg"
    fill="currentColor">
      <g id="SVGRepo_bgCarrier"
       strokeWidth="0"></g>
       <g id="SVGRepo_tracerCarrier" 
       strokeLinecap="round" strokeLinejoin="round"></g>
       <g id="SVGRepo_iconCarrier"><path d="M512 1024C229.7 1024 0 794.3 0 512S229.7 0 512 0s512 229.7 512 512-229.7 512-512 512z m0-938.7C276.7 85.3 85.3 276.7 85.3 512S276.7 938.7 512 938.7 938.7 747.3 938.7 512 747.3 85.3 512 85.3z" fill="#3688FF"></path><path d="M640 682.7c-9.6 0-19.3-3.2-27.3-9.9l-128-106.7c-9.7-8.1-15.4-20.1-15.4-32.8V384c0-23.6 19.1-42.7 42.7-42.7s42.7 19.1 42.7 42.7v129.4l112.6 93.9c18.1 15.1 20.5 42 5.5 60.1-8.5 10-20.6 15.3-32.8 15.3z" fill="#5F6379">
  </path></g></svg>
  );

//defaultstyleguiderules
const DEFAULT_STYLE_GUIDE = `## Style & Logic Guide

### CRITICAL (Severity: CRITICAL)
1. **Security**: NEVER hardcode API keys, secrets, or credentials. Use environment variables.
2. **Fatal Logic**: Identify major bugs like infinite loops, memory leaks, or race conditions.

### INFO (Severity: INFO)
1. **Naming Conventions**: Use \`snake_case\` for functions and variables. Use \`PascalCase\` for classes.
2. **Type Hinting**: All function signatures must include type hints.
3. **Docstrings**: All public functions must have a Google-style docstring.
4. **Error Handling**: Avoid bare \`except:\` blocks (catch specific exceptions).

### WARNING (Severity: WARNING)
1. **General**: Optimization suggestions, minor logic flaws, or code smells not listed above.`;

const DEFAULT_CODE_DIFF = `def process_user_data(data):
    try:
        api_key = "12345-ABCDE"  # Connected to legacy system
        
        if data['status'] == 'active':
            result = []
            for item in data['items']:
                val = item * 2
                result.append(val)
            return result
            
    except:
        print("Something went wrong")
        return None`;

type AppMode = 'review' | 'analyst' | 'history' | 'settings';
type InputMode = 'manual' | 'github' | 'gitlab' | 'auto';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('review');
  const [styleGuide, setStyleGuide] = useState(DEFAULT_STYLE_GUIDE);
  const [codeDiff, setCodeDiff] = useState(DEFAULT_CODE_DIFF);
  const [discussionContext, setDiscussionContext] = useState<string>('');
  const [blockOnWarning, setBlockOnWarning] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(isAnalyzing); // Ref to track status in interval closure
  
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [projectResult, setProjectResult] = useState<ProjectAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [externalUrl, setExternalUrl] = useState('');
  const [accessToken, setAccessToken] = useState(''); 
  const [isFetchingDiff, setIsFetchingDiff] = useState(false);
  
  // PAT Guidance Persistence logic
  const [showPatGuidance, setShowPatGuidance] = useState(false);
  const [hasSeenGuidance, setHasSeenGuidance] = useState(() => {
    return localStorage.getItem('winsolution_seen_guidance') === 'true';
  });
  const [patGuidanceTab, setPatGuidanceTab] = useState<'github' | 'gitlab' | 'security'>('github');
  
  // Job Syncing State
  const [autoMrs, setAutoMrs] = useState<ExternalMR[]>([]);
  const [isFetchingMrs, setIsFetchingMrs] = useState(false);
  const [selectedMr, setSelectedMr] = useState<ExternalMR | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentAuthor, setCurrentAuthor] = useState(DEFAULT_SYSTEM_AUTHOR);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [isRussian, setIsRussian] = useState(() => {
    return localStorage.getItem('winsolution_language') === 'ru';
  });

  // Update ref whenever state changes
  useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);
  
  // Save language preference
  useEffect(() => {
    localStorage.setItem('winsolution_language', isRussian ? 'ru' : 'en');
  }, [isRussian]);

  // Translation function helper
  const t = (en: string, ru: string) => isRussian ? ru : en;

  useEffect(() => {
    // 1. Load Local History
    const loaded = loadHistoryFromLocalStorage();
    if (loaded.length > 0) {
      debugLog(`[Init] Loaded ${loaded.length} entries from localStorage`);
      setHistory(loaded);
    } else {
      debugLog('[Init] No saved history found in localStorage');
    }

    const savedToken = localStorage.getItem('winsolution_pat');
    if (savedToken) setAccessToken(savedToken);

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    }

    // 2. Fetch Automated History from Supabase
    fetchCloudHistory();

    // 3. Auto-Pilot Interval (Check every 30 seconds if it's time to run)
    const intervalId = setInterval(checkAndRunAutoPilot, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Persist history to localStorage whenever it changes
    if (history.length > 0 || localStorage.getItem('review_history')) {
      const saved = saveHistoryToLocalStorage(history);
      debugLog(`[History] Saved ${history.length} entries to localStorage (success: ${saved})`);
    }
  }, [history]);

  useEffect(() => {
    if (accessToken) localStorage.setItem('winsolution_pat', accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // --- AUTO PILOT LOGIC ---
  const checkAndRunAutoPilot = async () => {
    // 1. Check if enabled
    const isEnabled = localStorage.getItem('winsolution_autopilot_enabled') === 'true';
    if (!isEnabled) return;

    // 2. Check if currently busy
    if (isAnalyzingRef.current) {
        console.log("Auto-Pilot: Skipping run (System Busy)");
        return;
    }

    // 3. Check frequency (5 minutes = 300,000ms)
    const lastRunStr = localStorage.getItem('winsolution_last_autopilot_run') || '0';
    const lastRun = parseInt(lastRunStr);
    const now = Date.now();
    const COOLDOWN = 5 * 60 * 1000; 

    if (now - lastRun < COOLDOWN) {
        return; 
    }

    // 4. Execution
    await runAutoPilotCycle();
  };

  const runAutoPilotCycle = async () => {
      console.log("🤖 Auto-Pilot: Waking up...");
      addLog(t("🤖 Auto-Pilot: Starting background scan...", "🤖 Автопилот: Начинается фоновое сканирование..."));
      
      localStorage.setItem('winsolution_last_autopilot_run', Date.now().toString());

      const ghToken = localStorage.getItem('winsolution_github_token');
      const glToken = localStorage.getItem('winsolution_gitlab_token');

      if (!ghToken && !glToken) {
          addLog(t("Auto-Pilot: No tokens found. Pausing.", "Автопилот: Токены не найдены. Пауза."));
          return;
      }

      try {
          // A. Fetch all active MRs
          const mrs = await fetchOpenMrs(ghToken, glToken);
          
          // B. Filter against processed cache
          const reviewedRaw = localStorage.getItem('winsolution_reviewed_mrs') || '[]';
          const reviewedIds = new Set(JSON.parse(reviewedRaw));
          
          const pendingMrs = mrs.filter(mr => !reviewedIds.has(mr.id));

          if (pendingMrs.length === 0) {
              addLog(t(`Auto-Pilot: No new MRs found (Scanned ${mrs.length}). Sleeping.`, `Автопилот: Новые MR не найдены (сканировано ${mrs.length}). Сон.`));
              return;
          }

          // C. Pick the first one
          const targetMr = pendingMrs[0];
          addLog(t(`Auto-Pilot: Selected job "${targetMr.title}" (#${targetMr.number})`, `Автопилот: Выбрана работа "${targetMr.title}" (#${targetMr.number})`));

          // D. Process Review (This sets isAnalyzing to true via internal logic, but we do it manually to be safe)
          setIsAnalyzing(true);
          
          try {
              // D1. Fetch Diff
              const token = targetMr.platform === 'github' ? ghToken! : glToken!;
              const { diff, context } = await fetchMergeRequestDiff(targetMr, token);
              
              if (!diff) throw new Error("Empty diff returned.");
              
              // D2. Update UI State (so user sees what's happening if looking)
              setCodeDiff(diff);
              setCurrentAuthor(targetMr.author);
              setSelectedMr(targetMr);

              // D3. Analyze
              addLog(t("Auto-Pilot: Running AI Analysis...", "Автопилот: Запуск анализа ИИ..."));
              const result = await analyzeCode(styleGuide, diff, blockOnWarning);
              
              // D4. Save & Notify
              const newEntry: HistoryEntry = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                author: targetMr.author,
                projectName: targetMr.title,
                status: result.status,
                summary: result.summary,
                result: result,
                codeDiff: diff // Store the exact code diff that was analyzed
              };
              
              console.log('[Auto-Pilot] Adding to history:', newEntry);
              setHistory(prev => {
                const updated = [newEntry, ...prev];
                console.log(`[Auto-Pilot] History updated. Total entries: ${updated.length}`, updated);
                return updated;
              });
              setReviewResult(result);

              if (TELEGRAM_CONFIG.enabled && isSupabaseConfigured()) {
                  addLog(t("Auto-Pilot: Sending Telegram notification...", "Автопилот: Отправка уведомления в Telegram..."));
                  try {
                    // Translate summary to Russian for Telegram
                    const russianSummary = await translateTextToRussian(result.summary);
                    const resultForTelegram = {
                      ...result,
                      summary: russianSummary
                    };
                    await sendReviewToTelegram(
                        TELEGRAM_CONFIG.chatId,
                        targetMr.author,
                        targetMr.title,
                        resultForTelegram,
                        targetMr
                    );
                  } catch (telegramErr) {
                    console.error('Auto-Pilot Telegram error:', telegramErr);
                  }
              }

              if (isSupabaseConfigured() && supabase) {
                try {
                  console.log('[Auto-Pilot] Inserting to Supabase:', {
                    id: newEntry.id,
                    project_name: newEntry.projectName,
                    code_diff_length: newEntry.codeDiff?.length || 0
                  });
                  
                  const { data, error } = await supabase.from('reviews').insert({
                    id: newEntry.id,
                    timestamp: newEntry.timestamp,
                    author: newEntry.author,
                    project_name: newEntry.projectName,
                    status: newEntry.status,
                    summary: newEntry.summary,
                    result_json: newEntry.result,
                    code_diff: newEntry.codeDiff
                  });
                  
                  if (error) {
                    console.error('[Auto-Pilot] Supabase insert error:', error);
                    // Check if error is due to missing code_diff column
                    if (error.message?.includes('code_diff')) {
                      console.warn('[Auto-Pilot] code_diff column missing, retrying without it...');
                      addLog(t('⚠️ code_diff column not found. Retrying without code diff...', '⚠️ Столбец code_diff не найден. Повторная попытка без диффа кода...'));
                      // Retry without code_diff
                      const { error: retryError } = await supabase.from('reviews').insert({
                        id: newEntry.id,
                        timestamp: newEntry.timestamp,
                        author: newEntry.author,
                        project_name: newEntry.projectName,
                        status: newEntry.status,
                        summary: newEntry.summary,
                        result_json: newEntry.result
                      });
                      if (retryError) {
                        console.error('[Auto-Pilot] Retry failed:', retryError);
                        addLog(t(`Supabase Error: ${retryError.message}`, `Ошибка Supabase: ${retryError.message}`));
                      } else {
                        console.log('[Auto-Pilot] Saved to Supabase (without code_diff)');
                        addLog(t('✅ Saved to Cloud DB. (Add code_diff column to Supabase to store code diffs)', '✅ Сохранено в облачную БД. (Добавьте столбец code_diff в Supabase для сохранения дифов кода)'));
                      }
                    } else {
                      addLog(t(`Supabase Error: ${error.message}`, `Ошибка Supabase: ${error.message}`));
                    }
                  } else {
                    console.log('[Auto-Pilot] Successfully saved to Supabase');
                    addLog(t('✅ Auto-Pilot: Saved review to Cloud DB.', '✅ Автопилот: Обзор сохранён в облачную БД.'));
                  }
                } catch (supabaseErr: any) {
                  console.error('[Auto-Pilot] Supabase exception:', supabaseErr);
                  addLog(t(`Supabase Exception: ${supabaseErr.message}`, `Исключение Supabase: ${supabaseErr.message}`));
                }
              }

              // D5. Mark as Reviewed
              reviewedIds.add(targetMr.id);
              localStorage.setItem('winsolution_reviewed_mrs', JSON.stringify(Array.from(reviewedIds)));
              
              addLog(t("Auto-Pilot: Cycle Complete. Sleeping for 5 mins.", "Автопилот: Цикл завершён. Спит 5 минут."));

          } catch (err: any) {
              addLog(t(`Auto-Pilot Error on ${targetMr.title}: ${err.message}`, `Ошибка Автопилота на ${targetMr.title}: ${err.message}`));
          } finally {
              setIsAnalyzing(false);
          }

      } catch (err: any) {
          addLog(t(`Auto-Pilot Global Error: ${err.message}`, `Глобальная ошибка Автопилота: ${err.message}`));
          setIsAnalyzing(false);
      }
  };

  const fetchCloudHistory = async () => {
    if (!isSupabaseConfigured() || !supabase) return;

    setIsSyncingDb(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        // Transform DB data to frontend HistoryEntry
        const cloudEntries: HistoryEntry[] = data.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          author: row.author,
          projectName: row.project_name,
          status: row.status as ReviewStatus,
          summary: row.summary,
          result: row.result_json as ReviewResult,
          codeDiff: row.code_diff // Restore the code diff from database
        }));

        console.log('[Cloud Sync] Fetched cloud entries:', cloudEntries);

        // Merge with local history, avoiding duplicates by ID
        setHistory(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newEntries = cloudEntries.filter(c => !existingIds.has(c.id));
          const merged = [...newEntries, ...prev].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          console.log(`[Cloud Sync] Merged history. New entries: ${newEntries.length}, Total: ${merged.length}`, merged);
          return merged;
        });
        
        if (data.length > 0) addLog(t(`Synced ${data.length} automated reviews from Cloud DB.`, `Синхронизировано ${data.length} автоматических обзоров из облачной БД.`));
      }
    } catch (err) {
      console.error("Cloud Sync Error", err);
    } finally {
      setIsSyncingDb(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const handleFetchOpenMrs = async () => {
    // Check for tokens in Settings first, then fallback to sidebar manual token
    const storedGh = localStorage.getItem('winsolution_github_token');
    const storedGl = localStorage.getItem('winsolution_gitlab_token');
    
    // Fallback logic for legacy manual token
    let ghTokenToUse = storedGh;
    let glTokenToUse = storedGl;
    
    if (!ghTokenToUse && !glTokenToUse && accessToken) {
        if (accessToken.startsWith('ghp_')) ghTokenToUse = accessToken;
        if (accessToken.startsWith('glpat-')) glTokenToUse = accessToken;
    }

    if (!ghTokenToUse && !glTokenToUse) {
      setError("No access tokens found. Please configure them in Settings or provide a token.");
      return;
    }

    setIsFetchingMrs(true);
    setError(null);
    setInputMode('auto');
    
    try {
      addLog(t("Starting aggregated fetch from connected platforms...", "Начало агрегированной выборки с подключённых платформ..."));
      const mrs = await fetchOpenMrs(ghTokenToUse, glTokenToUse);
      setAutoMrs(mrs);
      addLog(t(`Fetch complete. Found ${mrs.length} active jobs.`, `Выборка завершена. Найдено ${mrs.length} активных работ.`));
    } catch (err: any) {
      setError(`Sync Error: ${err.message}`);
    } finally {
      setIsFetchingMrs(false);
    }
  };

  const handleRunAnalysis = async (arg1?: unknown, arg2?: ExternalMR) => {
    // Determine if arguments are passed manually (diff + MR) or via event (onClick)
    const diffToAnalyze = typeof arg1 === 'string' ? arg1 : codeDiff;
    const mrToUse = arg2 || selectedMr;

    if (!styleGuide.trim() || !diffToAnalyze.trim()) {
      setError("Please provide style guide and a diff.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setReviewResult(null);
    setProjectResult(null);
    setLogs([]); // Clear logs for fresh analysis view
    
    try {
      addLog(t("Initializing AI Pipeline...", "Инициализация конвейера ИИ..."));
      const result = await analyzeCode(styleGuide, diffToAnalyze, blockOnWarning);
      setReviewResult(result);
      
      const projectName = externalUrl ? (externalUrl.split('/').pop() || 'Review') : (mrToUse ? mrToUse.title : 'Manual Workspace');
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        author: mrToUse ? mrToUse.author : currentAuthor,
        projectName,
        status: result.status,
        summary: result.summary,
        result: result,
        codeDiff: diffToAnalyze // Store the exact code diff that was analyzed
      };

      debugLog('[Manual Review] Adding to history:', newEntry);
      setHistory(prev => {
        const updated = [newEntry, ...prev];
        debugLog(`[Manual Review] History updated. Total entries: ${updated.length}`);
        return updated;
      });

      // TELEGRAM NOTIFICATION (Now Secure)
      if (TELEGRAM_CONFIG.enabled && isSupabaseConfigured()) {
        addLog(t("Sending report to Telegram (via Secure Backend)...", "Отправка отчёта в Telegram (через защищённый серверный интерфейс)..."));
        try {
          // Translate summary to Russian for Telegram
          const russianSummary = await translateTextToRussian(result.summary);
          const resultForTelegram = {
            ...result,
            summary: russianSummary
          };
          await sendReviewToTelegram(
              TELEGRAM_CONFIG.chatId,
              mrToUse ? mrToUse.author : currentAuthor,
              projectName,
              resultForTelegram,
              mrToUse // Pass context for links
          );
          addLog(t("Notification sent.", "Уведомление отправлено."));
        } catch (telegramErr) {
          console.error('Manual Review Telegram error:', telegramErr);
          addLog(t("Telegram notification failed to send.", "Ошибка отправки уведомления в Telegram."));
        }
      } else if (TELEGRAM_CONFIG.enabled && !isSupabaseConfigured()) {
        addLog(t("Telegram skipped: Supabase not configured.", "Telegram пропущен: Supabase не настроен."));
      }
      
      // Save to Supabase (Optional for Manual Runs)
      if (isSupabaseConfigured() && supabase) {
        addLog(t("Syncing result to Cloud DB...", "Синхронизация результата с облачной БД..."));
        try {
          console.log('[Manual Review] Inserting to Supabase:', {
            id: newEntry.id,
            project_name: newEntry.projectName,
            code_diff_length: newEntry.codeDiff?.length || 0
          });
          
          const { data, error } = await supabase.from('reviews').insert({
            id: newEntry.id,
            timestamp: newEntry.timestamp,
            author: newEntry.author,
            project_name: newEntry.projectName,
            status: newEntry.status,
            summary: newEntry.summary,
            result_json: newEntry.result,
            code_diff: newEntry.codeDiff
          });
          
          if (error) {
            console.error('[Manual Review] Supabase insert error:', error);
            // Check if error is due to missing code_diff column
            if (error.message?.includes('code_diff')) {
              console.warn('[Manual Review] code_diff column missing, retrying without it...');
              addLog(t('⚠️ code_diff column not found. Retrying without code diff...', '⚠️ Столбец code_diff не найден. Повторная попытка без диффа кода...'));
              // Retry without code_diff
              const { error: retryError } = await supabase.from('reviews').insert({
                id: newEntry.id,
                timestamp: newEntry.timestamp,
                author: newEntry.author,
                project_name: newEntry.projectName,
                status: newEntry.status,
                summary: newEntry.summary,
                result_json: newEntry.result
              });
              if (retryError) {
                console.error('[Manual Review] Retry failed:', retryError);
                addLog(t(`Supabase Error: ${retryError.message}`, `Ошибка Supabase: ${retryError.message}`));
              } else {
                console.log('[Manual Review] Saved to Supabase (without code_diff)');
                addLog(t('✅ Review saved to Cloud DB. (Add code_diff column to Supabase to store code diffs)', '✅ Обзор сохранён в облачную БД. (Добавьте столбец code_diff в Supabase для сохранения дифов кода)'));
              }
            } else {
              addLog(t(`Supabase Error: ${error.message}`, `Ошибка Supabase: ${error.message}`));
            }
          } else {
            console.log('[Manual Review] Successfully saved to Supabase');
            addLog(t('✅ Review successfully synced to Cloud DB.', '✅ Обзор успешно синхронизирован с облачной БД.'));
          }
        } catch (supabaseErr: any) {
          console.error('[Manual Review] Supabase exception:', supabaseErr);
          addLog(t(`Supabase Exception: ${supabaseErr.message}`, `Исключение Supabase: ${supabaseErr.message}`));
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectMrForReview = async (mr: ExternalMR) => {
    setSelectedMr(mr);
    setIsFetchingDiff(true);
    setLogs([]);
    addLog(t(`Synchronizing job: ${mr.title} (#${mr.number})`, `Синхронизация работы: ${mr.title} (#${mr.number})`));
    
    try {
      const storedGh = localStorage.getItem('winsolution_github_token');
      const storedGl = localStorage.getItem('winsolution_gitlab_token');
      const token = mr.platform === 'github' ? (storedGh || accessToken) : (storedGl || accessToken);

      if (!token) throw new Error(`Missing token for ${mr.platform}`);

      const { diff, context } = await fetchMergeRequestDiff(mr, token);
      
      setCodeDiff(diff);
      setDiscussionContext(context);
      setCurrentAuthor(mr.author);
      addLog(`${mr.platform === 'github' ? 'GitHub' : 'GitLab'} sync complete.`);
      
      // Automatically trigger analysis
      await handleRunAnalysis(diff, mr);
      
    } catch (err: any) {
      setError(err.message);
      addLog(`FETCH FAILURE: ${err.message}`);
    } finally {
      setIsFetchingDiff(false);
    }
  };

  const handleFetchExternalDiff = async () => {
    if (!externalUrl.trim()) {
      setError("Please provide a URL to fetch from.");
      return;
    }
    setIsFetchingDiff(true);
    setLogs([]);
    addLog(`Manual Job Trigger: ${externalUrl}`);
    
    try {
        const cleanUrl = externalUrl.trim().replace(/\/$/, "");
        const trimmedToken = accessToken.trim();
        
        if (inputMode === 'github') {
            const prMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
            if (!prMatch) throw new Error("Invalid GitHub URL.");
            const [_, owner, repo, pullNumber] = prMatch;
            const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
            if (trimmedToken) headers['Authorization'] = `token ${trimmedToken}`;
            const resMeta = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, { headers });
            const meta = await resMeta.json();
            setCurrentAuthor(meta.user?.login || DEFAULT_SYSTEM_AUTHOR);
            const resDiff = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, { headers: { ...headers, 'Accept': 'application/vnd.github.v3.diff' } });
            setCodeDiff(await resDiff.text());
            setInputMode('manual');
        } else if (inputMode === 'gitlab') {
            const mrMatch = cleanUrl.match(/gitlab\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
            if (!mrMatch) throw new Error("Invalid GitLab URL.");
            const projectPath = encodeURIComponent(mrMatch[1]);
            const mrIid = mrMatch[2];
            const headers: HeadersInit = { 'Accept': 'application/json' };
            if (trimmedToken) headers['PRIVATE-TOKEN'] = trimmedToken;
            const resMeta = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mrIid}`, { headers });
            const meta = await resMeta.json();
            setCurrentAuthor(meta.author?.username || DEFAULT_SYSTEM_AUTHOR);
            const resDiff = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mrIid}/diffs`, { headers });
            const diffs = await resDiff.json();
            setCodeDiff(diffs.map((d: any) => `--- a/${d.old_path}\n+++ b/${d.new_path}\n${d.diff}`).join('\n\n'));
            setInputMode('manual');
        }
        addLog("Fetch complete.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetchingDiff(false);
    }
  };

  const handleRepoAnalysis = async () => {
    if (!externalUrl.trim()) {
      setError("Provide a repo URL.");
      return;
    }
    setIsAnalyzing(true);
    setLogs([]);
    setError(null);
    
    try {
      addLog(`Indexing repository: ${externalUrl}`);
      
      const cleanUrl = externalUrl.trim().replace(/\/$/, "");
      
      // Token resolution (Manual Input -> Stored Settings)
      const storedGh = localStorage.getItem('winsolution_github_token');
      const storedGl = localStorage.getItem('winsolution_gitlab_token');
      const manualToken = accessToken.trim();
      
      let repoName = "";
      let fileTree = "";
      let keyContext = "";
      
      if (cleanUrl.includes('github.com')) {
        const match = cleanUrl.match(/(?:github\.com\/)([^/]+)\/([^/]+)/);
        if (!match) throw new Error("Invalid GitHub URL.");
        const owner = match[1];
        const repo = match[2];
        
        const token = manualToken || storedGh;
        const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        addLog("Fetching metadata...");
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if(!repoRes.ok) throw new Error("Repository not found or access denied (Check Token).");
        const repoData = await repoRes.json();
        repoName = repoData.full_name || repoData.name;
        
        addLog("Mapping file structure...");
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`, { headers });
        const treeData = await treeRes.json();
        const allFiles = treeData.tree || [];
        // Limit tree to first 300 files to avoid context limit
        fileTree = allFiles.map((f: any) => f.path).slice(0, 300).join('\n');

        addLog("Reading deep configuration files...");
        // Identify key files to fetch content for
        const keyFiles = ['README.md', 'package.json', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'requirements.txt', 'Dockerfile', 'pom.xml'];
        // Find these files in the tree
        const targetFiles = allFiles.filter((f: any) => keyFiles.some(k => f.path.endsWith(k) && f.path.split('/').length < 3)).slice(0, 5);

        for (const file of targetFiles) {
             try {
                 const blobRes = await fetch(file.url, { headers });
                 const blob = await blobRes.json();
                 if (blob.content) {
                     // GitHub returns base64 content with newlines
                     const text = atob(blob.content.replace(/\s/g, ''));
                     keyContext += `\n\n--- FILE: ${file.path} ---\n${text.substring(0, 5000)}`;
                 }
             } catch (e) { 
                 console.warn(`Skipped content fetch for ${file.path}`); 
             }
        }

      } else if (cleanUrl.includes('gitlab.com')) {
        const match = cleanUrl.match(/(?:gitlab\.com\/)(.+?)(?:\/-\/|#|\?|$)/);
        if (!match) throw new Error("Invalid GitLab URL.");
        const projectPath = encodeURIComponent(match[1]);
        
        const token = manualToken || storedGl;
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (token) headers['PRIVATE-TOKEN'] = token;

        addLog("Fetching metadata...");
        const repoRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}`, { headers });
        if(!repoRes.ok) throw new Error("Project not found or access denied (Check Token).");
        const repoData = await repoRes.json();
        repoName = repoData.name_with_namespace;

        addLog("Mapping file structure...");
        const treeRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100`, { headers });
        const treeData = await treeRes.json();
        const allFiles = Array.isArray(treeData) ? treeData : [];
        fileTree = allFiles.map((f: any) => f.path).join('\n');

        addLog("Reading deep configuration files...");
        const keyFiles = ['README.md', 'package.json', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'requirements.txt', 'Dockerfile'];
        const targetFiles = allFiles.filter((f: any) => keyFiles.includes(f.path));
        
        for (const file of targetFiles) {
            try {
                const fileRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(file.path)}/raw?ref=${repoData.default_branch}`, { headers });
                if (fileRes.ok) {
                    const text = await fileRes.text();
                    keyContext += `\n\n--- FILE: ${file.path} ---\n${text.substring(0, 5000)}`;
                }
            } catch (e) { 
                console.warn(`Skipped content fetch for ${file.path}`); 
            }
        }
      } else {
          throw new Error("Unsupported URL. Please use a valid GitHub or GitLab repository URL.");
      }

      addLog("Sending structural data to AI Architect...");
      const result = await analyzeRepository(repoName, fileTree, keyContext || "No specific config files found. Analyze based on file structure only.");
      setProjectResult(result);
      addLog("Analysis complete.");
    } catch (err: any) {
      setError(err.message);
      addLog(`FAILED: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDismissGuidance = () => {
    setHasSeenGuidance(true);
    localStorage.setItem('winsolution_seen_guidance', 'true');
    setShowPatGuidance(false);
  };

  const resetAll = () => {
    setReviewResult(null);
    setProjectResult(null);
    setError(null);
    setLogs([]);
    setSelectedMr(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 min-h-16 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveMode('review')}>
            <div className="bg-none-600 p-2 rounded-lg">
              <RefreshCwIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">WinSolution <span className="text-blue-600">AI</span></span>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-1 md:flex-none justify-center">
              <button onClick={() => setActiveMode('review')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeMode === 'review' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500'}`}>Code Review</button>
              <button onClick={() => setActiveMode('analyst')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeMode === 'analyst' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500'}`}>Repo Analyst</button>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchCloudHistory} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isSyncingDb ? 'animate-spin' : ''}`} title="Sync with Cloud">
                <RefreshCwIcon className="w-5 h-5 text-blue-500" />
              </button>
              <button onClick={() => setIsRussian(!isRussian)} className={`p-2 rounded-full transition-colors ${isRussian ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Toggle Russian/English">
                <span className="text-xs font-bold">{isRussian ? 'RU' : 'EN'}</span>
              </button>
              <button onClick={() => setActiveMode('settings')} className={`p-2 rounded-full transition-colors ${activeMode === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Settings">
                <SettingsIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setActiveMode('history')} className={`p-2 rounded-full transition-colors ${activeMode === 'history' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="History">
                <HistoryIcon className="w-5 h-5" />
              </button>
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <LayoutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeMode === 'settings' ? (
           <div className="lg:col-span-12">
              <SettingsView />
           </div>
        ) : activeMode === 'history' ? (
          <div className="lg:col-span-12">
            <HistoryView history={history} onSelect={(e) => { setReviewResult(e.result); setCodeDiff(e.codeDiff || DEFAULT_CODE_DIFF); setActiveMode('review'); }} onDelete={(id) => setHistory(h => h.filter(e => e.id !== id))} onClear={() => setHistory([])} />
          </div>
        ) : (
          <>
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpenIcon className="w-5 h-5 text-blue-600" /> Style Guide & Rules
                </h2>
                <textarea
                  className="w-full h-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={styleGuide}
                  onChange={(e) => setStyleGuide(e.target.value)}
                  placeholder="Define engineering principles..."
                />
              </section>

              <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <LockIcon className="w-5 h-5 text-blue-600" /> Manual Repository Access
                  </h2>
                  <button onClick={() => setShowPatGuidance(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-blue-600 transition-colors">
                    <InfoIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Repository URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://gitlab.com/project"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">One-Time Token</label>
                    <input
                      type="password"
                      placeholder="Override settings..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      onFocus={() => { 
                        // Only show if token empty and guidance not seen
                        if(!accessToken && !hasSeenGuidance) setShowPatGuidance(true); 
                      }}
                    />
                    <div className="mt-3 flex flex-col gap-2">
                      <button onClick={handleFetchOpenMrs} disabled={isFetchingMrs} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                        <RefreshCwIcon className={`w-3.5 h-3.5 ${isFetchingMrs ? 'animate-spin' : ''}`} /> Sync Active Jobs
                      </button>
                      <p className="text-[10px] text-center text-slate-400">Uses tokens from Settings if available.</p>
                    </div>
                  </div>
                </div>
              </section>

              <button onClick={() => activeMode === 'review' ? handleRunAnalysis() : handleRepoAnalysis()} disabled={isAnalyzing || isFetchingDiff} className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-black text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95">
                {isAnalyzing ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <PlayIcon className="w-5 h-5" />}
                {activeMode === 'review' ? 'Run AI Review' : 'Run Analysis'}
              </button>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
                  <XCircleIcon className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {!isAnalyzing && !reviewResult && !projectResult && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-2">
                    <button onClick={() => setInputMode('manual')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === "manual" ? "bg-yellow-500 dark:bg-slate-700 shadow-sm text-white" : "text-slate-500"}`}>Workspace</button>
                    <button onClick={() => setInputMode('auto')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === "auto" ? "bg-green-600 dark:bg-slate-700 shadow-sm text-white" : "text-slate-500"}`}><ActiveIcon className="w-3 h-3 inline mr-1" /> Active MR's</button>
                    <button onClick={() => setInputMode('github')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === "github" ? "bg-sky-700 dark:bg-slate-700 shadow-sm text-white" : "text-slate-500"}`}><GitHubIcon className="w-3 h-3 inline mr-1" /> GitHub</button>
                    <button onClick={() => setInputMode('gitlab')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === "gitlab" ? "bg-orange-500 dark:bg-slate-600 shadow-sm text-white" : "text-slate-500"}'}`}><GitLabIcon className="w-3 h-3 inline mr-1" /> GitLab</button>
                  </div>

                  {inputMode === 'manual' ? (
                    <textarea className="flex-1 w-full bg-slate-900 text-blue-300 p-6 text-sm font-mono outline-none resize-none" value={codeDiff} onChange={(e) => setCodeDiff(e.target.value)} placeholder="Paste code diff here..." />
                  ) : inputMode === 'auto' ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50 dark:bg-slate-950/50">
                      {isFetchingMrs ? (
                         <div className="space-y-3">
                           {[1, 2, 3].map((i) => (
                             <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
                               <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                               <div className="flex-1 min-w-0 space-y-2">
                                 <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                 <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                               </div>
                               <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                             </div>
                           ))}
                         </div>
                      ) : autoMrs.length === 0 ? (
                        <div className="text-center py-20 text-slate-400"><GitPullRequestIcon className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>No active jobs found. Configure tokens in Settings & Sync.</p></div>
                      ) : (
                        autoMrs.map(mr => (
                          <div key={mr.id} className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer ${selectedMr?.id === mr.id ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 dark:border-slate-800'}`} onClick={() => handleSelectMrForReview(mr)}>
                            {mr.authorAvatar ? <img src={mr.authorAvatar} alt={mr.author} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">{mr.author.substring(0, 2)}</div>}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate flex items-center gap-2">
                                    {mr.platform === 'github' ? <GitHubIcon className="w-3 h-3" /> : <GitLabIcon className="w-3 h-3" />}
                                    {mr.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{mr.repo} • #{mr.number}</p>
                            </div>
                            <div className={`bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center min-w-[60px] ${selectedMr?.id === mr.id && isFetchingDiff ? 'opacity-80' : ''}`}>
                                {selectedMr?.id === mr.id && isFetchingDiff ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : 'Review'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                       <h3 className="text-xl font-bold mb-8">Direct Integration</h3>
                       <div className="flex w-full max-w-md gap-2">
                         <input type="text" placeholder={`Paste ${inputMode} URL here...`} className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
                         <button onClick={handleFetchExternalDiff} disabled={isFetchingDiff} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {isFetchingDiff ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : null}
                            {isFetchingDiff ? 'Fetching...' : 'Fetch'}
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {(isAnalyzing || isFetchingDiff) && (
                <div className="bg-slate-900 rounded-xl p-6 font-mono text-xs text-blue-300 flex-1 min-h-[400px] overflow-y-auto">
                  {logs.map((log, i) => <div key={i} className="mb-1 leading-relaxed"><span className="text-slate-600 mr-2">{log.substring(0, 12)}</span> {log.substring(12)}</div>)}
                  <div ref={logEndRef} />
                </div>
              )}

              {reviewResult && !isAnalyzing && (
                <ReviewOutput result={reviewResult} onReset={resetAll} styleGuide={styleGuide} originalCode={codeDiff} />
              )}

              {projectResult && !isAnalyzing && (
                <ProjectAnalysisOutput result={projectResult} onReset={resetAll} />
              )}
            </div>
          </>
        )}
      </main>

      {showPatGuidance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50">
               <div>
                 <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                   <LockIcon className="w-5 h-5 text-white" />
                 </div>
                 <h2 className="text-xl font-bold">Security & Connection Guide</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Safe & Private Data Synchronization</p>
               </div>
               <button onClick={() => setShowPatGuidance(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircleIcon className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="p-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
               <div className="flex flex-col sm:flex-row gap-2">
                 {[
                   { id: 'github', label: 'GitHub', icon: GitHubIcon }, 
                   { id: 'gitlab', label: 'GitLab', icon: GitLabIcon }, 
                   { id: 'security', label: 'Security Pledge', icon: CheckCircleIcon }
                 ].map(tab => (
                   <button 
                     key={tab.id} 
                     onClick={() => setPatGuidanceTab(tab.id as any)} 
                     className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${patGuidanceTab === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                   >
                     <tab.icon className="w-4 h-4" />
                     {tab.label}
                   </button>
                 ))}
               </div>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto min-h-[300px]">
               {patGuidanceTab === 'github' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generating a GitHub Token</h3>
                   <p className="text-sm text-slate-500">To review private repositories, WinSolution requires a Personal Access Token (Classic).</p>
                   
                   <div className="space-y-4">
                     {[
                       "Navigate to Settings > Developer settings > Personal access tokens > Tokens (classic).",
                       "Click Generate new token (classic). Give it a descriptive name like \"WinSolution AI Review\".",
                       "Select the 'repo' scope. This is required to read your private code diffs.",
                       "Click Generate token and paste it into the Repository Access field."
                     ].map((step, i) => (
                       <div key={i} className="flex gap-4">
                         <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                         <p className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{step}</p>
                       </div>
                     ))}
                   </div>
                   
                   <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline mt-2">
                     Go to GitHub Token Settings <LinkIcon className="w-3 h-3" />
                   </a>
                 </div>
               )}

               {patGuidanceTab === 'gitlab' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generating a GitLab Token</h3>
                   <p className="text-sm text-slate-500">To access GitLab Merge Requests, create a Personal Access Token with API read rights.</p>
                   
                   <div className="space-y-4">
                     {[
                       "Go to your User Settings > Access Tokens.",
                       "Set a name and select the 'read_api' scope.",
                       "Set an expiration date (we recommend 7-30 days for security).",
                       "Click Create personal access token and copy the result."
                     ].map((step, i) => (
                       <div key={i} className="flex gap-4">
                         <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                         <p className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{step}</p>
                       </div>
                     ))}
                   </div>

                   <a href="https://gitlab.com/-/profile/personal_access_tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline mt-2">
                     Go to GitLab Token Settings <LinkIcon className="w-3 h-3" />
                   </a>
                 </div>
               )}

               {patGuidanceTab === 'security' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl flex gap-4">
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">Enterprise Privacy Commitment</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">We value your source code's confidentiality above all else. Our architecture is built to be stateless and local.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h5 className="font-bold text-blue-600 text-xs uppercase mb-2">Zero Server Persistence</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">Your code diffs and access tokens are never saved on our backend. They reside temporarily in your browser's RAM during analysis.</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h5 className="font-bold text-blue-600 text-xs uppercase mb-2">Browser-Only Tokens</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">Access tokens are only used to initiate a direct handshake with GitHub/GitLab. They are cleared when the session ends or the tab is closed.</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h5 className="font-bold text-blue-600 text-xs uppercase mb-2">AI Safety Protocols</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">We use the Google Gemini 3 Enterprise model, which ensures that your code is not used for model training.</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h5 className="font-bold text-blue-600 text-xs uppercase mb-2">HTTPS Encryption</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">Every bit of data is encrypted in transit using industry-standard TLS 1.3 certificates.</p>
                      </div>
                   </div>
                 </div>
               )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
               <button onClick={handleDismissGuidance} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">Got it, I'm ready</button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t py-8 bg-white dark:bg-slate-900 mt-auto text-center text-sm text-slate-500">
        <p>© 2026 WinSolution Engineering. Enterprise AI Intelligence.</p>
      </footer>
    </div>
  );
};

export default App;
