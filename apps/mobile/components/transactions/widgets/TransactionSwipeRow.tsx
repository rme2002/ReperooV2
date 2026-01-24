import { type ReactNode, useRef, useMemo } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/constants/theme";
import { ACTION_WIDTH } from "@/utils/transactionsConstants";

type TransactionSwipeRowProps = {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
};

export function TransactionSwipeRow({
  children,
  onEdit,
  onDelete,
}: TransactionSwipeRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const openActions = () => {
    Animated.timing(translateX, {
      toValue: -ACTION_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isOpen.current = true;
    });
  };

  const closeActions = () => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isOpen.current = false;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            translateX.setValue(Math.max(gesture.dx, -ACTION_WIDTH));
          } else if (!isOpen.current) {
            translateX.setValue(gesture.dx / 4);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -40) {
            openActions();
          } else {
            closeActions();
          }
        },
        onPanResponderTerminate: closeActions,
      }),
    [translateX]
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.swipeStaticRow, { width: ACTION_WIDTH }]}>
        <Pressable
          style={[styles.swipeStaticButton, styles.swipeStaticEdit]}
          onPress={() => {
            closeActions();
            onEdit();
          }}
        >
          <Text style={styles.swipeStaticText}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeStaticButton, styles.swipeStaticDelete]}
          onPress={() => {
            closeActions();
            onDelete();
          }}
        >
          <Text style={styles.swipeStaticText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.swipeContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
    marginVertical: 2,
    backgroundColor: colors.surface,
  },
  swipeStaticRow: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    overflow: "hidden",
  },
  swipeStaticButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  swipeStaticEdit: {
    backgroundColor: colors.primary,
  },
  swipeStaticDelete: {
    backgroundColor: colors.error,
  },
  swipeStaticText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 13,
  },
  swipeContent: {
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
});
