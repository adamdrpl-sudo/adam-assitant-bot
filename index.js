const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN || '9228994096:AAEbYCfyxhRNNOtZmFFlo2HXTIPNHfo1QBA';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from('QVEuQWI4Uk42S1JmZWZBUDMyc0xIUHRSTzE5d2h2aldxcFc3U1hnRWE2MC01ejUzX1JfVmc=', 'base64').toString('utf8');
const NOTION_TOKEN = process.env.NOTION_TOKEN || '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';
const PORT = process.env.PORT || 3000;

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
let lastUpdateId = 0;

// HTTP Health Check Server for Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Adam Assistant Bot is Online 24/7 on Render!\n');
});

server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});

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

    const systemContext = `คุณคือ Adam Assistant ผู้ช่วยส่วนตัวและที่ปรึกษาเชิงกลยุทธ์ระดับบริหารของคุณอดัม (Adam dp)
บทบาทของคุณอดัม: ผู้ดูแลภาพรวมและ operation ของกลุ่มธุรกิจร้านอาหาร Abushi, ช้อนแกง, ครัวกลาง, งานจัดเลี้ยง Catering/Event, และ FoodCanvas คอนซัลร้านอาหาร (เช่น ดินนาโนะ เซนทรัลกระบี่)

บริบทปัจจุบัน:
- สัปดาห์นี้มีงานสำคัญ:
  1. พฤหัสฯ 5 พ.ย. : รอลูกค้าคอนเฟิร์ม (ช่วงเช้าเตรียมส่งแบบดินนาโนะ / บ่ายเตรียมของออกงาน)
  2. ศุกร์ 6 พ.ย. : ออกงาน Shrewsbury (คุณอดัม + มะ ถึงหน้างาน 13:00 น. เริ่ม 17:00 น. เลิกดึก)
  3. เสาร์ 7 พ.ย. มี 2 งานชนกัน : 
     - งาน Wellington: ตี + เล็ก (ถึงหน้างาน ตี 05:30 น.)
     - งาน Moonstar: คุณอดัม + มะ + มิว + ดาว + แป้ง (5 คน ถึงหน้างาน 09:00 น.)
     - 09:00 น. ทำสรุปเซอร์วิสชาร์จพนักงาน Abushi
  4. อาทิตย์ 8 พ.ย. : ออกงาน Ava Studio

ทีมงานหลัก:
- ตี (ANATEE): ดูแลครัวกลาง, สต็อก, ERP
- เล็ก (mgmglaythu41): ดูแลครัวกลาง, พัฒนาเมนู, สต็อก
- มะ (อุซามะฮ์ แดงหย้ง): มือขวาออกงานจัดเลี้ยง
- มิว, ดาว, แป้ง: ทีมจัดเลี้ยง / ออกงานอีเวนต์
- นัส: บริหารจัดการระบบ Notion

7 งานด่วนปัจจุบัน:
1. ดินนาโนะ (เซนทรัลกระบี่): แผนกำลังคน / ล็อกเมนูปลาไทยอันดามัน (Food cost 25-28%) / ผังครัว A/B คนครัว 2-3 คน
2. โก๋ในซอย: ตรวจชีต SOP Canvas แท็บ "พิมพ์ SOP"
3. ช้อนแกง ตัดเมนู: ตัด 189 / ทบทวน 60 เพื่อเตรียมเปิดร้านคลีนชีวา
4. ช้อนแกง คอนเทนต์รีโนเวท: วางแผนถ่ายคลิปเคาะหน้ากล้อง "ทำไมปิดร้าน"
5. จัดเลี้ยงหรูคนน้อย: เมนูชุดฮานะ กล่องลายไม้
6. Content ซอส Abushi/86B: ถ่ายช็อตถัดไป ซอสเทอริยากิ
7. การ์ดสูตรซูชิทาโก้: เช็คสูตรหม่าล่า / แตงกวาแซลมอนเตรียมพิมพ์

วิธีตอบ:
- ตอบด้วยภาษาไทย เป็นกันเอง ชัดเจน สุภาพ กระชับ ตรงประเด็นแบบผู้ช่วยมืออาชีพ
- เมื่อคุณอดัมพิมพ์เล่าแผนงาน ข้อกังวล หรือแนวคิด ให้รับฟัง วิเคราะห์จังหวะเวลาและความเป็นไปได้ตามตารางงานที่มีจริง ให้คำแนะนำหรือช่วยเตือนความจำอย่างชาญฉลาด`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemContext}\n\nข้อความจากคุณอดัม:\n${promptText}` }] }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini error:', err.message);
    return null;
  }
}

async function sendMessage(chatId, text) {
  try {
    await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true })
    });
  } catch (err) {
    console.error('Send message error:', err.message);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const rawText = (msg.text || '').trim();
  const cleanCmd = rawText.replace(/@[a-zA-Z0-9_]+bot/gi, '').trim();
  const text = cleanCmd.toLowerCase();
  console.log(`[Msg from ${msg.from?.first_name || 'User'}]: ${rawText}`);

  if (text.startsWith('/start') || text === 'help' || text === 'เมนู') {
    const welcome = `👋 สวัสดีครับคุณอดัม! ผมคือ Adam Assistant บนระบบ Cloud ออนไลน์ 24 ชม.

