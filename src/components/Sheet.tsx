import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RADIUS, useTheme } from '../theme';
import { Txt } from './ui';

/** Feuille modale qui glisse depuis le bas. */
export function Sheet({ visible, onClose, title, subtitle, children }: {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 4 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: native }).start(() => setMounted(false));
    }
  }, [visible, anim, native]);

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: t.bg, paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.surface3 }]} />
          {!!title && <Txt variant="h1" style={{ marginBottom: subtitle ? 2 : 12 }}>{title}</Txt>}
          {!!subtitle && <Txt muted style={{ marginBottom: 14 }}>{subtitle}</Txt>}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
});
