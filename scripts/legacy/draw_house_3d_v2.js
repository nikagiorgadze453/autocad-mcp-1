import axios from 'axios';

const PLUGIN_URL = 'http://localhost:12345';
const TOKEN = 'default-secret-token';

async function send(command, args, timeout = 30000) {
  return (await axios.post(PLUGIN_URL, { command, args }, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeout,
    responseType: 'json'
  })).data;
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const W = 13000, H = 10000, ow = 200, iw = 120, wallH = 2700;

const walls = [
  [0, 0, W, ow],
  [0, H - ow, W, H],
  [0, 0, ow, H],
  [W - ow, 0, W, H],
  [ow, 5000, W - ow, 5000 + iw],
  [7800, ow, 7800 + iw, 5000],
  [ow, 5000 + iw + 1400, W - ow, 5000 + iw + 1400 + iw],
  [3800, 5000 + iw + 1400 + iw, 3800 + iw, H - ow],
  [8200, 5000 + iw + 1400 + iw, 8200 + iw, H - ow],
  [11000, 5000 + iw + 1400 + iw, 11000 + iw, H - ow]
];

async function runLisp(lisp) {
  const res = await send('run_command', { command: lisp });
  return res;
}

(async () => {
  console.log('Erasing 2D plan...');
  await runLisp('(command "_.ERASE" "_ALL" "")');
  await wait(800);

  console.log('Set UCS World...');
  await runLisp('(command "_.UCS" "_W")');
  await wait(300);

  console.log(`Creating ${walls.length} wall solids...`);
  for (let i = 0; i < walls.length; i++) {
    const [x1, y1, x2, y2] = walls[i];
    const lisp = `(command "_.BOX" (list ${x1} ${y1} 0.0) (list ${x2} ${y2} 0.0) ${wallH})`;
    await runLisp(lisp);
    await wait(250);
    process.stdout.write(`  wall ${i + 1}/${walls.length}\r`);
  }
  console.log('\nFloor slab...');
  await runLisp(`(command "_.BOX" (list 0 0 0.0) (list ${W} ${H} 0.0) -150)`);
  await wait(400);

  console.log('Roof slab...');
  await runLisp(`(command "_.BOX" (list 0 0 ${wallH}) (list ${W} ${H} ${wallH}) 200)`);
  await wait(400);

  console.log('SW Iso view...');
  await runLisp('(command "_.-VIEW" "_SWISO")');
  await wait(400);

  console.log('Conceptual visual style...');
  await runLisp('(command "_.VSCURRENT" "_C")');
  await wait(400);

  console.log('Zoom extents...');
  await runLisp('(command "_.ZOOM" "_E")');

  console.log('3D house complete.');
})();
