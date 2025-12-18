const { EmergencyContact, User } = require('../models');
const { Op } = require('sequelize');

// Generate confirmation URL
const getConfirmationUrl = (token) => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/api/emergency-contacts/confirm/${token}`;
};

const createContact = async (req, res) => {
  try {
    const { name, phone, relationship, is_primary } = req.body;
    const user_id = req.user.dbId;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'name and phone are required'
      });
    }

    // Generate unique token
    const confirmation_token = EmergencyContact.generateToken();

    // Token expires in 14 days
    const token_expires_at = new Date();
    token_expires_at.setDate(token_expires_at.getDate() + 14);

    // If setting as primary, unset other primaries first
    if (is_primary) {
      await EmergencyContact.update(
        { is_primary: false },
        { where: { user_id } }
      );
    }

    const contact = await EmergencyContact.create({
      user_id,
      name,
      phone,
      relationship: relationship || null,
      status: 'pending',
      confirmation_token,
      token_expires_at,
      is_primary: is_primary || false
    });

    // Get user info for the confirmation link message
    const user = await User.findByPk(user_id);
    const userName = user?.name || user?.email?.split('@')[0] || 'Someone';

    res.status(201).json({
      message: 'Emergency contact created successfully',
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        status: contact.status,
        is_primary: contact.is_primary,
        created_at: contact.created_at
      },
      confirmation_url: getConfirmationUrl(confirmation_token),
      sms_message: `${userName} added you as a support contact on SoulBloom. Unsure? Verify with them first. Not spam: ${getConfirmationUrl(confirmation_token)}`
    });
  } catch (error) {
    console.error('Create contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create emergency contact'
    });
  }
};

const getContacts = async (req, res) => {
  try {
    const user_id = req.user.dbId;

    // First, expire any old tokens
    await EmergencyContact.expireOldTokens();

    const contacts = await EmergencyContact.findAll({
      where: { user_id },
      attributes: ['id', 'name', 'phone', 'relationship', 'status', 'is_primary', 'created_at', 'updated_at'],
      order: [
        ['is_primary', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    // Check if user has an active primary contact
    const hasActivePrimary = contacts.some(c => c.status === 'active' && c.is_primary);

    res.json({
      contacts,
      hasActivePrimary
    });
  } catch (error) {
    console.error('Get contacts error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch emergency contacts'
    });
  }
};

const getContact = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const contact = await EmergencyContact.findOne({
      where: { id, user_id },
      attributes: ['id', 'name', 'phone', 'relationship', 'status', 'is_primary', 'created_at', 'updated_at']
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Emergency contact not found'
      });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Get contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch emergency contact'
    });
  }
};

const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;
    const { name, phone, relationship, is_primary } = req.body;

    const contact = await EmergencyContact.findOne({
      where: { id, user_id }
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Emergency contact not found'
      });
    }

    // If setting as primary, unset other primaries first
    if (is_primary && !contact.is_primary) {
      await EmergencyContact.update(
        { is_primary: false },
        { where: { user_id } }
      );
    }

    await contact.update({
      name: name ?? contact.name,
      phone: phone ?? contact.phone,
      relationship: relationship !== undefined ? relationship : contact.relationship,
      is_primary: is_primary !== undefined ? is_primary : contact.is_primary
    });

    res.json({
      message: 'Emergency contact updated successfully',
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        status: contact.status,
        is_primary: contact.is_primary,
        created_at: contact.created_at,
        updated_at: contact.updated_at
      }
    });
  } catch (error) {
    console.error('Update contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update emergency contact'
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const contact = await EmergencyContact.findOne({
      where: { id, user_id }
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Emergency contact not found'
      });
    }

    await contact.destroy();

    res.json({
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete emergency contact'
    });
  }
};

const reorderContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;
    const user_id = req.user.dbId;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'contactIds array is required'
      });
    }

    // Verify all contacts belong to user
    const contacts = await EmergencyContact.findAll({
      where: { user_id }
    });

    const userContactIds = contacts.map(c => c.id);
    const allBelongToUser = contactIds.every(id => userContactIds.includes(id));

    if (!allBelongToUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'One or more contacts do not belong to this user'
      });
    }

    // Update created_at to reflect new order
    const now = new Date();
    for (let i = 0; i < contactIds.length; i++) {
      const newDate = new Date(now.getTime() + i * 1000);
      await EmergencyContact.update(
        { created_at: newDate },
        { where: { id: contactIds[i], user_id } }
      );
    }

    const reorderedContacts = await EmergencyContact.findAll({
      where: { user_id },
      attributes: ['id', 'name', 'phone', 'relationship', 'status', 'is_primary', 'created_at'],
      order: [['created_at', 'ASC']]
    });

    res.json({
      message: 'Contacts reordered successfully',
      contacts: reorderedContacts
    });
  } catch (error) {
    console.error('Reorder contacts error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reorder emergency contacts'
    });
  }
};

// Serve HTML confirmation page
const getConfirmationPage = async (req, res) => {
  try {
    const { token } = req.params;

    const contact = await EmergencyContact.findOne({
      where: { confirmation_token: token },
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email']
      }]
    });

    if (!contact) {
      return res.status(404).send(getErrorHtml('Invalid Link', 'This confirmation link is invalid or has already been used.'));
    }

    if (contact.status !== 'pending') {
      const statusMessages = {
        active: 'You have already confirmed this request.',
        declined: 'You have already declined this request.',
        expired: 'This confirmation link has expired.'
      };
      return res.send(getStatusHtml(contact.status, statusMessages[contact.status]));
    }

    if (contact.isTokenExpired()) {
      await contact.update({ status: 'expired' });
      return res.send(getErrorHtml('Link Expired', 'This confirmation link has expired. Please ask the person to send a new request.'));
    }

    const userName = contact.user?.name || 'Someone';

    res.send(getConfirmationHtml(userName, token));
  } catch (error) {
    console.error('Get confirmation page error:', error.message);
    res.status(500).send(getErrorHtml('Error', 'An error occurred. Please try again later.'));
  }
};

// Handle confirmation response
const confirmContact = async (req, res) => {
  try {
    const { token } = req.params;
    const { accepted } = req.body;

    const contact = await EmergencyContact.findOne({
      where: { confirmation_token: token },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid confirmation token'
      });
    }

    if (contact.status !== 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This request has already been processed'
      });
    }

    if (contact.isTokenExpired()) {
      await contact.update({ status: 'expired' });
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This confirmation link has expired'
      });
    }

    const newStatus = accepted ? 'active' : 'declined';
    await contact.update({
      status: newStatus,
      confirmation_token: null, // Clear token after use
      token_expires_at: null
    });

    res.json({
      message: accepted
        ? 'Thank you for confirming. You are now a support contact.'
        : 'You have declined to be a support contact.',
      status: newStatus
    });
  } catch (error) {
    console.error('Confirm contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process confirmation'
    });
  }
};

// Resend confirmation for pending contact
const resendConfirmation = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const contact = await EmergencyContact.findOne({
      where: { id, user_id }
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Emergency contact not found'
      });
    }

    if (contact.status === 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Contact is already active'
      });
    }

    // Generate new token
    const confirmation_token = EmergencyContact.generateToken();
    const token_expires_at = new Date();
    token_expires_at.setDate(token_expires_at.getDate() + 14);

    await contact.update({
      status: 'pending',
      confirmation_token,
      token_expires_at
    });

    const user = await User.findByPk(user_id);
    const userName = user?.name || user?.email?.split('@')[0] || 'Someone';

    res.json({
      message: 'Confirmation resent successfully',
      confirmation_url: getConfirmationUrl(confirmation_token),
      sms_message: `${userName} added you as a support contact on SoulBloom. Unsure? Verify with them first. Not spam: ${getConfirmationUrl(confirmation_token)}`
    });
  } catch (error) {
    console.error('Resend confirmation error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend confirmation'
    });
  }
};

// Get active primary contact for alerts
const getActivePrimaryContact = async (req, res) => {
  try {
    const user_id = req.user.dbId;

    const contact = await EmergencyContact.findOne({
      where: {
        user_id,
        status: 'active',
        is_primary: true
      },
      attributes: ['id', 'name', 'phone', 'relationship']
    });

    res.json({
      contact: contact || null,
      hasPrimaryContact: !!contact
    });
  } catch (error) {
    console.error('Get active primary contact error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch primary contact'
    });
  }
};

// HTML Templates
const getConfirmationHtml = (userName, token) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Contact Confirmation - SoulBloom</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 48px; margin-bottom: 12px; }
    h1 { color: #1F2937; font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #6B7280; font-size: 16px; }
    .info-box {
      background: #F3F4F6;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .info-box h3 { color: #374151; font-size: 16px; margin-bottom: 12px; }
    .info-box ul { list-style: none; }
    .info-box li {
      padding: 8px 0;
      color: #4B5563;
      font-size: 14px;
      display: flex;
      align-items: flex-start;
    }
    .info-box li::before {
      content: "✓";
      color: #10B981;
      font-weight: bold;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-accept {
      background: #6366F1;
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .btn-decline {
      background: #F3F4F6;
      color: #4B5563;
    }
    .btn-decline:hover { background: #E5E7EB; }
    .disclaimer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-size: 12px;
      color: #9CA3AF;
      text-align: center;
    }
    .result { display: none; text-align: center; padding: 40px 20px; }
    .result.show { display: block; }
    .result-icon { font-size: 64px; margin-bottom: 16px; }
    .result h2 { color: #1F2937; margin-bottom: 8px; }
    .result p { color: #6B7280; }
    .form-content { display: block; }
    .form-content.hide { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="form-content" id="formContent">
      <div class="header">
        <div class="logo">💜</div>
        <h1>Support Contact Request</h1>
        <p class="subtitle"><strong>${userName}</strong> would like you to be their support contact on SoulBloom.</p>
      </div>

      <div class="info-box">
        <h3>What this means:</h3>
        <ul>
          <li>You may occasionally receive a text if they want support</li>
          <li>You will NOT receive clinical or private health details</li>
          <li>You are NOT responsible for their safety</li>
          <li>You are NOT expected to be available 24/7</li>
          <li>You can opt out at any time</li>
        </ul>
      </div>

      <div class="buttons">
        <button class="btn btn-decline" onclick="respond(false)">Decline</button>
        <button class="btn btn-accept" onclick="respond(true)">Accept</button>
      </div>

      <p class="disclaimer">
        SoulBloom is a mental wellness app. By accepting, you agree to be a supportive contact,
        not a medical or crisis responder.
      </p>
    </div>

    <div class="result" id="acceptResult">
      <div class="result-icon">💜</div>
      <h2>Thank You!</h2>
      <p>You are now a support contact for ${userName}. They will be notified.</p>
    </div>

    <div class="result" id="declineResult">
      <div class="result-icon">👋</div>
      <h2>No Problem</h2>
      <p>You have declined the request. ${userName} will be notified.</p>
    </div>

    <div class="result" id="errorResult">
      <div class="result-icon">⚠️</div>
      <h2>Error</h2>
      <p id="errorMessage">Something went wrong. Please try again.</p>
    </div>
  </div>

  <script>
    async function respond(accepted) {
      try {
        const response = await fetch('/api/emergency-contacts/confirm/${token}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accepted })
        });

        const data = await response.json();

        document.getElementById('formContent').classList.add('hide');

        if (response.ok) {
          document.getElementById(accepted ? 'acceptResult' : 'declineResult').classList.add('show');
        } else {
          document.getElementById('errorMessage').textContent = data.message || 'Something went wrong';
          document.getElementById('errorResult').classList.add('show');
        }
      } catch (error) {
        document.getElementById('formContent').classList.add('hide');
        document.getElementById('errorResult').classList.add('show');
      }
    }
  </script>
</body>
</html>
`;

const getErrorHtml = (title, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SoulBloom</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1F2937; font-size: 24px; margin-bottom: 12px; }
    p { color: #6B7280; font-size: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
`;

const getStatusHtml = (status, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Status - SoulBloom</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1F2937; font-size: 24px; margin-bottom: 12px; }
    p { color: #6B7280; font-size: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${status === 'active' ? '✅' : status === 'declined' ? '👋' : '⏰'}</div>
    <h1>${status === 'active' ? 'Already Confirmed' : status === 'declined' ? 'Already Declined' : 'Link Expired'}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
`;

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  reorderContacts,
  getConfirmationPage,
  confirmContact,
  resendConfirmation,
  getActivePrimaryContact
};
