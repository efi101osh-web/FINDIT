// A stand-in for the login API, so tests control exactly what "the server" says.
export const AMINA = { id: 'u1', fullName: 'Amina Yusuf', email: 'amina@example.com', role: 'user' };

export const makeAuthApi = (overrides = {}) => ({
  restoreSession: jest.fn().mockResolvedValue(null),
  login: jest.fn().mockResolvedValue({ user: AMINA, token: null }),
  register: jest.fn().mockResolvedValue({ user: AMINA, token: null }),
  logout: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

export const signedInApi = (overrides = {}) => makeAuthApi({ restoreSession: jest.fn().mockResolvedValue({ user: AMINA, token: null }), ...overrides });
