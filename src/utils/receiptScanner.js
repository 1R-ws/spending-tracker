import Tesseract from 'tesseract.js'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

/* =========================
   LEARNING FUNCTION
========================= */
async function getLearnedCategory(keyword) {

  if (!keyword || !auth.currentUser) return null

  try {

    const q = query(
      collection(db, 'expenses'),
      where('uid', '==', auth.currentUser.uid)
    )

    const snap = await getDocs(q)

    const map = {}

    snap.forEach(doc => {

      const data = doc.data()
      const note = (data.note || '').toUpperCase()
      const cat = data.category

      if (note.includes(keyword.toUpperCase())) {

        map[cat] = (map[cat] || 0) + 1

      }

    })

    let best = null
    let max = 0

    for (const cat in map) {

      if (map[cat] > max) {
        max = map[cat]
        best = cat
      }

    }

    return best

  } catch (err) {

    console.error('Learning error:', err)
    return null

  }

}

/* =========================
   MAIN FUNCTION
========================= */
export async function scanReceipt(file) {

  try {

    const { data: { text } } =
      await Tesseract.recognize(file, 'eng')

    const cleanText = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()

    /* =========================
       AMOUNT
    ========================= */
    let amount = ''

    const amountPatterns = [
      /TOTAL AMOUNT\s*RM\s*([0-9]+\.[0-9]{2})/i,
      /TOTAL\s*RM\s*([0-9]+\.[0-9]{2})/i,
      /RM\s*([0-9]+\.[0-9]{2})/i
    ]

    for (const p of amountPatterns) {
      const m = cleanText.match(p)
      if (m?.[1]) {
        amount = m[1]
        break
      }
    }

    /* =========================
       DATE
    ========================= */
    let date = ''

    const d = cleanText.match(
      /([0-9]{2}\/[0-9]{2}\/[0-9]{4})/
    )

    if (d?.[1]) {

      const [dd, mm, yyyy] = d[1].split('/')
      date = `${yyyy}-${mm}-${dd}`

    }

    /* =========================
       NOTE (SHOP NAME)
    ========================= */
    let note = 'Receipt'

    const lines = text.split('\n')

    for (const line of lines) {

      const up = line.toUpperCase()

      if (
        up.includes('ENTERPRISE') ||
        up.includes('SDN') ||
        up.includes('MOTOR') ||
        up.includes('CAFE') ||
        up.includes('SHOP')
      ) {
        note = line.trim()
        break
      }

    }

    /* =========================
       CATEGORY (BASE RULE)
    ========================= */
    let category = 'General'

    const txt = cleanText

    if (
      txt.includes('MCD') ||
      txt.includes('KFC') ||
      txt.includes('ZUS') ||
      txt.includes('TEALIVE')
    ) category = 'Food'

    else if (
      txt.includes('PETRONAS') ||
      txt.includes('SHELL')
    ) category = 'Fuel'

    else if (
      txt.includes('SHOPEE') ||
      txt.includes('AEON') ||
      txt.includes('MR DIY')
    ) category = 'Shopping'

    else if (
      txt.includes('GRAB') ||
      txt.includes('TNG')
    ) category = 'Transport'

    else if (
      txt.includes('WATSON') ||
      txt.includes('PHARMACY')
    ) category = 'Health'

    else if (
      txt.includes('MOTOR') ||
      txt.includes('WORKSHOP')
    ) category = 'Maintenance'

    /* =========================
       🧠 AI LEARNING LAYER
    ========================= */

    const learned = await getLearnedCategory(note)

    if (learned) {
      category = learned
    }

    /* =========================
       RESULT
    ========================= */

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

  } catch (err) {

    console.error(err)
    alert('Failed to scan receipt.')
    return null

  }

}