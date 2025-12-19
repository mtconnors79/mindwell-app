import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import {
  getMoodLabel,
  getMoodColor,
  getStressLabel,
  formatMoodRating,
  formatEmotions,
  formatDateRange,
  formatTableDate,
} from '../utils/reportHelpers';

// Register font (using system fonts for simplicity)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

// SoulBloom colors
const colors = {
  primary: '#355F5B',
  primaryLight: '#4A7A75',
  background: '#F7F5F2',
  surface: '#EFEAF6',
  card: '#D8D1E6',
  textPrimary: '#2F3E3C',
  textSecondary: '#8FA4B3',
  accent: '#C6B7D8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  // Header
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  brandTagline: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  headerMeta: {
    textAlign: 'right',
  },
  headerMetaText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Section styles
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },

  // Summary cards
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '23%',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summarySubvalue: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Emotion breakdown
  emotionList: {
    marginTop: 8,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionName: {
    width: 80,
    fontSize: 10,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  emotionBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: 6,
    marginRight: 10,
  },
  emotionBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  emotionPercent: {
    width: 35,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'right',
  },

  // Table styles
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 9,
    color: colors.textPrimary,
  },
  tableCellSmall: {
    fontSize: 8,
    color: colors.textSecondary,
  },

  // Column widths for check-in table
  colDate: { width: '18%' },
  colMood: { width: '14%' },
  colStress: { width: '14%' },
  colEmotions: { width: '24%' },
  colNotes: { width: '30%' },

  // Mood trend mini chart (simplified representation)
  trendContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 8,
  },
  trendBar: {
    width: 20,
    marginRight: 4,
    borderRadius: 3,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  trendLabel: {
    width: 24,
    fontSize: 7,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 3,
  },
  footerDisclaimer: {
    fontSize: 7,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: colors.textSecondary,
  },

  // Empty state
  emptyText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },

  // Notes text (for full tier)
  notesText: {
    fontSize: 8,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
});

// Summary Card Component
const SummaryCard = ({ label, value, subvalue }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
    {subvalue && <Text style={styles.summarySubvalue}>{subvalue}</Text>}
  </View>
);

// Emotion Bar Component
const EmotionBar = ({ emotion, count, total }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.emotionItem}>
      <Text style={styles.emotionName}>{emotion}</Text>
      <View style={styles.emotionBarContainer}>
        <View style={[styles.emotionBar, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.emotionPercent}>{percentage}%</Text>
    </View>
  );
};

