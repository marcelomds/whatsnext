const { toVercelHandler } = require("../apps/backend/src/utils/vercel-adapter");
const { getMessages } = require("../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(getMessages);
