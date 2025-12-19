const nodemailer = require('nodemailer');

// SoulBloom brand colors
const BRAND_COLORS = {
  primary: '#355F5B',
  background: '#F7F5F2',
  surface: '#EFEAF6',
  textPrimary: '#2F3E3C',
  textSecondary: '#8FA4B3',
  accent: '#C6B7D8',
  success: '#AFC8C5',
  white: '#FFFFFF'
};

// Check if email is configured
const isEmailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Create transporter based on environment
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (isEmailConfigured()) {
    // Production/configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    try {
      await transporter.verify();
      console.log('Email service connected to SMTP server');
    } catch (error) {
      console.error('Email service SMTP verification failed:', error.message);
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Development mode: create ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Email service using Ethereal test account:', testAccount.user);
    } catch (error) {
      console.log('Email service: Ethereal unavailable, will log emails to console');
      transporter = null;
    }
  }

  return transporter;
};

// Get sender info
const getSender = () => {
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@soulbloom.app';
  const fromName = process.env.SMTP_FROM_NAME || 'SoulBloom';
  return `"${fromName}" <${fromEmail}>`;
};

// Get app URLs
const getAppUrl = () => process.env.APP_URL || 'http://localhost:3000';
const getWebPortalUrl = () => process.env.WEB_PORTAL_URL || process.env.APP_URL || 'http://localhost:3000';

