'use strict';

// Serializers decide EXACTLY which fields leave the backend. They build the reply from an
// allow-list (they never "remove the bad fields"), so a field added to a model later is
// private by default until someone deliberately adds it here.

/** What the account owner (and administrators) may see about a user. Never the password hash. */
function toUserView(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber || null,
    profileImage: user.profileImage ? { url: user.profileImage.url, publicId: user.profileImage.publicId } : null,
    contactPreference: user.contactPreference,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  };
}

module.exports = { toUserView };
