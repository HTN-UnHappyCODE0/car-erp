'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorTheme?: 'red' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple';
  delayIndex?: number;
}

const COLOR_STYLES = {
  red: {
    bg: 'bg-indigo-500/10',
    iconText: 'text-indigo-600',
    border: 'border-indigo-500/20',
    topBar: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent',
  },
  blue: {
    bg: 'bg-blue-500/10',
    iconText: 'text-blue-600',
    border: 'border-blue-500/20',
    topBar: 'bg-gradient-to-r from-blue-600 via-blue-500 to-transparent',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600',
    border: 'border-emerald-500/20',
    topBar: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent',
  },
  amber: {
    bg: 'bg-amber-500/10',
    iconText: 'text-amber-600',
    border: 'border-amber-500/20',
    topBar: 'bg-gradient-to-r from-amber-600 via-amber-500 to-transparent',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    iconText: 'text-indigo-600',
    border: 'border-indigo-500/20',
    topBar: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent',
  },
  rose: {
    bg: 'bg-rose-500/10',
    iconText: 'text-rose-600',
    border: 'border-rose-500/20',
    topBar: 'bg-gradient-to-r from-rose-600 via-rose-500 to-transparent',
  },
  purple: {
    bg: 'bg-purple-500/10',
    iconText: 'text-purple-600',
    border: 'border-purple-500/20',
    topBar: 'bg-gradient-to-r from-purple-600 via-purple-500 to-transparent',
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorTheme = 'red',
  delayIndex = 0,
}: KPICardProps) {
  const styles = COLOR_STYLES[colorTheme] || COLOR_STYLES.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: delayIndex * 0.06,
        ease: [0.34, 1.56, 0.64, 1], // UI/UX Pro Max back.out easing
      }}
      className="h-full"
    >
      <Card className="kpi-card relative h-full p-4 sm:p-5 overflow-hidden border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl">
        {/* Subtle accent top line indicator */}
        <div className={cn('absolute top-0 left-0 right-0 h-[2px]', styles.topBar)} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <h4 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
              {value}
            </h4>
          </div>

          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-200 group-hover:scale-105',
              styles.bg,
              styles.iconText,
              styles.border
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {(subtitle || trend) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-[10px] tracking-wide font-mono',
                  trend.isPositive
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
