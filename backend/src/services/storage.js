'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath, defaultValue) {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getTasks() {
  return readJson(TASKS_FILE, []);
}

function saveTask(task) {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    tasks[idx] = task;
  } else {
    tasks.push(task);
  }
  writeJson(TASKS_FILE, tasks);
  return task;
}

function getTask(id) {
  return getTasks().find((t) => t.id === id) || null;
}

function deleteTask(id) {
  const tasks = getTasks().filter((t) => t.id !== id);
  writeJson(TASKS_FILE, tasks);
}

function getSettings() {
  return readJson(SETTINGS_FILE, { githubToken: '', model: 'gpt-4o' });
}

function saveSettings(settings) {
  const current = getSettings();
  const merged = { ...current, ...settings };
  writeJson(SETTINGS_FILE, merged);
  return merged;
}

module.exports = { getTasks, saveTask, getTask, deleteTask, getSettings, saveSettings };
