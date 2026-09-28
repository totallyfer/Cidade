const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, 
    PermissionFlagsBits, AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');
const express = require('express');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// --- Servidor Web para manter ativo (Render / Replit) ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot de Cidade / Economia a funcionar perfeitamente!'));
app.listen(PORT, () => console.log(`Servidor web na porta ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1551768205444259862";

// --- Mapeamento de Cores ---
const COLOR_MAP = {
    'lavanda': '#9b59b6',
    'azul': '#3498db',
    'dourado': '#f1c40f',
    'verde': '#2ecc71',
    'cinza': '#34495e',
    'branco': '#ecf0f1',
    'rosa': '#e91e63',
    'amarelo': '#f39c12',
    'ciano': '#00bcd4'
};

// --- Base de dados local ---
const DB_FILE = './cidade_database.json';
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ 
            users: {}, 
            settings: { 
                tabelaNome: 'CIDADE - RANKING', 
                tabelaCor: 'dourado'
            } 
        }, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!data.settings) {
            data.settings = { tabelaNome: 'CIDADE - RANKING', tabelaCor: 'dourado' };
        }
        return data;
    } catch {
        return { 
            users: {}, 
            settings: { tabelaNome: 'CIDADE - RANKING', tabelaCor: 'dourado' } 
        };
    }
}
function saveDB(data) {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DB_FILE);
}

// Cooldowns em memória
const cooldowns = {
    work: new Map(),
    job: new Map(),
    slut: new Map(),
    daily: new Map(),
    rob: new Map()
};

// ============================================================
// --- FUNÇÕES AUXILIARES DE CANVAS ---
// ============================================================
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function drawRoundImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

// ============================================================
// --- GERADOR DE IMAGEM: TABELA DA CIDADE (1-10) ---
// ============================================================
async function generateCidadeRankingImage(playersArray, page = 0, dbSettings = {}) {
    const PER_PAGE = 10;
    const startIdx = page * PER_PAGE;
    const current = playersArray.slice(startIdx, startIdx + PER_PAGE);
    
    const ROW_H = 65;
    const HEADER_H = 120;
    const W = 800;
    const H = HEADER_H + Math.max(current.length, 1) * ROW_H + 50;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const selectedColor = COLOR_MAP[dbSettings.tabelaCor] || '#f1c40f';

    // Fundo geral
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15, 15, 18, 0.90)';
    ctx.fillRect(0, 0, W, H);

    // Título Principal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((dbSettings.tabelaNome || 'CIDADE - RANKING').toUpperCase(), W / 2, 45);

    // Subtítulo / Indicador
    ctx.fillStyle = selectedColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`EXIBINDO DO 1 AO 10 (BANCO)`, W / 2, 75);

    if (current.length === 0) {
        ctx.fillStyle = '#888888';
        ctx.font = '18px sans-serif';
        ctx.fillText('Nenhum cidadão com dinheiro no banco.', W / 2, HEADER_H + 50);
        return canvas.toBuffer('image/png');
    }

    let startY = 105;
    for (let i = 0; i < current.length; i++) {
        const p = current[i];
        const rank = startIdx + i + 1;

        // Caixa de cada usuário
        ctx.fillStyle = 'rgba(30, 31, 34, 0.85)';
        roundRect(ctx, 40, startY, 720, 55, 8, true, false);

        // Barra lateral colorida de rank
        if (rank === 1) ctx.fillStyle = '#f1c40f';
        else if (rank === 2) ctx.fillStyle = '#95a5a6';
        else if (rank === 3) ctx.fillStyle = '#d35400';
        else ctx.fillStyle = selectedColor;
        ctx.fillRect(40, startY, 5, 55);

        // Posição #${rank}
        ctx.fillStyle = rank === 1 ? '#f1c40f' : rank === 2 ? '#95a5a6' : rank === 3 ? '#d35400' : '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`#${rank}`, 65, startY + 34);

        // Avatar
        let avatarImg = null;
        try {
            if (p.avatarURL) avatarImg = await loadImage(p.avatarURL);
        } catch {}

        if (avatarImg) {
            drawRoundImage(ctx, avatarImg, 115, startY + 7, 40);
        } else {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(135, startY + 27, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nome do Usuário
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText((p.username || 'Cidadão').slice(0, 20), 175, startY + 34);

        // Moeda (Ícone simulado ou texto estilizado) e Quantidade no Banco
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`🪙 ${p.bank.toLocaleString()} moedas`, 735, startY + 35);

        startY += 62;
    }

    return canvas.toBuffer('image/png');
}

async function getRankedCidadePlayers(db, clientInstance) {
    const usersObj = db.users || {};
    const filtered = Object.values(usersObj).filter(u => (u.bank || 0) > 0);
    filtered.sort((a, b) => b.bank - a.bank);

    const enriched = [];
    for (const p of filtered) {
        const u = await clientInstance.users.fetch(p.userId).catch(() => null);
        enriched.push({
            userId: p.userId,
            bank: p.bank,
            wallet: p.wallet || 0,
            username: u ? u.username : 'Cidadão',
            avatarURL: u ? u.displayAvatarURL({ extension: 'png', size: 128 }) : null
        });
    }
    return enriched;
}

async function buildCidadeTabelaMessage(players, page, dbSettings, clientInstance) {
    const PER_PAGE = 10;
    const buffer = await generateCidadeRankingImage(players, page, dbSettings);
    const attachment = new AttachmentBuilder(buffer, { name: `tabela_cidade_pagina_${page + 1}.png` });

    const totalPages = Math.ceil(players.length / PER_PAGE) || 1;
    const embed = new EmbedBuilder()
        .setTitle(`🏙️ ${dbSettings.tabelaNome}`)
        .setDescription('Ranking dos cidadãos mais ricos com moedas guardadas no **Banco**.')
        .setColor(COLOR_MAP[dbSettings.tabelaCor] || 0xF1C40F)
        .setImage(`attachment://tabela_cidade_pagina_${page + 1}.png`)
        .setTimestamp()
        .setFooter({ text: `Página ${page + 1} de${totalPages}` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cidade_prev_${page}`).setLabel('◀ Anterior').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId(`cidade_next_${page}`).setLabel('Próxima ▶').setStyle(ButtonStyle.Primary).setDisabled((page + 1) * PER_PAGE >= players.length)
    );

    return { embeds: [embed], files: [attachment], components: [row] };
}

// ============================================================
// --- REGISTO DE COMANDOS SLASH ---
// ============================================================
client.once('ready', async () => {
    console.log(`Bot de Economia/Cidade online como ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('painel')
            .setDescription('Painel de controlo da cidade (Apenas Staff/Admins)')
            .setDMPermission(false),
        new SlashCommandBuilder()
            .setName('tabela')
            .setDescription('Mostra a tabela de classificação da cidade')
            .addStringOption(option => option.setName('modo').setDescription('Modo').setRequired(true).addChoices({ name: 'cidade', value: 'cidade' })),
        new SlashCommandBuilder()
            .setName('work')
            .setDescription('Trabalha para ganhar moedas (Flee the Facility)'),
        new SlashCommandBuilder()
            .setName('job')
            .setDescription('Realiza um trabalho comum na cidade'),
        new SlashCommandBuilder()
            .setName('slut')
            .setDescription('Tenta arriscar a sorte para faturar moedas'),
        new SlashCommandBuilder()
            .setName('daily')
            .setDescription('Resgata sua recompensa diária de moedas'),
        new SlashCommandBuilder()
            .setName('moneyinfo')
            .setDescription('Mostra o saldo na carteira, banco e informações financeiras')
            .addUserOption(option => option.setName('usuario').setDescription('Ver informações de outro cidadão').setRequired(false)),
        new SlashCommandBuilder()
            .setName('dep')
            .setDescription('Deposita moedas no banco')
            .addStringOption(option => option.setName('quantidade').setDescription('Quantidade numérica ou "all"').setRequired(true)),
        new SlashCommandBuilder()
            .setName('rob')
            .setDescription('Tenta roubar moedas de outro cidadão')
            .addUserOption(option => option.setName('usuario').setDescription('Cidadão a ser roubado').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Comandos de Economia/Cidade registados com sucesso!');
    } catch (error) {
        console.error('Erro ao registar comandos:', error);
    }
});

// ============================================================
// --- MANUTENÇÃO DE INTERAÇÕES E COMANDOS ---
// ============================================================
client.on('interactionCreate', async interaction => {
    const db = loadDB();

    // Helper para garantir perfil do usuário
    const ensureUser = (userId) => {
        if (!db.users[userId]) {
            db.users[userId] = { userId, wallet: 0, bank: 0 };
        }
        return db.users[userId];
    };

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // --- /PAINEL ---
        if (commandName === 'painel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: '❌ Apenas membros com permissão de **Moderação** ou **Administrador** podem aceder ao painel da cidade!', ephemeral: true });
            }

            const settings = db.settings;
            const embed = new EmbedBuilder()
                .setTitle('🏙️ Painel Administrativo - Cidade')
                .setDescription(
                    `Gerencie as configurações da cidade e da tabela de economia diretamente por aqui.\n\n` +
                    `📌 **Título da Tabela:** \`${settings.tabelaNome}\`\n` +
                    `🎨 **Cor Temática:** \`${settings.tabelaCor}\``
                )
                .setColor(COLOR_MAP[settings.tabelaCor] || 0xF1C40F)
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cidade_mudar_titulo').setLabel('Mudar Título').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
                new ButtonBuilder().setCustomId('cidade_mudar_cor').setLabel('Mudar Cor').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
                new ButtonBuilder().setCustomId('cidade_add_remover').setLabel('Adicionar/Remover Moedas').setStyle(ButtonStyle.Success).setEmoji('🪙'),
                new ButtonBuilder().setCustomId('cidade_resetar').setLabel('Resetar Cidade').setStyle(ButtonStyle.Danger).setEmoji('🚨')
            );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- /TABELA CIDADE ---
        if (commandName === 'tabela') {
            const modo = interaction.options.getString('modo');
            if (modo === 'cidade') {
                await interaction.deferReply();
                const players = await getRankedCidadePlayers(db, client);
                try {
                    const payload = await buildCidadeTabelaMessage(players, 0, db.settings, client);
                    return await interaction.editReply(payload);
                } catch (err) {
                    console.error('Erro ao gerar tabela da cidade:', err);
                    return await interaction.editReply({ content: '❌ Erro ao gerar a tabela da cidade.' });
                }
            }
        }

        // --- /WORK (Flee the Facility) ---
        if (commandName === 'work') {
            const userId = interaction.user.id;
            const now = Date.now();
            const cooldownTime = 10 * 60 * 1000; // 10 minutos

            if (cooldowns.work.has(userId)) {
                const expiration = cooldowns.work.get(userId) + cooldownTime;
                if (now < expiration) {
                    const timeLeft = Math.ceil((expiration - now) / 1000);
                    const mins = Math.floor(timeLeft / 60);
                    const secs = timeLeft % 60;
                    return await interaction.reply({ content: `⏱️ Estás cansado! Aguarda **${mins}m${secs}s** para trabalhar novamente.`, ephemeral: true });
                }
            }

            cooldowns.work.set(userId, now);
            const coins = Math.floor(Math.random() * (7000 - 1000 + 1)) + 1000;
            const userObj = ensureUser(userId);
            userObj.wallet += coins;
            saveDB(db);

            const workMessages = [
                `matou um top br e ganhou **${coins.toLocaleString()}** moedas`,
                `hackeou os computadores de Facility e recolheu **${coins.toLocaleString()}** moedas`,
                `escapou da Besta no mapa Airport e faturou **${coins.toLocaleString()}** moedas`,
                `resgatou um companheiro na cadeira em Homestead e ganhou **${coins.toLocaleString()}** moedas`,
                `ganhou um 1v1 épico na prisão abandonada e obteve **${coins.toLocaleString()}** moedas`,
                `encontrou uma saída secreta no mapa Arcade e recolheu **${coins.toLocaleString()}** moedas`,
                `conseguiu atordoar a Besta com o martelo e ganhou **${coins.toLocaleString()}** moedas`,
                `consertou todos os computadores sozinho em Abandoned Facility e faturou **${coins.toLocaleString()}** moedas`,
                `venceu a rodada como sobrevivente mestre e obteve **${coins.toLocaleString()}** moedas`,
                `completou a missão noturna no mapa Facility e ganhou **${coins.toLocaleString()}** moedas`
            ];

            const randomMsg = workMessages[Math.floor(Math.random() * workMessages.length)];
            const embed = new EmbedBuilder()
                .setTitle('💼 Trabalho - Flee the Facility')
                .setDescription(`👤 <@${userId}>${randomMsg}! (Dinheiro foi para a carteira 🪙)`)
                .setColor(0x2ECC71);

            return await interaction.reply({ embeds: [embed] });
        }

        // --- /JOB ---
        if (commandName === 'job') {
            const userId = interaction.user.id;
            const now = Date.now();
            const cooldownTime = 10 * 60 * 1000; // 10 minutos

            if (cooldowns.job.has(userId)) {
                const expiration = cooldowns.job.get(userId) + cooldownTime;
                if (now < expiration) {
                    const timeLeft = Math.ceil((expiration - now) / 1000);
                    const mins = Math.floor(timeLeft / 60);
                    const secs = timeLeft % 60;
                    return await interaction.reply({ content: `⏱️ Já trabalhaste recentemente! Descansa mais **${mins}m${secs}s**.`, ephemeral: true });
                }
            }

            cooldowns.job.set(userId, now);
            const coins = Math.floor(Math.random() * (7000 - 1000 + 1)) + 1000;
            const userObj = ensureUser(userId);
            userObj.wallet += coins;
            saveDB(db);

            const jobMessages = [
                `trabalhou atendendo pacientes no hospital e ganhou **${coins.toLocaleString()}** moedas`,
                `entregou encomendas urgentes pela cidade e ganhou **${coins.toLocaleString()}** moedas`,
                `trabalhou como segurança noturno no banco central e recebeu **${coins.toLocaleString()}** moedas`,
                `consertou encanamentos na prefeitura e faturou **${coins.toLocaleString()}** moedas`,
                `trabalhou como chef num restaurante famoso e ganhou **${coins.toLocaleString()}** moedas`,
                `deu aulas particulares de programação e recebeu **${coins.toLocaleString()}** moedas`,
                `trabalhou na oficina mecânica consertando carros e faturou **${coins.toLocaleString()}** moedas`,
                `organizou o estoque do supermercado local e ganhou **${coins.toLocaleString()}** moedas`,
                `trabalhou como motorista de aplicativo e acumulou **${coins.toLocaleString()}** moedas`,
                `pintou murais artísticos nas ruas da cidade e faturou **${coins.toLocaleString()}** moedas`
            ];

            const randomMsg = jobMessages[Math.floor(Math.random() * jobMessages.length)];
            const embed = new EmbedBuilder()
                .setTitle('👷 Emprego Diário')
                .setDescription(`👤 <@${userId}>${randomMsg}! (Dinheiro foi para a carteira 🪙)`)
                .setColor(0x3498DB);

            return await interaction.reply({ embeds: [embed] });
        }

        // --- /SLUT ---
        if (commandName === 'slut') {
            const userId = interaction.user.id;
            const now = Date.now();
            const cooldownTime = 10 * 60 * 1000;

            if (cooldowns.slut.has(userId)) {
                const expiration = cooldowns.slut.get(userId) + cooldownTime;
                if (now < expiration) {
                    const timeLeft = Math.ceil((expiration - now) / 1000);
                    const mins = Math.floor(timeLeft / 60);
                    const secs = timeLeft % 60;
                    return await interaction.reply({ content: `⏱️ Calma aí! Podes tentar arriscar novamente em **${mins}m${secs}s**.`, ephemeral: true });
                }
            }

            cooldowns.slut.set(userId, now);
            const userObj = ensureUser(userId);
            const success = Math.random() < 0.5;

            if (success) {
                const coins = Math.floor(Math.random() * (6000 - 1500 + 1)) + 1500;
                userObj.wallet += coins;
                saveDB(db);
                const embed = new EmbedBuilder()
                    .setTitle('🎰 Arriscar a Sorte')
                    .setDescription(`🎉 Deu bom! <@${userId}> arriscou nos becos escuros e faturou **${coins.toLocaleString()}** moedas para a carteira!`)
                    .setColor(0x2ECC71);
                return await interaction.reply({ embeds: [embed] });
            } else {
                const loss = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
                userObj.wallet = Math.max(0, userObj.wallet - loss);
                saveDB(db);
                const embed = new EmbedBuilder()
                    .setTitle('🎰 Arriscar a Sorte')
                    .setDescription(`💸 Deu ruim! <@${userId}> foi pego pela polícia ou caiu numa armadilha e perdeu **${loss.toLocaleString()}** moedas da carteira!`)
                    .setColor(0xE74C3C);
                return await interaction.reply({ embeds: [embed] });
            }
        }

        // --- /DAILY ---
        if (commandName === 'daily') {
            const userId = interaction.user.id;
            const now = Date.now();
            const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas

            if (cooldowns.daily.has(userId)) {
                const expiration = cooldowns.daily.get(userId) + cooldownTime;
                if (now < expiration) {
                    const timeLeft = Math.ceil((expiration - now) / 1000);
                    const hours = Math.floor(timeLeft / 3600);
                    const mins = Math.floor((timeLeft % 3600) / 60);
                    return await interaction.reply({ content: `🎁 Já resgataste o teu prêmio diário! Volta daqui a **${hours}h${mins}m**.`, ephemeral: true });
                }
            }

            const coins = Math.floor(Math.random() * (25000 - 5000 + 1)) + 5000;

            const embed = new EmbedBuilder()
                .setTitle('🎁 Recompensa Diária')
                .setDescription(`Clica no botão abaixo para resgatar o teu prêmio diário aleatório de **${coins.toLocaleString()}** moedas!`)
                .setColor(0xF1C40F);

            const btnResgatar = new ButtonBuilder()
                .setCustomId(`resgatar_daily_${userId}_${coins}`)
                .setLabel('Resgatar Daily')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(btnResgatar);
            return await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- /MONEYINFO ---
        if (commandName === 'moneyinfo') {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            const userObj = ensureUser(targetUser.id);
            const total = userObj.wallet + userObj.bank;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Informações Financeiras - ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ extension: 'png' }))
                .addFields(
                    { name: '🪙 Carteira', value: `\`${userObj.wallet.toLocaleString()} moedas\``, inline: true },
                    { name: '🏦 Banco', value: `\`${userObj.bank.toLocaleString()} moedas\``, inline: true },
                    { name: '💰 Património Total', value: `\`${total.toLocaleString()} moedas\``, inline: false }
                )
                .setColor(COLOR_MAP[db.settings.tabelaCor] || 0xF1C40F)
                .setTimestamp();

            return await interaction.reply({ embeds: [embed] });
        }

        // --- /DEP ---
        if (commandName === 'dep') {
            const userId = interaction.user.id;
            const userObj = ensureUser(userId);
            const arg = interaction.options.getString('quantidade').toLowerCase();

            if (userObj.wallet <= 0) {
                return await interaction.reply({ content: '❌ Não tens moedas na carteira para depositar!', ephemeral: true });
            }

            let amountToDep = 0;
            if (arg === 'all') {
                amountToDep = userObj.wallet;
            } else {
                const parsed = parseInt(arg, 10);
                if (isNaN(parsed) || parsed <= 0) {
                    return await interaction.reply({ content: '❌ Insere um valor numérico válido ou "all".', ephemeral: true });
                }
                amountToDep = Math.min(parsed, userObj.wallet);
            }

            userObj.wallet -= amountToDep;
            userObj.bank += amountToDep;
            saveDB(db);

            const embed = new EmbedBuilder()
                .setTitle('🏦 Depósito Realizado')
                .setDescription(`Depositaste com sucesso **${amountToDep.toLocaleString()}** moedas no banco! Agora estão seguras contra roubos.`)
                .setColor(0x2ECC71);

            return await interaction.reply({ embeds: [embed] });
        }

        // --- /ROB ---
        if (commandName === 'rob') {
            const robberId = interaction.user.id;
            const targetUser = interaction.options.getUser('usuario');

            if (targetUser.id === robberId) {
                return await interaction.reply({ content: '❌ Não podes roubar a ti próprio!', ephemeral: true });
            }
            if (targetUser.bot) {
                return await interaction.reply({ content: '❌ Não podes roubar um bot!', ephemeral: true });
            }

            const robberObj = ensureUser(robberId);
            const targetObj = ensureUser(targetUser.id);

            if (targetObj.wallet <= 0) {
                return await interaction.reply({ content: `❌ **${targetUser.username}** não tem dinheiro na carteira para ser roubado!`, ephemeral: true });
            }

            // 70% chance de dar errado, 30% chance de dar certo
            const success = Math.random() < 0.30;

            if (success) {
                // Rouba entre 10% a 40% da carteira do alvo
                const stolenAmount = Math.floor(targetObj.wallet * (Math.random() * 0.30 + 0.10));
                targetObj.wallet -= stolenAmount;
                robberObj.wallet += stolenAmount;
                saveDB(db);

                const embed = new EmbedBuilder()
                    .setTitle('🥷 Assalto Bem-Sucedido!')
                    .setDescription(`Fizeste uma operação limpa! Roubaste **${stolenAmount.toLocaleString()}** moedas da carteira de **${targetUser.username}**!`)
                    .setColor(0x2ECC71);
                return await interaction.reply({ embeds: [embed] });
            } else {
                // Dá errado: Perde 30% do dinheiro que tem (carteira ou banco) e vai para o alvo
                const totalRobberMoney = robberObj.wallet + robberObj.bank;
                const penalty = Math.floor(totalRobberMoney * 0.30);

                if (penalty > 0) {
                    if (robberObj.wallet >= penalty) {
                        robberObj.wallet -= penalty;
                    } else {
                        const remainder = penalty - robberObj.wallet;
                        robberObj.wallet = 0;
                        robberObj.bank = Math.max(0, robberObj.bank - remainder);
                    }
                    targetObj.wallet += penalty;
                    saveDB(db);
                }

                const embed = new EmbedBuilder()
                    .setTitle('🚨 Assalto Fracassado!')
                    .setDescription(`Foste pego em flagrante tentado roubar **${targetUser.username}**! Tiveste de pagar uma penalidade de **30%** do teu dinheiro (**${penalty.toLocaleString()}** moedas), que foi direto para a vítima!`)
                    .setColor(0xE74C3C);
                return await interaction.reply({ embeds: [embed] });
            }
        }
    }

    // --- INTERAÇÕES DE BOTÕES E MODAIS DO PAINEL / DAILY ---
    if (interaction.isButton()) {
        // Resgatar Daily
        if (interaction.customId.startsWith('resgatar_daily_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[2];
            const coins = parseInt(parts[3], 10);

            if (interaction.user.id !== userId) {
                return await interaction.reply({ content: '❌ Este botão não é para ti!', ephemeral: true });
            }

            cooldowns.daily.set(userId, Date.now());
            const userObj = ensureUser(userId);
            userObj.wallet += coins;
            saveDB(db);

            await interaction.update({
                content: `✅ Resgataste com sucesso a tua recompensa diária de **${coins.toLocaleString()}** moedas para a carteira!`,
                embeds: [],
                components: []
            });
            return;
        }

        // Navegação da Tabela Cidade
        if (interaction.customId.startsWith('cidade_prev_') || interaction.customId.startsWith('cidade_next_')) {
            await interaction.deferUpdate();
            const pageChange = interaction.customId.startsWith('cidade_next_') ? 1 : -1;
            const currentPage = parseInt(interaction.customId.split('_').pop(), 10);
            const newPage = currentPage + pageChange;

            const players = await getRankedCidadePlayers(db, client);
            if (players.length === 0) {
                return await interaction.editReply({ content: '⚠️ A tabela da cidade está vazia.', embeds: [], files: [], components: [] });
            }

            try {
                const payload = await buildCidadeTabelaMessage(players, newPage, db.settings, client);
                return await interaction.editReply(payload);
            } catch (err) {
                console.error('Erro ao paginar tabela cidade:', err);
                return await interaction.followUp({ content: '❌ Erro ao mudar de página.', ephemeral: true });
            }
        }

        // Ações do Painel Administrativo
        if (interaction.customId.startsWith('cidade_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: '❌ Não tens permissão para usar estes botões.', ephemeral: true });
            }

            if (interaction.customId === 'cidade_mudar_titulo') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_cidade_titulo')
                    .setTitle('Alterar Título da Tabela');

                const inputTitulo = new TextInputBuilder()
                    .setCustomId('input_novo_titulo')
                    .setLabel('Novo Título da Tabela')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: CIDADE - SEASON 2')
                    .setRequired(true)
                    .setMaxLength(50);

                modal.addComponents(new ActionRowBuilder().addComponents(inputTitulo));
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'cidade_mudar_cor') {
                const selectCor = new StringSelectMenuBuilder()
                    .setCustomId('select_cidade_cor')
                    .setPlaceholder('🎨 Selecione a cor temática...')
                    .addOptions([
                        { label: 'Lavanda', value: 'lavanda' },
                        { label: 'Azul', value: 'azul' },
                        { label: 'Dourado', value: 'dourado' },
                        { label: 'Verde', value: 'verde' },
                        { label: 'Cinza', value: 'cinza' },
                        { label: 'Branco', value: 'branco' },
                        { label: 'Rosa', value: 'rosa' },
                        { label: 'Amarelo', value: 'amarelo' },
                        { label: 'Ciano', value: 'ciano' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectCor);
                return await interaction.reply({ content: 'Selecione abaixo a nova cor de fundo/detalhe da tabela:', components: [row], ephemeral: true });
            }

            if (interaction.customId === 'cidade_add_remover') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_cidade_moedas')
                    .setTitle('Adicionar / Remover Moedas');

                const inputUser = new TextInputBuilder()
                    .setCustomId('input_user_id')
                    .setLabel('ID do Usuário')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 123456789012345678')
                    .setRequired(true);

                const inputQtd = new TextInputBuilder()
                    .setCustomId('input_qtd_moedas')
                    .setLabel('Quantidade (use negativo para remover)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 5000 ou -2000')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(inputUser), new ActionRowBuilder().addComponents(inputQtd));
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'cidade_resetar') {
                db.users = {};
                saveDB(db);
                return await interaction.reply({ content: '🔄 Todos os saldos da cidade foram resetados com sucesso!', ephemeral: true });
            }
        }
    }

    // --- SELEÇÃO DE COR DO PAINEL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_cidade_cor') {
        const novaCor = interaction.values[0];
        db.settings.tabelaCor = novaCor;
        saveDB(db);
        return await interaction.update({ content: `✅ Cor temática alterada com sucesso para **${novaCor.toUpperCase()}**!`, components: [] });
    }

    // --- SUBMISSÃO DE MODAIS ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_cidade_titulo') {
            const novoTitulo = interaction.fields.getTextInputValue('input_novo_titulo');
            db.settings.tabelaNome = novoTitulo;
            saveDB(db);
            return await interaction.reply({ content: `✅ Título da tabela atualizado com sucesso para: \`${novoTitulo}\``, ephemeral: true });
        }

        if (interaction.customId === 'modal_cidade_moedas') {
            const targetId = interaction.fields.getTextInputValue('input_user_id').trim();
            const qtdStr = interaction.fields.getTextInputValue('input_qtd_moedas').trim();
            const qtd = parseInt(qtdStr, 10);

            if (isNaN(qtd)) {
                return await interaction.reply({ content: '❌ A quantidade inserida é inválida.', ephemeral: true });
            }

            const userObj = ensureUser(targetId);
            userObj.bank += qtd;
            if (userObj.bank < 0) userObj.bank = 0;
            saveDB(db);

            return await interaction.reply({ content: `✅ Saldo do banco do usuário \`${targetId}\` atualizado com sucesso! Novo saldo no banco: **${userObj.bank.toLocaleString()} moedas**.`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
