const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong 🏓');
  }
});

client.login(process.env.MTQ3ODgwNTgyMDk3MTAyNDM5NA.GoeeLv.z6GunxiFFbnuaRqTlZll0m34xVta02_KK50BQw);
