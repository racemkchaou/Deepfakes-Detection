import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Check, Cpu, Film, ScanFace } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEPS = [
  { icon: Film, label: 'Extracting 30 frames' },
  { icon: ScanFace, label: 'Detecting faces with AI' },
  { icon: Brain, label: 'Analyzing temporal patterns' },
  { icon: Cpu, label: 'Computing deepfake probability' },
];

function AnalyzingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervals = STEPS.map((_, idx) =>
      setTimeout(() => {
        setActiveStep(idx + 1);
      }, idx * 800)
    );

    return () => {
      intervals.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-dark-950/85 px-4 backdrop-blur-md"
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-white sm:p-8">
        <div className="mx-auto mb-8 grid h-36 w-36 place-items-center">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              stroke="url(#ringGradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={327}
              animate={{ strokeDashoffset: [327, 100, 16] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <defs>
              <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="-mt-28 text-center">
            <p className="font-display text-3xl font-bold">AI</p>
            <p className="text-xs text-slate-300">Analyzing</p>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = activeStep > idx;

            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.12 }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                  done ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-white/15 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <span className="text-sm sm:text-base">{step.label}</span>
                </div>

                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      className="rounded-full bg-cyan-300/20 p-1"
                    >
                      <Check className="h-4 w-4 text-cyan-200" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-cyan-300"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default AnalyzingState;
