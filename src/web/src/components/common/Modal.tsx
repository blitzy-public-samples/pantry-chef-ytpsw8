/**
 * HUMAN TASKS:
 * 1. Ensure framer-motion is installed: npm install framer-motion@^6.0.0
 * 2. Verify classnames package is installed: npm install classnames@^2.3.0
 * 3. Configure Tailwind CSS for proper purging of dynamic classes
 * 4. Add body-scroll-lock functionality to your package.json if not present
 */

import React, { useEffect } from 'react'; // ^18.0.0
import { AnimatePresence, motion } from 'framer-motion'; // ^6.0.0
import classnames from 'classnames'; // ^2.3.0
import { palette, spacing, shadows, borderRadius } from '../../config/theme';
import Button from './Button';

/**
 * Props interface for the Modal component
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation
 * - Web Dashboard: Responsive design with proper accessibility
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  preventScroll?: boolean;
}

/**
 * Modal size configuration using theme breakpoints
 */
const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

/**
 * Animation configurations for modal and overlay
 */
const animations = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
};

/**
 * Generates class names for the modal based on size and custom classes
 */
const getModalClasses = (props: ModalProps): string => {
  const {
    size = 'md',
    className,
    showCloseButton = true,
    closeOnBackdropClick = true,
    preventScroll = true
  } = props;

  return classnames(
    // Base classes
    'relative bg-white',
    'w-full m-4',
    'flex flex-col',
    'overflow-hidden',
    // Size classes
    modalSizes[size],
    // Theme-based styles
    `rounded-${borderRadius.lg}`,
    `shadow-${shadows.xl}`,
    // Custom classes
    className
  );
};

/**
 * Modal component that implements Material Design principles
 * with proper accessibility features and animations
 */
export const Modal: React.FC<ModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    title,
    children,
    showCloseButton,
    closeOnBackdropClick,
    footer,
    contentClassName,
    preventScroll,
  } = props;

  // Handle body scroll locking
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, preventScroll]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeOnBackdropClick ? onClose : undefined}
            {...animations.overlay}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className={getModalClasses(props)}
                {...animations.modal}
              >
                {/* Header */}
                <div className={`px-${spacing[6]} py-${spacing[4]} border-b border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <h2
                      id="modal-title"
                      className={`text-${palette.text.primary} font-semibold text-lg`}
                    >
                      {title}
                    </h2>
                    {showCloseButton && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={onClose}
                        aria-label="Close modal"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div
                  className={classnames(
                    `px-${spacing[6]} py-${spacing[4]}`,
                    'overflow-y-auto',
                    contentClassName
                  )}
                >
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div
                    className={`px-${spacing[6]} py-${spacing[4]} border-t border-gray-200`}
                  >
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;