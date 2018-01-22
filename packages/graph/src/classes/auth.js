class Auth {
  constructor({ user, session, err } = {}) {
    this.user = user;
    this.session = session;
    this.err = err;
  }

  isValid() {
    const error = this.getError();
    if (error) return false;
    return true;
  }

  getError() {
    if (this.err) return this.err;
    if (!this.session || !this.user) return new Error('No user or session was found.');
    return this.session.uid !== this.user.uid ? new Error('Session-user mismatch encountered.') : null;
  }

  hasRole(name) {
    if (!this.isValid()) return false;
    return this.user.get('role') === name;
  }

  isAdmin() {
    return this.hasRole('Admin');
  }
}

module.exports = Auth;
