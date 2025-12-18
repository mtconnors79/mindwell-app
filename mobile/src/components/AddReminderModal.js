import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';

const DAYS = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

const FREQUENCIES = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays only' },
  { id: 'weekends', label: 'Weekends only' },
  { id: 'custom', label: 'Custom days' },
];

const TYPES = [
  { id: 'checkin', label: 'Check-in reminder', icon: 'create-outline' },
  { id: 'mindfulness', label: 'Mindfulness reminder', icon: 'leaf-outline' },
  { id: 'both', label: 'General wellness', icon: 'heart-outline' },
];

const AddReminderModal = ({ visible, onClose, onSave, editingReminder }) => {
  const [time, setTime] = useState(new Date());
  const [frequency, setFrequency] = useState('daily');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
  const [type, setType] = useState('both');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (editingReminder) {
      const [hours, minutes] = editingReminder.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setTime(date);
      setFrequency(editingReminder.frequency);
      setSelectedDays(editingReminder.days || [1, 2, 3, 4, 5]);
      setType(editingReminder.type);
    } else {
      // Reset to defaults
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0);
      setTime(defaultTime);
      setFrequency('daily');
      setSelectedDays([1, 2, 3, 4, 5]);
      setType('both');
    }
  }, [editingReminder, visible]);

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const toggleDay = (dayId) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');

    onSave({
      id: editingReminder?.id,
      time: `${hours}:${minutes}`,
      frequency,
      days: frequency === 'custom' ? selectedDays : null,
      type,
      enabled: editingReminder?.enabled ?? true,
    });
    onClose();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time</Text>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="time-outline" size={24} color="#6366F1" />
                <Text style={styles.timeButtonText}>{formatTime(time)}</Text>
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            {showTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                />
              </View>
            )}
          </View>

          {/* Frequency Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <View style={styles.optionsContainer}>
              {FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.id}
                  style={[
                    styles.optionButton,
                    frequency === freq.id && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFrequency(freq.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      frequency === freq.id && styles.optionTextSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Days Selector */}
            {frequency === 'custom' && (
              <View style={styles.daysContainer}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day.id) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDays.includes(day.id) && styles.dayTextSelected,
                      ]}
                    >
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Type</Text>
            <View style={styles.typesContainer}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeButton,
                    type === t.id && styles.typeButtonSelected,
                  ]}
                  onPress={() => setType(t.id)}
                >
                  <Icon
                    name={t.icon}
                    size={24}
                    color={type === t.id ? '#6366F1' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      type === t.id && styles.typeTextSelected,
                    ]}
                  >
                    {t.label}
                  </Text>
                  {type === t.id && (
                    <Icon name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  timePickerContainer: {
    alignItems: 'center',
  },
  timePicker: {
    width: '100%',
    height: 150,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  optionText: {
    fontSize: 16,
    color: '#4B5563',
  },
  optionTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  typesContainer: {
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  typeText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
  },
  typeTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});

export default AddReminderModal;
