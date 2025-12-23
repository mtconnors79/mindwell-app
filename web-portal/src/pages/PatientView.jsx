import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { careCircleAPI } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, subDays } from 'date-fns';

// Lazy load heavy PDF components (only loaded when user clicks Export/Print)
const ExportReport = lazy(() => import('../components/ExportReport'));
const PrintableReport = lazy(() => import('../components/PrintableReport'));
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeftIcon,
  HeartIcon,
  ChartBarIcon,
  CalendarIcon,
  FaceSmileIcon,
  ExclamationCircleIcon,
  ClockIcon,
  FireIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  getDateRangeFromPeriod,
  generateReportFilename,
} from '../utils/reportHelpers';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const moodScoreToLabel = (score) => {
  if (score >= 0.5) return 'Great';
  if (score >= 0) return 'Good';
  if (score >= -0.5) return 'Okay';
  return 'Struggling';
};

const StatCard = ({ icon: Icon, label, value, subValue, color = 'primary' }) => (
  <div className="bg-white rounded-xl p-5 shadow-soft">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
        <Icon className={`h-5 w-5 text-${color}`} />
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
    <p className="text-2xl font-bold text-text-primary">{value}</p>
    {subValue && <p className="text-sm text-text-secondary mt-1">{subValue}</p>}
  </div>
);

