// Image handling.
//
// The existing frontend `ImageUploader` reads the chosen file with
// `FileReader.readAsDataURL()` and the admin forms submit that base64 string in
// the `image` / `before` / `after` fields. The API transparently turns that
// base64 data URL into a real hosted image and stores only the resulting URL in
// MongoDB (documents never hold image bytes).
//
// Storage strategy, in priority order:
//   1. Plain `http(s)://` URLs and existing `/uploads/...` paths pass straight
//      through, so pasting an image URL keeps working.
//   2. If Cloudinary is configured (CLOUDINARY_* env vars), the image is
//      uploaded there and its CDN URL is stored. This is the production path.
//   3. Otherwise (local development) the file is written to backend/uploads.
//
// Vercel's filesystem is NOT persistent, so in production an upload with no
// image host configured fails with a clear message rather than silently losing
// the file on the next deploy.

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env, isProduction } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,([\s\S]+)$/i

const EXTENSION_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

// Resolved from this file, not process.cwd(), so uploads always land in
// backend/uploads no matter where the process was launched from.
const UPLOAD_ROOT = path.resolve(__dirname, '..', env.uploadDir)
const PUBLIC_PREFIX = `/${env.uploadDir}`

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true })
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}

function parseDataUrl(value, fieldName) {
  const match = value.match(DATA_URL_PATTERN)
  if (!match) {
    throw ApiError.badRequest(
      `${fieldName}: unsupported image format. Use a PNG, JPEG, GIF, WEBP or AVIF file.`,
    )
  }

  const mime = `image/${match[1].toLowerCase()}`
  const extension = EXTENSION_BY_MIME[mime]
  if (!extension) {
    throw ApiError.badRequest(`${fieldName}: unsupported image format.`)
  }

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) {
    throw ApiError.badRequest(`${fieldName}: the uploaded file appears to be empty.`)
  }
  if (buffer.length > env.maxUploadBytes) {
    const limitMb = Math.round(env.maxUploadBytes / (1024 * 1024))
    throw ApiError.badRequest(`${fieldName}: image must be smaller than ${limitMb}MB.`)
  }

  return { buffer, extension }
}

/** Upload a base64 data URL to Cloudinary and return its secure URL. */
async function uploadToCloudinary(dataUrl, fieldName) {
  const { cloudName, apiKey, apiSecret } = env.cloudinary
  const timestamp = Math.floor(Date.now() / 1000)

  // Signed upload: sign every parameter except file/api_key/cloud_name. The
  // params are sorted alphabetically before hashing.
  const signature = crypto
    .createHash('sha1')
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const form = new FormData()
  form.append('file', dataUrl)
  form.append('api_key', apiKey)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)

  let response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })
  } catch (error) {
    console.error('[image] Cloudinary request failed:', error.message)
    throw ApiError.internal(`${fieldName}: could not reach the image host. Please try again.`)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.secure_url) {
    console.error('[image] Cloudinary error:', payload?.error?.message || response.status)
    throw ApiError.internal(`${fieldName}: the image host rejected the upload.`)
  }

  return payload.secure_url
}

/**
 * Resolve an image field coming from the client into a storable URL.
 *
 * @param {string|null|undefined} value  URL, /uploads path, or base64 data URL.
 * @param {string} fieldName             Used in error messages.
 * @returns {Promise<string>}            A URL/path safe to store in MongoDB.
 */
export async function resolveImage(value, fieldName = 'image') {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  // Already a URL or a previously stored upload path — nothing to do.
  if (!isDataUrl(trimmed)) return trimmed

  if (env.cloudinary.enabled) {
    return uploadToCloudinary(trimmed, fieldName)
  }

  // No external image host configured. Local disk is fine for development but
  // is wiped between deployments on Vercel, so refuse rather than lose data.
  if (isProduction) {
    throw ApiError.badRequest(
      `${fieldName}: image uploads are not configured on this server. ` +
        'Please paste an image URL instead, or ask the administrator to set up image hosting.',
    )
  }

  const { buffer, extension } = parseDataUrl(trimmed, fieldName)
  await ensureUploadDir()

  // Random name: never trust a client-supplied filename.
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`
  const absolutePath = path.join(UPLOAD_ROOT, filename)

  try {
    await fs.writeFile(absolutePath, buffer)
  } catch (error) {
    console.error('[image] Failed to write upload:', error.message)
    throw ApiError.internal('Could not save the uploaded image. Please try again.')
  }

  console.log(`[image] Stored upload ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`)

  return `${PUBLIC_PREFIX}/${filename}`
}