// Mood Trend Visual (simplified bar chart representation)
const MoodTrendChart = ({ moodTrends }) => {
  if (!moodTrends || moodTrends.length === 0) {
    return <Text style={styles.emptyText}>No mood trend data available</Text>;
  }

  // Take last 14 days max for display
  const displayData = moodTrends.slice(-14);

  return (
    <View style={styles.trendContainer}>
      <View style={styles.trendRow}>
        {displayData.map((item, index) => {
          const mood = parseFloat(item.average_mood) || 0;
          // Normalize from -1 to 1 range to 0 to 100% height
          const normalizedHeight = ((mood + 1) / 2) * 100;
          const height = Math.max(5, normalizedHeight);
          const barColor = mood >= 0 ? colors.primary : colors.warning;

          return (
            <View
              key={index}
              style={[
                styles.trendBar,
                {
                  height: `${height}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.trendLabels}>
        {displayData.map((item, index) => {
          const date = new Date(item.date);
          return (
            <Text key={index} style={styles.trendLabel}>
              {format(date, 'd')}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

// Check-in Table Row
const CheckinRow = ({ checkin, isAlt, sharingTier }) => {
  const showNotes = sharingTier === 'full';

  return (
    <View style={[styles.tableRow, isAlt && styles.tableRowAlt]}>
      <View style={styles.colDate}>
        <Text style={styles.tableCell}>
          {formatTableDate(checkin.created_at || checkin.timestamp)}
        </Text>
      </View>
      <View style={styles.colMood}>
        <Text style={styles.tableCell}>
          {formatMoodRating(checkin.mood_rating)}
        </Text>
      </View>
      <View style={styles.colStress}>
        <Text style={styles.tableCell}>
          {checkin.stress_level !== null ? `${checkin.stress_level}/10` : 'N/A'}
        </Text>
      </View>
      <View style={styles.colEmotions}>
        <Text style={styles.tableCellSmall}>
          {formatEmotions(checkin.emotions)}
        </Text>
      </View>
      <View style={styles.colNotes}>
        {showNotes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {checkin.journal_text || checkin.notes || '-'}
          </Text>
        ) : (
          <Text style={styles.tableCellSmall}>—</Text>
        )}
      </View>
    </View>
  );
};

// Main Export Report Document
const ExportReport = ({
  patientName,
  sharingTier,
  dateRange,
  summary,
  moodTrends,
  emotions,
  checkins,
  generatedAt,
}) => {
  const totalEmotionCount = emotions?.reduce((sum, e) => sum + e.count, 0) || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logo}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>S</Text>
              </View>
              <View>
                <Text style={styles.brandName}>SoulBloom</Text>
                <Text style={styles.brandTagline}>Care Circle Portal</Text>
              </View>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.headerMetaText}>
                Generated: {format(generatedAt, 'MMM d, yyyy h:mm a')}
              </Text>
              <Text style={styles.headerMetaText}>
                Access Level: {sharingTier === 'full' ? 'Full Access' : 'Data Only'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>Wellness Report: {patientName}</Text>
          <Text style={styles.subtitle}>
            Report Period: {formatDateRange(dateRange.startDate, dateRange.endDate)}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Overview</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Average Mood"
              value={summary?.average_mood_score ? getMoodLabel(summary.average_mood_score) : 'N/A'}
              subvalue={summary?.average_mood_score ? `Score: ${summary.average_mood_score}` : null}
            />
            <SummaryCard
              label="Avg Stress"
              value={summary?.average_stress_level ? `${summary.average_stress_level}/10` : 'N/A'}
              subvalue={summary?.average_stress_level ? getStressLabel(summary.average_stress_level) : null}
            />
            <SummaryCard
              label="Check-ins"
              value={summary?.total_checkins || 0}
              subvalue="This period"
            />
            <SummaryCard
              label="Streak"
              value={`${summary?.checkin_streak || 0} days`}
              subvalue="Current"
            />
          </View>
        </View>

        {/* Mood Trend Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Trend</Text>
          <MoodTrendChart moodTrends={moodTrends} />
        </View>

        {/* Emotion Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
          {emotions && emotions.length > 0 ? (
            <View style={styles.emotionList}>
              {emotions.slice(0, 6).map((item) => (
                <EmotionBar
                  key={item.emotion}
                  emotion={item.emotion}
                  count={item.count}
                  total={totalEmotionCount}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No emotion data available</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SoulBloom Wellness Report • Confidential
          </Text>
          <Text style={styles.footerDisclaimer}>
            This report is generated from SoulBloom and is not a clinical assessment.
            It should not be used as a substitute for professional medical advice,
            diagnosis, or treatment.
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>

      {/* Check-in History Page */}
      {checkins && checkins.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-in History</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={styles.colDate}>
                  <Text style={styles.tableHeaderCell}>Date</Text>
                </View>
                <View style={styles.colMood}>
                  <Text style={styles.tableHeaderCell}>Mood</Text>
                </View>
                <View style={styles.colStress}>
                  <Text style={styles.tableHeaderCell}>Stress</Text>
                </View>
                <View style={styles.colEmotions}>
                  <Text style={styles.tableHeaderCell}>Emotions</Text>
                </View>
                <View style={styles.colNotes}>
                  <Text style={styles.tableHeaderCell}>
                    {sharingTier === 'full' ? 'Notes' : '—'}
                  </Text>
                </View>
              </View>

              {/* Table Rows */}
              {checkins.slice(0, 25).map((checkin, index) => (
                <CheckinRow
                  key={checkin.id || index}
                  checkin={checkin}
                  isAlt={index % 2 === 1}
                  sharingTier={sharingTier}
                />
              ))}
            </View>

            {checkins.length > 25 && (
              <Text style={[styles.emptyText, { marginTop: 10 }]}>
                Showing first 25 of {checkins.length} check-ins
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SoulBloom Wellness Report • Confidential
            </Text>
            <Text style={styles.footerDisclaimer}>
              This report is generated from SoulBloom and is not a clinical assessment.
            </Text>
          </View>

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </Page>
      )}
    </Document>
  );
};

export default ExportReport;
