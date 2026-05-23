import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  increment
} from 'firebase/firestore'

import { db, auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'

import { categorizeExpense } from '../utils/gemini'
import { scanReceipt } from '../utils/receiptScanner'
import { getSmartCategory } from '../utils/smartCategory'

import { CATEGORIES, CATEGORY_ICONS } from '../constants/categories'

// compress image and convert to base64
function compressImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function AddExpense() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [receiptBase64, setReceiptBase64] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)

  const [selectedDate, setSelectedDate] = useState(new Date())

  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    note: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // ── AI CATEGORIZE ──
  const handleAICategorize = async () => {
    if (!form.note) {
      alert('Please enter a note first.')
      return
    }
    setAiLoading(true)
    try {
      const smart = await getSmartCategory(form.note)
      if (smart) {
        setForm(prev => ({ ...prev, category: smart }))
        setAiLoading(false)
        return
      }
      const category = await categorizeExpense(form.note, form.amount)
      setForm(prev => ({ ...prev, category }))
    } catch (error) {
      console.error(error)
      alert('AI failed')
    }
    setAiLoading(false)
  }

  // ── RECEIPT SCAN + BASE64 ──
  const handleReceiptScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setScanLoading(true)

    try {
      // 1. Compress and save as base64
      const base64 = await compressImage(file)
      setReceiptBase64(base64)
      setReceiptPreview(base64)

      // 2. Scan for expense data
      const result = await scanReceipt(file)

      if (!result) {
        alert('No data detected')
        setScanLoading(false)
        return
      }

      setForm(prev => ({
        ...prev,
        amount: result.amount ? String(result.amount) : '',
        note: result.note || '',
        category: result.category || 'General'
      }))

      if (result.date) {
        // handle dd/MM/yyyy format
        const parts = result.date.split('/')
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
          if (!isNaN(d)) setSelectedDate(d)
        }
      }

      alert(
`✅ Receipt scanned!

Amount: RM ${result.amount || 'Not detected'}
Category: ${result.category || 'Not detected'}
Note: ${result.note || 'Not detected'}
Date: ${result.date || 'Not detected'}`
      )

    } catch (error) {
      console.error(error)
      alert('Scan failed')
    }

    setScanLoading(false)
  }

  // ── REMOVE RECEIPT ──
  const handleRemoveReceipt = () => {
    setReceiptBase64(null)
    setReceiptPreview(null)
  }

  // ── SAVE EXPENSE ──
  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Invalid amount')
      return
    }

    setLoading(true)

    try {
      // Save expense with receipt base64
      await addDoc(collection(db, 'expenses'), {
        amount: parseFloat(form.amount),
        category: form.category,
        note: form.note,
        date: selectedDate.toISOString().slice(0, 10),
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        receiptImage: receiptBase64 || null
      })

      // Smart memory learning
      const keyword = (form.note || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
      const memoryKey = keyword.split(' ')[0]

      if (memoryKey) {
        const ref = doc(db, 'userPatterns', memoryKey)
        await setDoc(ref, {
          [form.category]: {
            count: increment(1),
            lastUsed: serverTimestamp()
          }
        }, { merge: true })
      }

      alert('Expense added successfully!')
      navigate('/')

    } catch (error) {
      console.error(error)
      alert('Failed to save expense')
    }

    setLoading(false)
  }

  return (
    <div className="page-container">
      <h2 className="page-title">➕ Add Expense</h2>

      <div className="form-card">

        {/* SCAN RECEIPT */}
        <div className="form-group">
          <label>📷 Scan Receipt (optional)</label>

          {!receiptPreview ? (
            <div className="receipt-upload-box">
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptScan}
                id="receipt-input"
                style={{ display: 'none' }}
              />
              <label htmlFor="receipt-input" className="receipt-upload-label">
                {scanLoading ? '🔍 Scanning...' : '📷 Upload Receipt'}
              </label>
            </div>
          ) : (
            <div className="receipt-preview-wrap">
              <img src={receiptPreview} alt="Receipt" className="receipt-preview-img" />
              <button className="receipt-remove-btn" onClick={handleRemoveReceipt}>✕ Remove</button>
            </div>
          )}
        </div>

        {/* AMOUNT */}
        <div className="form-group">
          <label>Amount (RM)</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
          />
        </div>

        {/* NOTE + AI */}
        <div className="form-group">
          <label>Note</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="e.g. lunch at mamak"
              style={{ flex: 1 }}
            />
            <button className="ai-btn" onClick={handleAICategorize} disabled={aiLoading}>
              {aiLoading ? '...' : '🤖 AI'}
            </button>
          </div>
        </div>

        {/* CATEGORY */}
        <div className="form-group">
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
            ))}
          </select>
        </div>

        {/* DATE */}
        <div className="form-group">
          <label>Date</label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            className="datepicker-input"
          />
        </div>

        {/* SAVE */}
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : '+ Add Expense'}
        </button>

      </div>
    </div>
  )
}

export default AddExpense