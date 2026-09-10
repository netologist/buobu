/**
 * Authentication module exports
 */

export type { User } from './service';
export {
  getUser,
  isAuthenticated,
  getSessionUser,
  onAuthStateChange,
  register,
  login,
  loginWithOAuth,
  logout,
  updatePassword,
  updateEmail,
  uploadAvatar,
  removeAvatar,
  getLinkedIdentities,
  linkGoogleAccount,
  unlinkGoogleAccount,
} from './service';
