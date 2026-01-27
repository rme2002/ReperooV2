import { View, Text, FlatList, StyleSheet } from "react-native";
import type { StreakMilestone } from "@/lib/gen/model";
import {
  AchievementBadge,
  getBadgeTier,
  getBadgeName,
} from "./AchievementBadge";
import { colors } from "@/constants/theme";
import { DEFAULT_MILESTONES } from "@/constants/milestones";

type AchievementBadgesSectionProps = {
  milestones: StreakMilestone[];
  currentStreak: number;
};

export function AchievementBadgesSection({
  milestones,
  currentStreak,
}: AchievementBadgesSectionProps) {
  const fallbackMilestones: StreakMilestone[] = DEFAULT_MILESTONES.map(
    (milestone) => ({
      ...milestone,
      achieved: currentStreak >= milestone.days,
      achieved_at: null,
      days_remaining: Math.max(0, milestone.days - currentStreak),
    }),
  );

  const displayMilestones =
    milestones.length > 0 ? milestones : fallbackMilestones;

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
    color: colors.text,
  },
  countBadge: {
    backgroundColor: `${colors.primary}1F`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  separator: {
    width: 12,
  },
});
