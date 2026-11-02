const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');

const app = express();
app.get('/', (req,res) => res.send('BOT DTS 771269905 en ligne ✅ CODE PAIRING'));
app.listen(process.env.PORT || 10000, () => console.log('Serveur web OK'));

// --- Stock ---
let stock = { "chaussures": 10, "sacs": 5, "robes": 8 };
let pairingCodeRequested = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ["DTS Bot", "Chrome", "1.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  // Demande le code d'appairage pour 771269905
  if (!sock.authState.creds.registered && !pairingCodeRequested) {
    pairingCodeRequested = true;
    setTimeout(async () => {
      try {
        // NUMERO SANS + : 221 + ton numéro
        let phoneNumber = "221771269905"; 
        let code = await sock.requestPairingCode(phoneNumber);
        console.log("=================================");
        console.log(`TON CODE POUR 771269905 EST: ${code}`);
        console.log("=================================");
        console.log("Va dans WhatsApp > Appareils liés > Lier avec numéro de téléphone");
      } catch(e) {
        console.log("Erreur code:", e);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open') {
      console.log('BOT CONNECTE - 771269905 OK ✅');
    }
  });

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

    if(text === 'stock') {
      let rep = '*STOCK DTS - 771269905*\n\n';
      for(let k in stock) rep += `- ${k}: ${stock[k]}\n`;
      rep += '\nTape: vendu chaussures 2';
      await sock.sendMessage(from, { text: rep });
    }
    else if(text.startsWith('vendu')) {
      const parts = text.split(' ');
      if(parts.length >= 3) {
        let article = parts[1]; let qte = parseInt(parts[2]) || 1;
        if(stock[article] !== undefined) {
          stock[article] -= qte; if(stock[article] < 0) stock[article] = 0;
          await sock.sendMessage(from, { text: `✅ Vendu ${qte} ${article}. Reste: ${stock[article]}` });
        }
      }
    }
    else if(text === 'menu' || text === 'aide') {
      await sock.sendMessage(from, { text: `*MENU DTS*\n- Tape *stock*\n- Tape *vendu chaussures 1*` });
    }
  });
}

startBot();
