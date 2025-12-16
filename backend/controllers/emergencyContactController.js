const { EmergencyContact } = require('../models');

const createContact = async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;
    const user_id = req.user.dbId;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'name and phone are required'
      });
    }

    const contact = await EmergencyContact.create({
      user_id,
      name,
      phone,
      relationship: relationship || null
    });

    res.status(201).json({
      message: 'Emergency contact created successfully',
      contact
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

    const contacts = await EmergencyContact.findAll({
      where: { user_id },
      order: [['created_at', 'ASC']]
    });

    res.json({ contacts });
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
      where: { id, user_id }
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
    const { name, phone, relationship } = req.body;

    const contact = await EmergencyContact.findOne({
      where: { id, user_id }
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Emergency contact not found'
      });
    }

    await contact.update({
      name: name ?? contact.name,
      phone: phone ?? contact.phone,
      relationship: relationship !== undefined ? relationship : contact.relationship
    });

    res.json({
      message: 'Emergency contact updated successfully',
      contact
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

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  reorderContacts
};
