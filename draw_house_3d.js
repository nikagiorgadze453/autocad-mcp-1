import axios from 'axios';

const PLUGIN_URL = 'http://localhost:12345';
const TOKEN = 'default-secret-token';

async function send(command, args) {
  const res = await axios.post(PLUGIN_URL, { command, args }, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeout: 60000,
    responseType: 'json'
  });
  return res.data;
}

const W = 13000, H = 10000, ow = 200, iw = 120, wallH = 2700;

// list of [x1,y1,x2,y2] walls
const walls = [
  [0, 0, W, ow],            // outer bottom
  [0, H - ow, W, H],        // outer top
  [0, 0, ow, H],            // outer left
  [W - ow, 0, W, H],        // outer right
  [ow, 5000, W - ow, 5000 + iw],         // mid horizontal
  [7800, ow, 7800 + iw, 5000],            // bottom zone divider
  [ow, 5000 + iw + 1400, W - ow, 5000 + iw + 1400 + iw], // corridor top wall
  [3800, 5000 + iw + 1400 + iw, 3800 + iw, H - ow],        // br1|br2
  [8200, 5000 + iw + 1400 + iw, 8200 + iw, H - ow],        // br2|master
  [11000, 5000 + iw + 1400 + iw, 11000 + iw, H - ow]       // master|ensuite
];

const lispParts = [
  '(command "_.ERASE" "_ALL" "")',
  '(command "_.UCS" "_W")'
];
for (const [x1, y1, x2, y2] of walls) {
  lispParts.push(`(command "_.BOX" (list ${x1} ${y1} 0.0) (list ${x2} ${y2} 0.0) ${wallH})`);
}
// floor slab 150mm thick below z=0
lispParts.push(`(command "_.BOX" (list 0 0 0.0) (list ${W} ${H} 0.0) -150)`);
// roof slab 200mm thick on top of walls
lispParts.push(`(command "_.BOX" (list 0 0 ${wallH}) (list ${W} ${H} ${wallH}) 200)`);
// view + visual style
lispParts.push('(command "_.-VIEW" "_SWISO")');
lispParts.push('(command "_.VSCURRENT" "_C")');
lispParts.push('(command "_.ZOOM" "_E")');

const lisp = '(progn ' + lispParts.join(' ') + ' (princ))';

(async () => {
  const r = await send('run_command', { command: lisp });
  console.log(r);
  console.log('3D house generated');
})();
