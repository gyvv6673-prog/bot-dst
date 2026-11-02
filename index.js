const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');

// --- Petit serveur pour Render (OBLIGATOIRE) ---
const express = require('express');
const app = express();
app.get('/', (req,res) => res.send('BOT DTS 771269905 en ligne ✅'));
app.listen(process.env.PORT || 10000, () => console.log('Serveur web OK'));

// --- Stock en mémoire ---
let stock = {
  "chaussures": 10,
  "sacs": 5,
  "robes": 8
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open') {
      console.log('BOT CONNECTE - 771269905');
    }
  });

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;
    
    const from = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
    
    console.log('Message:', text);

    if(text === 'stock') {
      let rep = '*STOCK DTS - 771269905*\n\n';
      for(let k in stock) rep += `- ${k}: ${stock[k]}\n`;
      rep += '\nTape: vendu chaussures 2';
      await sock.sendMessage(from, { text: rep });
    }
    else if(text.startsWith('vendu')) {
      // vendu chaussures 2
      const parts = text.split(' ');
      if(parts.length >= 3) {
        let article = parts[1];
        let qte = parseInt(parts[2]) || 1;
        if(stock[article] !== undefined) {
          stock[article] -= qte;
          if(stock[article] < 0) stock[article] = 0;
          await sock.sendMessage(from, { text: `✅ Vendu ${qte} ${article}. Reste: ${stock[article]}` });
        } else {
          await sock.sendMessage(from, { text: `Article ${article} non trouvé` });
        }
      }
    }
    else if(text === 'aide' || text === 'menu') {
      await sock.sendMessage(from, { text: `*MENU DTS*\n\n- Tape *stock* pour voir stock\n- Tape *vendu chaussures 1* pour enlever\n- Numéro: 771269905` });
    }
  });
}

startBot();
