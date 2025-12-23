/**
 * ScreenLoader Component
 *
 * Loading placeholder shown while screens are lazy loading.
 * Provides a consistent loading experience across the app.
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { colors } from '../theme/colors';

const ScreenLoader = ({ message = 'Loading...', showMessage = true }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {showMessage && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default ScreenLoader;
