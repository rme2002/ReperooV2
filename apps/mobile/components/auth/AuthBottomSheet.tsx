import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
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

  const handleClose = () => {
    if (visible) {
      onClose();
    }
  };

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
          <View style={styles.dragIndicator} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={16}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(3, 7, 18, 0.75)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#050814",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  dragIndicator: {
    width: 60,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "rgba(148,163,184,0.6)",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "600",
  },
  closeText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "600",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.16)",
    borderRadius: 14,
    padding: 4,
    marginTop: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  segmentText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#f8fafc",
  },
  sheetContent: {
    marginTop: 20,
    flex: 1,
  },
  sheetContentContainer: {
    paddingBottom: 24,
    flexGrow: 1,
  },
});
