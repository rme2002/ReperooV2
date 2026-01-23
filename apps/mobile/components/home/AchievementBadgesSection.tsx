import { View, Text, FlatList, StyleSheet } from "react-native";
import type { StreakMilestone } from "@/lib/gen/model";
import {
  AchievementBadge,
  getBadgeTier,
  getBadgeName,
} from "./AchievementBadge";

type AchievementBadgesSectionProps = {
  milestones: StreakMilestone[];
  currentStreak: number;
};

// Default milestones if none from API
const DEFAULT_MILESTONES: StreakMilestone[] = [
  { days: 7, xp_reward: 50, achieved: false },
  { days: 14, xp_reward: 75, achieved: false },
  { days: 30, xp_reward: 150, achieved: false },
  { days: 60, xp_reward: 250, achieved: false },
  { days: 100, xp_reward: 400, achieved: false },
  { days: 150, xp_reward: 500, achieved: false },
  { days: 200, xp_reward: 600, achieved: false },
  { days: 365, xp_reward: 1000, achieved: false },
];

export function AchievementBadgesSection({
  milestones,
  currentStreak,
}: AchievementBadgesSectionProps) {
  const displayMilestones =
    milestones.length > 0 ? milestones : DEFAULT_MILESTONES;

  const unlockedCount = displayMilestones.filter((m) => m.achieved).length;

  const renderBadge = ({ item }: { item: StreakMilestone }) => (
    <AchievementBadge
      days={item.days}
      name={getBadgeName(item.days)}
      xpReward={item.xp_reward}
      achieved={item.achieved}
      tier={getBadgeTier(item.days)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {unlockedCount}/{displayMilestones.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={displayMilestones}
        renderItem={renderBadge}
        keyExtractor={(item) => `milestone-${item.days}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        snapToInterval={112} // badge width + separator
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "rgba(34, 164, 93, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22A45D",
  },
  listContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  separator: {
    width: 12,
  },
});
