/**
 * Platform Mock Helpers for Testing
 *
 * Provides utilities to mock Platform.OS for testing
 * platform-specific code paths on both iOS and Android.
 *
 * Usage:
 *   import { mockIOS, mockAndroid, resetPlatform } from './__tests__/helpers/platformMock';
 *
 *   describe('Platform-specific tests', () => {
 *     afterEach(() => {
 *       resetPlatform();
 *     });
 *
 *     it('works on iOS', () => {
 *       mockIOS();
 *       // Test iOS-specific behavior
 *     });
 *
 *     it('works on Android', () => {
 *       mockAndroid();
 *       // Test Android-specific behavior
 *     });
 *   });
 */

import { Platform } from 'react-native';

// Store original Platform values
const originalOS = Platform.OS;
const originalSelect = Platform.select;
const originalVersion = Platform.Version;

/**
 * Mock Platform as iOS
 * @param {string} version - iOS version (default: '17.0')
 */
export const mockIOS = (version = '17.0') => {
  Platform.OS = 'ios';
  Platform.Version = version;
  Platform.select = (options) => {
    if (options.ios !== undefined) return options.ios;
    if (options.native !== undefined) return options.native;
    return options.default;
  };
};

/**
 * Mock Platform as Android
 * @param {number} version - Android API level (default: 34)
 */
export const mockAndroid = (version = 34) => {
  Platform.OS = 'android';
  Platform.Version = version;
  Platform.select = (options) => {
    if (options.android !== undefined) return options.android;
    if (options.native !== undefined) return options.native;
    return options.default;
  };
};

/**
 * Reset Platform to original values
 * Should be called in afterEach() to prevent test pollution
 */
export const resetPlatform = () => {
  Platform.OS = originalOS;
  Platform.select = originalSelect;
  Platform.Version = originalVersion;
};

/**
 * Get current mocked platform
 * @returns {'ios' | 'android'} Current platform
 */
export const getCurrentPlatform = () => Platform.OS;

/**
 * Check if current platform is iOS
 * @returns {boolean}
 */
export const isIOS = () => Platform.OS === 'ios';

/**
 * Check if current platform is Android
 * @returns {boolean}
 */
export const isAndroid = () => Platform.OS === 'android';

/**
 * Run a test for both platforms
 * @param {string} description - Test description
 * @param {Function} testFn - Test function that receives platform as argument
 *
 * Usage:
 *   testBothPlatforms('renders correctly', (platform) => {
 *     const { getByText } = render(<Component />);
 *     expect(getByText('Hello')).toBeTruthy();
 *   });
 */
export const testBothPlatforms = (description, testFn) => {
  describe.each(['ios', 'android'])(`${description} on %s`, (platform) => {
    beforeEach(() => {
      if (platform === 'ios') {
        mockIOS();
      } else {
        mockAndroid();
      }
    });

    afterEach(() => {
      resetPlatform();
    });

    it(`works on ${platform}`, () => {
      testFn(platform);
    });
  });
};

/**
 * Create platform-specific mock values
 * @param {Object} options - { ios: value, android: value }
 * @returns {any} Value for current platform
 */
export const platformValue = (options) => {
  return Platform.select(options);
};

export default {
  mockIOS,
  mockAndroid,
  resetPlatform,
  getCurrentPlatform,
  isIOS,
  isAndroid,
  testBothPlatforms,
  platformValue,
};
