/**
 * Gera o GOOGLE_CALENDAR_REFRESH_TOKEN via OAuth2.
 * Requer GOOGLE_CALENDAR_CLIENT_ID e GOOGLE_CALENDAR_CLIENT_SECRET no .env,
 * com http://localhost:3000/callback cadastrado como Authorized redirect URI.
 */

require("dotenv").config();
const http = require("http");
const { URL } = require("url");
const axios = require("axios");

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Defina GOOGLE_CALENDAR_CLIENT_ID e GOOGLE_CALENDAR_CLIENT_SECRET no .env antes de rodar este script."
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar",
  }).toString();

console.log("\nAbra esta URL no navegador e autorize o acesso:\n");
console.log(authUrl);
console.log("\nAguardando redirecionamento em", REDIRECT_URI, "...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400).end("Código de autorização não recebido.");
    return;
  }

  try {
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Autorizado! Pode fechar esta aba e voltar ao terminal.</h2>");

    console.log("\nAdicione ao seu .env:\n");
    console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${data.refresh_token}`);
    console.log();

    if (!data.refresh_token) {
      console.warn(
        "Nenhum refresh_token retornado. Revogue o acesso do app em https://myaccount.google.com/permissions e rode o script de novo (o Google só emite refresh_token no primeiro consentimento)."
      );
    }
  } catch (error) {
    res.writeHead(500).end("Falha ao trocar o código por tokens.");
    console.error(
      "Erro ao obter tokens:",
      error.response?.data || error.message
    );
  } finally {
    server.close();
  }
});

server.listen(3000);