// Base email template
const getEmailTemplate = ({ title, preheader, content, ctaButton, footerText }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button {padding: 12px 24px !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BRAND_COLORS.background}; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader || ''}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; padding: 32px 40px; text-align: center;">
              <!-- Logo placeholder -->
              <div style="width: 48px; height: 48px; margin: 0 auto 12px; background-color: ${BRAND_COLORS.white}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; color: ${BRAND_COLORS.primary}; font-weight: bold;">S</span>
              </div>
              <h1 style="margin: 0; color: ${BRAND_COLORS.white}; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">SoulBloom</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}

              ${ctaButton ? `
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaButton.url}" target="_blank" style="display: inline-block; padding: 16px 32px; background-color: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.white}; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">
                      ${ctaButton.text}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${BRAND_COLORS.surface}; border-top: 1px solid ${BRAND_COLORS.accent};">
              <p style="margin: 0 0 12px; color: ${BRAND_COLORS.textSecondary}; font-size: 13px; line-height: 1.6; text-align: center;">
                ${footerText || 'This email was sent by SoulBloom, your mental wellness companion.'}
              </p>
              <p style="margin: 0; color: ${BRAND_COLORS.textSecondary}; font-size: 12px; text-align: center;">
                If you did not expect this email, you can safely ignore it.
                <br>
                <a href="${getWebPortalUrl()}/unsubscribe" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">Unsubscribe from notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Plain text template generator
const getPlainTextTemplate = ({ greeting, body, ctaText, ctaUrl, footer }) => {
  let text = `${greeting}\n\n${body}`;
  if (ctaText && ctaUrl) {
    text += `\n\n${ctaText}: ${ctaUrl}`;
  }
  if (footer) {
    text += `\n\n---\n${footer}`;
  }
  text += '\n\nSoulBloom - Your Mental Wellness Companion';
  return text;
};

// Format sharing tier for display
const formatSharingTier = (tier) => {
  if (tier === 'full') {
    return {
      name: 'Full Access',
      description: 'You will be able to see mood scores, stress levels, emotions, and check-in journal entries.'
    };
  }
  return {
    name: 'Data Only',
    description: 'You will be able to see mood scores, stress levels, and emotions, but not personal journal entries.'
  };
};

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Send email (with console fallback in development)
 */
const sendEmail = async (mailOptions) => {
  const transport = await getTransporter();

  if (!transport) {
    // Console fallback
    console.log('\n========== EMAIL (Console Mode) ==========');
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    console.log('-------------------------------------------');
    console.log('TEXT:', mailOptions.text?.substring(0, 500) + '...');
    console.log('===========================================\n');
    return { messageId: 'console-' + Date.now(), consoleMode: true };
  }

  const result = await transport.sendMail({
    from: getSender(),
    ...mailOptions
  });

  // Log preview URL for Ethereal
  if (result.messageId && process.env.NODE_ENV === 'development') {
    const previewUrl = nodemailer.getTestMessageUrl(result);
    if (previewUrl) {
      console.log('Email preview URL:', previewUrl);
    }
  }

  return result;
};

/**
 * Send Care Circle invitation email
 */
const sendCareCircleInvite = async (options) => {
  const { toEmail, patientName, inviteToken, sharingTier, expiresAt, trustedName } = options;

  const tierInfo = formatSharingTier(sharingTier);
  const acceptUrl = `${getWebPortalUrl()}/care-circle/accept/${inviteToken}`;
  const expirationDate = formatDate(expiresAt);
  const greeting = trustedName ? `Hi ${trustedName}` : 'Hello';

  const content = `
    <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
      ${greeting},
    </h2>

    <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
      <strong>${patientName}</strong> has invited you to join their Care Circle on SoulBloom.
    </p>

    <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: ${BRAND_COLORS.primary}; font-size: 16px; font-weight: 600;">
        What is Care Circle?
      </h3>
      <p style="margin: 0; color: ${BRAND_COLORS.textPrimary}; font-size: 14px; line-height: 1.6;">
        Care Circle is a feature that allows someone you trust to view your mental wellness data.
        It helps loved ones stay connected and supportive, especially during challenging times.
      </p>
    </div>

    <div style="background-color: ${BRAND_COLORS.background}; border-left: 4px solid ${BRAND_COLORS.primary}; padding: 16px 20px; margin: 24px 0;">
      <h4 style="margin: 0 0 8px; color: ${BRAND_COLORS.textPrimary}; font-size: 14px; font-weight: 600;">
        Access Level: ${tierInfo.name}
      </h4>
      <p style="margin: 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px; line-height: 1.5;">
        ${tierInfo.description}
      </p>
    </div>

    <p style="margin: 24px 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
      By accepting this invitation, you'll be able to:
    </p>
    <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.8;">
      <li>View ${patientName}'s mood trends and patterns</li>
      <li>See stress levels and emotional check-ins</li>
      <li>Receive insights to better support their wellness journey</li>
    </ul>

    <div style="background-color: #FFF8E7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #8B6914; font-size: 14px; line-height: 1.5;">
        <strong>Important:</strong> If you weren't expecting this invitation or are unsure,
        please verify directly with ${patientName} before accepting.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
      This invitation expires on <strong>${expirationDate}</strong>.
    </p>
  `;

  const plainText = getPlainTextTemplate({
    greeting: `${greeting},`,
    body: `${patientName} has invited you to join their Care Circle on SoulBloom.

Care Circle allows trusted people to view mental wellness data, helping loved ones stay connected and supportive.

Access Level: ${tierInfo.name}
${tierInfo.description}

By accepting, you'll be able to view ${patientName}'s mood trends, stress levels, and emotional check-ins.

IMPORTANT: If you weren't expecting this invitation, please verify with ${patientName} before accepting.

This invitation expires on ${expirationDate}.`,
    ctaText: 'Accept Invitation',
    ctaUrl: acceptUrl,
    footer: 'If you do not wish to accept, you can simply ignore this email or click decline in the link above.'
  });

  return sendEmail({
    to: toEmail,
    subject: `${patientName} invited you to their Care Circle`,
    text: plainText,
    html: getEmailTemplate({
      title: 'Care Circle Invitation',
      preheader: `${patientName} wants you to be part of their wellness support network`,
      content,
      ctaButton: {
        text: 'Accept Invitation',
        url: acceptUrl
      },
      footerText: 'You received this email because someone invited you to their Care Circle on SoulBloom.'
    })
  });
};

/**
 * Send notification to patient when invitation is accepted
 */
const sendCareCircleAccepted = async (options) => {
  const { toEmail, patientName, trustedPersonName, trustedPersonEmail } = options;

  const dashboardUrl = `${getWebPortalUrl()}/care-circle`;

  const content = `
    <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
      Great news, ${patientName}!
    </h2>

    <div style="text-align: center; padding: 24px 0;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${BRAND_COLORS.success}; border-radius: 50%; line-height: 64px;">
        <span style="font-size: 32px;">&#10003;</span>
      </div>
    </div>

    <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6; text-align: center;">
      <strong>${trustedPersonName || trustedPersonEmail}</strong> has accepted your Care Circle invitation!
    </p>

    <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">
        They can now view your wellness data based on the sharing settings you configured.
        You can manage their access level or revoke access at any time from your Care Circle settings.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px; text-align: center;">
      Having trusted people in your Care Circle can make a real difference in your wellness journey.
    </p>
  `;

  const plainText = getPlainTextTemplate({
    greeting: `Great news, ${patientName}!`,
    body: `${trustedPersonName || trustedPersonEmail} has accepted your Care Circle invitation!

They can now view your wellness data based on the sharing settings you configured. You can manage their access level or revoke access at any time from your Care Circle settings.

Having trusted people in your Care Circle can make a real difference in your wellness journey.`,
    ctaText: 'View Care Circle',
    ctaUrl: dashboardUrl
  });

  return sendEmail({
    to: toEmail,
    subject: `${trustedPersonName || 'Someone'} joined your Care Circle!`,
    text: plainText,
    html: getEmailTemplate({
      title: 'Care Circle Invitation Accepted',
      preheader: `${trustedPersonName || trustedPersonEmail} is now part of your support network`,
      content,
      ctaButton: {
        text: 'View Care Circle',
        url: dashboardUrl
      }
    })
  });
};

/**
 * Send notification to patient when invitation is declined
 */
const sendCareCircleDeclined = async (options) => {
  const { toEmail, patientName, trustedPersonEmail, trustedPersonName } = options;

  const inviteUrl = `${getWebPortalUrl()}/care-circle/invite`;
  const displayName = trustedPersonName || trustedPersonEmail;

  const content = `
    <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
      Hi ${patientName},
    </h2>

    <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
      We wanted to let you know that <strong>${displayName}</strong> has declined your Care Circle invitation.
    </p>

    <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">
        Everyone has their own comfort level with sharing wellness data, and that's completely okay.
        This doesn't affect your relationship outside of SoulBloom.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
      You can always invite someone else to your Care Circle, or reach out to ${displayName} directly
      if you'd like to discuss it.
    </p>
  `;

  const plainText = getPlainTextTemplate({
    greeting: `Hi ${patientName},`,
    body: `We wanted to let you know that ${displayName} has declined your Care Circle invitation.

Everyone has their own comfort level with sharing wellness data, and that's completely okay. This doesn't affect your relationship outside of SoulBloom.

You can always invite someone else to your Care Circle, or reach out to ${displayName} directly if you'd like to discuss it.`,
    ctaText: 'Invite Someone Else',
    ctaUrl: inviteUrl
  });

  return sendEmail({
    to: toEmail,
    subject: 'Care Circle invitation update',
    text: plainText,
    html: getEmailTemplate({
      title: 'Care Circle Update',
      preheader: 'An update about your Care Circle invitation',
      content,
      ctaButton: {
        text: 'Invite Someone Else',
        url: inviteUrl
      }
    })
  });
};

