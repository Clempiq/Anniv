import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';

const COLORS = ['#FF4D6D', '#FF8A5B', '#FFC233', '#7ED957', '#00C6D7', '#7C5CFF', '#FF6BD6'];
const N = 70;

type Burst = { key: number; pieces: Piece[] };
type Piece = { x: number; drift: number; rot: number; size: number; color: string; delay: number; round: boolean; dur: number };

const ConfettiContext = createContext<() => void>(() => {});

/** Pluie de confettis déclenchable depuis n'importe quel écran (useConfetti()). */
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const fire = useCallback(() => {
    const { width } = Dimensions.get('window');
    const pieces = Array.from({ length: N }, () => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 160,
      rot: (Math.random() - 0.5) * 1440,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.25,
      round: Math.random() < 0.3,
      dur: 0.7 + Math.random() * 0.3,
    }));
    progress.setValue(0);
    setBurst({ key: Date.now(), pieces });
    Animated.timing(progress, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' })
      .start(() => setBurst(null));
  }, [progress]);

  const { height } = Dimensions.get('window');
  return (
    <ConfettiContext.Provider value={fire}>
      {children}
      {burst && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {burst.pieces.map((p, i) => {
            const start = p.delay;
            const end = Math.min(1, p.delay + p.dur);
            const local = progress.interpolate({ inputRange: [0, start, end, 1], outputRange: [0, 0, 1, 1] });
            return (
              <Animated.View
                key={`${burst.key}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: -20,
                  width: p.size,
                  height: p.round ? p.size : p.size * 1.6,
                  borderRadius: p.round ? p.size : 2,
                  backgroundColor: p.color,
                  opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                  transform: [
                    { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
                    { translateX: local.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                    { rotate: local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
                  ],
                }}
              />
            );
          })}
        </View>
      )}
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
