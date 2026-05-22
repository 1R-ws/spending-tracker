import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { categorizeExpense } from '../utils/gemini'

import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'

function AddExpense() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
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
      alert('Please enter a note first so AI can categorize it.')
      return
    }
    setAiLoading(true)
    const category = await categorizeExpense(form.note, form.amount)
    if (category) {
      setForm({ ...form, category })
      setAiMessage(`AI detected: ${category}`)
    } else {
      alert('AI could not categorize. Please select manually.')
    }
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) {
      alert('Please enter a valid amount.')
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: parseFloat(form.amount),
        category: form.category,
        date: selectedDate.toISOString().slice(0, 10),
        note: form.note,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      })
      alert('Expense added successfully!')
      navigate('/')
    } catch (error) {
      console.error(error)
      alert('Failed to add expense. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <h2 className="page-title">Add Expense</h2>
      <div className="form-card">

        <div className="form-group">
          <label>Amount (RM)</label>
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

        <div className="form-group">
          <label>Note (optional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              name="note"
              placeholder="e.g. lunch at mamak"
              value={form.note}
              onChange={handleChange}
              style={{ flex: 1 }}
            />
            <button
              className="ai-btn"
              onClick={handleAICategorize}
              disabled={aiLoading}
              title="Let AI detect category"
            >
              {aiLoading ? '...' : '🤖 AI'}
            </button>
          </div>
          <small className="ai-hint">Type a note then click 🤖 AI to auto detect category</small>
        </div>

        <div className="form-group">
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
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

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : '+ Add Expense'}
        </button>

      </div>
    </div>
  )
}

export default AddExpense