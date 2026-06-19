// Simplex noise - based on Stefan Gustavson's implementation
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

function buildPermTable(seed = 0) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = (seed || 12345) >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

export class SimplexNoise {
  constructor(seed = 0) { this.perm = buildPermTable(seed); }

  noise2d(xin, yin) {
    const { perm } = this;
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    function dot2(g, x, y) { return g[0]*x + g[1]*y; }
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 < 0) { n0 = 0; } else { t0 *= t0; n0 = t0*t0*dot2(grad3[perm[ii+perm[jj]] % 12], x0, y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 < 0) { n1 = 0; } else { t1 *= t1; n1 = t1*t1*dot2(grad3[perm[ii+i1+perm[jj+j1]] % 12], x1, y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 < 0) { n2 = 0; } else { t2 *= t2; n2 = t2*t2*dot2(grad3[perm[ii+1+perm[jj+1]] % 12], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }

  octave2d(x, y, octaves, persistence = 0.5, lacunarity = 2) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.noise2d(x * freq, y * freq) * amp;
      max += amp; amp *= persistence; freq *= lacunarity;
    }
    return val / max;
  }
}
