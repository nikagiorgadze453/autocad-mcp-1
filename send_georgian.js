import axios from 'axios';

const PLUGIN_URL = 'http://localhost:12345';
const TOKEN = 'default-secret-token';

async function send(command, args) {
  const res = await axios.post(PLUGIN_URL, { command, args }, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeout: 20000,
    responseType: 'json'
  });
  return res.data;
}

const FONT = 'Sylfaen';
const fmt = (text) => `\\F${FONT}|b0|i0;${text}`;

const items = [
  { handle: '3F90', x: 4500, y: 28000, text: 'ფუნდამენტის გეგმა  -  კ-44',                              h: 600, w: 25000 },
  { handle: '3F91', x: 4500, y: 27200, text: 'რკინაბეტონის სვეტები 500x500, იზოლირებულ ფუნდამენტზე', h: 280, w: 25000 },
  { handle: '3F92', x: 34200, y: 4500, text: 'პროექტი:    სამშენებლო ნიმუში\\Pნახაზი:      ფუნდამენტის გეგმა\\Pფურცელი:    კ-44\\Pმასშტაბი:   1:50\\Pთარიღი:     2026-04\\Pშემსრ.:      AI / MCP', h: 240, w: 8000 },
  { handle: '3F93', x: 4700, y: 7000, text: 'ლეგენდა',                            h: 320, w: 9000 },
  { handle: '3F94', x: 5400, y: 6120, text: 'სვეტი 500x500 მმ',                  h: 240, w: 9000 },
  { handle: '3F95', x: 5400, y: 5520, text: 'საკოორდინაცო ღერძი (1..12, A..D)', h: 240, w: 9000 },
  { handle: '3F96', x: 4700, y: 4950, text: 'შენიშვნა: ნახაზი შესრულებულია AI-ის მიერ', h: 220, w: 9000 },
  { handle: '3F97', x: 18000, y: 7700, text: 'სულ 36600',                         h: 320, w: 6000 },
  { handle: '3F98', x: 850,   y: 16500, text: 'სულ 13800',                        h: 320, w: 6000 }
];

const oldHandles = items.map(i => i.handle);

(async () => {
  try {
    await send('erase_entities', { handles: oldHandles });
  } catch (e) {
    console.error('erase warn:', e.message);
  }

  for (const it of items) {
    try {
      const res = await send('create_mtext', {
        x: it.x,
        y: it.y,
        text: fmt(it.text),
        height: it.h,
        width: it.w,
        layer: 'TEXT'
      });
      console.log(`${it.text.slice(0, 30)}... -> ${res.handle}`);
    } catch (e) {
      console.error('text fail:', it.text, e.message);
    }
  }

  await send('run_command', { command: '_.ZOOM _E' });
  console.log('Done');
})();
