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

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

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
  // FORM UPDATE
  // =========================
  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // =========================
  // AI CATEGORY (MEMORY + GEMINI)
  // =========================
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

      const category = await categorizeExpense(
        form.note,
        form.amount
      )

      setForm(prev => ({ ...prev, category }))

    } catch (err) {
      console.error(err)
      alert('AI failed')
    }

    setAiLoading(false)
  }

  // =========================
  // RECEIPT SCAN (FIXED)
  // =========================
  const handleReceiptScan = async (e) => {

    const file = e.target.files[0]
    if (!file) return

    setScanLoading(true)

    try {

      const result = await scanReceipt(file)

      const imageUrl = await uploadReceiptImage(file)
      if (!result) {
        alert('No data detected')
        setScanLoading(false)
        return
      }

      // ✅ SAFE AMOUNT CLEANING
      const cleanAmount = result.amount
        ? parseFloat(
            String(result.amount)
              .replace(/[^0-9.]/g, '')
          )
        : ''

      setForm(prev => ({
        ...prev,
        amount: cleanAmount ? String(cleanAmount) : '',
        note: result.note || '',
        category: result.category || 'Food',
        imageUrl: imageUrl
      }))

      if (result.date) {
        const d = new Date(result.date)
        if (!isNaN(d)) setSelectedDate(d)
      }

      // ONLY ONE ALERT HERE
      alert(
`Receipt scanned successfully!

Amount: ${cleanAmount || 'Not detected'}
Category: ${result.category || 'Not detected'}
Note: ${result.note || 'Not detected'}
Date: ${result.date || 'Not detected'}`
      )

    } catch (err) {
      console.error(err)
      alert('Scan failed')
    }

    setScanLoading(false)
  }

  // =========================
  // SAVE EXPENSE (FIXED STABLE)
  // =========================
  const handleSubmit = async () => {

    if (!auth.currentUser) {
      alert('Please login first')
      return
    }

    if (!form.amount || isNaN(Number(form.amount))) {
      alert('Invalid amount')
      return
    }

    setLoading(true)

    try {

      const payload = {
        amount: parseFloat(form.amount),
        category: form.category,
        note: form.note,
        date: selectedDate.toISOString().slice(0, 10),
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      }

      console.log('Saving expense:', payload)

      await addDoc(collection(db, 'expenses'), payload)

      // =========================
      // MEMORY SYSTEM
      // =========================
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

    } catch (err) {
      console.error(err)
      alert('Failed to save expense')
    }

    setLoading(false)
  }

  const uploadReceiptImage = async (file) => {

  const fileRef = ref(
    storage,
    `receipts/${auth.currentUser.uid}/${Date.now()}.jpg`
  )

  await uploadBytes(fileRef, file)

  const url = await getDownloadURL(fileRef)

  return url
}
  
  // =========================
  // UI
  // =========================
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

          {scanLoading && (
            <small>Scanning receipt...</small>
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
          />
        </div>

        {/* NOTE */}
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