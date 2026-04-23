import { motion } from 'framer-motion';
import { ActivitySquare, BarChart3, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    title: '30-Frame Analysis',
    description: 'Temporal pattern detection across a sampled sequence to detect manipulation cues.',
    icon: ActivitySquare,
  },
  {
    title: 'Grad-CAM Visualization',
    description: 'Explainable AI heatmaps reveal which facial regions influenced model decisions.',
    icon: Sparkles,
  },
  {
    title: '90% Accuracy',
    description: 'Trained on 3,200 curated videos with robust augmentation and phase-wise tuning.',
    icon: BarChart3,
  },
];

function InfoSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="mx-auto mt-8 grid w-full max-w-5xl gap-4 md:grid-cols-3"
    >
      {FEATURES.map((feature, idx) => {
        const Icon = feature.icon;
        return (
          <motion.article
            key={feature.title}
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="glass rounded-2xl p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <div className="mb-3 inline-flex rounded-lg bg-gradient-to-r from-accent to-cyan-400 p-2 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
          </motion.article>
        );
      })}
    </motion.section>
  );
}

export default InfoSection;