/**
 * Send notification when connection is revoked
 */
const sendCareCircleRevoked = async (options) => {
  const { toEmail, recipientName, otherPartyName, revokedBy, wasPatient } = options;

  const settingsUrl = `${getWebPortalUrl()}/care-circle`;

  let content;
  let subject;

  if (wasPatient) {
    // Email to trusted person: patient revoked their access
    subject = 'Care Circle access has been removed';
    content = `
      <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
        Hi ${recipientName},
      </h2>

      <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
        <strong>${otherPartyName}</strong> has removed you from their Care Circle.
      </p>

      <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">
          You no longer have access to their wellness data. This may be for personal reasons, and
          it's a normal part of managing one's privacy and boundaries.
        </p>
      </div>

      <p style="margin: 24px 0 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
        If you have questions, we encourage you to reach out to ${otherPartyName} directly.
      </p>
    `;
  } else {
    // Email to patient: trusted person left their Care Circle
    subject = `${otherPartyName} left your Care Circle`;
    content = `
      <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
        Hi ${recipientName},
      </h2>

      <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
        <strong>${otherPartyName}</strong> has left your Care Circle and no longer has access to your wellness data.
      </p>

      <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">
          People may choose to step back for various reasons. Your data is still safe and secure,
          and you can invite others to your Care Circle whenever you're ready.
        </p>
      </div>
    `;
  }

  const plainText = wasPatient
    ? getPlainTextTemplate({
        greeting: `Hi ${recipientName},`,
        body: `${otherPartyName} has removed you from their Care Circle.

You no longer have access to their wellness data. This may be for personal reasons, and it's a normal part of managing one's privacy and boundaries.

If you have questions, we encourage you to reach out to ${otherPartyName} directly.`
      })
    : getPlainTextTemplate({
        greeting: `Hi ${recipientName},`,
        body: `${otherPartyName} has left your Care Circle and no longer has access to your wellness data.

People may choose to step back for various reasons. Your data is still safe and secure, and you can invite others to your Care Circle whenever you're ready.`,
        ctaText: 'Manage Care Circle',
        ctaUrl: settingsUrl
      });

  return sendEmail({
    to: toEmail,
    subject,
    text: plainText,
    html: getEmailTemplate({
      title: 'Care Circle Update',
      preheader: wasPatient
        ? 'Your Care Circle access has been updated'
        : 'Someone has left your Care Circle',
      content,
      ctaButton: wasPatient ? null : {
        text: 'Manage Care Circle',
        url: settingsUrl
      }
    })
  });
};

