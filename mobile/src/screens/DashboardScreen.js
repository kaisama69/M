import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Colors, FontFamily, SharedStyles, CLASS_META } from '../theme';
import { api } from '../config';
import Header from '../components/Header';
import Toast from '../components/Toast';

const screenWidth = Dimensions.get('window').width;
const chartWidth = Platform.OS === 'web' ? 313 : (screenWidth - 60);

const sentimentScore = (s) => {
  const scores = {
    'Normal': 3,
    'Anxiety': 1,
    'Stress': 0,
    'Bipolar': -1,
    'Depression': -2,
    'Personality disorder': -2,
    'Suicidal': -3,
  };
  return scores[s] ?? 0;
};

const DashboardScreen = () => {
  const [stats, setStats] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const isFocused = useIsFocused();

  // Auto-refresh when tab is focused
  useEffect(() => {
    if (isFocused) {
      loadDashboard();
    }
  }, [isFocused]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const getUserId = async () => {
    const savedUser = await AsyncStorage.getItem('mindscale_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    return user?.id ? user.id.toString() : null;
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      const headers = { 'X-User-ID': userId };

      const [statsRes, historyRes] = await Promise.all([
        fetch(api('/api/stats'), { headers }),
        fetch(api('/api/history'), { headers }),
      ]);

      if (statsRes.status === 401 || historyRes.status === 401) {
        await AsyncStorage.removeItem('mindscale_user');
        return;
      }

      if (!statsRes.ok || !historyRes.ok) {
        throw new Error('Failed to fetch dashboard data.');
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      setAllLogs(historyData);
    } catch (error) {
      showToast(error.message || 'Error loading analytics statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return allLogs;
    const query = searchQuery.toLowerCase();
    return allLogs.filter(
      (log) =>
        log.raw_text.toLowerCase().includes(query) ||
        log.sentiment.toLowerCase().includes(query) ||
        log.timestamp.toLowerCase().includes(query)
    );
  }, [allLogs, searchQuery]);

  // Derived calculations
  let dominantSentiment = 'None';
  let avgConf = 0;

  if (stats && allLogs.length > 0) {
    let maxCount = -1;
    Object.keys(stats.counts).forEach((key) => {
      if (stats.counts[key] > maxCount) {
        maxCount = stats.counts[key];
        dominantSentiment = key;
      }
    });

    const totalConf = allLogs.reduce((sum, item) => sum + item.confidence, 0);
    avgConf = Math.round((totalConf / allLogs.length) * 100);
  }

  const dominantMeta = CLASS_META[dominantSentiment] || {
    color: Colors.neutral,
    icon: 'meh',
    label: dominantSentiment,
  };

  const formatDateTime = (dbDateString) => {
    try {
      const formattedStr = dbDateString.replace(' ', 'T');
      const d = new Date(formattedStr);
      if (isNaN(d.getTime())) return dbDateString;
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (e) {
      return dbDateString;
    }
  };

  // Pie chart config/data
  const pieData = [];
  if (stats && stats.total > 0) {
    Object.keys(stats.counts).forEach((key) => {
      const count = stats.counts[key] || 0;
      if (count > 0) {
        const meta = CLASS_META[key] || { color: Colors.neutral };
        pieData.push({
          name: key,
          population: count,
          color: meta.color,
          legendFontColor: Colors.textSecondary,
          legendFontSize: 11,
        });
      }
    });
  } else {
    pieData.push({
      name: 'No data',
      population: 1,
      color: Colors.overlayMedium,
      legendFontColor: Colors.textMuted,
      legendFontSize: 11,
    });
  }

  // Line chart config/data
  const timelineData = stats?.timeline ? stats.timeline.slice(-8) : []; // Slice to fits on mobile screen easily
  const lineChartData = {
    labels: timelineData.map((item) => {
      const date = new Date(item.timestamp.replace(' ', 'T'));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        data: timelineData.map((item) => sentimentScore(item.sentiment)),
        color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: Colors.bgCardSolid,
    backgroundGradientTo: Colors.bgCardSolid,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity * 0.15})`,
    labelColor: (opacity = 1) => Colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '5',
      strokeWidth: '1.5',
      stroke: Colors.primary,
    },
  };

  return (
    <View style={SharedStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={SharedStyles.screenScroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Header title="Analytics" subtitle="Emotional trajectories and cognitive insights" />

        {/* KPI Grid */}
        <View style={styles.kpiContainer}>
          {/* KPI 1 */}
          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' }]}>
              <FontAwesome5 name="book" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.kpiVal}>{stats?.total || 0}</Text>
            <Text style={styles.kpiSub}>Total Entries</Text>
          </View>

          {/* KPI 2 */}
          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: `${dominantMeta.color}15`, borderColor: `${dominantMeta.color}30` }]}>
              <FontAwesome5 name={dominantMeta.icon} size={18} color={dominantMeta.color} />
            </View>
            <Text style={[styles.kpiVal, { color: dominantMeta.color }]} numberOfLines={1}>
              {dominantMeta.label}
            </Text>
            <Text style={styles.kpiSub}>Dominant State</Text>
          </View>

          {/* KPI 3 */}
          <View style={[SharedStyles.card, styles.kpiCard]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }]}>
              <FontAwesome5 name="percentage" size={18} color={Colors.neutral} />
            </View>
            <Text style={styles.kpiVal}>{avgConf}%</Text>
            <Text style={styles.kpiSub}>Avg Confidence</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Mood Trend Chart */}
            <View style={[SharedStyles.cardSolid, styles.chartCard]}>
              <Text style={styles.chartTitle}>
                <FontAwesome5 name="chart-line" size={14} color={Colors.primary} style={{ marginRight: 8 }} />
                Mood Trend Over Time
              </Text>
              {timelineData.length > 0 ? (
                <LineChart
                  data={lineChartData}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  fromZero
                />
              ) : (
                <Text style={styles.noDataText}>Write reflections to visualize mood trend.</Text>
              )}
            </View>

            {/* Pie Chart */}
            <View style={[SharedStyles.cardSolid, styles.chartCard]}>
              <Text style={styles.chartTitle}>
                <FontAwesome5 name="chart-pie" size={14} color={Colors.neutral} style={{ marginRight: 8 }} />
                Mental State Breakdown
              </Text>
              <PieChart
                data={pieData}
                width={chartWidth}
                height={180}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>

            {/* Reflection Logs List */}
            <View style={[SharedStyles.card, { marginTop: 10 }]}>
              <View style={styles.logHeader}>
                <Text style={styles.logTitle}>Reflection Log History</Text>
                <TextInput
                  style={[SharedStyles.input, styles.searchInput]}
                  placeholder="Search logs..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {filteredLogs.length === 0 ? (
                <Text style={styles.noLogsText}>No matching logs found.</Text>
              ) : (
                filteredLogs.map((log) => {
                  const meta = CLASS_META[log.sentiment] || { color: Colors.neutral, icon: 'meh' };
                  return (
                    <View key={log.id.toString()} style={styles.logRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.logText} numberOfLines={2}>
                          {log.raw_text}
                        </Text>
                        <Text style={styles.logDate}>{formatDateTime(log.timestamp)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[SharedStyles.badge, { backgroundColor: `${meta.color}15` }]}>
                          <FontAwesome5 name={meta.icon} size={10} color={meta.color} />
                          <Text style={[styles.badgeText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                        <Text style={styles.logConfidence}>
                          Conf: {Math.round(log.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Toast
        visible={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiVal: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  kpiSub: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
    marginBottom: 16,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 40,
  },
  noLogsText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  logHeader: {
    marginBottom: 16,
  },
  logTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  searchInput: {
    paddingVertical: 8,
    fontSize: 14,
  },
  logRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  logDate: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  logConfidence: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
});

export default DashboardScreen;
