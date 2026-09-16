import { motion } from "motion/react";

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
}

export function ProgressBar({ progress, className = "", showLabel = true, color = "#4DA6FF" }: ProgressBarProps) {
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <div className="w-full flex flex-col justify-center">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <motion.span
            className="text-xs font-semibold text-gray-700"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {safeProgress}%
          </motion.span>
        </div>
      )}
      <div className={`w-full h-2 bg-gray-200/80 rounded-full overflow-hidden relative ${className}`}>
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${safeProgress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ backgroundColor: color }}
        >
          {safeProgress > 0 && (
            <motion.div
              className="absolute inset-0 bg-white/30"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}