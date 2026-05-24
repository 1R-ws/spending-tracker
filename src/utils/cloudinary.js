const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadReceiptImage(file) {
  try {
    // Compress image before upload
    const compressed = await compressImage(file)

    // Convert base64 to blob
    const res = await fetch(compressed)
    const blob = await res.blob()

    // Upload to Cloudinary
    const formData = new FormData()
    formData.append('file', blob)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'receipts')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )

    const data = await response.json()

    if (data.secure_url) {
      return data.secure_url
    } else {
      console.error('Cloudinary error:', data)
      return null
    }

  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Compress image before upload
function compressImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}