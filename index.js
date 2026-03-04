require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Conectar MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB conectado ✅'))
  .catch(err => console.log('Erro MongoDB:', err));

// Gemini / OpenAI
const openai = new OpenAI({ apiKey: process.env.GEMINI_KEY });

// Comandos prefix ! 
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') message.reply('Pong 🏓');

    if (command === 'ia') {
      const prompt = args.join(' ');
      if (!prompt) return message.reply('Digite algo para a IA responder!');
      try {
        const response = await openai.chat.completions.create({
          model: 'gemini-1.5',
          messages: [{ role: 'user', content: prompt }]
        });
        message.reply(response.choices[0].message.content);
      } catch (err) {
        console.log(err);
        message.reply('Erro ao acessar a IA.');
      }
    }
  }
});

// Slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  if (commandName === 'ping') interaction.reply('Pong 🏓');
  if (commandName === 'ia') {
    const prompt = interaction.options.getString('input');
    try {
      const response = await openai.chat.completions.create({
        model: 'gemini-1.5',
        messages: [{ role: 'user', content: prompt }]
      });
      interaction.reply(response.choices[0].message.content);
    } catch (err) {
      console.log(err);
      interaction.reply('Erro ao acessar a IA.');
    }
  }
});

// Login
client.login(process.env.TOKEN).then(() => console.log('Bot online ✅'))
  .catch(err => console.log('Erro no token:', err));
