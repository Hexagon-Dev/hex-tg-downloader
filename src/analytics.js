import Database from 'better-sqlite3';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANALYTICS_DB_PATH = path.join(__dirname, '..', 'analytics.db');

/** Analytics run only when ENABLE_ANALYTICS is exactly the string "true". */
export function isAnalyticsEnabled() {
  return process.env.ENABLE_ANALYTICS === 'true';
}

/** @type {import('better-sqlite3').Database | null} */
let db = null;

function getDb() {
  if (!isAnalyticsEnabled()) {
    return null;
  }

  if (!db) {
    db = new Database(ANALYTICS_DB_PATH);
  }

  return db;
}

/**
 * @param {TelegramBot.User | undefined} user 
 */
function getUserModel(user) {
  const database = getDb();
  let userModel = null;

  if (database && user) {
    userModel = database.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

    if (!userModel) {
      database.prepare('INSERT INTO users (id, first_name, last_name, username, language_code) VALUES (?, ?, ?, ?, ?)').run([
        user.id,
        user.first_name,
        user.last_name,
        user.username,
        user.language_code,
      ]);

      return getUserModel(user);
    }
  }

  return userModel;
}

function getChatModel(chat) {
  const database = getDb();
  let chatModel = null;

  if (database && chat) {
    chatModel = database.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id);

    if (!chatModel) {
      database.prepare('INSERT INTO chats (id, type, title, username) VALUES (?, ?, ?, ?)').run([
        chat.id,
        chat.type,
        chat.title,
        chat.username,
      ]);

      return getChatModel(chat);
    }
  }

  return chatModel;
}

/**
 * @param {object} data
 * @param {number} data.id
 * @param {TelegramBot.Chat} data.chat
 * @param {TelegramBot.User | undefined} data.user
 * @param {string | undefined} data.text
 * @param {number} data.created_at
 */
export function insertMessage(data) {
  const database = getDb();
  if (!database) {
    return;
  }

  const userModel = getUserModel(data.user);
  const chatModel = getChatModel(data.chat);

  database.prepare('INSERT INTO messages (id, text, created_at, user_id, chat_id) VALUES (?, ?, ?, ?, ?)')
  .run(data.id, data.text, data.created_at, userModel?.id ?? null, chatModel?.id ?? null);
}

function getCounts() {
  const database = getDb();
  if (!database) {
    return { messages: 0, users: 0, chats: 0 };
  }

  return {
    messages: database.prepare('SELECT COUNT(*) as count FROM messages').get().count,
    users: database.prepare('SELECT COUNT(*) as count FROM users').get().count,
    chats: database.prepare('SELECT COUNT(*) as count FROM chats').get().count,
  };
}

function getLastMessages(count = 5) {
  const database = getDb();
  if (!database) {
    return [];
  }

  const messages = database.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?').all(count);

  return messages.map((message) => ({
    id: message.id,
    text: message.text,
    created_at: message.created_at,
    user: database.prepare('SELECT * FROM users WHERE id = ?').get(message.user_id),
    chat: database.prepare('SELECT * FROM chats WHERE id = ?').get(message.chat_id),
  }));
}

function getLastUsers(count = 5) {
  const database = getDb();
  if (!database) {
    return [];
  }

  return database.prepare('SELECT * FROM users LEFT JOIN messages m ON users.id = m.user_id GROUP BY users.id ORDER BY m.created_at DESC LIMIT ?').all(count);
}

function getTopUsers(count = 5) {
  const database = getDb();
  if (!database) {
    return [];
  }

  const users = database.prepare(`
    SELECT u.*, COUNT(m.id) as message_count
    FROM users u
    LEFT JOIN messages m ON u.id = m.user_id
    GROUP BY u.id
    ORDER BY message_count DESC
    LIMIT ?
  `).all(count);

  return users.map((user) => ({
    ...user,
    message_count: user.message_count,
  }));
}

export function getStats() {
  return {
    counts: getCounts(),
    lastMessages: getLastMessages(),
    lastUsers: getLastUsers(),
    topUsers: getTopUsers(),
  };
}
