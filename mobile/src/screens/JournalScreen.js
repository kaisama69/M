import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Colors, FontFamily, SharedStyles, CLASS_META } from '../theme';
import { api } from '../config';
import Header from '../components/Header';
import Toast from '../components/Toast';

const JournalScreen = ({ navigation }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const isFocused = useIsFocused();

  // Re-fetch history when the tab comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchHistory();
    }
  }, [isFocused]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const getUserId = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('mindscale_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user?.id ? user.id.toString() : null;
    } catch (e) {
      console.log('Error getting user id', e);
      return null;
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setHistoryLoading(false);
        return;
      }

      const response = await fetch(api('/api/history'), {
        headers: {
          'X-User-ID': userId,
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('mindscale_user');
        return;
      }

      if (!response.ok) throw new Error('Failed to retrieve history logs.');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      showToast('Could not fetch logs history.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setLoading(true);
    setResult(null);

    try {
      const userId = await getUserId();
      if (!userId) {
        showToast('Please log in again.', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed.');
      }

      const data = await response.json();
      setResult(data);
      setText('');
      showToast('Reflection logged and analyzed successfully!', 'success');
      fetchHistory();
    } catch (error) {
      showToast(error.message || 'Error occurred during analysis.', 'error');
    } finally {
      setLoading(false);
    }
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

  const getSentimentStyle = (sentiment) => {
    return CLASS_META[sentiment] || CLASS_META['Normal'];
  };

  const resultMeta = result ? getSentimentStyle(result.sentiment) : null;

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
        <Header />

        {/* Input Area */}
        <View style={[SharedStyles.card, { marginBottom: 20 }]}>
          <Text style={styles.cardHeader}>How was your day?</Text>
          <View style={styles.textareaContainer}>
            <TextInput
              style={styles.textarea}
              placeholder="Write your thoughts here..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={2000}
              value={text}
              onChangeText={setText}
            />
            <View style={styles.controlsRow}>
              <Text style={styles.charCount}>{text.length} / 2000</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loading || !text.trim()}>
            <LinearGradient
              colors={[Colors.primary, '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[SharedStyles.gradientBtn, (!text.trim() || loading) && { opacity: 0.5 }]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Analyze Mood</Text>
                  <FontAwesome5 name="arrow-right" size={14} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Results Area */}
        {result && resultMeta && (
          <View style={[SharedStyles.card, { borderColor: resultMeta.color, marginBottom: 24 }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Analysis Result</Text>
              <View style={[SharedStyles.badge, { backgroundColor: `${resultMeta.color}20`, borderColor: resultMeta.color, borderWidth: 1 }]}>
                <FontAwesome5 name={resultMeta.icon} size={12} color={resultMeta.color} />
                <Text style={{ color: resultMeta.color, fontFamily: FontFamily.bold, fontSize: 13 }}>
                  {resultMeta.label}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceText}>Confidence</Text>
              <Text style={[styles.confidenceText, { color: Colors.textPrimary }]}>
                {Math.round(result.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(result.confidence * 100)}%`, backgroundColor: resultMeta.color },
                ]}
              />
            </View>

            <View style={[styles.recommendationCard, { backgroundColor: `${resultMeta.color}10`, borderColor: `${resultMeta.color}25` }]}>
              <Text style={[styles.recommendationLabel, { color: resultMeta.color }]}>
                Recommended Action
              </Text>
              <Text style={styles.recommendationText}>{result.recommendation}</Text>
            </View>

            {result.sentiment !== 'Normal' && (
              <TouchableOpacity
                style={styles.breathingRoomBtn}
                onPress={() => navigation.navigate('Breathing')}
              >
                <FontAwesome5 name="spa" size={14} color={Colors.primary} />
                <Text style={styles.breathingRoomText}>Feel stressed? Try a 1-min Breathing session</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reflections History */}
        <Text style={styles.historyTitle}>
          <FontAwesome5 name="history" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
          Recent Reflections
        </Text>

        {historyLoading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="folder-open" size={32} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No logs yet. Start typing above to log your first mood!</Text>
          </View>
        ) : (
          history.map((item) => {
            const itemStyle = getSentimentStyle(item.sentiment);
            return (
              <View key={item.id.toString()} style={styles.historyItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.historyText} numberOfLines={1}>
                    {item.raw_text}
                  </Text>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historySubtext}>
                      <FontAwesome5 name="calendar-alt" size={11} /> {formatDateTime(item.timestamp)}
                    </Text>
                    <Text style={styles.historySubtext}>
                      <FontAwesome5 name="percentage" size={11} /> {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                <View style={[SharedStyles.badge, { backgroundColor: `${itemStyle.color}15` }]}>
                  <FontAwesome5 name={itemStyle.icon} size={11} color={itemStyle.color} />
                  <Text style={[styles.badgeText, { color: itemStyle.color }]}>
                    {itemStyle.label}
                  </Text>
                </View>
              </View>
            );
          })
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
  cardHeader: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  textareaContainer: {
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    marginBottom: 16,
    padding: 12,
  },
  textarea: {
    height: 140,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    textAlignVertical: 'top',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  btnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidenceText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  progressBg: {
    height: 10,
    backgroundColor: Colors.overlayMedium,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  recommendationCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  recommendationLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  breathingRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 8,
    paddingVertical: 10,
  },
  breathingRoomText: {
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
    fontSize: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  historyItem: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  historySubtext: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
});

export default JournalScreen;
