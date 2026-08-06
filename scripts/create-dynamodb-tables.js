/**
 * Cria as tabelas DynamoDB (messages, events, audit_logs).
 * Usa DYNAMODB_ENDPOINT (ex: http://localhost:8000) para rodar contra
 * DynamoDB Local; sem essa variável, cria as tabelas na AWS real.
 */

require("dotenv").config();
const {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  }),
});

const tables = [
  {
    TableName: process.env.DYNAMODB_MESSAGES_TABLE || "messages",
    AttributeDefinitions: [
      { AttributeName: "messageId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
      { AttributeName: "phoneNumber", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "messageId", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "phoneNumber-timestamp-index",
        KeySchema: [
          { AttributeName: "phoneNumber", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMODB_EVENTS_TABLE || "events",
    AttributeDefinitions: [
      { AttributeName: "eventId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
      { AttributeName: "phoneNumber", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "eventId", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "phoneNumber-timestamp-index",
        KeySchema: [
          { AttributeName: "phoneNumber", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMODB_AUDIT_LOGS_TABLE || "audit_logs",
    AttributeDefinitions: [
      { AttributeName: "logId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
    ],
    KeySchema: [
      { AttributeName: "logId", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMODB_USERS_TABLE || "users",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
];

async function main() {
  const { TableNames: existing } = await client.send(
    new ListTablesCommand({})
  );

  for (const table of tables) {
    if (existing.includes(table.TableName)) {
      console.log(`Tabela "${table.TableName}" já existe, pulando.`);
      continue;
    }

    await client.send(new CreateTableCommand(table));
    console.log(`Tabela "${table.TableName}" criada.`);
  }
}

main().catch((error) => {
  console.error("Falha ao criar tabelas:", error.message);
  process.exit(1);
});