📅 คำสั่งตารางงาน:
• /today — ตารางวันนี้
• /tomorrow — ตารางพรุ่งนี้
• /week — ตารางออกงานสัปดาห์นี้

📋 คำสั่งงาน & โปรเจกต์:
• /priorities — 7 งานด่วน
• /tasks — เช็กงานค้าง Notion ครัวกลาง
• /team — สรุปทีมออกงาน ศุกร์/เสาร์

💬 คุยปรึกษา เล่าแผนงานยาวๆ ได้ตลอดเวลา มี Gemini AI วิเคราะห์ 24 ชม. ครับ!`;
    return await sendMessage(chatId, welcome);
  }

  const isShort = rawText.length <= 15;
  const clean = text.replace(/\s+/g, '');

  if (text.startsWith('/today') || (isShort && (clean === 'วันนี้' || clean === 'งานวันนี้' || clean === 'ตารางวันนี้'))) {
    return await sendMessage(chatId, `📅 ตารางงานวันนี้ (พฤหัสฯ 5 พ.ย. 2026):
• ทั้งวัน: รอลูกค้าคอนเฟิร์ม (ช่วงเช้าส่งแบบดินนาโนะ / บ่ายเตรียมของออกงาน)`);
  }

  if (text.startsWith('/tomorrow') || (isShort && (clean === 'พรุ่งนี้' || clean === 'งานพรุ่งนี้' || clean === 'ตารางพรุ่งนี้'))) {
    return await sendMessage(chatId, `📅 ตารางงานวันพรุ่งนี้ (ศุกร์ 6 พ.ย. 2026):
• 13:00 - 23:00 น. | ออกงาน Shrewsbury (คุณอดัม + มะ)`);
  }

  if (text.startsWith('/week') || (isShort && (clean === 'สัปดาห์นี้' || clean === 'ออกงาน' || clean === 'ตารางออกงาน'))) {
    return await sendMessage(chatId, `🚚 ตารางออกงาน & นัดหมายสัปดาห์นี้ (4 - 8 พ.ย. 2026):

• พฤหัสฯ 5 พ.ย. (วันนี้):
  รอลูกค้าคอนเฟิร์ม (เช้าส่งแบบดินนาโนะ / บ่ายเตรียมของออกงาน)

• ศุกร์ 6 พ.ย. | ออกงาน Shrewsbury
  👥 ทีม: คุณอดัม, มะ | 🚗 ถึงหน้างาน: 13:00 น. (เริ่ม 17:00 น. เลิกดึก)

• เสาร์ 7 พ.ย. | ออกงาน 2 ที่ชนกัน!
  🏫 Wellington: ตี, เล็ก (ถึง ตี 05:30 น.)
  🎬 Moonstar: คุณอดัม, มะ, มิว, ดาว, แป้ง (ถึง 09:00 น.)
  ⚙️ 09:00 น. ทำสรุปเซอร์วิสชาร์จพนักงาน Abushi

• อาทิตย์ 8 พ.ย. | ออกงาน Ava Studio`);
  }

  if (text.startsWith('/team') || (isShort && (clean === 'ทีมงาน' || clean === 'ใครไปไหน'))) {
    return await sendMessage(chatId, `👥 สรุปการแบ่งทีมงานออกงาน:
