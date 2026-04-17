'use client'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let poseLandmarker: PoseLandmarker | null = null
let initPromise: Promise<PoseLandmarker> | null = null

async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) return poseLandmarker
  if (initPromise) return initPromise

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    )
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      },
      runningMode: 'IMAGE',
      numPoses: 1,
    })
    return poseLandmarker
  })()

  return initPromise
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export interface BodyBox {
  imageWidth: number
  imageHeight: number
  centerX: number
  topY: number
  bottomY: number
  bodyHeight: number
  shoulderWidth: number
}

export interface Alignment {
  zoom: number
  x: number
  y: number
}

export async function detectBody(imageUrl: string): Promise<BodyBox | null> {
  const landmarker = await initPoseLandmarker()
  const img = await loadImage(imageUrl)

  // MediaPipe needs the image drawn to a canvas
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const result = landmarker.detect(canvas)

  if (!result.landmarks || result.landmarks.length === 0) return null

  const lm = result.landmarks[0]

  // Key landmarks (normalized 0-1)
  const leftShoulder = lm[11]
  const rightShoulder = lm[12]
  const leftHip = lm[23]
  const rightHip = lm[24]
  const leftAnkle = lm[27]
  const rightAnkle = lm[28]
  const nose = lm[0]

  const w = img.naturalWidth
  const h = img.naturalHeight

  const topY = Math.min(nose.y, leftShoulder.y, rightShoulder.y) * h
  const bottomY = Math.max(leftAnkle.y, rightAnkle.y) * h
  const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * w
  const bodyHeight = bottomY - topY
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * w

  return { imageWidth: w, imageHeight: h, centerX, topY, bottomY, bodyHeight, shoulderWidth }
}

export async function computeAlignment(
  beforeUrl: string,
  afterUrl: string
): Promise<{ before: Alignment; after: Alignment } | null> {
  const [before, after] = await Promise.all([detectBody(beforeUrl), detectBody(afterUrl)])

  if (!before || !after) return null

  // Scale: match body heights
  const beforeBodyRatio = before.bodyHeight / before.imageHeight
  const afterBodyRatio = after.bodyHeight / after.imageHeight
  const zoomFactor = beforeBodyRatio / afterBodyRatio

  // X offset: align body centers (as % of image width)
  const beforeCenterPct = before.centerX / before.imageWidth
  const afterCenterPct = after.centerX / after.imageWidth
  const offsetX = (beforeCenterPct - afterCenterPct * zoomFactor) * 100

  // Y offset: align body midpoints
  const beforeMidPct = (before.topY + before.bottomY) / 2 / before.imageHeight
  const afterMidPct = (after.topY + after.bottomY) / 2 / after.imageHeight
  const offsetY = (beforeMidPct - afterMidPct * zoomFactor) * 100

  return {
    before: { zoom: 1, x: 0, y: 0 },
    after: {
      zoom: Math.round(zoomFactor * 1000) / 1000,
      x: Math.round(offsetX * 10) / 10,
      y: Math.round(offsetY * 10) / 10,
    },
  }
}