const EmotionTag = ({ emotion, count, total }) => {
  const percentage = ((count / total) * 100).toFixed(0);
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface last:border-0">
      <span className="text-text-primary capitalize">{emotion}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-text-secondary w-12 text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const PatientView = () => {
  const { patientId } = useParams();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [checkins, setCheckins] = useState([]);

  // Export states
  const [exportLoading, setExportLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    fetchData();
  }, [patientId, period]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendsRes, checkinsRes] = await Promise.all([
        careCircleAPI.getSharedSummary(patientId),
        careCircleAPI.getSharedTrends(patientId, period),
        careCircleAPI.getSharedCheckins(patientId, { limit: 50 }),
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setCheckins(checkinsRes.data?.checkins || []);
    } catch (err) {
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF and download (dynamically imports @react-pdf/renderer)
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      // Dynamic import of @react-pdf/renderer and ExportReport
      const [{ pdf }, { default: ExportReportComponent }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/ExportReport'),
      ]);

      const dateRange = getDateRangeFromPeriod(period);
      const generatedAt = new Date();

      const doc = (
        <ExportReportComponent
          patientName={summary?.patient_name || 'Unknown'}
          sharingTier={summary?.sharing_tier || 'data_only'}
          dateRange={dateRange}
          summary={summary?.summary}
          moodTrends={summary?.mood_trends}
          emotions={summary?.most_common_emotions}
          checkins={checkins}
          generatedAt={generatedAt}
        />
      );

      const blob = await pdf(doc).toBlob();
      const filename = generateReportFilename(
        summary?.patient_name || 'patient',
        dateRange.startDate,
        dateRange.endDate,
        'pdf'
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Open print dialog
  const handlePrint = () => {
    setPrintLoading(true);
    setShowPrintView(true);

    // Wait for the print view to render, then trigger print
    setTimeout(() => {
      window.print();
      setPrintLoading(false);
      // Keep print view visible for a moment after printing
      setTimeout(() => setShowPrintView(false), 500);
    }, 500);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading wellness data..." />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="bg-white rounded-2xl p-8 text-center shadow-soft">
            <ExclamationCircleIcon className="h-12 w-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Unable to Load Data
            </h2>
            <p className="text-text-secondary mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const avgMood = summary?.summary?.average_mood_score;
  const avgStress = summary?.summary?.average_stress_level;
  const totalCheckins = summary?.summary?.total_checkins || 0;
  const streak = summary?.summary?.checkin_streak || 0;
  const lastCheckin = summary?.summary?.last_checkin_date
    ? format(new Date(summary.summary.last_checkin_date), 'MMM d, yyyy')
    : 'No check-ins yet';

  // Prepare chart data
  const moodChartData = summary?.mood_trends?.map((item) => ({
    date: format(new Date(item.date), 'MMM d'),
    mood: parseFloat(item.average_mood) || 0,
  })) || [];

  const stressChartData = summary?.stress_trends?.map((item) => ({
    date: format(new Date(item.date), 'MMM d'),
    stress: parseFloat(item.average_stress) || 0,
  })) || [];

  const emotions = summary?.most_common_emotions || [];
  const totalEmotionCount = emotions.reduce((sum, e) => sum + e.count, 0);

  // Data for print/export
  const dateRange = getDateRangeFromPeriod(period);

  return (
    <>
      <Layout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-text-secondary hover:text-primary mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <HeartIcon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {summary?.patient_name}'s Wellness
                  </h1>
                  <p className="text-text-secondary">
                    {summary?.sharing_tier === 'full' ? 'Full Access' : 'Data Only'} View
                  </p>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Period selector */}
                <div className="flex gap-2">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPeriod(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        period === option.value
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-secondary hover:bg-card'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-surface" />

                {/* Export buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface rounded-lg text-sm font-medium text-text-primary hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Export PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrint}
                    disabled={printLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface rounded-lg text-sm font-medium text-text-primary hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {printLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <PrinterIcon className="h-4 w-4" />
                        <span>Print</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={FaceSmileIcon}
              label="Average Mood"
              value={avgMood ? moodScoreToLabel(parseFloat(avgMood)) : 'N/A'}
              subValue={avgMood ? `Score: ${avgMood}` : undefined}
            />
            <StatCard
              icon={ChartBarIcon}
              label="Average Stress"
              value={avgStress ? `${avgStress}/10` : 'N/A'}
            />
            <StatCard
              icon={CalendarIcon}
              label="Total Check-ins"
              value={totalCheckins}
              subValue="This period"
            />
            <StatCard
              icon={FireIcon}
              label="Current Streak"
              value={`${streak} day${streak !== 1 ? 's' : ''}`}
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Mood Trend Chart */}
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Mood Trend
              </h3>
              {moodChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEAF6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#8FA4B3' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[-1, 1]}
                      tick={{ fontSize: 12, fill: '#8FA4B3' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #EFEAF6',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#355F5B"
                      strokeWidth={2}
                      dot={{ fill: '#355F5B', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-text-secondary">
                  No mood data available
                </div>
              )}
            </div>

            {/* Stress Trend Chart */}
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Stress Level Trend
              </h3>
              {stressChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stressChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEAF6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#8FA4B3' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 12, fill: '#8FA4B3' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #EFEAF6',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="stress"
                      fill="#C6B7D8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-text-secondary">
                  No stress data available
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Common Emotions */}
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Most Common Emotions
              </h3>
              {emotions.length > 0 ? (
                <div className="space-y-1">
                  {emotions.slice(0, 5).map((emotion) => (
                    <EmotionTag
                      key={emotion.emotion}
                      emotion={emotion.emotion}
                      count={emotion.count}
                      total={totalEmotionCount}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-center py-8">
                  No emotion data available
                </p>
              )}
            </div>

            {/* Last Activity */}
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Activity Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-primary" />
                    <span className="text-text-primary">Last Check-in</span>
                  </div>
                  <span className="text-text-secondary">{lastCheckin}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <span className="text-text-primary">Data Period</span>
                  </div>
                  <span className="text-text-secondary">
                    {summary?.period?.days || 30} days
                  </span>
                </div>
                {trends?.overview && (
                  <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div className="flex items-center gap-3">
                      <ChartBarIcon className="h-5 w-5 text-primary" />
                      <span className="text-text-primary">Weeks Analyzed</span>
                    </div>
                    <span className="text-text-secondary">
                      {trends.overview.weeks_analyzed}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-8 p-4 bg-surface rounded-xl">
            <p className="text-sm text-text-secondary text-center">
              This data is shared with you to help support {summary?.patient_name}'s wellness journey.
              Please keep this information private and confidential.
            </p>
          </div>
        </div>
      </Layout>

      {/* Hidden printable report (rendered when printing, lazy loaded) */}
      {showPrintView && (
        <Suspense fallback={<div className="print-loading">Preparing print view...</div>}>
          <PrintableReport
            ref={printRef}
            patientName={summary?.patient_name || 'Unknown'}
            sharingTier={summary?.sharing_tier || 'data_only'}
            dateRange={dateRange}
            summary={summary?.summary}
            moodTrends={summary?.mood_trends}
            emotions={summary?.most_common_emotions}
            checkins={checkins}
            generatedAt={new Date()}
          />
        </Suspense>
      )}
    </>
  );
};

export default PatientView;
