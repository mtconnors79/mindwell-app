import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const RELATIONSHIPS = [
  { id: 'Family', label: 'Family', icon: 'people-outline' },
  { id: 'Friend', label: 'Friend', icon: 'person-outline' },
  { id: 'Partner', label: 'Partner', icon: 'heart-outline' },
  { id: 'Therapist', label: 'Therapist', icon: 'medkit-outline' },
  { id: 'Other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const AddContactModal = ({ visible, onClose, onSave, editingContact }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [isPrimary, setIsPrimary] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name || '');
      setPhone(editingContact.phone || '');
      setRelationship(editingContact.relationship || 'Family');
      setIsPrimary(editingContact.is_primary || false);
      setSendSms(false); // Don't send SMS when editing
    } else {
      // Reset to defaults
      setName('');
      setPhone('');
      setRelationship('Family');
      setIsPrimary(false);
      setSendSms(true);
    }
    setErrors({});
  }, [editingContact, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onSave(
      {
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        is_primary: isPrimary,
      },
      sendSms && !editingContact
    );
  };

  const formatPhoneNumber = (text) => {
    // Remove all non-numeric characters except +
    const cleaned = text.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingContact ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Contact name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={formatPhoneNumber}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Relationship Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.relationshipContainer}>
              {RELATIONSHIPS.map((rel) => (
                <TouchableOpacity
                  key={rel.id}
                  style={[
                    styles.relationshipButton,
                    relationship === rel.id && styles.relationshipButtonSelected,
                  ]}
                  onPress={() => setRelationship(rel.id)}
                >
                  <Icon
                    name={rel.icon}
                    size={20}
                    color={relationship === rel.id ? '#6366F1' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.relationshipText,
                      relationship === rel.id && styles.relationshipTextSelected,
                    ]}
                  >
                    {rel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Primary Toggle */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleInfo}>
              <Icon name="star-outline" size={22} color="#F59E0B" />
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Set as Primary Contact</Text>
                <Text style={styles.toggleDescription}>
                  Your primary contact will be notified in crisis situations
                </Text>
              </View>
            </View>
            <Switch
              value={isPrimary}
              onValueChange={setIsPrimary}
              trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
              thumbColor={isPrimary ? '#6366F1' : '#9CA3AF'}
            />
          </View>

          {/* SMS Toggle (only for new contacts) */}
          {!editingContact && (
            <View style={styles.toggleGroup}>
              <View style={styles.toggleInfo}>
                <Icon name="chatbubble-outline" size={22} color="#6366F1" />
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Send Confirmation SMS</Text>
                  <Text style={styles.toggleDescription}>
                    They must confirm before receiving alerts
                  </Text>
                </View>
              </View>
              <Switch
                value={sendSms}
                onValueChange={setSendSms}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={sendSms ? '#6366F1' : '#9CA3AF'}
              />
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Icon name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              {editingContact
                ? 'Changes to name and relationship won\'t require re-confirmation.'
                : 'This person will receive an SMS to confirm they want to be your support contact. They can decline or opt out at any time.'}
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  relationshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  relationshipButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  relationshipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  relationshipTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AddContactModal;
