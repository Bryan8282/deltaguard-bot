// index.js - DeltaGuard Ultra (Slash Commands)
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require('openai');

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
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde com Pong 🏓'),
    new SlashCommandBuilder().setName('perfil').setDescription('Mostra perfil do usuário')
        .addUserOption(option => option.setName('usuario').setDescription('Escolha um usuário')),
    new SlashCommandBuilder().setName('ia').setDescription('Pergunte algo para a IA')
        .addStringOption(option => option.setName('input').setDescription('Pergunta para a IA').setRequired(true)),
];

// ------------------ REGISTRAR COMANDOS ------------------
client.once('ready', async () => {
    console.log(`Bot online como ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(cmd => cmd.toJSON()) },
        );
        console.log('Slash commands registrados com sucesso!');
    } catch (err) {
        console.error(err);
    }
});

// ------------------ EVENTO DE INTERAÇÃO ------------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // ---------- /ping ----------
    if (commandName === 'ping') {
        await interaction.reply('Pong 🏓');
    }

    // ---------- /perfil ----------
    if (commandName === 'perfil') {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const embed = {
            title: `Perfil de ${user.username}`,
            thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
            fields: [
                { name: "ID", value: user.id, inline: true },
                { name: "Criado em", value: user.createdAt.toDateString(), inline: true },
                { name: "Bot?", value: user.bot ? "Sim" : "Não", inline: true },
            ],
        };
        await interaction.reply({ embeds: [embed] });
    }

    // ---------- /ia ----------
    if (commandName === 'ia') {
        const prompt = interaction.options.getString('input');
        try {
            const response = await openai.createChatCompletion({
                model: "gpt-4.1-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300
            });
            const answer = response.data.choices[0].message.content;
            await interaction.reply(answer);
        } catch (err) {
            console.error(err);
            await interaction.reply("Erro ao acessar a IA, tente novamente mais tarde.");
        }
    }
});

// ------------------ ANTI-SPAM E ALERTAS ------------------
const spamMap = new Map();
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Anti-spam
    const key = `${message.guild.id}-${message.author.id}`;
    if (!spamMap.has(key)) spamMap.set(key, []);
    const times = spamMap.get(key);
    times.push(Date.now());
    spamMap.set(key, times.filter(t => t > Date.now() - 5000));
    if (spamMap.get(key).length > 5) {
        const alertChannel = message.guild.channels.cache.find(ch => ch.name === "delta-alerts");
        if (alertChannel) alertChannel.send(`<@${message.author.id}> Spam detectado!`);
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
});

// ------------------ ANTI-RAID ------------------
const joinMap = new Map();
client.on('guildMemberAdd', member => {
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
client.login(process.env.TOKEN);
