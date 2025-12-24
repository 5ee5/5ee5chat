require('dotenv').config();
const redis = require('redis');

const client = redis.createClient({ url: process.env.REDIS_URL });

async function clearMessages() {
  await client.connect();
  await client.del('chat_messages');
  console.log('Chat messages cleared!');
  await client.quit();
}

clearMessages().catch(console.error);
