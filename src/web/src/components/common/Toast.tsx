/**
 * HUMAN TASKS:
 * 1. Ensure framer-motion v6.0.0 is installed in package.json
 * 2. Verify classnames v2.3.0 is installed in package.json
 * 3. Confirm theme configuration is properly imported in the project
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import classNames from 'classnames'; // v2.3.0
import { palette, spacing, borderRadius } from '../../config/theme';

/**
 * Implements requirements:
 * - Frontend UI Framework: UI Components using React Native Paper and Material Design implementation
 * - Web Dashboard: Web dashboard for extended functionality with responsive design
 */

// Type definition for different toast variants
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Props interface for the Toast component
export interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
  isVisible?: boolean;
}

// Constants for animation and timing
const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 0.2;

// Animation variants for framer-motion
const variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// Generate toast styles based on type and theme palette
const getToastStyles = (type: ToastType) => {
  const styles = {
    background: '',
    text: palette.text.primary,
    icon: ''
  };

  switch (type) {
    case 'success':
      styles.background = palette.success.light;
      styles.icon = '✓';
      break;
    case 'error':
      styles.background = palette.error.light;
      styles.icon = '✕';
      break;
    case 'warning':
      styles.background = palette.warning.light;
      styles.icon = '!';
      break;
    case 'info':
      styles.background = palette.primary[300];
      styles.icon = 'i';
      break;
  }

  return styles;
};

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = DEFAULT_DURATION,
  onClose,
  isVisible = true
}) => {
  useEffect(() => {
    if (isVisible && duration !== 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const styles = getToastStyles(type);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="alert"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ duration: ANIMATION_DURATION }}
          className={classNames(
            'fixed top-4 right-4 z-50',
            'flex items-center gap-2',
            'px-4 py-2',
            'shadow-md',
            'max-w-md'
          )}
          style={{
            backgroundColor: styles.background,
            color: styles.text,
            borderRadius: borderRadius.md
          }}
        >
          <span className={classNames(
            'flex items-center justify-center',
            'w-5 h-5',
            'text-sm font-bold',
            'rounded-full',
            'bg-white bg-opacity-25'
          )}>
            {styles.icon}
          </span>
          <p className={classNames(
            'text-sm font-medium',
            'mr-8'
          )}>
            {message}
          </p>
          <button
            onClick={handleClose}
            className={classNames(
              'absolute top-2 right-2',
              'p-1',
              'opacity-75 hover:opacity-100',
              'transition-opacity'
            )}
            aria-label="Close notification"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;