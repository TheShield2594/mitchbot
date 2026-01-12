const fs = require('fs');
const path = require('path');
const { randomUUID } = require('node:crypto');

const fsp = fs.promises;

const remindersPath = path.join(__dirname, '..', 'data', 'reminders.json');
const scheduledJobs = new Map();
let reminders = [];
let writeQueue = Promise.resolve();

function ensureRemindersFile() {
  try {
    if (!fs.existsSync(remindersPath)) {
      fs.mkdirSync(path.dirname(remindersPath), { recursive: true });
      fs.writeFileSync(remindersPath, JSON.stringify([], null, 4));
    }
  } catch (error) {
    console.warn('Failed to ensure reminders file', { error });
  }
}

async function loadReminders() {
  ensureRemindersFile();

  try {
    const data = await fsp.readFile(remindersPath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load reminders', { error });
    return [];
  }
}

function saveReminders() {
  const payload = JSON.stringify(reminders, null, 4);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${remindersPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, remindersPath);
    })
    .catch((error) => {
      console.warn('Failed to save reminders', { error });
    });

  return writeQueue;
}

async function initReminders() {
  reminders = await loadReminders();
}

function createReminder({ userId, channelId, guildId, message, scheduledAt }) {
  const reminder = {
    id: randomUUID(),
    userId,
    channelId,
    guildId: guildId || null, // Support for reminders without guild context (DMs)
    message,
    scheduledAt,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };

  reminders.push(reminder);
  saveReminders();

  return reminder;
}

function getReminderById(reminderId) {
  return reminders.find((reminder) => reminder.id === reminderId);
}

function clearScheduledJob(reminderId) {
  const existingJob = scheduledJobs.get(reminderId);
  if (existingJob) {
    clearTimeout(existingJob);
    scheduledJobs.delete(reminderId);
  }
}

async function sendReminder(reminder, client) {
  const reminderText = `⏰ Reminder: ${reminder.message}`;
  let delivered = false;

  try {
    const user = await client.users.fetch(reminder.userId);
    if (user) {
      await user.send(reminderText);
      delivered = true;
    }
  } catch (error) {
    console.warn('Failed to send reminder DM', {
      error,
      reminderId: reminder.id,
      userId: reminder.userId,
    });
  }

  if (!delivered && reminder.channelId) {
    try {
      const channel = await client.channels.fetch(reminder.channelId);
      if (channel) {
        await channel.send({ content: `<@${reminder.userId}> ${reminderText}` });
        delivered = true;
      }
    } catch (error) {
      console.warn('Failed to send reminder to channel', {
        error,
        reminderId: reminder.id,
        channelId: reminder.channelId,
      });
    }
  }

  return delivered;
}

async function deliverReminder(reminderId, client) {
  await initReminders();
  const reminder = getReminderById(reminderId);
  if (!reminder || reminder.status !== 'pending') {
    clearScheduledJob(reminderId);
    return;
  }

  const delivered = await sendReminder(reminder, client);
  clearScheduledJob(reminderId);

  if (delivered) {
    reminder.status = 'sent';
    reminder.sentAt = new Date().toISOString();
    saveReminders();
    return;
  }

  reminder.attempts = (reminder.attempts || 0) + 1;
  if (reminder.attempts < 3) {
    reminder.status = 'pending';
    reminder.scheduledAt = new Date(Date.now() + 60 * 1000).toISOString();
    saveReminders();
    scheduleReminder(reminder, client);
    return;
  }

  reminder.status = 'failed';
  reminder.failedAt = new Date().toISOString();
  saveReminders();
}

function scheduleReminder(reminder, client) {
  if (!reminder || reminder.status !== 'pending') {
    return;
  }

  const scheduledTime = new Date(reminder.scheduledAt).getTime();
  if (Number.isNaN(scheduledTime)) {
    reminder.status = 'failed';
    reminder.failedAt = new Date().toISOString();
    saveReminders();
    return;
  }

  const delay = Math.max(0, scheduledTime - Date.now());
  clearScheduledJob(reminder.id);
  const timeout = setTimeout(() => deliverReminder(reminder.id, client), delay);
  scheduledJobs.set(reminder.id, timeout);
}

async function schedulePendingReminders(client) {
  await initReminders();
  const now = Date.now();

  for (const reminder of reminders) {
    if (reminder.status !== 'pending') {
      continue;
    }

    const scheduledTime = new Date(reminder.scheduledAt).getTime();
    if (Number.isNaN(scheduledTime)) {
      reminder.status = 'failed';
      reminder.failedAt = new Date().toISOString();
      saveReminders();
      continue;
    }

    if (scheduledTime <= now) {
      scheduleReminder({ ...reminder, scheduledAt: new Date().toISOString() }, client);
      continue;
    }

    scheduleReminder(reminder, client);
  }
}

function cancelReminder(reminderId) {
  const reminder = getReminderById(reminderId);
  if (!reminder || reminder.status !== 'pending') {
    return false;
  }

  reminder.status = 'canceled';
  reminder.canceledAt = new Date().toISOString();
  clearScheduledJob(reminderId);
  saveReminders();
  return true;
}

function getRemindersByGuild(guildId) {
  return reminders.filter((reminder) => reminder.guildId === guildId);
}

function getRemindersByUser(userId, guildId = null) {
  if (guildId) {
    return reminders.filter(
      (reminder) => reminder.userId === userId && reminder.guildId === guildId
    );
  }
  return reminders.filter((reminder) => reminder.userId === userId);
}

module.exports = {
  cancelReminder,
  createReminder,
  getRemindersByGuild,
  getRemindersByUser,
  initReminders,
  schedulePendingReminders,
  scheduleReminder,
};
