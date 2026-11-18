import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { takeDisplayLinkStats } from './modules/display-link-stats';
import type { DisplayLinkStats } from './modules/display-link-stats';

const VARIANT_LABEL = process.env.EXPO_PUBLIC_VARIANT_LABEL ?? 'react-native-worklets 0.13.1';

interface PanelStats extends DisplayLinkStats {
  frames: number;
  longestFrameMs: number;
}

function useSpinnerStyle() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.set(
      withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
  }, [rotation]);

  return useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${rotation.get()}deg`,
        },
      ],
    };
  });
}

function usePanelStats() {
  const frames = useSharedValue(0);
  const longestFrameMs = useSharedValue(0);
  const [stats, setStats] = useState<PanelStats | null>(null);

  useFrameCallback((frameInfo) => {
    frames.set(frames.get() + 1);

    if (frameInfo.timeSincePreviousFrame !== null) {
      longestFrameMs.set(Math.max(longestFrameMs.get(), frameInfo.timeSincePreviousFrame));
    }
  });

  useEffect(() => {
    takeDisplayLinkStats();

    const interval = setInterval(() => {
      const displayLinkStats = takeDisplayLinkStats();

      setStats({
        ...displayLinkStats,
        frames: frames.get(),
        longestFrameMs: longestFrameMs.get(),
      });

      frames.set(0);
      longestFrameMs.set(0);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [frames, longestFrameMs]);

  return stats;
}

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const spinnerStyle = useSpinnerStyle();
  const stats = usePanelStats();

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.spinner, spinnerStyle]} />
      <Text style={styles.title}>One looping Reanimated animation</Text>
      <Text style={styles.variant}>{VARIANT_LABEL}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Last second</Text>
        <StatRow
          label="setPaused: calls on main thread"
          value={stats ? `${stats.mainThreadCalls}` : '-'}
        />
        <StatRow
          label="Main thread time in setPaused:"
          value={stats ? `${stats.mainThreadMilliseconds.toFixed(2)} ms` : '-'}
        />
        <StatRow label="setPaused: calls, all threads" value={stats ? `${stats.calls}` : '-'} />
        <StatRow label="UI thread frames" value={stats ? `${stats.frames}` : '-'} />
        <StatRow
          label="Longest frame"
          value={stats ? `${stats.longestFrameMs.toFixed(1)} ms` : '-'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  spinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: '#E5E7EB',
    borderTopColor: '#2563EB',
  },
  title: {
    fontSize: 16,
    color: '#111827',
  },
  variant: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  panel: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 15,
    color: '#111827',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111827',
  },
});
