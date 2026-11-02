const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');

const app = express();
app.get('/', (req,res) => res.send('BOT DTS EN LIGNE'));
app.listen(process.env.PORT || 10000, () => console.log('Serveur web OK'));

let stock = { "chaussures": 10, "sacs": 5, "robes": 8 };

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      // ESSAIE SANS 221 d'abord pour Orange Sénégal
      const numbersToTry = ["771269905", "221771269905"];
      for (let num of numbersToTry) {
        try {
          console.log(`Tentative avec numero: ${num}`);
          let code = await sock.requestPairingCode(num);
          console.log("================================");
          console.log(`CODE POUR ${num}: ${code}`);
          console.log("================================");
          console.log("WhatsApp > Appareils lies > Lier avec numero");
          break; // stop si ca marche
        } catch(e) {
          console.log(`Echec avec ${num}:`, e.message);
        }
      }
    }, 5000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      console.log("Connexion fermee", lastDisconnect?.error);
      if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    } else if(connection === 'open') {
      console.log('✅ CONNECTE 771269905');
    }
  });

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();
    if(text === 'stock') {
      let rep = '*STOCK DTS*\n'; for(let k in stock) rep+= `- ${k}: ${stock[k]}\n`;
      await sock.sendMessage(from, { text: rep });
    }
  });
}
startBot();
