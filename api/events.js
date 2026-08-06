const { toVercelHandler } = require("../apps/backend/src/utils/vercel-adapter");
const { getEvents } = require("../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(getEvents);
