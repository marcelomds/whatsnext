const { toVercelHandler } = require("../../apps/backend/src/utils/vercel-adapter");
const { handleWhatsappWebhook } = require("../../apps/backend/src/handlers/whatsapp-handler");

module.exports = toVercelHandler(handleWhatsappWebhook);
