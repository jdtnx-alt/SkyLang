import { motion } from "motion/react";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function AnimatedCard({ children, className = "", delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { y: -4, scale: 1.02, transition: { duration: 0.2 } } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedStatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  delay?: number;
}

export function AnimatedStatCard({ icon, title, value, subtitle, color, delay = 0 }: AnimatedStatCardProps) {
  return (
    <AnimatedCard delay={delay} className="bg-white rounded-xl shadow-md p-6 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-0"
        style={{ background: `linear-gradient(135deg, ${color}20 0%, transparent 100%)` }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <div className="relative z-10">
        <motion.div
          className="flex items-center justify-between mb-4"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
        </motion.div>
        <h3 className="text-gray-600 text-sm mb-2">{title}</h3>
        <motion.p
          className="text-3xl font-bold text-[#111111]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
        >
          {value}
        </motion.p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </AnimatedCard>
  );
}
