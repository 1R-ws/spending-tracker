import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other']

export async function categorizeExpense(note, amount) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

    const prompt = `
      You are a spending categorizer. Based on the expense note and amount, 
      return ONLY one category from this list: ${CATEGORIES.join(', ')}.
      
      Expense note: "${note}"
      Amount: RM ${amount}
      
      Reply with ONLY the category name, nothing else.
      Examples:
      - "nasi lemak" → Food
      - "Grab to KLCC" → Transport
      - "TNB bill" → Bills
      - "Panadol" → Health
      - "Nike shoes" → Shopping
      - "Netflix" → Entertainment
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Make sure response is valid category
    if (CATEGORIES.includes(text)) {
      return text
    }
    return 'Other'

  } catch (error) {
    console.error('Gemini error:', error)
    return null
  }
}