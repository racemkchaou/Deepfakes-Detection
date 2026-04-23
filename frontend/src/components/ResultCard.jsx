import { motion } from 'framer-motion';
import { Activity, Clock3, RotateCcw, ShieldCheck, ShieldX, Sigma } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function useAnimatedNumber(target, duration = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(target * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function Gauge({ score }) {
  const percent = score * 100;
  const needleAngle = -90 + (percent / 100) * 180;

  return (
    <svg viewBox="0 0 300 190" className="w-full max-w-md">
      <path d={describeArc(150, 150, 110, -90, -18)} fill="none" stroke="#10b981" strokeWidth="18" />
      <path d={describeArc(150, 150, 110, -18, 36)} fill="none" stroke="#f59e0b" strokeWidth="18" />
      <path d={describeArc(150, 150, 110, 36, 90)} fill="none" stroke="#ef4444" strokeWidth="18" />
      <motion.line
        x1="150"
        y1="150"
        x2="150"
        y2="58"
        stroke="#f8fafc"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ rotate: -90 }}
        animate={{ rotate: needleAngle }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ transformOrigin: '150px 150px' }}
      />
      <circle cx="150" cy="150" r="12" fill="#f8fafc" />
      <text x="150" y="125" textAnchor="middle" className="fill-slate-100 text-[26px] font-bold">
        {percent.toFixed(1)}%
      </text>
      <text x="150" y="147" textAnchor="middle" className="fill-slate-300 text-[11px] uppercase tracking-[0.22em]">
        Risk Score
      </text>
    </svg>
  );
}

function ResultCard({ result, onReset }) {
  const score = Number(result?.score || 0);
  const confidence = Number(result?.confidence || 0);
  const processingTime = Number(result?.processing_time || 0);
  const label = result?.label || 'REAL';

  const isFake = label === 'DEEPFAKE';
  const scoreAnimated = useAnimatedNumber(score * 100, 1500);
  const confidenceAnimated = useAnimatedNumber(confidence * 100, 1500);

  const timelineData = useMemo(
    () => (result?.frame_scores || []).map((v, i) => ({ frame: i, probability: Number(v || 0) })),
    [result]
  );

  const timelineDomain = useMemo(() => {
    if (!timelineData.length) {
      return [0, 1];
    }

    const values = timelineData.map((point) => point.probability);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    if (Math.abs(maxVal - minVal) < 1e-6) {
      return [0, 1];
    }

    const pad = Math.max(0.02, (maxVal - minVal) * 0.2);
    return [Math.max(0, minVal - pad), Math.min(1, maxVal + pad)];
  }, [timelineData]);

  const middleSrc = result?.middle_frame_b64 ? `data:image/png;base64,${result.middle_frame_b64}` : '';
  const gradcamSrc = result?.gradcam_b64 ? `data:image/png;base64,${result.gradcam_b64}` : '';

  const [gradcamLoaded, setGradcamLoaded] = useState(false);

  useEffect(() => {
    setGradcamLoaded(false);
  }, [gradcamSrc]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45 }}
      className="mx-auto w-full max-w-6xl"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-6 text-white ${
            isFake
              ? 'bg-gradient-to-r from-fake to-rose-600'
              : 'bg-gradient-to-r from-real to-emerald-600'
          }`}
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className={isFake ? 'verdict-shake' : 'verdict-bounce'}>
              <p className="font-display text-3xl font-extrabold sm:text-4xl">
                {isFake ? '⚠ DEEPFAKE DETECTED' : '✓ AUTHENTIC VIDEO'}
              </p>
            </div>
            <p className="font-display text-4xl font-extrabold sm:text-5xl">{scoreAnimated.toFixed(1)}%</p>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 sm:p-6"
          >
            <h3 className="mb-3 font-display text-xl font-bold text-slate-900 dark:text-white">Confidence Gauge</h3>
            <div className="grid place-items-center rounded-xl bg-slate-900 p-3">
              <Gauge score={score} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-4 sm:p-6"
          >
            <h3 className="mb-3 font-display text-xl font-bold text-slate-900 dark:text-white">
              Frame Analysis Timeline
            </h3>
            <div className="h-[260px] rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="timelineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b33" />
                  <XAxis dataKey="frame" stroke="#94a3b8" />
                  <YAxis domain={timelineDomain} stroke="#94a3b8" />
                  <Tooltip />
                  <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Area
                    type="linear"
                    dataKey="probability"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#timelineGradient)"
                    fillOpacity={0.55}
                    dot={{ r: 2 }}
                    isAnimationActive
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-4 sm:p-6"
        >
          <h3 className="mb-4 font-display text-xl font-bold text-slate-900 dark:text-white">Grad-CAM Analysis</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Original Frame</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {middleSrc ? (
                  <img src={middleSrc} alt="Original frame" className="h-64 w-full object-cover" />
                ) : (
                  <div className="h-64 w-full bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">AI Focus Map</p>
              <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {!gradcamLoaded && <div className="shimmer h-64 w-full" />}
                {gradcamSrc ? (
                  <img
                    src={gradcamSrc}
                    alt="Grad-CAM heatmap"
                    className={`h-64 w-full object-cover transition duration-300 ${
                      gradcamLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setGradcamLoaded(true)}
                  />
                ) : (
                  <div className="h-64 w-full bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-400">Blue = low attention</span>
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-400">Red = high attention</span>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Highlighted regions show facial areas that most influenced the AI decision.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-xl p-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Model Confidence</p>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <Sigma className="h-5 w-5 text-accent" /> {confidenceAnimated.toFixed(1)}%
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Processing Time</p>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <Clock3 className="h-5 w-5 text-accent" /> {processingTime.toFixed(2)}s
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Frames Analyzed</p>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <Activity className="h-5 w-5 text-accent" /> 30
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Model Version</p>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {isFake ? <ShieldX className="h-5 w-5 text-fake" /> : <ShieldCheck className="h-5 w-5 text-real" />} v5
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <RotateCcw className="h-4 w-4" /> Analyze Another Video
        </button>
      </div>
    </motion.section>
  );
}

export default ResultCard;
