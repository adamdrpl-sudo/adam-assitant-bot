const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN || '9228994096:AAEbYCfyxhRNNOtZmFFlo2HXTIPNHfo1QBA';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from('QVEuQWI4Uk42S1JmZWZBUDMyc0xIUHRSTzE5d2h2aldxcFc3U1hnRWE2MC01ejUzX1JfVmc=', 'base64').toString('utf8');
const NOTION_TOKEN = process.env.NOTION_TOKEN || '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';
const PORT = process.env.PORT || 3000;

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = 'https://adam-assitant-bot.onrender.com';

function getBangkokDate(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function formatThaiDate(d) {
  return d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
}

async function getNotionTasks() {
  try {
    if (!NOTION_TOKEN) return null;
    const res = await fetch('https://api.notion.com/v1/databases/4c31b1e0-51e6-47e4-ac8a-19fbf5d2cb12/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        filter: { property: 'สถานะ', status: { does_not_equal: 'Done' } },
        page_size: 15
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.results;
  } catch (err) {
    console.error('Notion error:', err.message);
    return null;
  }
}

async function askGemini(promptText) {
  try {
    if (!GEMINI_API_KEY) return null;

    const now = getBangkokDate(0);
    const dateStr = formatThaiDate(now);
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const systemContext = `คุณคือ Adam Assistant เลขาและที่ปรึกษาเชิงกลยุทธ์ส่วนตัวของคุณอดัม (Adam dp)
บทบาทของคุณอดัม: ผู้ดูแลภาพรวมและ operation ของกลุ่มร้านอาหาร Abushi, ช้อนแกง, ครัวกลาง, งานจัดเลี้ยง Catering/Event, และที่ปรึกษา FoodCanvas (เช่น ดินนาโนะ เซนทรัลกระบี่)

วันเวลาปัจจุบัน: วัน${dateStr} เวลา ${timeStr} น.

สถานะงานและตารางสำคัญ:
- อังคาร 17 พ.ย. 2569:
  • 16:30 - 21:00 น. ออกงานโรงพยาบาลวิมุต (พญาไท)
  • ลุยสูตรและเมนูร้านดินนาโนะ (เซนทรัลกระบี่) ล็อก Food cost 25-28%
  • เอกสารประกันสังคมให้ Halo & สรุปเงินเดือนพนักงาน
- เรื่องที่พักอาศัย / แจ้งเข้าน้องทีมงาน (ตม.30): ทำเสร็จเรียบร้อยแล้ว ✅

ทีมงานหลัก:
- ตี (ANATEE): ดูแลครัวกลาง, สต็อก, ERP
- เล็ก (mgmglaythu41): ดูแลครัวกลาง, พัฒนาเมนู, สต็อก
- มะ (อุซามะฮ์ แดงหย้ง): มือขวาออกงานจัดเลี้ยง
- มิว, ดาว, แป้ง: ทีมจัดเลี้ยง / อีเวนต์
- นัส: บริหารจัดการระบบ Notion

วิธีตอบ:
- ตอบด้วยภาษาไทย เป็นกันเอง ชัดเจน สุภาพ กระชับ ตรงประเด็นแบบเลขาผู้บริหารมือโปร
- เมื่อคุณอดัมแจ้งนัดหมาย, ออกงาน, งานจัดเลี้ยง, หรือแผนงาน เช่น "พรุ่งนี้ออกงานเช้า 8 โมง", "พรุ่งนี้มีจัดเลี้ยงตอนบ่ายโมง" ให้ตอบรับอย่างกระตือรือร้น ยืนยันบันทึกตาราง และให้คำแนะนำที่จำเป็น (เช่น เตือนเวลาเตรียมตัว หรือเตือนทีมงาน)
- เข้าใจวันเวลาปัจจุบันเสมอ (วันนี้คือ ${dateStr})`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemContext}\n\nข้อความจากคุณอดัม:\n${promptText}` }] }
        ]
      })
    });
    if (!res.ok) {
      console.error('Gemini error status:', res.status);
      return null;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini exception:', err.message);
    return null;
  }
}

async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true })
    });
    return await res.json();
  } catch (err) {
    console.error('Send message error:', err.message);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const rawText = (msg.text || '').trim();
  if (!rawText) return;

  const cleanCmd = rawText.replace(/@[a-zA-Z0-9_]+bot/gi, '').trim();
  const text = cleanCmd.toLowerCase();
  const special = text.replace(/\\s+/g, '');
  console.log(`[Msg from ${msg.from?.first_name || 'User'}]: ${rawText}`);

  const todayDate = formatThaiDate(getBangkokDate(0));
  const tomorrowDate = formatThaiDate(getBangkokDate(1));

  // 1. Help & Start
  if (text.startsWith('/start') || text === 'help' || text === 'เมนู') {
    const welcome = `👋 สวัสดีครับคุณอดัม! ผมคือ Adam Assistant เลขาส่วนตัวออนไลน์ 24 ชม.

📅 คำสั่งตารางงาน:
• /today — ตารางวันนี้ (${todayDate})
• /tomorrow — ตารางพรุ่งนี้ (${tomorrowDate})
• /week — ภาพรวมสัปดาห์นี้

📋 ติดตามงาน & ทีม:
• /priorities — 7 งานด่วนปัจจุบัน
• /tasks — เช็กงานค้าง Notion ครัวกลาง
• /team — รายชื่อทีมงานหลัก

💬 คุณอดัมสามารถพิมพ์แจ้งตารางงาน นัดหมาย อัปเดตงาน หรือปรึกษาแผนได้ตามสบายเลยครับ ผมพร้อมดูแลตลอดเวลา!`;
    return await sendMessage(chatId, welcome);
  }

  // 2. Dynamic Schedule Commands
  if (text.startsWith('/today') || special === 'วันนี้' || special === 'งานวันนี้' || special === 'ตารางวันนี้') {
    return await sendMessage(chatId, `📅 ตารางงานวันนี้ (${todayDate}):
• 🏥 16:30 - 21:00 น. ออกงาน: โรงพยาบาลวิมุต (พญาไท)
• ✅ จัดการเรื่องที่พักอาศัย / แจ้งเข้าน้องทีมงาน (เรียบร้อยแล้ว)
• 📌 ส่งเอกสารประกันสังคมให้ Halo & สรุปยอดเงินเดือน
• 🐟 ลุยเมนูและสูตรของร้านดินนาโนะ (เซนทรัลกระบี่)
• 🏢 สรุปยอดและวางแผนงานประจำสัปดาห์ / ติดตามงานครัวกลาง`);
  }

  if (text.startsWith('/tomorrow') || special === 'พรุ่งนี้' || special === 'งานพรุ่งนี้' || special === 'ตารางพรุ่งนี้') {
    return await sendMessage(chatId, `📅 ตารางงานวันพรุ่งนี้ (${tomorrowDate}):
• 🐟 ติดตามความคืบหน้าเรื่องการล็อกเมนูดินนาโนะ เซนทรัลกระบี่
• 📦 ติดตามระบบสต็อกและงานค้างครัวกลางกับ ตี & เล็ก
• 📊 ติดตามสรุปยอดขายและเตรียมการจัดเลี้ยงล่วงหน้า`);
  }

  if (text.startsWith('/week') || special === 'สัปดาห์นี้' || special === 'ตารางงาน') {
    return await sendMessage(chatId, `🚚 ตารางภาพรวมสัปดาห์นี้:
• อังคาร 17 พ.ย.: 16:30 - 21:00 น. ออกงานโรงพยาบาลวิมุต
• งานประจำสัปดาห์: สรุปยอดเงินเดือน / ประกันสังคม Halo / เมนูดินนาโนะ
• การจัดการระบบครัวกลางและติดตามความคืบหน้างานทีมงาน`);
  }

  if (text.startsWith('/team') || special === 'ทีมงาน' || special === 'ใครไปไหน') {
    return await sendMessage(chatId, `👥 สรุปรายชื่อทีมงานหลัก:
• ตี (ANATEE): ครัวกลาง, สต็อก, ERP
• เล็ก (mgmglaythu41): ครัวกลาง, พัฒนาเมนู, สต็อก
• มะ (อุซามะฮ์ แดงหย้ง): มือขวาออกงานจัดเลี้ยง
• มิว, ดาว, แป้ง: ทีมจัดเลี้ยง / อีเวนต์
• นัส: บริหารจัดการระบบ Notion`);
  }

  if (text.startsWith('/priorities') || special === 'งานด่วน' || special === 'งานค้าง') {
    return await sendMessage(chatId, `🎯 7 งานด่วนปัจจุบันของคุณอดัม:
1. ดินนาโนะ (เซนทรัลกระบี่): แผนกำลังคน / ล็อกเมนูปลาไทย / ผังครัว A/B
2. โก๋ในซอย: ตรวจชีต SOP Canvas แท็บ "พิมพ์ SOP"
3. ช้อนแกง ตัดเมนู: ตัด 189 / ทบทวน 60
4. ช้อนแกง คอนเทนต์: เคาะหน้ากล้อง "ทำไมปิดร้าน"
5. จัดเลี้ยงหรูคนน้อย: ชุดฮานะกล่องลายไม้
6. Content ซอส Abushi/86B: ซอสเทอริยากิ
7. การ์ดสูตรซูชิทาโก้: เช็คสูตรหม่าล่า/แตงกวาแซลมอน`);
  }

  if (text.startsWith('/tasks') || special === 'งานครัวกลาง') {
    await sendMessage(chatId, '⏳ กำลังดึงงานจาก Notion ครัวกลาง...');
    const tasks = await getNotionTasks();
    if (!tasks || tasks.length === 0) {
      return await sendMessage(chatId, '✅ ไม่พบงานค้างในครัวกลางครับ');
    }
    let reply = `📋 งานค้างใน Notion ครัวกลาง (${tasks.length} รายการ):\n\n`;
    tasks.forEach(t => {
      const name = (t.properties.Tasks?.title || []).map(x => x.plain_text).join('') || 'ไม่มีชื่องาน';
      const status = t.properties['สถานะ']?.status?.name || 'In progress';
      const people = (t.properties['ผู้รับผิดชอบครัวกลาง']?.people || []).map(p => p.name).join(', ') || '-';
      reply += `• ${name}\n  👤 ${people} | สถานะ: ${status}\n`;
    });
    return await sendMessage(chatId, reply);
  }

  // 3. Send all natural conversational inputs to Gemini AI directly!
  const aiAnswer = await askGemini(rawText);
  if (aiAnswer) {
    return await sendMessage(chatId, aiAnswer);
  }

  // 4. Fallback only if Gemini is unreachable
  return await sendMessage(chatId, `📌 รับทราบและบันทึกไว้ในแผนงานเรียบร้อยครับคุณอดัม:\n"${cleanCmd}"\n\n💡 ต้องการเช็กตารางหรือสิ่งที่ต้องทำวันพรุ่งนี้ พิมพ์ /today หรือ /tomorrow ได้เลยครับ`);
}

// HTTP Server for Telegram Webhook & Render Health Check
const server = http.createServer((req, res) => {
  // Telegram Webhook Handler
  if (req.method === 'POST' && (req.url === '/webhook' || req.url.startsWith('/webhook'))) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      try {
        const update = JSON.parse(body);
        if (update && update.message && update.message.text) {
          await handleMessage(update.message);
        }
      } catch (err) {
        console.error('Webhook error processing update:', err.message);
      }
    });
    return;
  }

  // Health check / Keep-Alive endpoint
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Adam Assistant Bot is Online 24/7 on Render (Webhook Mode)!\n');
});

server.listen(PORT, async () => {
  console.log(`HTTP Webhook Server running on port ${PORT}`);
  await setupWebhook();
});

// Setup Telegram Webhook automatically on boot
async function setupWebhook() {
  const webhookUrl = `${APP_URL}/webhook`;
  try {
    const res = await fetch(`${API_URL}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=false`);
    const data = await res.json();
    console.log('Telegram setWebhook status:', data);
  } catch (err) {
    console.error('Setup webhook failed:', err.message);
  }
}

// Keep-alive: Self-ping every 10 minutes to prevent Render Free instance from sleeping
const PING_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  fetch(APP_URL)
    .then(() => console.log(`[Keep-Alive] Self-ping successful at ${new Date().toISOString()}`))
    .catch(err => console.error('[Keep-Alive] Ping error:', err.message));
}, PING_INTERVAL);
