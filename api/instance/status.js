const { toVercelHandler } = require("../../apps/backend/src/utils/vercel-adapter");
const { getInstanceStatus } = require("../../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(getInstanceStatus);
