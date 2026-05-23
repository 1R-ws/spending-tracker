import Tesseract from 'tesseract.js'

export async function scanReceipt(file) {

  try {

    const {
      data: { text }
    } = await Tesseract.recognize(
      file,
      'eng'
    )

    console.log('OCR TEXT:')
    console.log(text)

    const cleanText = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()

    console.log('CLEAN TEXT:', cleanText)

    /* =========================
       AMOUNT DETECTION
    ========================= */

    let amount = ''

    const amountPatterns = [

      /TOTAL AMOUNT\s*RM\s*([0-9]+\.[0-9]{2})/i,
      /TOTAL\s*RM\s*([0-9]+\.[0-9]{2})/i,
      /AMOUNT\s*RM\s*([0-9]+\.[0-9]{2})/i,
      /RM\s*([0-9]+\.[0-9]{2})/i

    ]

    for (const pattern of amountPatterns) {

      const match = cleanText.match(pattern)

      if (match?.[1]) {

        amount = match[1]
        break

      }

    }

    /* =========================
       DATE DETECTION
    ========================= */

    let date = ''

    const dateMatch = cleanText.match(
      /([0-9]{2}\/[0-9]{2}\/[0-9]{4})/
    )

    if (dateMatch?.[1]) {

      const parts = dateMatch[1].split('/')

      date =
        `${parts[2]}-${parts[1]}-${parts[0]}`

    }

    /* =========================
       SHOP / NOTE DETECTION
    ========================= */

    let note = 'Receipt'

    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    for (const line of lines) {

      const upper = line.toUpperCase()

      if (

        upper.includes('SDN') ||
        upper.includes('ENTERPRISE') ||
        upper.includes('MOTOR') ||
        upper.includes('RESTAURANT') ||
        upper.includes('CAFE') ||
        upper.includes('SHOP') ||
        upper.includes('STORE')

      ) {

        note = line
        break

      }

    }

    /* =========================
       CATEGORY DETECTION
    ========================= */

    let category = 'General'

    // FOOD
    if (

      cleanText.includes('MCD') ||
      cleanText.includes('MCDONALD') ||
      cleanText.includes('KFC') ||
      cleanText.includes('TEALIVE') ||
      cleanText.includes('ZUS') ||
      cleanText.includes('RESTAURANT') ||
      cleanText.includes('CAFE')

    ) {

      category = 'Food'

    }

    // FUEL
    else if (

      cleanText.includes('PETRONAS') ||
      cleanText.includes('SHELL') ||
      cleanText.includes('PETROL') ||
      cleanText.includes('SETEL')

    ) {

      category = 'Fuel'

    }

    // SHOPPING
    else if (

      cleanText.includes('MR DIY') ||
      cleanText.includes('LOTUSS') ||
      cleanText.includes('LOTUS') ||
      cleanText.includes('AEON') ||
      cleanText.includes('SHOPEE')

    ) {

      category = 'Shopping'

    }

    // TRANSPORT
    else if (

      cleanText.includes('GRAB') ||
      cleanText.includes('TNG') ||
      cleanText.includes('TOUCH N GO')

    ) {

      category = 'Transport'

    }

    // HEALTH
    else if (

      cleanText.includes('WATSON') ||
      cleanText.includes('GUARDIAN') ||
      cleanText.includes('PHARMACY')

    ) {

      category = 'Health'

    }

    // MAINTENANCE
    else if (

      cleanText.includes('MOTOR') ||
      cleanText.includes('WORKSHOP') ||
      cleanText.includes('SPARE PART')

    ) {

      category = 'Maintenance'

    }

    alert(
`Receipt scanned successfully!

Amount: ${amount || 'Not detected'}
Category: ${category}
Note: ${note || 'Not detected'}
Date: ${date || 'Not detected'}`
    )

    return {

      amount,
      category,
      note,
      date

    }

  } catch (error) {

    console.error(error)

    alert('Failed to scan receipt.')

    return null

  }

}