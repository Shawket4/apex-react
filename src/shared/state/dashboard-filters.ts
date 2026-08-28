import { create } from 'zustand';

/**
 * The dashboard's global scope: one date window + company selection that every
 * card, drawer, and the fleet tiles' revenue consume together.
 *
 * `from`/`to` of null means the backend default (the current month). Company
 * of null means all companies. Cash-out and owed-money cards have no company
 * dimension — they ignore the company and say so in the UI rather than
 * silently pretending to filter.
 */
export type DashboardPreset = 'month' | 'today' | 'yesterday' | 'week' | 'custom';

interface DashboardFilters {
  preset: DashboardPreset;
  from: string | null;
  to: string | null;
  company: string | null;
  setPreset: (preset: DashboardPreset) => void;
  setCustomRange: (from: string, to: string) => void;
  setCompany: (company: string | null) => void;
}

function cairoToday(): Date {
  // The backend buckets by Cairo calendar days; the browser is assumed to be
  // in or near that zone (the ops team is). Local date is close enough for
  // picking filter presets.
  return new Date();
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: DashboardPreset): { from: string | null; to: string | null } {
  const today = cairoToday();
  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) };
    case 'yesterday': {
      const y = new Date(today.getTime() - 86_400_000);
      return { from: iso(y), to: iso(y) };
    }
    case 'week': {
      const start = new Date(today.getTime() - 6 * 86_400_000);
      return { from: iso(start), to: iso(today) };
    }
    default:
      return { from: null, to: null };
  }
}

export const useDashboardFilters = create<DashboardFilters>((set) => ({
  preset: 'month',
  from: null,
  to: null,
  company: null,
  setPreset: (preset) => set({ preset, ...presetRange(preset) }),
  setCustomRange: (from, to) => set({ preset: 'custom', from, to }),
  setCompany: (company) => set({ company }),
}));
