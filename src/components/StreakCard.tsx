// src/components/StreakCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Flame, Crown } from 'lucide-react';
import { loadHistory, type LogItem } from '../lib/history';
import {
  computeStreak,
  canRepairToday,
  cooldownDaysLeft,
  getRepairSet,
  recordRepairToday,
} from '../lib/streak';
import { isPro, setPro } from '../lib/pro';
import { track } from '../lib/metrics'; 

export default function StreakCard() {
  const [list, setList] = useState<LogItem[] | null>(null);
  const [repairs, setRepairs] = useState<Set<string>>(new Set());
  const [canRepair, setCanRepair] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pro, setProState] = useState(false);

  async function refresh() {
    const [items, repSet, can, cd, proVal] = await Promise.all([
      loadHistory(),
      getRepairSet(),
      canRepairToday(),
      cooldownDaysLeft(),
      isPro(),
    ]);
    setList(items);
    setRepairs(repSet);
    setCanRepair(can);
    setCooldown(cd);
    setProState(proVal);
  }

  useEffect(() => { void refresh(); }, []);

  const { streak, todayCount } = useMemo(() => {
    const h = Array.isArray(list) ? [...list] : [];
    const s = computeStreak(h, repairs);
    const today = dayjs().startOf('day').format('YYYY-MM-DD');
    const hasTodayLog =
      h.some(x => dayjs(x.ts).isSame(dayjs(today), 'day')) || repairs.has(today);
    return { streak: s, todayCount: hasTodayLog ? 1 : 0 };
  }, [list, repairs]);

  async function onRepair() {
    if (busy || !pro || !canRepair) return;
    setBusy(true);
    try {
      await recordRepairToday();
      track('streak_repair_used');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-brand-100/10 flex items-center justify-center">
        <Flame className="text-brand-400" size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">Daily streak</div>
        <div className="text-xs text-gray-500 truncate">
          {todayCount ? 'You’re on track today' : 'Log a mood to keep it going'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold tabular-nums">{streak}🔥</div>

        {pro ? (
          canRepair ? (
            <button
              className="btn btn-outline h-8 px-3"
              onClick={onRepair}
              disabled={busy}
              title="Repair today (Pro • 1 per 7 days)"
            >
              {busy ? 'Repairing…' : 'Repair'}
            </button>
          ) : (
            cooldown > 0 && (
              <span className="text-[11px] text-gray-500">Repair in {cooldown}d</span>
            )
          )
        ) : (
          <button
            className="btn btn-ghost h-8 px-3"
            onClick={async () => {
              track('upgrade_click', { source: 'streak_card' });
              await setPro(true); // local preview upgrade
              setProState(true);
              track('pro_enabled');
            }}
            title="Pro feature: repair missed day"
          >
            <Crown size={14} className="mr-1" />
            Go Pro
          </button>
        )}
      </div>
    </div>
  );
}
