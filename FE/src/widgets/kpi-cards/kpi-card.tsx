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
  colorTheme?: 'red' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple' | 'ember' | 'brass' | 'ivory' | 'ash';
  delayIndex?: number;
}

const COLOR_STYLES: Record<string, { bg: string; iconText: string; border: string; topBar: string; cardBg?: string }> = {
  ember: {
    bg: 'bg-[#ff682c]/10',
    iconText: 'text-[#ff682c]',
    border: 'border-[#ff682c]/20',
    topBar: 'bg-[#ff682c]',
  },
  brass: {
    bg: 'bg-[#816729]/10',
    iconText: 'text-[#816729]',
    border: 'border-[#816729]/20',
    topBar: 'bg-[#816729]',
  },
  ivory: {
    bg: 'bg-[#ebe6dd]',
    iconText: 'text-[#202020]',
    border: 'border-[#ded7cb]',
    topBar: 'bg-[#816729]',
    cardBg: 'bg-[#ebe6dd]/40',
  },
  ash: {
    bg: 'bg-[#efefef]',
    iconText: 'text-[#202020]',
    border: 'border-[#e8e8e8]',
    topBar: 'bg-[#202020]',
    cardBg: 'bg-[#efefef]/40',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconText: 'text-emerald-700',
    border: 'border-emerald-200',
    topBar: 'bg-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    iconText: 'text-amber-700',
    border: 'border-amber-200',
    topBar: 'bg-amber-600',
  },
  indigo: {
    bg: 'bg-[#efefef]',
    iconText: 'text-[#202020]',
    border: 'border-[#e8e8e8]',
    topBar: 'bg-[#202020]',
  },
  blue: {
    bg: 'bg-[#f5f5f5]',
    iconText: 'text-[#202020]',
    border: 'border-[#e8e8e8]',
    topBar: 'bg-[#202020]',
  },
  red: {
    bg: 'bg-[#ff682c]/10',
    iconText: 'text-[#ff682c]',
    border: 'border-[#ff682c]/20',
    topBar: 'bg-[#ff682c]',
  },
  rose: {
    bg: 'bg-rose-50',
    iconText: 'text-rose-700',
    border: 'border-rose-200',
    topBar: 'bg-rose-600',
  },
  purple: {
    bg: 'bg-[#816729]/10',
    iconText: 'text-[#816729]',
    border: 'border-[#816729]/20',
    topBar: 'bg-[#816729]',
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorTheme = 'ember',
  delayIndex = 0,
}: KPICardProps) {
  const styles = COLOR_STYLES[colorTheme] || COLOR_STYLES.ember;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: delayIndex * 0.05,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="h-full"
    >
      <Card className={cn(
        "kpi-card relative h-full p-4 sm:p-5 overflow-hidden border border-[#e8e8e8] bg-white rounded-2xl shadow-[0_1px_3px_rgba(32,32,32,0.02)]",
        styles.cardBg
      )}>
        {/* Accent top line indicator */}
        <div className={cn('absolute top-0 left-0 right-0 h-[2px]', styles.topBar)} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-semibold text-[#828282] uppercase tracking-wider truncate">
              {title}
            </p>
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202020] font-mono">
              {value}
            </h4>
          </div>

          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform duration-200 group-hover:scale-105',
              styles.bg,
              styles.iconText,
              styles.border
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>

        {(subtitle || trend) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-[10px] tracking-wide font-mono',
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-[#ff682c]/10 text-[#ff682c] border border-[#ff682c]/20'
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
              <span className="text-[11px] text-[#828282] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
