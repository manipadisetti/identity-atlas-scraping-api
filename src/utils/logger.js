// src/utils/logger.js
function logScraping(source, identifier, duration, success, itemCount = 0) {
  const timestamp = new Date().toISOString();
  const status = success ? '✓' : '✗';
  const durationMs = `${duration}ms`;
  
  const logEntry = {
    timestamp,
    source,
    identifier,
    duration: durationMs,
    success,
    itemCount
  };

  if (success) {
    console.log(`[SCRAPER] ${status} ${source.toUpperCase()} - ${identifier} (${durationMs}, ${itemCount} items)`);
  } else {
    console.error(`[SCRAPER] ${status} ${source.toUpperCase()} - ${identifier} FAILED (${durationMs})`);
  }

  return logEntry;
}

module.exports = {
  logScraping
};
