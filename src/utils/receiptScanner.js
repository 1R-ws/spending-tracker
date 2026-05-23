import Tesseract from 'tesseract.js'

import { categorizeExpense } from './gemini'

export async function scanReceipt(file) {

  try {

    const {
      data: { text }
    } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => console.log(m)
      }
    )

    console.log('OCR TEXT:')
    console.log(text)

    // =========================
    // CLEAN TEXT
    // =========================

    const clean = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('CLEAN TEXT:', clean)

    // =========================
    // DETECT AMOUNT
    // =========================

    const amountPatterns = [

      /total\s*amount\s*rm?\s*(\d+\.\d{2})/i,

      /grand\s*total\s*rm?\s*(\d+\.\d{2})/i,

      /amount\s*rm?\s*(\d+\.\d{2})/i,

      /total\s*rm?\s*(\d+\.\d{2})/i,

      /rm\s*(\d+\.\d{2})/i,

      /(\d+\.\d{2})/

    ]

    let amount = ''

    for (const pattern of amountPatterns) {

      const match = clean.match(pattern)

      if (match) {

        amount = match[1]
        break

      }

    }

    // =========================
    // DETECT DATE
    // =========================

    const datePatterns = [

      /(\d{2}\/\d{2}\/\d{4})/,

      /(\d{2}-\d{2}-\d{4})/,

      /(\d{4}-\d{2}-\d{2})/

    ]

    let date = ''

    for (const pattern of datePatterns) {

      const match = clean.match(pattern)

      if (match) {

        date = match[1]
        break

      }

    }

    // =========================
    // DETECT SHOP NAME
    // =========================

    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    let note = ''

    const blacklist = [

      'rm',
      'cash',
      'receipt',
      'date',
      'member',
      'cashier',
      'sales',
      'total',
      'qty',
      'thank',
      'signature',
      'point',
      'description',
      'tel',
      'refund',
      'returnable'

    ]

    // prioritize business/company name
    for (const line of lines) {

      const lower = line.toLowerCase()

      const isBlacklisted =
        blacklist.some(word => lower.includes(word))

      const hasNumber =
        /\d/.test(line)

      const looksLikeBusiness =
        line.length > 8 &&
        !hasNumber &&
        !isBlacklisted

      if (looksLikeBusiness) {

        note = line
        break

      }

    }

    // fallback
    if (!note) {

      for (const line of lines) {

        const lower = line.toLowerCase()

        const isBad =
          blacklist.some(word => lower.includes(word)) ||
          line.length < 4

        if (!isBad) {

          note = line
          break

        }

      }

    }

    // =========================
    // FIX COMMON OCR MISTAKES
    // =========================

    const fixes = {

      'TIAM niac MOTOR ENTERPRISE':
        'TIAM MIAO MOTOR ENTERPRISE',

      'Tian mac':
        'TIAM MIAO MOTOR ENTERPRISE'

    }

    if (fixes[note]) {

      note = fixes[note]

    }

    // =========================
    // AI CATEGORY
    // =========================

    let category = 'Other'

    try {

      category = await categorizeExpense(
        note,
        amount
      )

    } catch (e) {

      console.log(e)

    }

    // =========================
    // AUTO CATEGORY FALLBACK
    // =========================

    const lowerNote = note.toLowerCase()

    if (
      lowerNote.includes('motor') ||
      lowerNote.includes('workshop') ||
      lowerNote.includes('tyre') ||
      lowerNote.includes('service') ||
      lowerNote.includes('spare')
    ) {

      category = 'Maintenance'

    }

    // =========================
    // FINAL DEBUG
    // =========================

    console.log('FINAL RESULT:', {

      amount,
      date,
      note,
      category

    })

    return {

      amount,
      date,
      note,
      category

    }

  } catch (error) {

    console.error(error)

    return {

      amount: '',
      date: '',
      note: '',
      category: 'Other'

    }

  }

}