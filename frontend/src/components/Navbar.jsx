import { motion } from 'framer-motion';
import { Github, Moon, Shield, Sun } from 'lucide-react';

function Navbar({ isDark, onToggleTheme }) {
  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="glass sticky top-4 z-40 mx-auto mb-8 mt-4 flex w-[min(1120px,92vw)] items-center justify-between rounded-2xl px-4 py-3 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-accent to-cyan-400 p-2 text-white shadow-glow">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold leading-none sm:text-2xl">
            <span className="gradient-text">DeepGuard</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            AI-Powered Deepfake Detection
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl p-2 text-slate-700 transition hover:bg-white/60 dark:text-slate-100 dark:hover:bg-white/10"
          aria-label="GitHub"
        >
          <Github className="h-5 w-5" />
        </a>

        <button
          type="button"
          onClick={onToggleTheme}
          className="relative rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          aria-label="Toggle theme"
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            transition={{ duration: 0.25 }}
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </motion.div>
        </button>
      </div>
    </motion.nav>
  );
}

export default Navbar;
