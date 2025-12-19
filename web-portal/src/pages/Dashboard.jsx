import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { careCircleAPI } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import {
  UserGroupIcon,
  HeartIcon,
  ChartBarIcon,
  EyeIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const TierBadge = ({ tier }) => {
  const isFullAccess = tier === 'full';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
        isFullAccess
          ? 'bg-primary/10 text-primary'
          : 'bg-surface text-text-secondary'
      }`}
    >
      <EyeIcon className="h-3 w-3" />
      {isFullAccess ? 'Full Access' : 'Data Only'}
    </span>
  );
};

const ConnectionCard = ({ connection, type }) => {
  const isPatientConnection = type === 'patient';
  const name = isPatientConnection
    ? connection.trusted_name || connection.trusted_email
    : connection.patient_name;

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    declined: 'bg-red-100 text-red-700',
    revoked: 'bg-gray-100 text-gray-600',
  };

  const formattedDate = connection.accepted_at
    ? format(new Date(connection.accepted_at), 'MMM d, yyyy')
    : connection.invited_at
    ? format(new Date(connection.invited_at), 'MMM d, yyyy')
    : '';

  // Only trusted person connections are viewable
  const isViewable = !isPatientConnection && connection.status === 'active';

  const CardWrapper = isViewable ? Link : 'div';
  const cardProps = isViewable
    ? { to: `/patient/${connection.patient_user_id}` }
    : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`block bg-white rounded-xl p-5 shadow-soft border border-surface transition-all ${
        isViewable ? 'hover:shadow-medium hover:border-primary/20 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isPatientConnection ? 'bg-accent' : 'bg-primary/10'
          }`}
        >
          {isPatientConnection ? (
            <UserGroupIcon className="h-6 w-6 text-primary" />
          ) : (
            <HeartIcon className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary truncate">{name}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                statusColors[connection.status]
              }`}
            >
              {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <TierBadge tier={connection.sharing_tier} />
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          </div>
          {isPatientConnection && connection.status === 'pending' && (
            <p className="mt-2 text-sm text-text-secondary">
              Waiting for response...
            </p>
          )}
        </div>
        {isViewable && (
          <ArrowRightIcon className="h-5 w-5 text-text-secondary" />
        )}
      </div>
    </CardWrapper>
  );
};

const EmptyState = () => (
  <div className="bg-white rounded-2xl p-12 text-center shadow-soft">
    <div className="w-20 h-20 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
      <UserGroupIcon className="h-10 w-10 text-accent" />
    </div>
    <h3 className="text-xl font-semibold text-text-primary mb-2">
      No Care Circle Connections Yet
    </h3>
    <p className="text-text-secondary max-w-sm mx-auto">
      When someone shares their wellness data with you, their profile will appear here.
      You can then view their mood trends and support their journey.
    </p>
  </div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState({
    asPatient: [],
    asTrustedPerson: [],
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await careCircleAPI.getConnections();
      setConnections({
        asPatient: response.data?.asPatient || [],
        asTrustedPerson: response.data?.asTrustedPerson || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const activeConnections = connections.asTrustedPerson.filter(
    (c) => c.status === 'active'
  );
  const myInvitations = connections.asPatient;
  const hasNoConnections =
    connections.asPatient.length === 0 && connections.asTrustedPerson.length === 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading your Care Circle..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Care Circle Dashboard</h1>
          <p className="text-text-secondary mt-1">
            View and support the people who share their wellness journey with you
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <ExclamationCircleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-error">{error}</p>
              <button
                onClick={fetchConnections}
                className="text-sm text-primary hover:underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {hasNoConnections ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {/* People Sharing With Me */}
            {activeConnections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <HeartIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-text-primary">
                    People Sharing With You
                  </h2>
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                    {activeConnections.length}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Click on a person to view their wellness data
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeConnections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      type="trusted"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* My Invitations (as patient) */}
            {myInvitations.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserGroupIcon className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold text-text-primary">
                    Your Trusted People
                  </h2>
                  <span className="bg-accent/20 text-primary text-xs font-medium px-2 py-1 rounded-full">
                    {myInvitations.length}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  People you've invited to view your wellness data
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myInvitations.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      type="patient"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Stats Summary */}
        {!hasNoConnections && (
          <div className="mt-8 p-6 bg-surface rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-text-primary">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {activeConnections.length}
                </p>
                <p className="text-sm text-text-secondary">Sharing with you</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {myInvitations.filter((c) => c.status === 'active').length}
                </p>
                <p className="text-sm text-text-secondary">Your trusted people</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-warning">
                  {myInvitations.filter((c) => c.status === 'pending').length}
                </p>
                <p className="text-sm text-text-secondary">Pending invites</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success">
                  {connections.asPatient.length + connections.asTrustedPerson.length}
                </p>
                <p className="text-sm text-text-secondary">Total connections</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
