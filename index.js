// index.js
const { Client, GatewayIntentBits, Partials, Events, Collection } = require('discord.js');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require('openai'); // API Gemini/OpenAI

// ------------------ CONFIG ------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
const prefix = "!";
client.commands = new Collection();

// ------------------ MONGO ------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB conectado!'))
  .catch(err => console.log(err));

// ------------------ OPENAI / GEMINI ------------------
const configuration = new Configuration({ apiKey: process.env.GEMINI_KEY });
const openai = new OpenAIApi(configuration);

// ------------------ COMANDOS ------------------

// Ping
client.commands.set('ping', { execute: (message) => message.channel.send('Pong 🏓') });

// Perfil
client.commands.set('perfil', {
  execute: (message, args) => {
    const user = message.mentions.users.first() || message.author;
    const embed = {
      title: `Perfil de ${user.username}`,
      thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
      fields: [
        { name: "ID", value: user.id, inline: true },
        { name: "Criado em", value: user.createdAt.toDateString(), inline: true },
        { name: "Bot?", value: user.bot ? "Sim" : "Não", inline: true },
      ],
    };
    message.channel.send({ embeds: [embed] });
  }
});

// IA com Gemini / OpenAI
client.commands.set('ia', {
  execute: async (message, args) => {
    const prompt = args.join(" ");
    if (!prompt) return message.channel.send("Escreva algo para eu responder!");

    try {
      const response = await openai.createChatCompletion({
        model: "gpt-4.1-mini", // ou modelo Gemini compatível
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });

      const answer = response.data.choices[0].message.content;
      message.channel.send(answer);

    } catch (err) {
      console.error(err);
      message.channel.send("Erro ao acessar a IA, tente novamente mais tarde.");
    }
  }
});

// ------------------ ANTI-SPAM ------------------
const spamMap = new Map();
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  // Anti-spam
  const key = `${message.guild.id}-${message.author.id}`;
  if (!spamMap.has(key)) spamMap.set(key, []);
  const times = spamMap.get(key);
  times.push(Date.now());
  spamMap.set(key, times.filter(t => t > Date.now() - 5000));

  if (spamMap.get(key).length > 5) {
    message.channel.send(`<@${message.author.id}> Spam detectado!`);
    spamMap.set(key, []);
  }

  // Anti-imagem proibida
  if (message.attachments.size > 0) {
    message.attachments.forEach(att => {
      const allowed = ['.jpg', '.jpeg', '.png', '.gif'];
      if (!allowed.some(ext => att.name.endsWith(ext))) {
        message.member.ban({ reason: "Imagem proibida" }).catch(() => {});
        const alertChannel = message.guild.channels.cache.find(ch => ch.name === "delta-alerts");
        if (alertChannel) alertChannel.send(`<@${message.author.id}> banido por imagem proibida.`);
      }
    });
  }

  // Comandos
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (!client.commands.has(cmd)) return;
  client.commands.get(cmd).execute(message, args);
});

// ------------------ ANTI-RAID ------------------
const joinMap = new Map();
client.on('guildMemberAdd', (member) => {
  const key = member.guild.id;
  if (!joinMap.has(key)) joinMap.set(key, []);
  const arr = joinMap.get(key);
  arr.push(Date.now());
  joinMap.set(key, arr.filter(t => t > Date.now() - 10000));

  if (arr.length > 3) {
    const alertChannel = member.guild.channels.cache.find(ch => ch.name === "delta-alerts");
    if (alertChannel) alertChannel.send(`Alerta: possível raid detectada!`);
  }
});

// ------------------ LOGIN ------------------
client.once(Events.ClientReady, () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
