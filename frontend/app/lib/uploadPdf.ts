export function uploadPdf(
  file: File,
  email: string,
  onProgress: (p: number) => void,
  onSuccess: () => void,
  onError: (msg: string) => void
) {
  const xhr = new XMLHttpRequest()
  const formData = new FormData()

  formData.append("file", file)
  formData.append("email", email)

  xhr.open(
    "POST",
    `${process.env.NEXT_PUBLIC_API_URL}/convert-pdf-to-audio/`
  )

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100)
      onProgress(Math.min(percent, 95))
    }
  }

  xhr.onload = () => {
    if (xhr.status === 200) {
      onProgress(100)
      onSuccess()
    } else {
      onError(`Upload failed: ${xhr.status}`)
    }
  }

  xhr.onerror = () => onError("Network error. Please try again.")
  xhr.timeout = 300000 // 5 minutes
  xhr.ontimeout = () => onError("Upload timed out. Please try again.")

  xhr.send(formData)
}