import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendSMS from 'react-native-sms';
import { resourcesAPI, emergencyContactAPI } from '../services/api';
import auth from '@react-native-firebase/auth';

const NOTIFY_PREFERENCE_KEY = '@soulbloom_notify_preference';

const CrisisResourcesModal = ({
  visible,
  onClose,
  requireAcknowledgment = false,
  alertMessage = null,
}) => {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [primaryContact, setPrimaryContact] = useState(null);
  const [notifyPreference, setNotifyPreference] = useState('ask_first');

  useEffect(() => {
    if (visible) {
      fetchResources();
      fetchPrimaryContact();
      loadNotifyPreference();
      setAcknowledged(false);
    }
  }, [visible]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await resourcesAPI.getCrisisResources();
      setResources(response.data?.resources || null);
    } catch (error) {
      console.error('Error fetching crisis resources:', error);
      // Fallback to hardcoded resources if API fails
      setResources({
        hotlines: [
          { id: 'suicide-lifeline', name: '988 Suicide & Crisis Lifeline', description: 'Free, confidential support 24/7', phone: '988', type: 'hotline', priority: 1 },
          { id: 'crisis-text', name: 'Crisis Text Line', description: 'Text HOME to 741741', phone: '741741', type: 'text', priority: 2 },
          { id: 'emergency', name: 'Emergency Services', description: 'For immediate emergencies', phone: '911', type: 'emergency', priority: 0 },
        ],
        therapyLinks: [
          { id: 'betterhelp', name: 'BetterHelp', description: 'Online therapy', url: 'https://www.betterhelp.com' },
        ],
        supportMessage: 'You are not alone. Help is available.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrimaryContact = async () => {
    try {
      const response = await emergencyContactAPI.getPrimary();
      setPrimaryContact(response.data?.contact || null);
    } catch (error) {
      console.error('Error fetching primary contact:', error);
      setPrimaryContact(null);
    }
  };

  const loadNotifyPreference = async () => {
    try {
      const pref = await AsyncStorage.getItem(NOTIFY_PREFERENCE_KEY);
      setNotifyPreference(pref || 'ask_first');
    } catch (error) {
      console.error('Error loading notify preference:', error);
    }
  };

  const getUserName = () => {
    const user = auth().currentUser;
    return user?.displayName || user?.email?.split('@')[0] || 'Someone';
  };

  const sendSupportAlert = (contact) => {
    const userName = getUserName();
    const message = `Hi, ${userName} wanted you to know they could use some support right now. Please consider checking in with them.`;

    SendSMS.send(
      {
        body: message,
        recipients: [contact.phone],
        successTypes: ['sent', 'queued'],
        allowAndroidSendWithoutReadPermission: true,
      },
      (completed, cancelled, error) => {
        if (completed) {
          Alert.alert('Sent', `${contact.name} has been notified.`);
        } else if (cancelled) {
          // User cancelled, no action needed
        } else if (error) {
          Alert.alert('Error', 'Failed to send message. Please try again.');
        }
      }
    );
  };

  const handleNotifySupportContact = () => {
    if (!primaryContact) {
      Alert.alert(
        'No Active Contact',
        'You don\'t have an active primary support contact. Add one in Settings > Emergency Contacts.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Notify Support Contact',
      `Send a support message to ${primaryContact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => sendSupportAlert(primaryContact),
        },
      ]
    );
  };

  const handleCall = (phoneNumber, isEmergency = false) => {
    if (isEmergency && primaryContact) {
      if (notifyPreference === 'always') {
        // Auto-notify primary contact
        sendSupportAlert(primaryContact);
        Linking.openURL(`tel:${phoneNumber}`);
      } else {
        // Ask first
        Alert.alert(
          'Notify Support Contact?',
          `Would you also like to notify ${primaryContact.name}?`,
          [
            {
              text: 'No, just call',
              onPress: () => Linking.openURL(`tel:${phoneNumber}`),
            },
            {
              text: 'Yes, notify them',
              onPress: () => {
                sendSupportAlert(primaryContact);
                Linking.openURL(`tel:${phoneNumber}`);
              },
            },
          ]
        );
        return;
      }
    } else {
      // Opens phone dialer with number pre-filled, does NOT auto-call
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleSMS = (phoneNumber, keyword) => {
    Linking.openURL(`sms:${phoneNumber}${keyword ? `&body=${keyword}` : ''}`);
  };

  const handleLink = (url) => {
    Linking.openURL(url);
  };

  const handleClose = () => {
    if (requireAcknowledgment && !acknowledged) {
      return; // Prevent closing without acknowledgment
    }
    onClose();
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'emergency':
        return 'warning';
      case 'hotline':
        return 'call';
      case 'text':
        return 'chatbubble-ellipses';
      default:
        return 'help-circle';
    }
  };

  const getColorForType = (type) => {
    switch (type) {
      case 'emergency':
        return '#EF4444';
      case 'hotline':
        return '#6366F1';
      case 'text':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="heart" size={28} color="#EF4444" />
            </View>
            <Text style={styles.title}>Crisis Resources</Text>
            {!requireAcknowledgment && (
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Alert Message */}
          {alertMessage && (
            <View style={styles.alertBox}>
              <Icon name="information-circle" size={20} color="#6366F1" />
              <Text style={styles.alertText}>{alertMessage}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Support Message */}
              {resources?.supportMessage && (
                <Text style={styles.supportMessage}>{resources.supportMessage}</Text>
              )}

              {/* Notify Support Contact Button */}
              {primaryContact && (
                <TouchableOpacity
                  style={styles.notifyButton}
                  onPress={handleNotifySupportContact}
                >
                  <View style={styles.notifyButtonIcon}>
                    <Icon name="people" size={24} color="#6366F1" />
                  </View>
                  <View style={styles.notifyButtonText}>
                    <Text style={styles.notifyButtonTitle}>Notify my support contact</Text>
                    <Text style={styles.notifyButtonSubtitle}>Send a message to {primaryContact.name}</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#6366F1" />
                </TouchableOpacity>
              )}

              {/* Hotlines Section */}
              <Text style={styles.sectionTitle}>Crisis Hotlines</Text>
              {resources?.hotlines
                ?.sort((a, b) => a.priority - b.priority)
                .map((hotline) => (
                  <TouchableOpacity
                    key={hotline.id}
                    style={styles.resourceCard}
                    onPress={() =>
                      hotline.type === 'text'
                        ? handleSMS(hotline.phone, hotline.smsKeyword)
                        : handleCall(hotline.phone, hotline.type === 'emergency')
                    }
                  >
                    <View style={[styles.resourceIcon, { backgroundColor: getColorForType(hotline.type) + '20' }]}>
                      <Icon name={getIconForType(hotline.type)} size={24} color={getColorForType(hotline.type)} />
                    </View>
                    <View style={styles.resourceInfo}>
                      <Text style={styles.resourceName}>{hotline.name}</Text>
                      <Text style={styles.resourceDescription}>{hotline.description}</Text>
                      <Text style={[styles.resourcePhone, { color: getColorForType(hotline.type) }]}>
                        {hotline.type === 'text' ? `Text: ${hotline.phone}` : `Call: ${hotline.phone}`}
                      </Text>
                    </View>
                    <Icon
                      name={hotline.type === 'text' ? 'chatbubble' : 'call'}
                      size={20}
                      color={getColorForType(hotline.type)}
                    />
                  </TouchableOpacity>
                ))}

              {/* Therapy Links Section */}
              <Text style={styles.sectionTitle}>Online Therapy</Text>
              {resources?.therapyLinks?.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.resourceCard}
                  onPress={() => handleLink(link.url)}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Icon name="globe-outline" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceName}>{link.name}</Text>
                    <Text style={styles.resourceDescription}>{link.description}</Text>
                  </View>
                  <Icon name="open-outline" size={20} color="#8B5CF6" />
                </TouchableOpacity>
              ))}

              {/* Acknowledgment Button */}
              {requireAcknowledgment && (
                <TouchableOpacity
                  style={[
                    styles.acknowledgeButton,
                    acknowledged && styles.acknowledgeButtonActive,
                  ]}
                  onPress={() => {
                    setAcknowledged(true);
                    onClose();
                  }}
                >
                  <Icon
                    name={acknowledged ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.acknowledgeButtonText}>I understand</Text>
                </TouchableOpacity>
              )}

              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
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
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  alertText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  supportMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  notifyButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifyButtonText: {
    flex: 1,
  },
  notifyButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  notifyButtonSubtitle: {
    fontSize: 13,
    color: '#6366F1',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  resourcePhone: {
    fontSize: 14,
    fontWeight: '600',
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  acknowledgeButtonActive: {
    backgroundColor: '#10B981',
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default CrisisResourcesModal;
