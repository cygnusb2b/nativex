const Promise = require('bluebird');
const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4');
const uuidv5 = require('uuid/v5');
const bcrypt = require('bcrypt');
const redis = require('../redis');

const SETTINGS = {
  // @todo Rotate the global secrets?
  globalSecret: '$2a$12$f6y.1RLxgHO/G8TU84rN/OnTwUiozKoih/nkf5BnXi75SAjYQ.ak6',
  saltRounds: 5, // For user secret bcrypt.
  namespace: 'b966dde2-9ca8-11e7-abc4-cec278b6b50a', // Namespace for UUIDv5.
  expires: 30 * 60, // Half-hour, in seconds.
  idPrefix: 'id', // Cache prefix.
  userPrefix: 'user', // Cache prefix.
};


function createSessionId({ uid, ts }) {
  return uuidv5(`${uid}.${ts}`, SETTINGS.namespace);
}

function createSecret({ userSecret }) {
  return `${userSecret}.${SETTINGS.globalSecret}`;
}

let client;

/**
 * @todo Need to adjust how errors are handled so certain 500's stay 500's??
 */
module.exports = {
  getClient() {
    if (!client) {
      client = redis.get('session');
    }
    return client;
  },

  /**
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.uid
   * @return {Promise}
   */
  delete({ id, uid }) {
    const delSession = this.getClient().delAsync(`${SETTINGS.idPrefix}:${id}`);
    const removeId = this.getClient().sremAsync(`${SETTINGS.userPrefix}:${uid}`, id);
    return Promise.join(delSession, removeId);
  },

  /**
   *
   * @param {string} token
   * @return {Promise}
   */
  async get(token) {
    const parsed = await jwt.decode(token, { complete: true, force: true });
    const result = await this.getClient().getAsync(`${SETTINGS.idPrefix}:${parsed.payload.jti}`);
    if (!result) {
      throw new Error('No token found in storage.');
    }
    const session = Object(JSON.parse(result));
    const sid = createSessionId(session);
    const secret = createSecret({ userSecret: session.s });
    const verified = jwt.verify(token, secret, { jwtid: sid, algorithms: ['HS256'] });

    // Return the public session.
    return {
      id: sid,
      uid: session.uid,
      cre: verified.iat,
      exp: verified.exp,
      token,
    };
  },

  /**
   *
   * @param {object} params
   * @param {string} params.uid
   * @return {Promise}
   */
  async set({ uid }) {
    const now = new Date();
    const iat = Math.floor(now.valueOf() / 1000);

    if (!uid) {
      throw new Error('The user ID is required.');
    }
    const userSecret = await bcrypt.hash(uuidv4(), SETTINGS.saltRounds);

    const ts = now.valueOf();
    const sid = createSessionId({ uid, ts });
    const exp = iat + SETTINGS.expires;
    const secret = createSecret({ userSecret });
    const token = jwt.sign({ jti: sid, exp, iat }, secret);

    await this.getClient().setexAsync(`${SETTINGS.idPrefix}:${sid}`, SETTINGS.expires, JSON.stringify({
      id: sid,
      ts,
      uid,
      s: userSecret,
    }));

    const memberKey = `${SETTINGS.userPrefix}:${uid}`;
    const addUserId = this.getClient().saddAsync(memberKey, sid);
    const updateExpires = this.getClient().expireAsync(memberKey, SETTINGS.expires);
    await Promise.join(addUserId, updateExpires);

    // Return the public session.
    return {
      id: sid,
      uid,
      cre: iat,
      exp,
      token,
    };
  },
};
