import { Alert, Platform, ToastAndroid } from "react-native";

/**
 * Display a toast message on Android or alert on iOS
 *
 * @param message - Message to display
 */
export function showToast(message: string): void {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

/**
 * Validates profile changes before saving
 *
 * @param name - Display name
 * @param currency - Selected currency code
 * @param initialName - Original name for comparison
 * @param initialCurrency - Original currency for comparison
 * @returns True if there are valid changes to save
 */
export function validateProfileChanges(
  name: string,
  currency: string,
  initialName: string,
  initialCurrency: string
): boolean {
  const trimmedName = name.trim();
  const trimmedInitial = initialName.trim();
  return trimmedName !== trimmedInitial || currency !== initialCurrency;
}
