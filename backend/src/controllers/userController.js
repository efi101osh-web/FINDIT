'use strict';

const { sendSuccess } = require('../utils/respond');
const { toUserView } = require('../utils/serializers');

function createUserController({ users }) {
  return {
    me(req, res) {
      sendSuccess(res, { user: toUserView(req.user) });
    },
    async updateMe(req, res) {
      const user = await users.updateProfile(req.user._id, req.valid.body);
      sendSuccess(res, { user: toUserView(user) });
    },
    async changePassword(req, res) {
      await users.changePassword(req.user._id, req.valid.body);
      sendSuccess(res, { message: 'Password updated.' });
    },
  };
}

module.exports = createUserController;
