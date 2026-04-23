import { motion } from 'framer-motion';
import { ArrowRight, FileVideo, ScanFace, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';

function formatFileSize(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const sec = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${min}:${sec}`;
}

function UploadZone({ onAnalyze, onError }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [duration, setDuration] = useState(null);

  const onDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      onError('Unsupported file or file size exceeds 100MB.');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
    };
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 100 * 1024 * 1024,
    accept: {
      'video/mp4': ['.mp4'],
      'video/x-msvideo': ['.avi'],
      'video/quicktime': ['.mov'],
      'video/x-matroska': ['.mkv'],
    },
  });

  const meta = useMemo(() => {
    if (!selectedFile) return null;
    return {
      name: selectedFile.name,
      size: formatFileSize(selectedFile.size),
      duration: formatDuration(duration),
    };
  }, [selectedFile, duration]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-5xl"
    >
      <div className="rotating-border p-[2px]">
        <div className="inner glass rounded-2xl p-4 sm:p-6">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
              isDragActive
                ? 'border-accent bg-accent/10'
                : 'border-slate-300/60 hover:border-accent/70 dark:border-slate-500/40'
            }`}
          >
            <input {...getInputProps()} />

            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-cyan-400 text-white shadow-glow"
            >
              {selectedFile ? <ShieldCheck className="h-10 w-10" /> : <ScanFace className="h-10 w-10" />}
            </motion.div>

            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              {isDragActive ? 'Drop your video here' : 'Drop your video here'}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">or click to browse</p>

            <div className="mt-4 inline-flex rounded-full bg-slate-900/90 px-4 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
              MP4, AVI, MOV, MKV • Max 100MB
            </div>
          </div>

          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid gap-4 md:grid-cols-[1.2fr,1fr]"
            >
              <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-600/40">
                {previewUrl ? (
                  <video className="h-52 w-full object-cover" src={previewUrl} controls />
                ) : (
                  <div className="h-52 w-full bg-slate-200 dark:bg-slate-700" />
                )}
              </div>

              <div className="glass rounded-xl p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <FileVideo className="h-5 w-5 text-accent" />
                  <span className="font-semibold">Video Metadata</span>
                </div>
                <p className="truncate text-sm text-slate-700 dark:text-slate-200">{meta?.name}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Size: {meta?.size}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Duration: {meta?.duration}</p>

                <button
                  type="button"
                  onClick={() => onAnalyze(selectedFile)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-cyan-400 px-5 py-3 font-semibold text-white transition hover:brightness-110"
                >
                  Analyze Video
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default UploadZone;
