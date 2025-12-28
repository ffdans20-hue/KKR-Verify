const Discord = require('discord.js');
const fetch = require('node-fetch');
const noblox = require('noblox.js');

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers
  ]
});

// AMBIL DARI ENVIRONMENT VARIABLE (nanti diatur di Render)
const SHEETS_URL = process.env.SHEETS_URL;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

client.on('ready', () => {
  console.log(`✅ Bot ${client.user.tag} sudah online!`);
  console.log(`📊 Bot ada di ${client.guilds.cache.size} server`);
});

client.on('messageCreate', async (message) => {
  if(message.author.bot) return;
  
  // Command !verify <username_roblox>
  if(message.content.startsWith('!verify ')) {
    const args = message.content.split(' ');
    const robloxUsername = args[1];
    
    if(!robloxUsername) {
      return message.reply('❌ Format salah! Gunakan: `!verify username_roblox_kamu`');
    }
    
    // Kirim typing indicator
    await message.channel.sendTyping();
    
    try {
      // Cek apakah username Roblox valid
      const userId = await noblox.getIdFromUsername(robloxUsername);
      
      if(!userId) {
        return message.reply('❌ Username Roblox tidak ditemukan! Pastikan username benar.');
      }
      
      // Simpan ke Google Sheets
      const response = await fetch(SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: message.author.id,
          robloxUsername: robloxUsername,
          robloxUserId: userId
        })
      });
      
      const data = await response.json();
      
      if(!data.success) {
        return message.reply('❌ Gagal menyimpan data. Coba lagi nanti.');
      }
      
      // Kasih role "Warga"
      const member = message.member;
      const role = message.guild.roles.cache.get(VERIFIED_ROLE_ID);
      
      if(role) {
        await member.roles.add(role);
        
        const embed = new Discord.EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Verifikasi Berhasil!')
          .setDescription(`Selamat datang, ${message.author}!`)
          .addFields(
            { name: '👤 Username Roblox', value: robloxUsername, inline: true },
            { name: '🆔 User ID', value: userId.toString(), inline: true }
          )
          .setFooter({ text: 'Kamu sekarang sudah bisa join game!' })
          .setTimestamp();
        
        message.reply({ embeds: [embed] });
      } else {
        message.reply('✅ Data tersimpan, tapi role tidak ditemukan. Hubungi admin!');
      }
      
    } catch(error) {
      console.error('Error saat verify:', error);
      message.reply('❌ Terjadi error! Coba lagi dalam beberapa saat.');
    }
  }
  
  // Command !help
  if(message.content === '!help') {
    const embed = new Discord.EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 Panduan Verifikasi')
      .setDescription('Untuk bisa masuk ke game RP, kamu harus verify terlebih dahulu!')
      .addFields(
        { name: '📝 Cara Verify', value: '`!verify username_roblox_kamu`' },
        { name: '📌 Contoh', value: '`!verify JohnDoe123`' }
      )
      .setFooter({ text: 'Pastikan username Roblox kamu benar!' });
    
    message.reply({ embeds: [embed] });
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login bot
client.login(BOT_TOKEN);
