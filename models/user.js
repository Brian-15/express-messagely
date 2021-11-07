/** User class for message.ly */

const db = require('../db');
const bcrypt = require('bcrypt');
const Message = require('./message');
const { BCRYPT_WORK_FACTOR } = require('../config');

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
    const hashed = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING username,
         password,
         first_name AS firstName,
         last_name AS lastName,
         phone`,
      [username, hashed, first_name, last_name, phone, new Date().toISOString()]
    );

    await this.updateLoginTimestamp(username)

    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    try {
      const result = await db.query(
        `SELECT password FROM users
         WHERE username = $1`,
        [username]
      );

      if (result.rows.length === 0) return false;
      
      if (await bcrypt.compare(password, result.rows[0].password)) {
        await this.updateLoginTimestamp(username)
        return true
      }
    }

    catch (err) {
      return false;
    }
    
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users SET last_login_at=$1
       WHERE username=$2
       RETURNING username`,
      [new Date().toISOString(), username]
    );

    return result.rows.length === 1;
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(
      `SELECT username,
       first_name,
       last_name,
       phone
       FROM users
       ORDER BY last_name, first_name`
    );
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username,
         first_name,
         last_name,
         phone,
         join_at,
         last_login_at
       FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    
    const results = await db.query(
      `SELECT id FROM messages
       WHERE from_username = $1`,
      [username]
    );

    return Promise.all(results.rows.map(async (msg) => {
      const message = await Message.get(msg.id);
      const {id, to_user, body, sent_at, read_at} = message;
      return {id, to_user, body, sent_at, read_at}
    }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `SELECT id FROM messages
       WHERE to_username = $1`,
      [username]
    );

    return Promise.all(results.rows.map(async (msg) => {
      const message = await Message.get(msg.id);
      const {id, from_user, body, sent_at, read_at} = message;
      return {id, from_user, body, sent_at, read_at};
    }));
  }
}


module.exports = User;