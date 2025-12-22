import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { goalsAPI } from '../services/goalsApi';

const ACTIVITY_TYPES = [
  { value: 'check_in', label: 'Check-in', icon: 'create-outline' },
  { value: 'quick_mood', label: 'Mood Log', icon: 'happy-outline' },
  { value: 'mindfulness', label: 'Mindfulness', icon: 'leaf-outline' },
  { value: 'breathing', label: 'Breathing', icon: 'cloudy-outline' },
  { value: 'journaling', label: 'Journaling', icon: 'book-outline' },
];

const TIME_FRAMES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const AddGoalModal = ({ visible, onClose, onGoalCreated, editGoal = null }) => {
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('check_in');
  const [targetCount, setTargetCount] = useState(1);
  const [timeFrame, setTimeFrame] = useState('daily');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
      if (editGoal) {
        setTitle(editGoal.title);
        setActivityType(editGoal.activity_type);
        setTargetCount(editGoal.target_count);
        setTimeFrame(editGoal.time_frame);
      } else {
        resetForm();
      }
    }
  }, [visible, editGoal]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await goalsAPI.getTemplates();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error.message);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setActivityType('check_in');
    setTargetCount(1);
    setTimeFrame('daily');
  };

  const handleTemplateSelect = (template) => {
    setTitle(template.title);
    setActivityType(template.activity_type);
    setTargetCount(template.target_count);
    setTimeFrame(template.time_frame);
  };

  const handleTargetIncrement = () => {
    if (targetCount < 100) {
      setTargetCount(targetCount + 1);
    }
  };

  const handleTargetDecrement = () => {
    if (targetCount > 1) {
      setTargetCount(targetCount - 1);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a goal title');
      return false;
    }
    if (title.trim().length > 50) {
      Alert.alert('Validation Error', 'Title must be 50 characters or less');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        activity_type: activityType,
        target_count: targetCount,
        time_frame: timeFrame,
      };

      if (editGoal) {
        await goalsAPI.updateGoal(editGoal.id, data);
      } else {
        await goalsAPI.createGoal(data);
      }

      onGoalCreated?.();
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save goal. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity?.icon || 'flag-outline';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'beginner': return '#10B981';
      case 'wellness': return '#6366F1';
      case 'awareness': return '#F59E0B';
      case 'reflection': return '#8B5CF6';
      case 'challenge': return '#EF4444';
      default: return colors.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editGoal ? 'Edit Goal' : 'Create Goal'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Start Templates */}
            {!editGoal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Start</Text>
                {loadingTemplates ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.templatesScroll}
                  >
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.templateChip,
                          { borderColor: getCategoryColor(template.category) }
                        ]}
                        onPress={() => handleTemplateSelect(template)}
                      >
                        <Icon
                          name={getActivityIcon(template.activity_type)}
                          size={16}
                          color={getCategoryColor(template.category)}
                        />
                        <Text style={[
                          styles.templateChipText,
                          { color: getCategoryColor(template.category) }
                        ]}>
                          {template.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Daily meditation"
                placeholderTextColor={colors.textSecondary}
                maxLength={50}
              />
              <Text style={styles.charCount}>{title.length}/50</Text>
            </View>

            {/* Activity Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Type</Text>
              <View style={styles.activityGrid}>
                {ACTIVITY_TYPES.map((activity) => (
                  <TouchableOpacity
                    key={activity.value}
                    style={[
                      styles.activityOption,
                      activityType === activity.value && styles.activityOptionSelected
                    ]}
                    onPress={() => setActivityType(activity.value)}
                  >
                    <Icon
                      name={activity.icon}
                      size={24}
                      color={activityType === activity.value ? colors.white : colors.primary}
                    />
                    <Text style={[
                      styles.activityLabel,
                      activityType === activity.value && styles.activityLabelSelected
                    ]}>
                      {activity.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Count */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target Count</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[styles.stepperButton, targetCount <= 1 && styles.stepperButtonDisabled]}
                  onPress={handleTargetDecrement}
                  disabled={targetCount <= 1}
                >
                  <Icon
                    name="remove"
                    size={24}
                    color={targetCount <= 1 ? colors.textSecondary : colors.primary}
                  />
                </TouchableOpacity>
                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValue}>{targetCount}</Text>
                  <Text style={styles.stepperLabel}>times</Text>
                </View>
                <TouchableOpacity
                  style={[styles.stepperButton, targetCount >= 100 && styles.stepperButtonDisabled]}
                  onPress={handleTargetIncrement}
                  disabled={targetCount >= 100}
                >
                  <Icon
                    name="add"
                    size={24}
                    color={targetCount >= 100 ? colors.textSecondary : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Frame */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Time Frame</Text>
              <View style={styles.timeFrameContainer}>
                {TIME_FRAMES.map((tf) => (
                  <TouchableOpacity
                    key={tf.value}
                    style={[
                      styles.timeFrameOption,
                      timeFrame === tf.value && styles.timeFrameOptionSelected
                    ]}
                    onPress={() => setTimeFrame(tf.value)}
                  >
                    <Text style={[
                      styles.timeFrameLabel,
                      timeFrame === tf.value && styles.timeFrameLabelSelected
                    ]}>
                      {tf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewSection}>
              <Icon name="flag-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.previewText}>
                {title || 'Your goal'}: {targetCount}x {timeFrame}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.createButtonText}>
                  {editGoal ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  templatesScroll: {
    marginHorizontal: -4,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
  },
  templateChipText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  activityOption: {
    width: '30%',
    marginHorizontal: '1.66%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: colors.white,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperValueContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  stepperLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -4,
  },
  timeFrameContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  timeFrameOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeFrameOptionSelected: {
    backgroundColor: colors.primary,
  },
  timeFrameLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeFrameLabelSelected: {
    color: colors.white,
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default AddGoalModal;
