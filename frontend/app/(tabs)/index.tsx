import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAppStore } from '../../src/store/appStore';
import {
  Colors,
  Card,
  StatCard,
  LoadingScreen,
  EmptyState,
} from '../../src/components/ThemedComponents';
import { formatCurrency } from '../../src/config/clientConfig';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

export default function DashboardScreen() {
  const {
    dashboardStats,
    recentActivity,
    salesChart,
    topProducts,
    isLoading,
    fetchDashboard,
  } = useAppStore();

  const {
    user,
    isSuperAdmin,
    isGeneralManager,
    isCrossWarehouse,
  } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard().catch(console.error);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboard();
    } catch (error) {
      console.error('Dashboard refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading && !dashboardStats) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={styles.content}
        >
          {/* Welcome Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </Text>
            <Text style={styles.subtitle}>Here's what's happening today</Text>
          </View>

          {/* KPI Stats - Restricted Overall Inventory Value */}
          <View style={styles.statsGrid}>
            {/* Always visible stats */}
            <StatCard
              title="Today's Sales"
              value={formatCurrency(dashboardStats?.today_sales || 0)}
              icon="trending-up"
              color={Colors.success}
            />
            <StatCard
              title="Today's Purchases"
              value={formatCurrency(dashboardStats?.today_purchases || 0)}
              icon="cart"
              color={Colors.warning}
            />

            {/* Restricted: Overall Inventory Value - only for SuperAdmin / GM / Cross-warehouse roles */}
            {(isSuperAdmin || isGeneralManager || isCrossWarehouse) && (
              <StatCard
                title="Total Inventory Value"
                value={formatCurrency(dashboardStats?.total_inventory_value || 0)}
                icon="cube"
                color={Colors.primary}
              />
            )}

            <StatCard
              title="Low Stock Items"
              value={dashboardStats?.low_stock_count?.toString() || '0'}
              icon="alert-circle"
              color={Colors.danger}
            />
          </View>

          {/* Sales Chart */}
          <Card style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Sales Trend (7 Days)</Text>
            {/* Chart component would go here - kept as-is */}
            <View style={styles.placeholderChart}>
              <Text style={styles.placeholderText}>
                Sales Chart (react-native-gifted-charts)
              </Text>
            </View>
          </Card>

          {/* Recent Activity */}
          <Card style={styles.activityCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {recentActivity.length === 0 ? (
              <EmptyState message="No recent activity" icon="time-outline" />
            ) : (
              recentActivity.slice(0, 5).map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name={
                        activity.type === 'sale'
                          ? 'cart'
                          : activity.type === 'purchase'
                          ? 'cube'
                          : 'time'
                      }
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDesc}>{activity.description}</Text>
                  </View>
                  {activity.amount && (
                    <Text style={styles.activityAmount}>
                      {formatCurrency(activity.amount)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </Card>

          {/* Top Products */}
          <Card style={styles.topProductsCard}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            {topProducts.length === 0 ? (
              <EmptyState message="No top products yet" />
            ) : (
              topProducts.map((product, index) => (
                <View key={index} style={styles.topProductRow}>
                  <Text style={styles.topProductName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.topProductQty}>
                    {product.quantity_sold} sold
                  </Text>
                  <Text style={styles.topProductRevenue}>
                    {formatCurrency(product.revenue)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  chartCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  placeholderChart: {
    height: 220,
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  activityCard: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  activityDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  topProductsCard: {
    marginBottom: 24,
  },
  topProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topProductName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  topProductQty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  topProductRevenue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
