import React from 'react';
import { motion } from 'motion/react';
import { soundEffects } from '../utils/soundEffects';

export interface BeeMascotProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  message?: string | React.ReactNode;
  messagePosition?: 'top' | 'right' | 'bottom' | 'left';
  mood?: 'happy' | 'cheering' | 'thinking' | 'encouraging' | 'celebrating' | 'idle';
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: 'w-10 h-10',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-36 h-36',
  xl: 'w-48 h-48',
  '2xl': 'w-60 h-60'
};

export const BeeMascot: React.FC<BeeMascotProps> = ({
  size = 'md',
  message,
  messagePosition = 'right',
  mood = 'happy',
  animate = true,
  className = '',
  onClick
}) => {
  const handleClick = () => {
    soundEffects.playPop();
    onClick?.();
  };

  const getMoodAnimation = () => {
    if (!animate) return {};
    switch (mood) {
      case 'cheering':
      case 'celebrating':
        return {
          y: [0, -10, 0],
          rotate: [0, -4, 4, 0],
          scale: [1, 1.05, 1],
          transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        };
      case 'thinking':
        return {
          rotate: [0, -6, -6, 0],
          y: [0, -3, 0],
          transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
        };
      case 'encouraging':
        return {
          scale: [1, 1.03, 1],
          y: [0, -5, 0],
          transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
        };
      case 'happy':
      case 'idle':
      default:
        return {
          y: [0, -6, 0],
          rotate: [0, 2, -2, 0],
          transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        };
    }
  };

  const renderBubble = () => {
    if (!message) return null;

    const positionClasses = {
      right: 'mascot-bubble ml-3',
      left: 'bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm mr-3 relative',
      top: 'bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm mb-3 relative',
      bottom: 'bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm mt-3 relative'
    }[messagePosition];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`max-w-xs ${positionClasses}`}
      >
        <div className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
          {message}
        </div>
      </motion.div>
    );
  };

  const isRow = messagePosition === 'right' || messagePosition === 'left';

  return (
    <div
      className={`inline-flex ${
        isRow ? 'flex-row items-center' : 'flex-col items-center'
      } ${messagePosition === 'left' ? 'flex-row-reverse' : ''} ${
        messagePosition === 'top' ? 'flex-col-reverse' : ''
      } ${className}`}
    >
      <motion.div
        animate={getMoodAnimation()}
        whileHover={{ scale: 1.08, rotate: mood === 'thinking' ? -6 : 4 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`relative ${SIZE_MAP[size]} shrink-0 cursor-pointer select-none filter drop-shadow-sm`}
      >
        <img
          src="/bee-logo.png"
          alt="Abejita SkyLang"
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src =
              'https://ui-avatars.com/api/?name=Bee&background=FFB800&color=000&rounded=true&size=150';
          }}
        />
      </motion.div>

      {renderBubble()}
    </div>
  );
};
