// src/utils/logger.js
// Logging Utility

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function formatTimestamp() {
  return new Date().toISOString();
}

function getLogFilePath(type = 'general') {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `${type}-${date}.log`);
}

function writeLog(type, level, message, data = null) {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level,
    type,
    message,
    data
  };

  const logString = JSON.stringify(logEntry) + '\n';

  // Write to file
  fs.appendFileSync(getLogFilePath(type), logString);

  // Also console log in development
  if (process.env.NODE_ENV === 'development') {
    const color = {
      'INFO': '\x1b[36m',    // Cyan
      'WARN': '\x1b[33m',    // Yellow
      'ERROR': '\x1b[31m',   // Red
      'SUCCESS': '\x1b[32m'  // Green
    }[level] || '\x1b[0m';

    console.log(`${color}[${level}] ${timestamp} - ${message}\x1b[0m`);
    if (data) {
      console.log(data);
    }
  }
}

function logRequest(req, res, next) {
  const start = Date.now();
  const { method, url, ip } = req;
  const projectName = req.project?.projectName || 'Unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    writeLog('request', 'INFO', `${method} ${url} ${statusCode} ${duration}ms`, {
      method,
      url,
      statusCode,
      duration,
      ip,
      projectName,
      userAgent: req.headers['user-agent']
    });
  });

  next();
}

function logError(error, context = {}) {
  writeLog('error', 'ERROR', error.message, {
    stack: error.stack,
    ...context
  });
}

function logScraping(source, identifier, duration, success, dataPoints = 0) {
  writeLog('scraping', success ? 'SUCCESS' : 'ERROR', 
    `${source} scraping ${success ? 'completed' : 'failed'}`, {
    source,
    identifier,
    duration,
    success,
    dataPoints
  });
}

module.exports = {
  writeLog,
  logRequest,
  logError,
  logScraping
};
