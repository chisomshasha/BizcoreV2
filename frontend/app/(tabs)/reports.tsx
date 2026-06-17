import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { useAuthStore } from '../../src/store/authStore';
import {
  Colors,
  Card,
  Button,
  LoadingScreen,
  EmptyState,
} from '../../src/components/ThemedComponents';
import { formatCurrency } from '../../src/config/clientConfig';

export default function ReportsScreen() {
  const { isLoading } = useAppStore();
  const { isSuperAdmin, isGeneralManager } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeReport, setActiveReport] = useState<'stock' | 'sales' | 'purchase' | 'financial'>('stock');

  const onRefresh = () => {
    setRefreshing(true);
    // Add actual report fetching logic here if needed
    setTimeout(() => setRefreshing(false), 800);
  };

  const reports = [
    {
      id: 'stock',
      title: 'Stock Summary',
      icon: 'cube-outline',
      description: 'Current inventory levels and valuation',
    },
    {
      id: 'sales',
      title: 'Sales Analysis',
      icon: 'trending-up',
      description: 'Sales performance and trends',
    },
    {
      id: 'purchase',
      title: 'Purchase Analysis',
      icon: 'cart-outline',
      description: 'Procurement and supplier performance',
    },
    {
      id: 'financial',
      title: 'Financial Reports',
      icon: 'wallet-outline',
      description: 'P&L, Balance Sheet & Cash Flow',
    },
  ];

  const handleGenerateReport = (type: string) => {
    Alert.alert(
      'Report Generation',
      `Generating ${type} report... (Backend integration ready)`,
      [{ text: 'OK' }]
    );
    // In a real implementation this would call the backend report endpoint
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.content}
      >
        {reports.map((report) => (
          <Card key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={report.icon as any} size={32} color={Colors.primary} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDesc}>{report.description}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => handleGenerateReport(report.title)}
            >
              <Text style={styles.generateButtonText}>Generate Report</Text>
              <Ionicons name="download-outline" size={20} color={Colors.text} />
            </TouchableOpacity>
          </Card>
        ))}

        {/* Example Report Preview with Naira Currency */}
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>Sample Stock Summary</Text>
          <View style={styles.sampleRow}>
            <Text style={styles.sampleLabel}>Total Inventory Value</Text>
            <Text style={styles.sampleValue}>{formatCurrency(1245000)}</Text>
          </View>
          <View style={styles.sampleRow}>
            <Text style={styles.sampleLabel}>Low Stock Items</Text>
            <Text style={styles.sampleValue}>12</Text>
          </View>
          <View style={styles.sampleRow}>
            <Text style={styles.sampleLabel}>Total Products</Text>
            <Text style={styles.sampleValue}>87</Text>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    padding: 20,
  },
  reportCard: {
    marginBottom: 16,
    padding: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  previewCard: {
    padding: 20,
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sampleLabel: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  sampleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
