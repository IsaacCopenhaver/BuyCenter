/**
 * Derives every served brand asset from the originals in assets/source/.
 *
 * The originals are 20834x20834 (434 megapixels, ~3MB each). A browser needs
 * roughly 1.6GB of memory to decode one, so they are deliberately kept out of
 * public/ -- anything in there is copied verbatim into the production build.
 *
 * Run after changing the source art:
 *   npm run assets
 */
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE = 'assets/source'
const OUT = 'public/brand'

// libvips refuses images over ~268 megapixels by default, and these are well
// past that. Sequential reading keeps the whole thing from being held at once.
const INPUT = { limitInputPixels: false, sequentialRead: true }

const JOBS = [
  // Wordmark for the app bar, at 1x and 2x, plus a larger one for the login
  // card. Heights are what matter in a bar, so these are capped by height.
  { from: 'logo.png', to: 'logo-32.png', height: 32 },
  { from: 'logo.png', to: 'logo-64.png', height: 64 },
  { from: 'logo.png', to: 'logo-128.png', height: 128 },

  // Square mark: favicon, apple-touch, and a large one for link previews.
  { from: 'icon.png', to: 'icon-32.png', width: 32, height: 32 },
  { from: 'icon.png', to: 'icon-180.png', width: 180, height: 180 },
  { from: 'icon.png', to: 'icon-512.png', width: 512, height: 512 },
]

async function main() {
  await mkdir(OUT, { recursive: true })

  for (const job of JOBS) {
    const input = path.join(SOURCE, job.from)
    const output = path.join(OUT, job.to)

    await sharp(input, INPUT)
      // The source art sits on a large uniform field. Trimming it means the
      // mark fills the box it is given instead of floating in padding that
      // no CSS can see.
      .trim()
      .resize({
        width: job.width,
        height: job.height,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, palette: true })
      .toFile(output)

    const { size } = await stat(output)
    const meta = await sharp(output).metadata()
    console.log(
      `  ${job.to.padEnd(16)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(4)}` +
        `  ${(size / 1024).toFixed(1)} kB`,
    )
  }

  const files = await readdir(OUT)
  console.log(`\n${files.length} assets in ${OUT}/`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
