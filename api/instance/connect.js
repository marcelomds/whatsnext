const { toVercelHandler } = require("../../apps/backend/src/utils/vercel-adapter");
const { connectInstance } = require("../../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(connectInstance);
