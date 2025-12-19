import { forwardRef } from 'react';
import { format } from 'date-fns';
import {
  getMoodLabel,
  getStressLabel,
  formatMoodRating,
  formatEmotions,
  formatDateRange,
  formatTableDate,
} from '../utils/reportHelpers';

const PrintableReport = forwardRef(({
  patientName,
  sharingTier,
  dateRange,
  summary,
  moodTrends,
  emotions,
  checkins,
  generatedAt,
}, ref) => {
  const totalEmotionCount = emotions?.reduce((sum, e) => sum + e.count, 0) || 0;
  const showNotes = sharingTier === 'full';

  return (
    <div ref={ref} className="printable-report">
      {/* Print-only styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-report,
            .printable-report * {
              visibility: visible;
            }
            .printable-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
          }

          .printable-report {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #2F3E3C;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
          }

          .print-header {
            border-bottom: 3px solid #355F5B;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }

          .print-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }

          .print-logo {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .print-logo-box {
            width: 48px;
            height: 48px;
            background: #355F5B;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }

          .print-brand-name {
            font-size: 24px;
            font-weight: bold;
            color: #355F5B;
            margin: 0;
          }

          .print-brand-tagline {
            font-size: 12px;
            color: #8FA4B3;
            margin: 0;
          }

          .print-meta {
            text-align: right;
            font-size: 11px;
            color: #8FA4B3;
          }

          .print-meta p {
            margin: 2px 0;
          }

          .print-title {
            font-size: 22px;
            font-weight: bold;
            color: #2F3E3C;
            margin: 15px 0 5px;
          }

          .print-subtitle {
            font-size: 14px;
            color: #8FA4B3;
            margin: 0;
          }

          .print-section {
            margin-bottom: 30px;
          }

          .print-section-title {
            font-size: 16px;
            font-weight: bold;
            color: #355F5B;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #EFEAF6;
          }

          .print-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }

          .print-summary-card {
            background: #F7F5F2;
            padding: 15px;
            border-radius: 8px;
          }

          .print-summary-label {
            font-size: 10px;
            color: #8FA4B3;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }

          .print-summary-value {
            font-size: 22px;
            font-weight: bold;
            color: #355F5B;
          }

          .print-summary-subvalue {
            font-size: 11px;
            color: #8FA4B3;
            margin-top: 3px;
          }

          .print-emotion-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .print-emotion-item {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .print-emotion-name {
            width: 100px;
            font-size: 13px;
            text-transform: capitalize;
          }

          .print-emotion-bar-container {
            flex: 1;
            height: 16px;
            background: #EFEAF6;
            border-radius: 8px;
            overflow: hidden;
          }

          .print-emotion-bar {
            height: 100%;
            background: #355F5B;
            border-radius: 8px;
          }

          .print-emotion-percent {
            width: 45px;
            text-align: right;
            font-size: 12px;
            color: #8FA4B3;
          }

          .print-trend-container {
            background: #F7F5F2;
            padding: 20px;
            border-radius: 8px;
          }

          .print-trend-bars {
            display: flex;
            align-items: flex-end;
            height: 80px;
            gap: 4px;
            margin-bottom: 8px;
          }

          .print-trend-bar {
            flex: 1;
            max-width: 30px;
            border-radius: 4px 4px 0 0;
          }

          .print-trend-labels {
            display: flex;
            gap: 4px;
          }

          .print-trend-label {
            flex: 1;
            max-width: 30px;
            text-align: center;
            font-size: 9px;
            color: #8FA4B3;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          .print-table th {
            background: #355F5B;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
          }

          .print-table th:first-child {
            border-radius: 6px 0 0 0;
          }

          .print-table th:last-child {
            border-radius: 0 6px 0 0;
          }

          .print-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #EFEAF6;
          }

          .print-table tr:nth-child(even) {
            background: #F7F5F2;
          }

          .print-table .notes-cell {
            font-size: 11px;
            color: #8FA4B3;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .print-footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #EFEAF6;
            text-align: center;
          }

          .print-footer-text {
            font-size: 11px;
            color: #8FA4B3;
            margin-bottom: 5px;
          }

          .print-footer-disclaimer {
            font-size: 10px;
            color: #8FA4B3;
            font-style: italic;
            max-width: 500px;
            margin: 0 auto;
          }

          .print-empty {
            text-align: center;
            padding: 20px;
            color: #8FA4B3;
            font-style: italic;
          }
        `}
      </style>

      {/* Header */}
      <header className="print-header">
        <div className="print-header-top">
          <div className="print-logo">
            <div className="print-logo-box">S</div>
            <div>
              <h1 className="print-brand-name">SoulBloom</h1>
              <p className="print-brand-tagline">Care Circle Portal</p>
            </div>
          </div>
          <div className="print-meta">
            <p>Generated: {format(generatedAt, 'MMM d, yyyy h:mm a')}</p>
            <p>Access Level: {sharingTier === 'full' ? 'Full Access' : 'Data Only'}</p>
          </div>
        </div>
        <h2 className="print-title">Wellness Report: {patientName}</h2>
        <p className="print-subtitle">
          Report Period: {formatDateRange(dateRange.startDate, dateRange.endDate)}
        </p>
      </header>

      {/* Summary Section */}
      <section className="print-section">
        <h3 className="print-section-title">Summary Overview</h3>
        <div className="print-summary-grid">
          <div className="print-summary-card">
            <div className="print-summary-label">Average Mood</div>
            <div className="print-summary-value">
              {summary?.average_mood_score ? getMoodLabel(summary.average_mood_score) : 'N/A'}
            </div>
            {summary?.average_mood_score && (
              <div className="print-summary-subvalue">Score: {summary.average_mood_score}</div>
            )}
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">Avg Stress</div>
            <div className="print-summary-value">
              {summary?.average_stress_level ? `${summary.average_stress_level}/10` : 'N/A'}
            </div>
            {summary?.average_stress_level && (
              <div className="print-summary-subvalue">
                {getStressLabel(summary.average_stress_level)}
              </div>
            )}
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">Check-ins</div>
            <div className="print-summary-value">{summary?.total_checkins || 0}</div>
            <div className="print-summary-subvalue">This period</div>
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">Streak</div>
            <div className="print-summary-value">{summary?.checkin_streak || 0} days</div>
            <div className="print-summary-subvalue">Current</div>
          </div>
        </div>
      </section>

      {/* Mood Trend Section */}
      <section className="print-section">
        <h3 className="print-section-title">Mood Trend</h3>
        {moodTrends && moodTrends.length > 0 ? (
          <div className="print-trend-container">
            <div className="print-trend-bars">
              {moodTrends.slice(-14).map((item, index) => {
                const mood = parseFloat(item.average_mood) || 0;
                const normalizedHeight = ((mood + 1) / 2) * 100;
                const height = Math.max(5, normalizedHeight);
                const barColor = mood >= 0 ? '#355F5B' : '#F59E0B';

                return (
                  <div
                    key={index}
                    className="print-trend-bar"
                    style={{
                      height: `${height}%`,
                      backgroundColor: barColor,
                    }}
                  />
                );
              })}
            </div>
            <div className="print-trend-labels">
              {moodTrends.slice(-14).map((item, index) => (
                <div key={index} className="print-trend-label">
                  {format(new Date(item.date), 'd')}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="print-empty">No mood trend data available</div>
        )}
      </section>

      {/* Emotion Breakdown Section */}
      <section className="print-section">
        <h3 className="print-section-title">Emotion Breakdown</h3>
        {emotions && emotions.length > 0 ? (
          <div className="print-emotion-list">
            {emotions.slice(0, 6).map((item) => {
              const percentage = totalEmotionCount > 0
                ? Math.round((item.count / totalEmotionCount) * 100)
                : 0;
              return (
                <div key={item.emotion} className="print-emotion-item">
                  <span className="print-emotion-name">{item.emotion}</span>
                  <div className="print-emotion-bar-container">
                    <div
                      className="print-emotion-bar"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="print-emotion-percent">{percentage}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="print-empty">No emotion data available</div>
        )}
      </section>

      {/* Check-in History Table */}
      {checkins && checkins.length > 0 && (
        <section className="print-section page-break">
          <h3 className="print-section-title">Check-in History</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Date</th>
                <th style={{ width: '14%' }}>Mood</th>
                <th style={{ width: '14%' }}>Stress</th>
                <th style={{ width: '24%' }}>Emotions</th>
                <th style={{ width: '30%' }}>{showNotes ? 'Notes' : '—'}</th>
              </tr>
            </thead>
            <tbody>
              {checkins.slice(0, 30).map((checkin, index) => (
                <tr key={checkin.id || index}>
                  <td>{formatTableDate(checkin.created_at || checkin.timestamp)}</td>
                  <td>{formatMoodRating(checkin.mood_rating)}</td>
                  <td>
                    {checkin.stress_level !== null
                      ? `${checkin.stress_level}/10`
                      : 'N/A'}
                  </td>
                  <td>{formatEmotions(checkin.emotions)}</td>
                  <td className="notes-cell">
                    {showNotes
                      ? (checkin.journal_text || checkin.notes || '—')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {checkins.length > 30 && (
            <p className="print-empty">Showing first 30 of {checkins.length} check-ins</p>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="print-footer">
        <p className="print-footer-text">SoulBloom Wellness Report • Confidential</p>
        <p className="print-footer-disclaimer">
          This report is generated from SoulBloom and is not a clinical assessment.
          It should not be used as a substitute for professional medical advice,
          diagnosis, or treatment.
        </p>
      </footer>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;
