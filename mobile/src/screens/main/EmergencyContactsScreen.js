import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendSMS from 'react-native-sms';
import { emergencyContactAPI } from '../../services/api';
import AddContactModal from '../../components/AddContactModal';

const NOTIFY_PREFERENCE_KEY = '@soulbloom_notify_preference';

const EmergencyContactsScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActivePrimary, setHasActivePrimary] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [notifyPreference, setNotifyPreference] = useState('ask_first'); // 'always' or 'ask_first'

  useEffect(() => {
    loadContacts();
    loadNotifyPreference();
  }, []);

  const loadNotifyPreference = async () => {
    try {
      const pref = await AsyncStorage.getItem(NOTIFY_PREFERENCE_KEY);
      if (pref) {
        setNotifyPreference(pref);
      }
    } catch (error) {
      console.error('Error loading notify preference:', error);
    }
  };

  const saveNotifyPreference = async (preference) => {
    try {
      await AsyncStorage.setItem(NOTIFY_PREFERENCE_KEY, preference);
      setNotifyPreference(preference);
    } catch (error) {
      console.error('Error saving notify preference:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await emergencyContactAPI.list();
      setContacts(response.data?.contacts || []);
      setHasActivePrimary(response.data?.hasActivePrimary || false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadContacts();
  }, []);

  const handleAddContact = () => {
    setEditingContact(null);
    setShowAddModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const handleSaveContact = async (contactData, smsMessage) => {
    try {
      if (editingContact) {
        await emergencyContactAPI.update(editingContact.id, contactData);
        Alert.alert('Success', 'Contact updated successfully');
      } else {
        const response = await emergencyContactAPI.create(contactData);

        // Send SMS with confirmation link
        if (smsMessage && response.data?.sms_message) {
          SendSMS.send(
            {
              body: response.data.sms_message,
              recipients: [contactData.phone],
              successTypes: ['sent', 'queued'],
              allowAndroidSendWithoutReadPermission: true,
            },
            (completed, cancelled, error) => {
              if (completed) {
                Alert.alert('Success', 'Contact added and confirmation SMS sent');
              } else if (cancelled) {
                Alert.alert('Contact Added', 'Contact added but SMS was cancelled. You can resend the confirmation later.');
              } else if (error) {
                Alert.alert('Contact Added', 'Contact added but SMS failed to send. You can resend the confirmation later.');
              }
            }
          );
        } else {
          Alert.alert('Success', 'Contact added successfully');
        }
      }
      loadContacts();
      setShowAddModal(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', error.message || 'Failed to save contact');
    }
  };

  const handleDeleteContact = async (contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name} as a support contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyContactAPI.delete(contact.id);
              loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleResendConfirmation = async (contact) => {
    try {
      const response = await emergencyContactAPI.resendConfirmation(contact.id);

      if (response.data?.sms_message) {
        SendSMS.send(
          {
            body: response.data.sms_message,
            recipients: [contact.phone],
            successTypes: ['sent', 'queued'],
            allowAndroidSendWithoutReadPermission: true,
          },
          (completed, cancelled, error) => {
            if (completed) {
              Alert.alert('Success', 'Confirmation SMS resent');
            } else {
              Alert.alert('Info', 'Confirmation link generated. Please send manually if SMS failed.');
            }
          }
        );
      }
      loadContacts();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend confirmation');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pending' },
      active: { bg: '#D1FAE5', color: '#059669', label: 'Active' },
      declined: { bg: '#FEE2E2', color: '#DC2626', label: 'Declined' },
      expired: { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
    };
    return styles[status] || styles.pending;
  };

  const renderRightActions = (contact) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteContact(contact)}
    >
      <Icon name="trash-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );

  const renderContact = (contact) => {
    const badge = getStatusBadge(contact.status);

    return (
      <Swipeable
        key={contact.id}
        renderRightActions={() => renderRightActions(contact)}
      >
        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => handleEditContact(contact)}
        >
          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              {contact.is_primary && (
                <Icon name="star" size={16} color="#F59E0B" style={styles.primaryStar} />
              )}
              <Text style={styles.contactName}>{contact.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
            <Text style={styles.contactRelationship}>{contact.relationship || 'Not specified'}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
          </View>

          <View style={styles.contactActions}>
            {(contact.status === 'pending' || contact.status === 'expired' || contact.status === 'declined') && (
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => handleResendConfirmation(contact)}
              >
                <Icon name="refresh-outline" size={18} color="#6366F1" />
              </TouchableOpacity>
            )}
            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {/* Warning if no active primary */}
        {!hasActivePrimary && contacts.length > 0 && (
          <View style={styles.warningBox}>
            <Icon name="warning-outline" size={20} color="#D97706" />
            <Text style={styles.warningText}>
              You don't have an active primary contact. Set one to enable crisis notifications.
            </Text>
          </View>
        )}

        {/* Contacts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Support Contacts</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No support contacts yet</Text>
              <Text style={styles.emptyText}>
                Add someone you trust to be notified if you need support.
              </Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={handleAddContact}>
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {contacts.map(renderContact)}
            </View>
          )}
        </View>

        {/* 911 Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>911 Notification</Text>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsDescription}>
              When you tap 911 in crisis resources, should we also notify your primary support contact?
            </Text>

            <TouchableOpacity
              style={[
                styles.optionButton,
                notifyPreference === 'always' && styles.optionButtonSelected,
              ]}
              onPress={() => saveNotifyPreference('always')}
            >
              <View style={styles.optionContent}>
                <Icon
                  name={notifyPreference === 'always' ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={notifyPreference === 'always' ? '#6366F1' : '#9CA3AF'}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Always notify primary contact</Text>
                  <Text style={styles.optionDescription}>
                    Automatically send SMS to your primary contact
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                notifyPreference === 'ask_first' && styles.optionButtonSelected,
              ]}
              onPress={() => saveNotifyPreference('ask_first')}
            >
              <View style={styles.optionContent}>
                <Icon
                  name={notifyPreference === 'ask_first' ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={notifyPreference === 'ask_first' ? '#6366F1' : '#9CA3AF'}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>Ask me first</Text>
                  <Text style={styles.optionDescription}>
                    Show a prompt before notifying anyone
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AddContactModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        editingContact={editingContact}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryStar: {
    marginRight: 6,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactRelationship: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    padding: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: 12,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  optionButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomPadding: {
    height: 32,
  },
});

export default EmergencyContactsScreen;
