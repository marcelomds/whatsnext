const { toVercelHandler } = require("../apps/backend/src/utils/vercel-adapter");
const { healthCheck } = require("../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(healthCheck);
