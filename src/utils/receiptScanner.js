export async function scanReceipt(file) {
  try {

    // Convert file to base64
    const base64 = await fileToBase64(file)

    // ========================
    // OCR.space API
    // ========================
    const formData = new FormData()
    formData.append('base64Image', base64)
    formData.append('language', 'eng')
    formData.append('OCREngine', '2') // Engine 2 is better for receipts
    formData.append('isTable', 'true')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_OCR_API_KEY
      },
      body: formData
    })

    const data = await response.json()

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      console.error('OCR failed:', data)
      return { amount: '', date: '', note: '', category: 'General' }
    }

    const text = data.ParsedResults[0].ParsedText
    console.log('OCR TEXT:', text)

    const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    console.log('CLEAN TEXT:', clean)

    // ========================
    // DETECT AMOUNT
    // ========================
    const allAmounts = []
    const allAmountRegex = /(\d+\.\d{2})/g
    let m
    while ((m = allAmountRegex.exec(clean)) !== null) {
      allAmounts.push(parseFloat(m[1]))
    }

    let amount = ''

    const grandTotalMatch = clean.match(/grand\s*total[^0-9]*(\d+\.\d{2})/i)
    const totalAmountMatch = clean.match(/total\s*amount[^0-9]*(\d+\.\d{2})/i)
    const totalMatch = clean.match(/\btotal\b[^0-9]*(\d+\.\d{2})/i)
    const rmMatch = clean.match(/rm\s*(\d+\.\d{2})/i)

    if (grandTotalMatch) {
      const gtVal = parseFloat(grandTotalMatch[1])
      const maxAmt = allAmounts.length > 0 ? Math.max(...allAmounts) : 0
      amount = gtVal >= maxAmt * 0.8 ? grandTotalMatch[1] : maxAmt.toFixed(2)
    } else if (totalAmountMatch) {
      amount = totalAmountMatch[1]
    } else if (totalMatch) {
      amount = totalMatch[1]
    } else if (rmMatch) {
      amount = rmMatch[1]
    } else if (allAmounts.length > 0) {
      amount = Math.max(...allAmounts).toFixed(2)
    }

    // ========================
    // DETECT DATE
    // ========================
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}-\d{2}-\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /date\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
    ]

    let date = ''
    for (const pattern of datePatterns) {
      const match = clean.match(pattern)
      if (match) { date = match[1]; break }
    }

    // ========================
    // DETECT SHOP NAME
    // ========================
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    const blacklist = [
      'rm', 'cash', 'receipt', 'date', 'member', 'cashier',
      'sales', 'total', 'qty', 'thank', 'signature', 'point',
      'description', 'tel', 'refund', 'returnable', 'invoice',
      'payment', 'credit', 'debit', 'rounding', 'subtotal',
      'item', 'price', 'discount', 'change', 'balance',
      'jalan', 'lorong', 'taman', 'seksyen', 'http', 'www',
      'bukit', 'rawang', 'selangor', 'kuala', 'lumpur',
      'tax', 'gst', 'sst', 'reg', 'no.', 'fax'
    ]

    const businessKeywords = [
      'sdn bhd', 'enterprise', 'trading', 'store', 'shop',
      'market', 'supermarket', 'restaurant', 'cafe', 'kedai',
      'holdings', 'industries', 'services', 'motor', 'auto',
      'pharmacy', 'clinic', 'hardware', 'construction',
      'petrol', 'station', 'food', 'bakery', 'salon'
    ]

    let note = ''

    // Pass 1 — business keywords in first 8 lines
    for (const line of lines.slice(0, 8)) {
      const lower = line.toLowerCase()
      if (businessKeywords.some(w => lower.includes(w)) && line.length > 5) {
        note = line
        break
      }
    }

    // Pass 2 — ALL CAPS line in first 5 lines
    if (!note) {
      for (const line of lines.slice(0, 5)) {
        const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line)
        const hasNumber = /^\d/.test(line)
        const isBlacklisted = blacklist.some(w => line.toLowerCase().includes(w))
        const isPostcode = /\d{5}/.test(line)
        if (isAllCaps && !hasNumber && !isBlacklisted && !isPostcode && line.length > 5) {
          note = line
          break
        }
      }
    }

    // Pass 3 — first clean line
    if (!note) {
      for (const line of lines) {
        const lower = line.toLowerCase()
        const isBlacklisted = blacklist.some(w => lower.includes(w))
        const hasNumber = /\d/.test(line)
        const isPostcode = /\d{5}/.test(line)
        if (!isBlacklisted && !hasNumber && !isPostcode && line.length > 5) {
          note = line
          break
        }
      }
    }

    // Fallback
    if (!note && lines.length > 0) note = lines[0]

    // Clean up
    note = note.replace(/[^\w\s\-&()]/g, '').trim()

    // ========================
    // KEYWORD CATEGORY
    // ========================
    const lowerNote = note.toLowerCase()
    const lowerClean = clean.toLowerCase()
    let category = 'General'

    if (
      lowerNote.includes('motor') || lowerNote.includes('workshop') ||
      lowerNote.includes('tyre') || lowerNote.includes('spare') ||
      lowerNote.includes('auto') || lowerClean.includes('motor')
    ) category = 'Maintenance'

    else if (
      lowerNote.includes('petronas') || lowerNote.includes('shell') ||
      lowerNote.includes('petrol') || lowerNote.includes('fuel') ||
      lowerNote.includes('bhp') || lowerNote.includes('caltex')
    ) category = 'Fuel'

    else if (
      lowerNote.includes('restaurant') || lowerNote.includes('cafe') ||
      lowerNote.includes('kedai makan') || lowerNote.includes('food') ||
      lowerClean.includes('nasi') || lowerClean.includes('roti') ||
      lowerClean.includes('mamak') || lowerClean.includes('makan')
    ) category = 'Food'

    else if (
      lowerNote.includes('pasaraya') || lowerNote.includes('supermarket') ||
      lowerNote.includes('market') || lowerNote.includes('store') ||
      lowerClean.includes('baju') || lowerClean.includes('shirt') ||
      lowerClean.includes('jersey') || lowerClean.includes('clothes')
    ) category = 'Shopping'

    else if (
      lowerNote.includes('clinic') || lowerNote.includes('pharmacy') ||
      lowerNote.includes('hospital') || lowerNote.includes('klinik') ||
      lowerClean.includes('panadol') || lowerClean.includes('ubat')
    ) category = 'Health'

    else if (
      lowerNote.includes('telekom') || lowerNote.includes('unifi') ||
      lowerNote.includes('celcom') || lowerNote.includes('maxis') ||
      lowerNote.includes('digi') || lowerNote.includes('tnb') ||
      lowerNote.includes('syabas') || lowerNote.includes('indah water')
    ) category = 'Bills'

    else if (
      lowerNote.includes('grab') || lowerNote.includes('myrapid') ||
      lowerNote.includes('lrt') || lowerNote.includes('mrt') ||
      lowerNote.includes('bus') || lowerNote.includes('taxi')
    ) category = 'Transport'

    // ========================
    // FINAL RESULT
    // ========================
    console.log('FINAL RESULT:', { amount, date, note, category })
    return { amount, date, note, category }

  } catch (error) {
    console.error('Scanner error:', error)
    return { amount: '', date: '', note: '', category: 'General' }
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