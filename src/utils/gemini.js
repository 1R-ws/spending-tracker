import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize using the environment variable token string securely
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
// 2. Fetch via secure Header Authentication channel targeting the modern flagship model path
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
// REPAIRED: Swapped model target path string to unblock tier access routes
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`

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
    'aeon', 'mid valley', 'sunway',
    'iaomi', 'xiaomi', 'hopee'
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

export async function categorizeExpense(note, amount) {
  try {
    const lowerNote = (note || '').toLowerCase().trim()

    if (!lowerNote) {
      return 'General'
    }

    // 1. Check local keywords first
    for (const category in KEYWORDS) {
      const matched = KEYWORDS[category].some(keyword =>
        lowerNote.includes(keyword)
      )
      if (matched) return category
    }

    // 2. Fetch via secure Header Authentication channel
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    // Updated route path to handle active free tier system models
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`

    const prompt = `
You are a spending categorizer.
Choose ONLY ONE category from this list: [${CATEGORIES.join(', ')}]

Expense note: "${note}"
Amount: RM ${amount}

Rules:
- Reply ONLY with the exact category name word from the list.
- No explanation, no punctuation, no extra formatting.
`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini HTTP Error Status: ${response.status}`)
    }

    const data = await response.json()
    
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const text = rawText.trim().replace(/[^\w\s]/g, '')

    const normalized = CATEGORIES.find(
      c => c.toLowerCase() === text.toLowerCase().trim()
    )
    
    return normalized || 'General'

  } catch (error) {
    console.error('Gemini classification fallback failure:', error)
    return 'General'
  }
}