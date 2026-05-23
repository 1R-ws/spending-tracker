import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
)

export const CATEGORIES = [
  'Food',
  'Fuel',
  'Shopping',
  'Bills',
  'Health',
  'Travel',
  'Education',
  'Entertainment',
  'Hobbies',
  'Clothes',
  'Maintenance',
  'General'
]

// Keyword matching first
const KEYWORDS = {

  Food: [
    'mcd', 'kfc', 'burger', 'pizza', 'nasi',
    'ayam', 'mamak', 'tealive', 'starbucks',
    'coffee', 'lunch', 'dinner', 'breakfast',
    'grabfood', 'foodpanda', 'mixue',
    'familymart', '99 speedmart', 'subway',
    'dominos', 'pizza hut', 'sushi',
    'ramen', 'bakery', 'roti', 'cakoi',
    'mee', 'char kuey teow', 'rice',
    'restaurant', 'cafe', 'kopitiam',
    'chatime', 'zus', 'richiamo'
  ],

  Fuel: [
    'petrol', 'fuel', 'ron95', 'ron97',
    'diesel', 'shell', 'petronas',
    'caltex', 'bhp', 'petrol station',
    'parking', 'toll', 'grab',
    'lrt', 'mrt', 'bus', 'taxi',
    'touch n go', 'tng', 'rapidkl',
    'ewallet reload', 'smart tag', 'minyak', 
  ],

  Shopping: [
    'shopee', 'lazada', 'online shopping',
    'keyboard', 'mouse', 'monitor',
    'pc', 'iphone', 'samsung',
    'tablet', 'charger', 'usb',
    'headphone', 'earbuds', 'powerbank',
    'electronic', 'gadgets', 'mall',
    'aeon', 'mid valley', 'sunway'
  ],

  Bills: [
    'tnb', 'electric', 'electricity',
    'water', 'wifi', 'internet',
    'unifi', 'maxis', 'celcom',
    'digi', 'bill', 'astro',
    'streamyx', 'phone bill',
    'utility', 'postpaid', 'broadband'
  ],

  Health: [
    'clinic', 'hospital', 'medicine',
    'panadol', 'doctor', 'pharmacy',
    'guardian', 'watsons', 'mc',
    'dental', 'dentist', 'vitamin',
    'supplement', 'checkup', 'medical',
    'ubat', 'insurance'
  ],

  Travel: [
    'hotel', 'flight', 'airasia',
    'malindo', 'resort', 'vacation',
    'holiday', 'trip', 'booking',
    'airbnb', 'tourism', 'travel',
    'homestay', 'passport'
  ],

  Education: [
    'course', 'udemy', 'book',
    'exam', 'printing', 'stationery',
    'class', 'training', 'workshop',
    'seminar', 'college', 'university',
    'tuition', 'assignment', 'notes'
  ],

  Entertainment: [
    'netflix', 'spotify', 'youtube',
    'cinema', 'movie', 'steam',
    'game', 'concert', 'ps5',
    'xbox', 'nintendo', 'valorant',
    'pubg', 'mobile legends',
    'disney+', 'tiktok'
  ],

  Hobbies: [
    'figure', 'gundam', 'lego',
    'fishing', 'camera', 'drone',
    'gym', 'football', 'badminton',
    'basketball', 'cycling', 'anime',
    'hobby', 'collection'
  ],

  Clothes: [
    'shirt', 'shoe', 'nike',
    'adidas', 'pants', 'hoodie',
    'jacket', 'clothes', 'uniqlo',
    'cotton on', 'h&m', 'zara',
    'slippers', 'fashion', 'cap'
  ],

  Maintenance: [
    'repair', 'service', 'workshop',
    'engine oil', 'tyre',
    'maintenance', 'car wash',
    'battery', 'aircond',
    'mechanic', 'motor service',
    'alignment', 'balancing'
  ]

}


export async function categorizeExpense(
  note,
  amount
) {

  try {

    const lowerNote = (note || '')
      .toLowerCase()
      .trim()

    // Empty note
    if (!lowerNote) {
      return 'General'
    }

    // 1. Keyword matching first
    for (const category in KEYWORDS) {

      const matched =
        KEYWORDS[category].some(keyword =>
          lowerNote.includes(keyword)
        )

      if (matched) {
        return category
      }

    }

    // 2. Fallback to Gemini AI
    const model =
      genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest'
      })

    const prompt = `
You are a spending categorizer.

Choose ONLY ONE category from this list:

${CATEGORIES.join(', ')}

Expense note:
"${note}"

Amount:
RM ${amount}

Rules:
- Reply ONLY the category name
- No explanation
- No symbols
- No extra text

Examples:
"Nasi lemak" = Food
"Shell petrol" = Fuel
"Netflix" = Entertainment
"Uniqlo shirt" = Clothes
"TNB bill" = Bills
`

    const result =
      await model.generateContent(prompt)

    const text = result.response
      .text()
      .trim()
      .replace(/[^\w\s]/g, '')

    const normalized = CATEGORIES.find(
      c => c.toLowerCase() === text.toLowerCase()
    )
    if (normalized) {
      return normalized
    }

    return 'General'

  } catch (error) {

    console.error(
      'Gemini categorize error:',
      error
    )

    return 'General'

  }

}