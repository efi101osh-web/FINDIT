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

// ---- Reports (items) -------------------------------------------------------------------------
//
// Three levels of what a viewer may see:
//   card     (lists)           safe for every logged-in user
//   detail   (one report)      the card plus the public details
//   private  (detail, for the reporter and administrators only)
//                              privateDetails, privateStorageLocation, closedAt, closeReason
//   reporter (administrators only) the reporter's name and contact details
//
// The reporter's id is NEVER sent. Other people only learn `isMine: false`.

const iso = (date) => (date ? new Date(date).toISOString() : null);

function toItemCard(item, viewerId) {
  return {
    id: String(item._id),
    reportType: item.reportType,
    title: item.title,
    category: item.category,
    colour: item.colour,
    generalLocation: item.generalLocation,
    locationDetail: item.locationDetail || null,
    dateOccurred: iso(item.dateOccurred),
    status: item.status,
    image: null, // photos arrive with image upload (Stage 9)
    isMine: String(item.reporterId) === String(viewerId),
    createdAt: iso(item.createdAt),
  };
}

/**
 * @param options.includePrivate  true only for the reporter and administrators
 * @param options.reporter        the reporter's contact details; only passed for administrators
 */
function toItemDetail(item, viewerId, { includePrivate = false, reporter = null } = {}) {
  const detail = {
    ...toItemCard(item, viewerId),
    description: item.description,
    brand: item.brand || null,
    approximateTime: item.approximateTime,
    images: [], // arrives with image upload (Stage 9)
    updatedAt: iso(item.updatedAt),
  };
  if (item.reportType === 'FOUND') detail.handedToOffice = Boolean(item.handedToOffice);

  if (includePrivate) {
    detail.privateDetails = item.privateDetails || null;
    if (item.reportType === 'FOUND') detail.privateStorageLocation = item.privateStorageLocation || null;
    detail.closedAt = iso(item.closedAt);
    detail.closeReason = item.closeReason || null;
  }
  if (reporter) {
    detail.reporter = {
      id: String(reporter._id),
      fullName: reporter.fullName,
      email: reporter.email,
      phoneNumber: reporter.phoneNumber || null,
      contactPreference: reporter.contactPreference,
    };
  }
  return detail;
}

module.exports = { toUserView, toItemCard, toItemDetail };
