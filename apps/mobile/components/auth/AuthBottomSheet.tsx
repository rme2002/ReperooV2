import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { LoginPanel } from "./components/LoginPanel";
import { RegisterPanel } from "./components/RegisterPanel";

type AuthBottomSheetProps = {
  visible: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
};

const MIN_SHEET_HEIGHT = 600;
const SHEET_VERTICAL_MARGIN = 24;
const KEYBOARD_BEHAVIOR = Platform.OS === "ios" ? "padding" : "height";
const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 16 : 0;
const DISMISS_DISTANCE_THRESHOLD = 0.55;
const DISMISS_VELOCITY_THRESHOLD = 1.1;
const PAN_ACTIVATION_THRESHOLD = 6;

export function AuthBottomSheet({
  visible,
  initialMode = "login",
  onClose,
}: AuthBottomSheetProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();

  const sheetHeight = useMemo(() => {
    const availableHeight = Math.max(windowHeight - SHEET_VERTICAL_MARGIN, 0);
    if (availableHeight === 0) {
      return MIN_SHEET_HEIGHT;
    }
    const desiredHeight = Math.max(windowHeight * 0.92, MIN_SHEET_HEIGHT);
    return Math.min(desiredHeight, availableHeight);
  }, [windowHeight]);

  const sheetTranslateY = translateY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetHeight],
  });

  const handleClose = useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [onClose, visible]);

  const animateTo = useCallback(
    (toValue: number, onComplete?: () => void) => {
      Animated.spring(translateY, {
        toValue,
        stiffness: 220,
        damping: 28,
        mass: 0.9,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onComplete?.();
        }
      });
    },
    [translateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > PAN_ACTIVATION_THRESHOLD,
        onPanResponderMove: (_, gestureState) => {
          const delta = clamp(gestureState.dy, 0, sheetHeight);
          translateY.setValue(delta / sheetHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const normalized = clamp(gestureState.dy / sheetHeight, 0, 1);
          const shouldDismiss =
            normalized > DISMISS_DISTANCE_THRESHOLD ||
            gestureState.vy > DISMISS_VELOCITY_THRESHOLD;
          if (shouldDismiss) {
            animateTo(1);
            handleClose();
            return;
          }
          animateTo(0);
        },
        onPanResponderTerminate: () => {
          animateTo(0);
        },
      }),
    [animateTo, handleClose, sheetHeight, translateY],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMode(initialMode);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, initialMode, translateY, overlayOpacity, mounted]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={KEYBOARD_BEHAVIOR}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.dragRegion} {...panResponder.panHandlers}>
            <View style={styles.dragIndicator} />
            <Text style={styles.sheetTitle}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
          </View>

          <View style={styles.segmented}>
            {(["login", "register"] as const).map((key) => (
              <Pressable
                key={key}
                onPress={() => setMode(key)}
                style={[
                  styles.segmentButton,
                  mode === key && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === key && styles.segmentTextActive,
                  ]}
                >
                  {key === "login" ? "Log in" : "Sign up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.sheetContent}
            contentContainerStyle={styles.sheetContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          >
            {mode === "login" ? (
              <LoginPanel onSubmitSuccess={handleClose} />
            ) : (
              <RegisterPanel onSubmitSuccess={() => setMode("login")} />
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f4f6ff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 2,
  },
  dragIndicator: {
    width: 60,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "rgba(100,116,139,0.3)",
    marginBottom: 14,
  },
  dragRegion: {
    paddingBottom: 12,
    gap: 8,
  },
  sheetTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "600",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#0f172a",
  },
  sheetContent: {
    marginTop: 18,
    flex: 1,
  },
  sheetContentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
});
