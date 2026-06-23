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
import '../styles/addexpense.css'

function AddExpense() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [receiptPreview, setReceiptPreview] = useState(null)

  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    note: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

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
      alert('AI categorization failed.')
    }
    setAiLoading(false)
  }

  const handleReceiptScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setReceiptPreview(URL.createObjectURL(file))
    setScanLoading(true)

    try {
      const result = await scanReceipt(file)
      if (!result) {
        alert('No data detected.')
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
    } catch (error) {
      console.error(error)
      alert('Scan failed.')
    }
    setScanLoading(false)
  }

  const handleRemoveReceipt = () => {
    setReceiptPreview(null)
  }

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid amount.')
      return
    }
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      await addDoc(collection(db, 'expenses'), {
        amount: parseFloat(form.amount),
        category: form.category,
        note: form.note,
        date: selectedDate.toISOString().slice(0, 10),
        uid,
        createdAt: serverTimestamp()
      })

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
        await setDoc(doc(db, 'userPatterns', `${uid}_${keyword}`), categoryUpdate, { merge: true })
        await setDoc(doc(db, 'globalPatterns', keyword), categoryUpdate, { merge: true })
      }

      navigate('/')
    } catch (error) {
      console.error(error)
      alert('Failed to save expense.')
    }
    setLoading(false)
  }

  return (
    <div className="ae-root">


      <div className="ae-body">

        {/* SCAN ZONE */}
        {!receiptPreview ? (
          <label className={`ae-scan-zone${scanLoading ? ' scanning' : ''}`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptScan}
              style={{ display: 'none' }}
            />
            <span className="ae-scan-icon">📷</span>
            <span className="ae-scan-label">
              {scanLoading ? 'Scanning receipt…' : 'Scan receipt'}
            </span>
            <span className="ae-scan-hint">
              {scanLoading ? 'Please wait' : 'Tap to auto-fill from photo'}
            </span>
          </label>
        ) : (
          <div className="ae-preview-wrap">
            <img src={receiptPreview} alt="Receipt preview" className="ae-preview-img" />
            {scanLoading && <div className="ae-scan-overlay">Scanning…</div>}
            {!scanLoading && (
              <button className="ae-remove-btn" onClick={handleRemoveReceipt}>
                Remove receipt
              </button>
            )}
          </div>
        )}

        {/* AMOUNT */}
        <div className="ae-field">
          <label className="ae-label">Amount</label>
          <div className="ae-amount-row">
            <div className="ae-prefix">RM</div>
            <input
              className="ae-amount-input"
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              inputMode="decimal"
              step="0.01"
            />
          </div>
        </div>

        {/* NOTE + AI */}
        <div className="ae-field">
          <label className="ae-label">Note</label>
          <div className="ae-note-row">
            <input
              className="ae-note-input"
              type="text"
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="e.g. lunch at mamak"
            />
            <button
              className={`ae-ai-btn${aiLoading ? ' loading' : ''}`}
              onClick={handleAICategorize}
              disabled={aiLoading}
            >
              {aiLoading ? '…' : '✦ AI'}
            </button>
          </div>
        </div>

        {/* CATEGORY CHIPS */}
        <div className="ae-field">
          <label className="ae-label">Category</label>
          <div className="ae-chips">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`ae-chip${form.category === cat ? ' active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, category: cat }))}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* DATE */}
        <div className="ae-field">
          <label className="ae-label">Date</label>
          <div className="ae-date-wrap">
            <span className="ae-date-icon">📅</span>
            <DatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              maxDate={new Date()}
              dateFormat="dd MMMM yyyy"
              className="ae-datepicker"
            />
          </div>
        </div>

        {/* SUBMIT */}
        <button
          className="ae-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving…' : '+ Add expense'}
        </button>

      </div>
    </div>
  )
}

export default AddExpense
