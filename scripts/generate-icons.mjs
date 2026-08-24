// 生成童课 PWA 图标（纯 Node 实现 PNG 编码，零依赖，2× 超采样抗锯齿）
// 运行：node scripts/generate-icons.mjs
// 图标设计：橙色圆角方块 + 白色翻开的书 + 橙色文字线
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const ORANGE = [0xea, 0x58, 0x0c]

// ---------- PNG 编码 ----------
const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 几何 ----------
function inTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

const inQuad = (px, py, p1, p2, p3, p4) =>
  inTriangle(px, py, p1, p2, p3) || inTriangle(px, py, p1, p3, p4)

function roundRectSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

// 书本形状（size 坐标系，contentScale 绕中心缩放，maskable 留安全区）
function makeShape(size, s) {
  const cx = size / 2
  const tr = (f) => cx + (f * size - cx) * s
  const quad = (pts) => pts.map(([fx, fy]) => [tr(fx), tr(fy)])
  return {
    left: quad([
      [0.22, 0.38],
      [0.49, 0.3],
      [0.49, 0.7],
      [0.22, 0.64],
    ]),
    right: quad([
      [0.78, 0.38],
      [0.51, 0.3],
      [0.51, 0.7],
      [0.78, 0.64],
    ]),
    spineX0: tr(0.492),
    spineX1: tr(0.508),
    spineY0: tr(0.3),
    spineY1: tr(0.7),
    lines: [0.44, 0.52, 0.6].map((fy) => {
      const yc = tr(fy)
      const half = 0.012 * size * s
      return { y0: yc - half, y1: yc + half, lx0: tr(0.26), lx1: tr(0.45), rx0: tr(0.55), rx1: tr(0.74) }
    }),
  }
}

// 采样书本形状：白色书页 / 橙色文字线 / null（背景）
function sampleBook(shape, u, v) {
  const { left, right, spineX0, spineX1, spineY0, spineY1, lines } = shape
  const inBook =
    inQuad(u, v, left[0], left[1], left[2], left[3]) ||
    inQuad(u, v, right[0], right[1], right[2], right[3]) ||
    (u >= spineX0 && u <= spineX1 && v >= spineY0 && v <= spineY1)
  if (!inBook) return null
  for (const ln of lines) {
    if (
      v >= ln.y0 &&
      v <= ln.y1 &&
      ((u >= ln.lx0 && u <= ln.lx1) || (u >= ln.rx0 && u <= ln.rx1))
    ) {
      return ORANGE
    }
  }
  return [255, 255, 255]
}

// 渲染：2× 超采样后盒式降采样
function render(size, { rounded = true, contentScale = 1 } = {}) {
  const shape = makeShape(size, contentScale)
  const half = size / 2
  const radius = Math.max(8, size * 0.225)
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const u = x + 0.25 + sx * 0.5
          const v = y + 0.25 + sy * 0.5
          let coverage = 1
          if (rounded) {
            const d = roundRectSDF(u, v, half, half, half, half, radius)
            coverage = Math.min(1, Math.max(0, 0.5 - d))
          }
          if (coverage <= 0) continue
          const col = sampleBook(shape, u, v)
          r += (col ? col[0] : ORANGE[0]) * coverage
          g += (col ? col[1] : ORANGE[1]) * coverage
          b += (col ? col[2] : ORANGE[2]) * coverage
          a += coverage
        }
      }
      const i = (y * size + x) * 4
      rgba[i] = a > 0 ? Math.round(r / a) : 0
      rgba[i + 1] = a > 0 ? Math.round(g / a) : 0
      rgba[i + 2] = a > 0 ? Math.round(b / a) : 0
      rgba[i + 3] = Math.round((a / 4) * 255)
    }
  }
  return rgba
}

// ---------- 输出 ----------
const targets = [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['icon-512-maskable.png', 512, { rounded: false, contentScale: 0.7 }],
  ['apple-touch-icon.png', 180, { rounded: false }], // iOS 自行加圆角
]

for (const [name, size, opts] of targets) {
  const rgba = render(size, opts)
  writeFileSync(join(outDir, name), encodePng(size, size, rgba))
  console.log(`✓ public/icons/${name} (${size}×${size})`)
}
