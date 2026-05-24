import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export async function scanReceipt(file) {
  try {

    // Convert image to base64
    const base64 = await fileToBase64(file)
    const base64Data = base64.split(',')[1]
    const mimeType = file.type || 'image/jpeg'

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `
You are a Malaysian receipt scanner. Extract information from this receipt image.

Return ONLY a JSON object with these exact fields, nothing else:
{
  "amount": "total amount as number string e.g. 28.80",
  "date": "date in DD/MM/YYYY format",
  "note": "store or business name only",
  "category": "one of: Food, Fuel, Shopping, Bills, Health, Travel, Education, Entertainment, Hobbies, Clothes, Maintenance, General"
}

Rules:
- amount: use GRAND TOTAL or TOTAL AMOUNT — the final amount paid, not individual item prices
- date: find the transaction date
- note: find the store/business name at the top of receipt, not the address
- category: based on store type and items purchased

If you cannot find a value, use empty string "".
Return ONLY the JSON, no explanation, no markdown.
`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      }
    ])

    const text = result.response.text().trim()
    console.log('Gemini Vision response:', text)

    // Parse JSON response
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    console.log('FINAL RESULT:', parsed)

    return {
      amount: parsed.amount || '',
      date: parsed.date || '',
      note: parsed.note || '',
      category: parsed.category || 'General'
    }

  } catch (error) {
    console.error('Gemini Vision error:', error)

    // If Gemini fails, return empty
    return {
      amount: '',
      date: '',
      note: '',
      category: 'General'
    }
  }
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}