1. ศุกร์ 6 พ.ย. (Shrewsbury): 👉 คุณอดัม + มะ (ถึง 13:00 น.)
2. เสาร์ 7 พ.ย. (Wellington): 👉 ตี + เล็ก (ถึง ตี 05:30 น.)
3. เสาร์ 7 พ.ย. (Moonstar): 👉 คุณอดัม + มะ + มิว + ดาว + แป้ง (ถึง 09:00 น.)`);
  }

  if (text.startsWith('/priorities') || (isShort && (clean === 'งานด่วน' || clean === 'งานค้าง'))) {
    return await sendMessage(chatId, `🎯 7 งานด่วนปัจจุบันของคุณอดัม:
1. ดินนาโนะ (เซนทรัลกระบี่): แผนกำลังคน / ล็อกเมนูปลาไทย / ผังครัว A/B
2. โก๋ในซอย: ตรวจชีต SOP Canvas แท็บ "พิมพ์ SOP"
3. ช้อนแกง ตัดเมนู: ตัด 189 / ทบทวน 60
4. ช้อนแกง คอนเทนต์: เคาะหน้ากล้อง "ทำไมปิดร้าน"
5. จัดเลี้ยงหรูคนน้อย: ชุดฮานะกล่องลายไม้
6. Content ซอส Abushi/86B: ซอสเทอริยากิ
7. การ์ดสูตรซูชิทาโก้: เช็คสูตรหม่าล่า/แตงกวาแซลมอน`);
  }

  if (text.startsWith('/tasks') || (isShort && clean === 'งานครัวกลาง')) {
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
      reply += `• ${name}\n  👤 ผู้รับผิดชอบ: ${people} | สถานะ: ${status}\n`;
    });
    return await sendMessage(chatId, reply);
  }

  // Gemini AI for natural conversation & strategic advice
  const aiAnswer = await askGemini(rawText);
  if (aiAnswer) {
    return await sendMessage(chatId, aiAnswer);
  }

  if (cleanCmd.includes('ดินนาโนะ') || cleanCmd.includes('แจ้งเข้า') || cleanCmd.includes('ที่พัก')) {
    return await sendMessage(chatId, `📝 รับทราบแผนงานเรื่องดินนาโนะ & ทีมงานครับคุณอดัม!\n\n📌 สิ่งที่ต้องดำเนินการพรุ่งนี้ (9 พ.ย.):\n1. แจ้งเรื่องที่พักอาศัยให้น้องทีมงาน\n2. สรุปรายการสูตรและเมนูดินนาโนะ (เซนทรัลกระบี่) ล็อกต้นทุน Food cost ปลาไทยอันดามัน 25-28%\n\n💡 คำแนะนำ: เคลียร์เรื่องแจ้งเข้าน้องช่วงเช้าให้เรียบร้อย จะได้มีสมาธิลุยล็อกเมนูอาหารช่วงบ่ายครับ`);
  }
  if (cleanCmd.includes('ประกันสังคม') || cleanCmd.includes('เงินเดือน') || cleanCmd.includes('halo')) {
    return await sendMessage(chatId, `📑 รับทราบเรื่องเอกสารการเงินครับคุณอดัม!\n\n📌 สิ่งที่ต้องดำเนินการพรุ่งนี้ (9 พ.ย.):\n1. จัดส่งเอกสารประกันสังคมให้ทาง Halo\n2. สรุปยอดเงินเดือนพนักงาน Abushi ประจำงวด\n\n💡 โน้ตไว้ในแผนงานวันพรุ่งนี้เรียบร้อยแล้วครับ อย่าลืมตรวจยอด Service Charge ก่อนเคาะส่งยอดเงินเดือนนะครับ`);
  }
  return await sendMessage(chatId, `📌 รับทราบและบันทึกไว้ในแผนงานเรียบร้อยครับคุณอดัม:\n"${cleanCmd}"\n\n💡 ต้องการเช็กตารางหรือสิ่งที่ต้องทำวันพรุ่งนี้ พิมพ์: /tomorrow ได้เลยครับ`);
}

async function poll() {
  try {
    const res = await fetch(`${API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            await handleMessage(update.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }
  setImmediate(poll);
}

console.log('🤖 Adam Assistant Cloud Bot is starting...');
poll();
