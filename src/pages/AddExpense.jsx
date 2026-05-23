import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import { categorizeExpense } from '../utils/gemini'
import { scanReceipt } from '../utils/receiptScanner'

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

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    })

  }

  // =========================
  // AI CATEGORY
  // =========================

  const handleAICategorize = async () => {

    if (!form.note) {

      alert('Please enter a note first.')
      return

    }

    setAiLoading(true)

    try {

      const category = await categorizeExpense(
        form.note,
        form.amount
      )

      if (category) {

        setForm(prev => ({
          ...prev,
          category
        }))

        alert(`AI detected category: ${category}`)

      } else {

        alert('AI could not detect category.')

      }

    } catch (error) {

      console.error(error)
      alert('AI categorize failed.')

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

      console.log('SCAN RESULT:', result)

      if (!result) {

        alert('No data detected from receipt.')
        setScanLoading(false)
        return

      }

      // =====================
      // AUTO FILL FORM
      // =====================

      setForm(prev => ({
        ...prev,

        amount:
          result.amount
            ? String(result.amount)
            : '',

        note:
          result.note || '',

        category:
          result.category || 'Food'
      }))

      // =====================
      // AUTO DATE
      // =====================

      if (result.date) {

        const detectedDate = new Date(result.date)

        if (!isNaN(detectedDate)) {

          setSelectedDate(detectedDate)

        }

      }

      // =====================
      // SHOW DETECTED DATA
      // =====================

      alert(
`Receipt scanned successfully!

Amount: ${result.amount || 'Not detected'}

Category: ${result.category || 'Not detected'}

Note: ${result.note || 'Not detected'}

Date: ${result.date || 'Not detected'}`
      )

    } catch (error) {

      console.error(error)

      alert('Failed to scan receipt.')

    }

    setScanLoading(false)

  }

  // =========================
  // SAVE EXPENSE
  // =========================

  const handleSubmit = async () => {

    if (!form.amount || Number(form.amount) <= 0) {

      alert('Please enter valid amount.')
      return

    }

    setLoading(true)

    try {

      await addDoc(
        collection(db, 'expenses'),
        {
          amount: parseFloat(form.amount),

          category: form.category,

          note: form.note,

          date: selectedDate
            .toISOString()
            .slice(0, 10),

          uid: auth.currentUser?.uid,

          createdAt: serverTimestamp()
        }
      )

      alert('Expense added successfully!')

      navigate('/')

    } catch (error) {

      console.error(error)

      alert('Failed to add expense.')

    }

    setLoading(false)

  }

  return (

    <div className="page-container">

      <h2 className="page-title">
        ➕ Add Expense
      </h2>

      <div className="form-card">

        {/* RECEIPT SCAN */}

        <div className="form-group">

          <label>
            Scan Receipt
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={handleReceiptScan}
          />

          <small className="ai-hint">

            Upload receipt image to auto detect amount, date & category

          </small>

          {scanLoading && (

            <div
              style={{
                marginTop: '10px',
                fontSize: '13px'
              }}
            >
              Scanning receipt...
            </div>

          )}

        </div>

        {/* AMOUNT */}

        <div className="form-group">

          <label>
            Amount (RM)
          </label>

          <input
            type="number"
            name="amount"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            min="0"
            step="0.01"
          />

        </div>

        {/* NOTE */}

        <div className="form-group">

          <label>
            Note
          </label>

          <div
            style={{
              display: 'flex',
              gap: '8px'
            }}
          >

            <input
              type="text"
              name="note"
              placeholder="e.g. FamilyMart"
              value={form.note}
              onChange={handleChange}
              style={{ flex: 1 }}
            />

            <button
              className="ai-btn"
              onClick={handleAICategorize}
              disabled={aiLoading}
            >

              {aiLoading ? '...' : '🤖 AI'}

            </button>

          </div>

        </div>

        {/* CATEGORY */}

        <div className="form-group">

          <label>
            Category
          </label>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
          >

            {CATEGORIES.map(cat => (

              <option
                key={cat}
                value={cat}
              >

                {CATEGORY_ICONS[cat]} {cat}

              </option>

            ))}

          </select>

        </div>

        {/* DATE */}

        <div className="form-group">

          <label>
            Date
          </label>

          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd/MM/yyyy"
            className="datepicker-input"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            maxDate={new Date()}
          />

        </div>

        {/* SAVE */}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >

          {loading
            ? 'Saving...'
            : '+ Add Expense'}

        </button>

      </div>

    </div>

  )

}

export default AddExpense