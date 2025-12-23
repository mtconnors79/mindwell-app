# SoulBloom Testing Guide

## Quick Start

```bash
# Backend tests
cd backend && npm test

# Mobile tests
cd mobile && npm test

# With coverage
npm test -- --coverage
```

## Backend Tests

### Test Structure
```
backend/tests/
├── setup.js           # Test utilities, mocks, MongoDB connection
├── auth.test.js       # Authentication endpoints (20 tests)
├── mood.test.js       # Mood API endpoints (22 tests)
├── checkin.test.js    # Check-in endpoints
└── sentimentService.test.js  # AI sentiment analysis (40+ tests)
```

### Running Specific Tests
```bash
npm test tests/auth.test.js
npm test tests/sentimentService.test.js
```

### Test Patterns

**Mock Setup Pattern:**
```javascript
// Define mock functions at top level (before jest.mock)
const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.mock('../models', () => ({
  User: { findOne: mockFindOne, create: mockCreate }
}));

// Configure mocks in beforeEach or individual tests
beforeEach(() => {
  mockFindOne.mockResolvedValue(null);
  mockCreate.mockResolvedValue({ id: 1, email: 'test@example.com' });
});
```

**Using Test Utilities:**
```javascript
const { mockUser, generateTestToken, mockAuthMiddleware } = require('./setup');
```

## Mobile Tests

### Test Structure
```
mobile/src/
├── components/__tests__/     # Component unit tests
├── screens/__tests__/        # Screen integration tests
├── services/__tests__/       # API service tests
├── __mocks__/               # Manual mocks for native modules
├── jest.setup.js            # Global mocks and setup
└── jest.config.js           # Jest configuration
```

### Key Mocks (jest.setup.js)

- `react-native-reanimated` - Animation mocking
- `@react-native-firebase/messaging` - FCM mocking
- `react-native-localize` - Locale mocking
- `@react-native-async-storage/async-storage` - Storage mocking
- `@react-navigation/native` - Navigation mocking

### Running Specific Tests
```bash
npm test -- --testPathPattern="SettingsScreen"
npm test src/components/__tests__/GoalCard.test.js
```

### Skipped Tests

Some tests are skipped due to environment limitations:

| Test | Reason |
|------|--------|
| Time formatting tests | `toLocaleTimeString` returns different formats in Node vs device |
| Animation interaction tests | Complex Animated.timing mocks required |
| Native module tests | Require device/emulator |

## Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Backend | >80% | ~25% (services: 25%, controllers need tests) |
| Mobile | >40% | ~34% |

## Test Data

### Generate Test Data
```bash
cd backend
npm run generate-test-data -- --email=user@example.com --days=120
```

### Mock Data Factories

**Backend (tests/setup.js):**
```javascript
const mockUser = {
  id: 1,
  dbId: 1,
  email: 'test@example.com',
  tokenType: 'jwt'
};
```

**Mobile (jest.setup.js):**
```javascript
jest.mock('../../services/api', () => ({
  moodAPI: {
    list: jest.fn().mockResolvedValue({ data: [] }),
    stats: jest.fn().mockResolvedValue({ data: { totalEntries: 0 } })
  }
}));
```

## Common Issues

### "Cannot read properties of undefined"
- Check that mocks are defined before `jest.mock()` calls
- Jest hoists `jest.mock()` to top of file - use function references

### "X is not a function"
- Module may need manual mock in `__mocks__/` directory
- Check import path matches mock path exactly

### Async Test Timeout
```javascript
it('async test', async () => {
  await waitFor(() => {
    expect(element).toBeTruthy();
  }, { timeout: 5000 });
});
```

### Native Module Errors
- Add mock to `jest.setup.js`
- Check `moduleNameMapper` in `jest.config.js`

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch

```yaml
# Example GitHub Actions
- name: Run Backend Tests
  run: cd backend && npm test -- --coverage --ci

- name: Run Mobile Tests
  run: cd mobile && npm test -- --coverage --ci
```

## Adding New Tests

1. Create test file matching source: `foo.js` → `__tests__/foo.test.js`
2. Import test utilities from setup
3. Mock external dependencies
4. Follow existing patterns in similar test files
5. Run with coverage to verify new code is tested
