'use strict';

// Thin: take the checked input, call the service, send the standard reply.

const { sendSuccess } = require('../utils/respond');
const { toUserView } = require('../utils/serializers');

function createAuthController({ auth }) {
  const sessionReply = ({ user, token, expiresIn }) => ({ user: toUserView(user), token, expiresIn });

  return {
    async register(req, res) {
      sendSuccess(res, sessionReply(await auth.register(req.valid.body)), { status: 201 });
    },
    async login(req, res) {
      sendSuccess(res, sessionReply(await auth.login(req.valid.body)));
    },
    me(req, res) {
      sendSuccess(res, { user: toUserView(req.user) });
    },
  };
}

module.exports = createAuthController;
