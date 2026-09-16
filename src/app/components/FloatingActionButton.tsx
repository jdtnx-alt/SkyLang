import { motion } from "motion/react";
import { ReactNode } from "react";

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  label?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  color?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = "bottom-right",
  color = "#4DA6FF",
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "bottom-8 right-8",
    "bottom-left": "bottom-8 left-8",
    "top-right": "top-8 right-8",
    "top-left": "top-8 left-8",
  };

  return (
    <motion.button
      className={`fixed ${positionClasses[position]} z-50 group`}
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
        whileHover={{ boxShadow: `0 10px 30px ${color}60` }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="relative z-10">{icon}</div>
      </motion.div>
      {label && (
        <motion.div
          className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
          initial={{ x: 10 }}
          whileHover={{ x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {label}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-8 border-transparent border-l-gray-900" />
        </motion.div>
      )}
    </motion.button>
  );
}
