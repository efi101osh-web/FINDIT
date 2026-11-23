'use strict';

// The rules for a user managing their OWN account.

const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// The only fields a user may change about themselves (email, role and status are not here).
const EDITABLE_PROFILE_FIELDS = ['fullName', 'phoneNumber', 'contactPreference'];

function createUserService({ passwords }) {
  return {
    async updateProfile(userId, changes) {
      const user = await User.findById(userId);
      if (!user) throw ApiError.unauthenticated();

      for (const field of EDITABLE_PROFILE_FIELDS) {
        if (changes[field] === undefined) continue;
        // `null` means "clear it"; assigning undefined removes the field from the document.
        user[field] = changes[field] === null ? undefined : changes[field];
      }
      await user.save();
      return user;
    },

    async changePassword(userId, { currentPassword, newPassword }) {
      const user = await User.findById(userId).select('+passwordHash');
      if (!user) throw ApiError.unauthenticated();

      if (!(await passwords.verify(currentPassword, user.passwordHash))) {
        // Reported as a validation problem (not 401) so an app does not mistake it for an expired login.
        throw ApiError.validation([{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
      }
      user.passwordHash = await passwords.hash(newPassword);
      await user.save();
    },
  };
}

module.exports = createUserService;
