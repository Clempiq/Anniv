import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, useTheme } from '../theme';

type ToastAction = { label: string; onPress: () => void };
type ToastFn = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; action?: ToastAction; key: number } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const native = Platform.OS !== 'web';

  const show = useCallback<ToastFn>((message, action) => {
    setToast({ message, action, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: native, speed: 18, bounciness: 8 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: native }).start(() => setToast(null));
    }, toast.action ? 5000 : 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, anim, native]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: t.dark ? t.surface3 : '#1D1420' }]}>
            <Ionicons name="sparkles" size={16} color={t.accent2} />
            <Text style={{ color: '#fff', flex: 1, fontSize: 14.5, fontFamily: FONTS.bodySemi }}>{toast.message}</Text>
            {toast.action && (
              <Pressable
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
                hitSlop={10}
              >
                <Text style={{ color: t.accent2, fontFamily: FONTS.bodyHeavy, fontSize: 14.5 }}>{toast.action.label}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 16,
    maxWidth: 520, width: '100%', elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
});
