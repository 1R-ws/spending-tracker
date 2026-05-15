import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other']

function AddExpense() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    note: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
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
        uid: auth.currentUser.uid,
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
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
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
            calendarClassName="custom-calendar"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            maxDate={new Date()}
          />
        </div>

        <div className="form-group">
          <label>Note (optional)</label>
          <input
            type="text"
            name="note"
            placeholder="e.g. lunch at mamak"
            value={form.note}
            onChange={handleChange}
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