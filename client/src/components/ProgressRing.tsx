import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animationDuration?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "hsl(var(--primary))",
  backgroundColor = "hsl(var(--muted))",
  showPercentage = true,
  animationDuration = 1.5,
  className = "",
  children
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(Math.min(Math.max(progress, 0), 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration: animationDuration,
            ease: "easeOut"
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? (
          children
        ) : showPercentage ? (
          <motion.span 
            className="text-lg font-semibold text-foreground"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.5, 
              delay: animationDuration * 0.3 
            }}
          >
            {Math.round(animatedProgress)}%
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}

interface MultiProgressRingProps {
  rings: Array<{
    progress: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function MultiProgressRing({
  rings,
  size = 140,
  strokeWidth = 6,
  className = "",
  children
}: MultiProgressRingProps) {
  const [animatedRings, setAnimatedRings] = useState(rings.map(() => 0));
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedRings(rings.map(ring => Math.min(Math.max(ring.progress, 0), 100)));
    }, 100);
    return () => clearTimeout(timer);
  }, [rings]);

  const baseRadius = (size - strokeWidth * rings.length - 8) / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {rings.map((ring, index) => {
          const radius = baseRadius - (index * (strokeWidth + 2));
          const circumference = radius * 2 * Math.PI;
          const strokeDasharray = `${circumference} ${circumference}`;
          const strokeDashoffset = circumference - (animatedRings[index] / 100) * circumference;
          
          return (
            <g key={index}>
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                className="opacity-10"
              />
              
              {/* Progress circle */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ 
                  duration: 1.5,
                  delay: index * 0.2,
                  ease: "easeOut"
                }}
              />
            </g>
          );
        })}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = ""
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let startValue = count;
    const targetValue = value;

    const animate = (currentTime: number) => {
      if (!startTime) {
        startTime = currentTime;
        startValue = count;
      }

      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentCount = startValue + (targetValue - startValue) * easeOutProgress;
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatNumber = (num: number) => {
    return num.toFixed(decimals);
  };

  return (
    <span className={className}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}