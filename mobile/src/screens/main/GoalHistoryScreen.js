import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { goalsAPI } from '../../services/goalsApi';
import { colors } from '../../theme/colors';

const ACTIVITY_ICONS = {
  check_in: 'create-outline',
  quick_mood: 'happy-outline',
  mindfulness: 'leaf-outline',
  breathing: 'cloudy-outline',
  journaling: 'book-outline',
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const GoalHistoryScreen = ({ navigation }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await goalsAPI.getHistory({ limit: 100 });
      setGoals(response.data?.goals || []);
    } catch (error) {
      console.error('Error fetching goal history:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all past goals? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await goalsAPI.clearHistory();
              setGoals([]);
              Alert.alert('Success', 'Goal history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const getGoalStatus = (goal) => {
    if (goal.completed_at) {
      return { label: 'Completed', color: '#10B981', icon: 'checkmark-circle' };
    }
    return { label: 'Abandoned', color: colors.textSecondary, icon: 'close-circle' };
  };

  const renderGoalItem = ({ item: goal }) => {
    const status = getGoalStatus(goal);

    return (
      <View style={styles.goalItem}>
        <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />

        <View style={styles.goalContent}>
          <View style={styles.goalHeader}>
            <View style={styles.goalIconContainer}>
              <Icon
                name={ACTIVITY_ICONS[goal.activity_type] || 'flag-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
              <Text style={styles.goalMeta}>
                {goal.target_count}x {goal.time_frame}
              </Text>
            </View>
          </View>

          <View style={styles.goalFooter}>
            <View style={styles.statusBadge}>
              <Icon name={status.icon} size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {formatDate(goal.completed_at || goal.updated_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="time-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No past goals</Text>
      <Text style={styles.emptyText}>
        Completed and deleted goals will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {goals.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Icon name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.clearButtonText}>Clear History</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  goalItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
  },
  goalContent: {
    flex: 1,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  goalMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
});

export default GoalHistoryScreen;
