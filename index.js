const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
let latestQR = null;

app.get('/', (req,res) => {
  if(latestQR) {
    res.send(`<h1>Scanne ce QR avec 771269905</h1><img src="${latestQR}" style="width:300px"><br><a href="/">Rafraichir</a><br>Ensuite va dans WhatsApp > Appareils liés > Lier un appareil`);
  } else {
    res.send('BOT DTS en ligne - QR en cours de generation... Rafraichis dans 10s <br><a href="/">Rafraichir</a>');
  }
});

app.listen(process.env.PORT || 10000, () => console.log('Serveur web OK'));

let stock = { "chaussures": 10, "sacs": 5, "robes": 8 };

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);// ajoute juste ces 2 lignes dans le messages.upsert pour voir
sock.ev.on('messages.upsert', async m => {
  const msg = m.messages[0];
  console.log("NOUVEAU MESSAGE RECU:", JSON.stringify(msg, null, 2)); // <--- AJOUTE ÇA
  if(!msg.message || msg.key.fromMe) return;
  // ... reste du code
});
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if(qr) {
      latestQR = await QRCode.toDataURL(qr);
      console.log('Nouveau QR genere - va sur https://bot-dst.onrender.com');
    }
    if(connection === 'close') {
      if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    } else if(connection === 'open') {
      console.log('✅ CONNECTE 771269905');
      latestQR = null;
    }
  });

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
    if(text === 'stock') {
      let rep = '*STOCK DTS - 771269905*\n\n'; for(let k in stock) rep+=`- ${k}: ${stock[k]}\n`;
      await sock.sendMessage(from, { text: rep });
    }
  });
}
startBot();
