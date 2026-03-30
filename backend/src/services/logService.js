const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logService = {
  log(level, action, details) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level, action, details }) + '\n';
    const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logEntry);
  },
  
  action(action, details) { this.log('ACTION', action, details); },
  error(action, details) { this.log('ERROR', action, details); },
  warn(action, details) { this.log('WARN', action, details); }
};

module.exports = logService;
