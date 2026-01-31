import { useState, useCallback } from "react";
import { Alert, Clipboard } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { ListTransactions200Item } from "@/lib/gen/model";
import { generateTransactionsCSV, type CSVFormatters } from "@/utils/csvExport";

export function useTransactionExport(formatters: CSVFormatters) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = useCallback(
    async (transactions: ListTransactions200Item[], monthLabel: string) => {
      try {
        setExporting(true);

        // Generate CSV content
        const csvContent = generateTransactionsCSV(transactions, formatters);

        // Create filename with .csv extension
        const filename = `transactions_${monthLabel.replace(/\s+/g, "_")}.csv`;

        // Save to a temporary file in the cache directory
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        // Write CSV content to file
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          // Share the file with proper CSV extension
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Export Transactions",
            UTI: "public.comma-separated-values-text",
          });
          console.log("CSV export shared successfully");
        } else {
          // Fallback to clipboard if sharing isn't available
          await Clipboard.setString(csvContent);
          Alert.alert("Success", "CSV data copied to clipboard. You can paste it into a spreadsheet app.");
        }
      } catch (error) {
        console.error("Error exporting transactions:", error);

        // If share fails, offer to copy to clipboard as fallback
        Alert.alert(
          "Export Options",
          "Would you like to copy the CSV data to your clipboard instead?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Copy to Clipboard",
              onPress: async () => {
                const csvContent = generateTransactionsCSV(transactions, formatters);
                await Clipboard.setString(csvContent);
                Alert.alert("Success", "CSV data copied to clipboard. You can paste it into a spreadsheet app.");
              },
            },
          ]
        );
      } finally {
        setExporting(false);
      }
    },
    [formatters],
  );

  return {
    exporting,
    exportToCSV,
  };
}
