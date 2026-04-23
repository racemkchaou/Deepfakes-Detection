import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AnalyzingState from './components/AnalyzingState';
import InfoSection from './components/InfoSection';
import Navbar from './components/Navbar';
import ResultCard from './components/ResultCard';
import UploadZone from './components/UploadZone';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Toast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-red-700 shadow-xl dark:border-red-500/40 dark:bg-red-900/60 dark:text-red-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <div className="flex-1 text-sm">{message}</div>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('deepguard-theme');
    return saved ? saved === 'dark' : true;
  });

  const [appState, setAppState] = useState('IDLE');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem('deepguard-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark-mode', isDark);
  }, [isDark]);

  const pageTitle = useMemo(() => {
    if (appState === 'ANALYZING') return 'DeepGuard • Analyzing';
    if (appState === 'RESULT') return 'DeepGuard • Results';
    return 'DeepGuard • Upload';
  }, [appState]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const handleAnalyze = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setAppState('ANALYZING');

    try {
      const startedAt = performance.now();
      const response = await axios.post(`${API_BASE}/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const elapsed = performance.now() - startedAt;
      if (elapsed < 3200) {
        await new Promise((resolve) => setTimeout(resolve, 3200 - elapsed));
      }

      setResult(response.data);
      setAppState('RESULT');
    } catch (error) {
      console.error(error);
      setAppState('IDLE');
      setToast('Backend unreachable or request failed. Please ensure FastAPI is running on http://localhost:8000.');
    }
  };

  return (
    <div className="min-h-screen px-3 pb-12 text-slate-900 dark:text-slate-100 sm:px-6">
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark((prev) => !prev)} />

      <main className="mx-auto w-full max-w-6xl">
        <AnimatePresence mode="wait">
          {appState === 'IDLE' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <UploadZone onAnalyze={handleAnalyze} onError={(msg) => setToast(msg)} />
              <InfoSection />
            </motion.div>
          )}

          {appState === 'RESULT' && result && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultCard
                result={result}
                onReset={() => {
                  setResult(null);
                  setAppState('IDLE');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>{appState === 'ANALYZING' && <AnalyzingState />}</AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast('')} />}</AnimatePresence>
    </div>
  );
}

export default App;
