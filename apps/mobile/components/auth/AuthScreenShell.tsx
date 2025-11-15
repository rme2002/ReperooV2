import { ReactNode, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenShellProps = {
  title: string;
  subtitle: string;
  highlights?: string[];
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreenShell({
  title,
  subtitle,
  highlights = [],
  children,
  footer,
}: AuthScreenShellProps) {
  const pills = useMemo(() => highlights.filter(Boolean), [highlights]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.backgroundBlur} />
      <View style={[styles.backgroundBlur, styles.backgroundBlurSecondary]} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Pulse</Text>
          </View>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.subheading}>{subtitle}</Text>

          {pills.length ? (
            <View style={styles.highlightsRow}>
              {pills.map((value) => (
                <View key={value} style={styles.highlightPill}>
                  <Text style={styles.highlightText}>{value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.formCard}>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050814",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  backgroundBlur: {
    position: "absolute",
    top: -140,
    right: -80,
    width: 260,
    height: 260,
    backgroundColor: "#3b82f6",
    opacity: 0.35,
    borderRadius: 260,
  },
  backgroundBlurSecondary: {
    top: 220,
    left: -120,
    backgroundColor: "#a855f7",
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 24,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
  },
  subheading: {
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    maxWidth: 320,
  },
  highlightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  highlightPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  highlightText: {
    color: "#ffffff",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: "rgba(15, 19, 33, 0.92)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  footer: {
    marginTop: 18,
  },
});
