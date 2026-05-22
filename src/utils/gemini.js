import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other'
]

// Keyword matching first
const KEYWORDS = {
  Food: [
  'mcd', 'kfc', 'burger', 'pizza', 'nasi',
  'ayam', 'mamak', 'tealive', 'starbucks',
  'coffee', 'lunch', 'dinner', 'breakfast',
  'grabfood', 'foodpanda',
  'mixue', 'familymart', '99 speedmart'
  ],

  Transport: [
    'grab', 'lrt', 'mrt', 'tng', 'petrol',
    'fuel', 'parking', 'toll', 'bus'
  ],

  Shopping: [
    'shopee', 'lazada', 'nike', 'adidas',
    'shirt', 'shoe', 'keyboard', 'mouse'
  ],

  Bills: [
    'tnb', 'electric', 'water', 'wifi',
    'internet', 'maxis', 'celcom', 'unifi'
  ],

  Health: [
    'clinic', 'hospital', 'panadol',
    'medicine', 'pharmacy', 'guardian', 'watsons'
  ],

  Entertainment: [
    'netflix', 'spotify', 'steam',
    'game', 'movie', 'cinema', 'youtube'
  ]
}

export async function categorizeExpense(note, amount) {
  try {
    const lowerNote = (note || '').toLowerCase()

    // 1. Keyword matching first
    for (const category in KEYWORDS) {
      const matched = KEYWORDS[category].some(keyword =>
        lowerNote.includes(keyword)
      )

      if (matched) {
        return category
      }
    }

    // 2. Fallback to Gemini AI
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

    const prompt = `
You are a spending categorizer.

Return ONLY one category from:
${CATEGORIES.join(', ')}

Expense note: "${note}"
Amount: RM ${amount}

Reply ONLY category name.
`

    const result = await model.generateContent(prompt)

    const text = result.response
      .text()
      .trim()
      .replace(/[^\w\s]/g, '')

    const normalized =
      text.charAt(0).toUpperCase() +
      text.slice(1).toLowerCase()

    if (CATEGORIES.includes(normalized)) {
      return normalized
    }

    return 'Other'

  } catch (error) {
    console.error('Gemini error:', error)
    return 'Other'
  }
}