/**
 * Send reminder email for pending invitation
 */
const sendCareCircleInviteReminder = async (options) => {
  const { toEmail, patientName, inviteToken, sharingTier, expiresAt, trustedName, daysLeft } = options;

  const tierInfo = formatSharingTier(sharingTier);
  const acceptUrl = `${getWebPortalUrl()}/care-circle/accept/${inviteToken}`;
  const greeting = trustedName ? `Hi ${trustedName}` : 'Hello';

  const content = `
    <h2 style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 22px; font-weight: 600;">
      ${greeting},
    </h2>

    <p style="margin: 0 0 16px; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
      This is a friendly reminder that <strong>${patientName}</strong>'s Care Circle invitation is waiting for you.
    </p>

    <div style="background-color: #FFF8E7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; color: #8B6914; font-size: 16px; font-weight: 600;">
        This invitation expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
      </p>
    </div>

    <div style="background-color: ${BRAND_COLORS.surface}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h4 style="margin: 0 0 8px; color: ${BRAND_COLORS.textPrimary}; font-size: 14px; font-weight: 600;">
        Access Level: ${tierInfo.name}
      </h4>
      <p style="margin: 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px; line-height: 1.5;">
        ${tierInfo.description}
      </p>
    </div>

    <p style="margin: 24px 0 0; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
      If you're not interested, you can safely ignore this email and the invitation will expire automatically.
    </p>
  `;

  const plainText = getPlainTextTemplate({
    greeting: `${greeting},`,
    body: `This is a friendly reminder that ${patientName}'s Care Circle invitation is waiting for you.

This invitation expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.

Access Level: ${tierInfo.name}
${tierInfo.description}

If you're not interested, you can safely ignore this email and the invitation will expire automatically.`,
    ctaText: 'View Invitation',
    ctaUrl: acceptUrl
  });

  return sendEmail({
    to: toEmail,
    subject: `Reminder: ${patientName}'s Care Circle invitation`,
    text: plainText,
    html: getEmailTemplate({
      title: 'Care Circle Invitation Reminder',
      preheader: `Your invitation from ${patientName} expires soon`,
      content,
      ctaButton: {
        text: 'View Invitation',
        url: acceptUrl
      },
      footerText: 'You received this reminder because you have a pending Care Circle invitation.'
    })
  });
};

module.exports = {
  sendCareCircleInvite,
  sendCareCircleAccepted,
  sendCareCircleDeclined,
  sendCareCircleRevoked,
  sendCareCircleInviteReminder,
  isEmailConfigured
};
