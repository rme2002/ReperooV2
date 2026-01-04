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
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Reperoo</Text>
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
    backgroundColor: "#f6f3ed",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#0b1222",
    backgroundColor: "#111827",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 24,
  },
  badgeText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  subheading: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 8,
    maxWidth: 320,
  },
  highlightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  highlightPill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  highlightText: {
    color: "#4b5563",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ede7dc",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  footer: {
    marginTop: 18,
  },
});
