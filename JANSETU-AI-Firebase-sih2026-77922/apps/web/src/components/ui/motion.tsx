import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

export const DashboardMotionContext = createContext(false);

export function PageTransition({ route, children }: { route: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={route}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const enabled = useContext(DashboardMotionContext);
  const reduceMotion = useReducedMotion();

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.35, delay: reduceMotion ? 0 : delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function RevealOnScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const enabled = useContext(DashboardMotionContext);
  const reduceMotion = useReducedMotion();

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  const enabled = useContext(DashboardMotionContext);
  const reduceMotion = useReducedMotion();

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  const enabled = useContext(DashboardMotionContext);
  const reduceMotion = useReducedMotion();

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
        visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.01 : 0.28 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedProgress({ value, className = '' }: { value: number; className?: string }) {
  const enabled = useContext(DashboardMotionContext);
  const reduceMotion = useReducedMotion();
  const supportsIntersectionObserver = typeof IntersectionObserver !== 'undefined';
  const progress = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  if (!enabled) return <div className={className} style={{ width: `${progress}%` }} />;

  return (
    <motion.div
      className={className}
      initial={{ width: supportsIntersectionObserver ? 0 : `${progress}%` }}
      animate={supportsIntersectionObserver ? undefined : { width: `${progress}%` }}
      whileInView={supportsIntersectionObserver ? { width: `${progress}%` } : undefined}
      viewport={supportsIntersectionObserver ? { once: true } : undefined}
      transition={{ duration: reduceMotion ? 0.01 : 0.65, ease: 'easeOut' }}
    />
  );
}

export function DashboardAnimatedNumber({ value }: { value: number }) {
  const enabled = useContext(DashboardMotionContext);
  return enabled ? <AnimatedNumber value={value} /> : <>{value.toLocaleString()}</>;
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const display = useTransform(count, current => Math.floor(current).toLocaleString());
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      count.set(value);
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [count, value]);

  useEffect(() => {
    if (!isVisible) return;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.9, ease: 'easeOut' });
    return () => controls.stop();
  }, [count, isVisible, reduceMotion, value]);

  return <motion.span ref={ref}>{display}</motion.span>;
}