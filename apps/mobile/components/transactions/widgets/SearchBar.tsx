import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/constants/theme";

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search note or category",
}: SearchBarProps) {
  return (
    <View style={styles.searchField}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <Pressable style={styles.clearSearch} onPress={() => onChangeText("")}>
          <Text style={styles.clearSearchText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchField: {
    position: "relative",
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  clearSearch: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchText: {
    fontSize: 16,
    color: colors.text,
    marginTop: -2,
  },
});
