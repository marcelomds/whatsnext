/**
 * Auth Service
 * Registro, login e emissão/validação de JWT
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const DynamoDBService = require("./dynamodb.service");
const { UnauthorizedError, ConflictError } = require("../utils/error-handler");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

const JWT_EXPIRES_IN = "30d";

const dynamoDbService = new DynamoDBService();

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugify(value) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(DIACRITICS_REGEX, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "user"
  );
}

function issueToken(user) {
  const payload = {
    userId: user.userId,
    email: user.email,
    evolutionInstance: user.evolutionInstance,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      evolutionInstance: user.evolutionInstance,
    },
  };
}

/**
 * Registrar novo usuário
 */
async function register(email, password, name, evolutionInstance) {
  const existing = await dynamoDbService.getUserByEmail(email);
  if (existing) {
    throw new ConflictError("E-mail já cadastrado");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  const user = await dynamoDbService.createUser({
    userId,
    email,
    name,
    passwordHash,
    evolutionInstance: evolutionInstance || `whatsnext-${slugify(name)}-${userId.slice(0, 8)}`,
  });

  return issueToken(user);
}

/**
 * Login
 */
async function login(email, password) {
  const user = await dynamoDbService.getUserByEmail(email);
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw new UnauthorizedError("E-mail ou senha inválidos");
  }

  return issueToken(user);
}

/**
 * Verificar e decodificar JWT
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { register, login, verifyToken };
