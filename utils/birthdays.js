const fs = require('fs');
const path = require('path');

const birthdaysPath = path.join(__dirname, '..', 'data', 'birthdays.json');

function ensureBirthdaysFile() {
  try {
    if (!fs.existsSync(birthdaysPath)) {
      fs.mkdirSync(path.dirname(birthdaysPath), { recursive: true });
      fs.writeFileSync(birthdaysPath, JSON.stringify({}, null, 4));
    }
  } catch (error) {
    console.warn('Failed to ensure birthdays file', { error });
  }
}

function loadBirthdays() {
  ensureBirthdaysFile();

  try {
    const data = fs.readFileSync(birthdaysPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(error);
    return {};
  }
}

function saveBirthdays(birthdays) {
  try {
    fs.writeFileSync(birthdaysPath, JSON.stringify(birthdays, null, 4));
  } catch (error) {
    console.error(error);
  }
}

let birthdays = loadBirthdays();

function getBirthdays() {
  return birthdays;
}

function addBirthday(userId, date) {
  birthdays[userId] = date;
  saveBirthdays(birthdays);
}

function removeBirthday(userId) {
  delete birthdays[userId];
  saveBirthdays(birthdays);
}

module.exports = {
  addBirthday,
  getBirthdays,
  loadBirthdays,
  removeBirthday,
  saveBirthdays,
};
