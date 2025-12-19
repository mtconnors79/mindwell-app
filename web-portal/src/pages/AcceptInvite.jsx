import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { careCircleAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import {
  HeartIcon,
  EyeIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState(null); // 'accepted' | 'declined' | null

  useEffect(() => {
    fetchInviteDetails();
  }, [token]);

  const fetchInviteDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await careCircleAPI.getInviteDetails(token);
      setInvite(response.data);
    } catch (err) {
      if (err.status === 404) {
        setError('This invitation was not found or has already been used.');
      } else if (err.status === 410) {
        setError(err.data?.message || 'This invitation is no longer valid.');
      } else {
        setError(err.message || 'Failed to load invitation details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await careCircleAPI.acceptInvite(token);
      setStatus('accepted');
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await careCircleAPI.declineInvite(token);
      setStatus('declined');
    } catch (err) {
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const isFullAccess = invite?.sharing_tier === 'full';
  const expiresAt = invite?.expires_at
    ? format(new Date(invite.expires_at), 'MMMM d, yyyy')
    : '';

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading invitation..." />
      </div>
    );
  }

  // Success states
  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            You're Connected!
          </h1>
          <p className="text-text-secondary mb-6">
            You are now part of {invite?.patient_name}'s Care Circle.
            You can view their wellness data from your dashboard.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Go to Dashboard
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
            <XCircleIcon className="h-8 w-8 text-text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Invitation Declined
          </h1>
          <p className="text-text-secondary mb-6">
            You've declined this Care Circle invitation.
            {invite?.patient_name} will be notified.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface text-text-primary font-medium rounded-xl hover:bg-card transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-error" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Invitation Error
          </h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface text-text-primary font-medium rounded-xl hover:bg-card transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-8 bg-white border-b border-surface">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <span className="font-semibold text-primary text-xl">SoulBloom</span>
            <span className="block text-xs text-text-secondary">Care Circle Portal</span>
          </div>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Invitation Card */}
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-8 py-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <HeartIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Care Circle Invitation
              </h1>
              <p className="text-white/80">
                {invite?.patient_name} would like to add you to their Care Circle
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* What this means */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-3">
                  What does this mean?
                </h2>
                <ul className="space-y-3">
                  {invite?.what_this_means?.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <ShieldCheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sharing tier */}
              <div className="bg-surface rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <EyeIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-text-primary">
                    Access Level: {isFullAccess ? 'Full Access' : 'Data Only'}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary">
                  {invite?.sharing_tier_description}
                </p>
              </div>

              {/* Expiration */}
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-8">
                <ClockIcon className="h-4 w-4" />
                <span>This invitation expires on {expiresAt}</span>
              </div>

              {/* Auth check */}
              {!user ? (
                <div className="bg-surface rounded-xl p-6 text-center">
                  <p className="text-text-primary mb-4">
                    Please sign in or create an account to accept this invitation.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/login"
                      state={{ from: { pathname: `/accept/${token}` } }}
                      className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors text-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      state={{ from: { pathname: `/accept/${token}` } }}
                      className="flex-1 py-3 bg-white border border-surface text-text-primary font-semibold rounded-xl hover:bg-surface transition-colors text-center"
                    >
                      Create Account
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        Accept Invitation
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-white border border-surface text-text-secondary font-semibold rounded-xl hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Privacy note */}
          <p className="mt-6 text-center text-sm text-text-secondary">
            By accepting, you agree to keep {invite?.patient_name}'s wellness data private
            and use it only to support their wellbeing.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AcceptInvite;
