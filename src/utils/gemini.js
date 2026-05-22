import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
)

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other'
]

// Local merchant keywords
const KEYWORDS = {
  Food: [
    'mcd',
    'mcdonald',
    'tealive',
    'starbucks',
    'kfc',
    'grabfood',
    'nasi',
    'restaurant',
    'mamak'
  ],

  Transport: [
    'grab',
    'tng',
    'petronas',
    'shell',
    'parking',
    'tol'
  ],

  Bills: [
    'tnb',
    'unifi',
    'maxis',
    'celcom',
    'wifi'
  ],

  Health: [
    'clinic',
    'hospital',
    'panadol',
    'guardian',
    'watson'
  ],

  Entertainment: [
    'netflix',
    'spotify',
    'steam',
    'movie'
  ],

  Shopping: [
    'shopee',
    'lazada',
    'nike',
    'uniqlo'
  ]
}

// Keyword matcher
function keywordCategorize(note) {

  const text = note.toLowerCase()

  for (const category in KEYWORDS) {

    const found = KEYWORDS[category]
      .some(keyword => text.includes(keyword))

    if (found) {
      return category
    }
  }

  return null
}

export async function categorizeExpense(note, amount) {

  try {

    // 1. Try keyword system first
    const keywordCategory = keywordCategorize(note)

    if (keywordCategory) {
      return keywordCategory
    }

    // 2. AI fallback
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    })

    const prompt = `
You are a Malaysian expense categorizer.

Choose ONLY ONE category:
${CATEGORIES.join(', ')}

Rules:
- Food = restaurant, drinks, groceries
- Transport = grab, fuel, parking, toll
- Bills = utilities, internet, phone bill
- Shopping = online shopping, clothes
- Health = medicine, clinic
- Entertainment = movies, games, subscriptions
- Other = unclear transaction

Transaction:
"${note}"

Amount:
RM ${amount}

Reply ONLY with category name.
`

    const result = await model.generateContent(prompt)

    let text = result.response.text().trim()

    // Cleanup AI response
    text = text
      .replace('.', '')
      .replace('"', '')
      .trim()

    // Normalize capitalization
    text =
      text.charAt(0).toUpperCase() +
      text.slice(1).toLowerCase()

    if (CATEGORIES.includes(text)) {
      return text
    }

    return 'Other'

  } catch (error) {

    console.error('Gemini error:', error)

    return 'Other'
  }
}