import { requireNativeModule } from 'expo';

interface DisplayLinkStats {
  calls: number;
  mainThreadCalls: number;
  milliseconds: number;
  mainThreadMilliseconds: number;
}

interface DisplayLinkStatsModule {
  takeStats(): DisplayLinkStats;
}

const DISPLAY_LINK_STATS_MODULE = requireNativeModule<DisplayLinkStatsModule>('DisplayLinkStats');

export function takeDisplayLinkStats() {
  return DISPLAY_LINK_STATS_MODULE.takeStats();
}

export type { DisplayLinkStats };
