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

import {
  CATEGORIES,
  CATEGORY_ICONS
} from '../constants/categories'

function AddExpense() {

  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState(new Date())

  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    note: ''
  })

  // =========================
  // FORM CHANGE
  // =========================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  // =========================
  // AI CATEGORIZE v2 (MEMORY FIRST)
  // =========================
  const handleAICategorize = async () => {

    if (!form.note) {
      alert('Please enter a note first.')
      return
    }

    setAiLoading(true)

    try {

      // 1. MEMORY FIRST (personal → global)
      const smart = await getSmartCategory(form.note)

      if (smart) {
        setForm(prev => ({ ...prev, category: smart }))
        setAiLoading(false)
        return
      }

      // 2. GEMINI FALLBACK
      const category = await categorizeExpense(
        form.note,
        form.amount
      )

      setForm(prev => ({
        ...prev,
        category
      }))

    } catch (error) {
      console.error(error)
      alert('AI failed')
    }

    setAiLoading(false)
  }

  // =========================
  // RECEIPT SCAN
  // =========================
  const handleReceiptScan = async (e) => {

    const file = e.target.files[0]
    if (!file) return

    setScanLoading(true)

    try {

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
        category: result.category || 'Food'
      }))

      if (result.date) {
        const d = new Date(result.date)
        if (!isNaN(d)) setSelectedDate(d)
      }

      alert(
`Receipt scanned successfully!

Amount: ${result.amount || 'Not detected'}
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

  // =========================
  // SAVE + MEMORY LEARNING (Option C: Global + Personal)
  // =========================
  const handleSubmit = async () => {

    if (!form.amount || Number(form.amount) <= 0) {
      alert('Invalid amount')
      return
    }

    setLoading(true)

    try {

      const uid = auth.currentUser?.uid

      // 1. SAVE EXPENSE
      await addDoc(collection(db, 'expenses'), {
        amount: parseFloat(form.amount),
        category: form.category,
        note: form.note,
        date: selectedDate.toISOString().slice(0, 10),
        uid,
        createdAt: serverTimestamp()
      })

      // 2. EXTRACT MEMORY KEY
      const keyword = (form.note || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
        .split(' ')[0]

      if (keyword && uid) {

        const categoryUpdate = {
          [form.category]: {
            count: increment(1),
            lastUsed: serverTimestamp()
          }
        }

        // 3A. PERSONAL MEMORY  →  userPatterns/{uid}_{keyword}
        //     Firestore rule: patternId.startsWith(uid + "_")  ✅
        await setDoc(
          doc(db, 'userPatterns', `${uid}_${keyword}`),
          categoryUpdate,
          { merge: true }
        )

        // 3B. GLOBAL COMMUNITY MEMORY  →  globalPatterns/{keyword}
        //     Firestore rule: any authenticated user can read/write  ✅
        await setDoc(
          doc(db, 'globalPatterns', keyword),
          categoryUpdate,
          { merge: true }
        )

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

        {/* SCAN */}
        <div className="form-group">
          <label>Scan Receipt</label>

          <input
            type="file"
            accept="image/*"
            onChange={handleReceiptScan}
          />

          {scanLoading && <small>Scanning...</small>}
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
              style={{ flex: 1 }}
            />

            <button
              className="ai-btn"
              onClick={handleAICategorize}
              disabled={aiLoading}
            >
              {aiLoading ? '...' : 'AI'}
            </button>

          </div>
        </div>

        {/* CATEGORY */}
        <div className="form-group">
          <label>Category</label>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {cat}
              </option>
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
          />
        </div>

        {/* SAVE */}
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving...' : '+ Add Expense'}
        </button>

      </div>

    </div>
  )
}

export default AddExpense
