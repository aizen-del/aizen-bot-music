const { Riffy } = require("riffy");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionsBitField } = require("discord.js");
const { queueNames, requesters } = require("./commands/play");
const { Dynamic } = require("musicard");
const config = require("./config.js");
const musicIcons = require('./UI/icons/musicicons.js');
const colors = require('./UI/colors/colors');
const fs = require("fs");
const path = require("path");
const { autoplayCollection } = require('./mongodb.js');

async function sendMessageWithPermissionsCheck(channel, embed, attachment, actionRow1, actionRow2) {
    try {
        const permissions = channel.permissionsFor(channel.guild.members.me);
        if (!permissions.has(PermissionsBitField.Flags.SendMessages) ||
            !permissions.has(PermissionsBitField.Flags.EmbedLinks) ||
            !permissions.has(PermissionsBitField.Flags.AttachFiles) ||
            !permissions.has(PermissionsBitField.Flags.UseExternalEmojis)) {
            console.error("Bot lacks necessary permissions to send messages in this channel.");
            return;
        }

        const message = await channel.send({
            embeds: [embed],
            files: [attachment],
            components: [actionRow1, actionRow2]
        });
        return message;
    } catch (error) {
        console.error("Error sending message:", error.message);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription("⚠️ **Unable to send message. Check bot permissions.**");
        await channel.send({ embeds: [errorEmbed] });
    }
}

function initializePlayer(client) {
    const nodes = config.nodes.map(node => ({
        name: node.name,
        host: node.host,
        port: node.port,
        password: node.password,
        secure: node.secure,
        reconnectTimeout: 5000,
        reconnectTries: Infinity
    }));

    client.riffy = new Riffy(client, nodes, {
        send: (payload) => {
            const guildId = payload.d.guild_id;
            if (!guildId) return;

            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
        defaultSearchPlatform: "ytmsearch",
        restVersion: "v4",
    });

    let currentTrackMessageId = null;
    let collector = null;

    client.riffy.on("nodeConnect", node => {
        console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.green}Node ${node.name} Connected ✅${colors.reset}`);
    });
    
    client.riffy.on("nodeError", (node, error) => {
        console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.red}Node ${node.name} Error ❌ | ${error.message}${colors.reset}`);
    });

    client.riffy.on("trackStart", async (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);
        const trackUri = track.info.uri;
        const requester = requesters.get(trackUri);

        try {
            const musicard = await Dynamic({
                thumbnailImage: track.info.thumbnail || 'https://example.com/default_thumbnail.png',
                backgroundColor: '#070707',
                progress: 10,
                progressColor: '#FF7A00',
                progressBarColor: '#5F2D00',
                name: track.info.title,
                nameColor: '#FF7A00',
                author: track.info.author || 'Unknown Artist',
                authorColor: '#696969',
            });

            const cardPath = path.join(__dirname, 'musicard.png');
            fs.writeFileSync(cardPath, musicard);

            const attachment = new AttachmentBuilder(cardPath, { name: 'musicard.png' });
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Playing Song..', 
                    iconURL: musicIcons.playerIcon,
                    url: config.SupportServer
                })
                .setTimestamp()
                .setDescription(  
                    `- **Title:** [${track.info.title}](${track.info.uri})\n` +
                    `- **Author:** ${track.info.author || 'Unknown Artist'}\n` +
                    `- **Length:** ${formatDuration(track.info.length)}\n` +
                    `- **Requester:** ${requester}\n` +
                    `- **Source:** ${track.info.sourceName}\n` + '**- Controls :**\n 🔁 `Loop`, ❌ `Disable`, ⏭️ `Skip`, 📜 `Queue`, 🗑️ `Clear`\n ⏹️ `Stop`, ⏸️ `Pause`, ▶️ `Resume`, 🔊 `Vol +`, 🔉 `Vol -`')
                .setImage('attachment://musicard.png')
                .setColor('#FF7A00');

            const actionRow1 = createActionRow1(false);
            const actionRow2 = createActionRow2(false);

            const message = await sendMessageWithPermissionsCheck(channel, embed, attachment, actionRow1, actionRow2);
            if (message) {
                currentTrackMessageId = message.id;

                if (collector) collector.stop(); 
                collector = setupCollector(client, player, channel, message);
            }

        } catch (error) {
            console.error("Error creating or sending music card:", error.message);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription("⚠️ **Unable to load track card. Continuing playback...**");
            await channel.send({ embeds: [errorEmbed] });
        }
    });
}

module.exports = { initializePlayer };
