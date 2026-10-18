import { DataError } from '../types'
import { MAX_FILE_BYTES } from './csv'

/** Reads a file as text in the browser. Nothing is sent anywhere. */
export function readFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new DataError('The file is larger than 20 MB. Export a shorter date range.'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new DataError('The file could not be read.'))
    reader.readAsText(file)
  })
}
