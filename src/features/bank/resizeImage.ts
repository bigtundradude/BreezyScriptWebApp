// Client-side thumbnail resize (docs/idea-workflow-plan.md §5): only a
// 334×188 cover-cropped JPEG ever leaves the device.

export const THUMB_WIDTH = 334
export const THUMB_HEIGHT = 188

export async function resizeToThumbnail(file: File): Promise<{
  blob: Blob
  width: number
  height: number
}> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("Couldn't read that image — try a different file.")
  }
  try {
    // Cover-crop: scale to fill 334×188, crop the overflow from the center.
    const scale = Math.max(THUMB_WIDTH / bitmap.width, THUMB_HEIGHT / bitmap.height)
    const cropWidth = THUMB_WIDTH / scale
    const cropHeight = THUMB_HEIGHT / scale
    const cropX = (bitmap.width - cropWidth) / 2
    const cropY = (bitmap.height - cropHeight) / 2

    const canvas = document.createElement('canvas')
    canvas.width = THUMB_WIDTH
    canvas.height = THUMB_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable in this browser.')
    context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob) throw new Error("Couldn't encode the thumbnail — try a different image.")
    return { blob, width: THUMB_WIDTH, height: THUMB_HEIGHT }
  } finally {
    bitmap.close()
  }
}
