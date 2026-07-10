import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'
import '../styles/dashboard.css'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function Dashboard() {
  const [expenses, setExpenses] = useState([])
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth())
  const [selectedCategory, setSelectedCategory] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let unsubSnapshot = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnapshot) unsubSnapshot()
      if (!user) { setExpenses([]); return }
      const q = query(
        collection(db, 'expenses'),
        where('uid', '==', user.uid)
      )
      unsubSnapshot = onSnapshot(q, (snapshot) => {
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      })
    })
    return () => { unsubAuth(); if (unsubSnapshot) unsubSnapshot() }
  }, [])

  const year = new Date().getFullYear()
  const monthKey = `${year}-${String(activeMonth + 1).padStart(2, '0')}`
  const monthExp = expenses.filter(e => e.date?.startsWith(monthKey))
  const total = monthExp.reduce((s, e) => s + Number(e.amount || 0), 0)

  const pieData = CATEGORIES
    .map(cat => ({
      name: cat,
      value: monthExp
        .filter(e => e.category === cat)
        .reduce((s, e) => s + Number(e.amount || 0), 0)
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const filteredExp = selectedCategory
    ? monthExp.filter(e => e.category === selectedCategory)
    : monthExp

  const recentExp = [...filteredExp]
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5)

  const filteredTotal = filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0)

  const [trendMonths, setTrendMonths] = useState(6)

  const trendData = Array.from({ length: trendMonths }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (trendMonths - 1 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = expenses
      .filter(e => e.date?.startsWith(key))
      .filter(e => !selectedCategory || e.category === selectedCategory)
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    return { month: MONTHS[d.getMonth()], total: parseFloat(total.toFixed(2)) }
  })

  const handleCatClick = (catName) => {
    setSelectedCategory(prev => prev === catName ? null : catName)
  }

  return (
    <div className="dash-root">

      {/* MONTH SCROLL */}
      <div className="month-scroll">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            className={`month-btn${activeMonth === i ? ' active' : ''}`}
            onClick={() => {
              setActiveMonth(i)
              setSelectedCategory(null)
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* DONUT */}
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              strokeWidth={0}
            >
              {pieData.length > 0
                ? pieData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name] || '#9ca3af'}
                      opacity={!selectedCategory || selectedCategory === entry.name ? 1 : 0.2}
                    />
                  ))
                : <Cell fill="var(--dash-border)" />
              }
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="donut-center">
          <div className="donut-label">
            {selectedCategory ? selectedCategory : 'This month'}
          </div>
          <div className="donut-total">
            RM {(selectedCategory ? filteredTotal : total).toFixed(2)}
          </div>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="cat-scroll">
        {pieData.length === 0 ? (
          <div className="dash-empty">No expenses this month.</div>
        ) : pieData.map(cat => (
          <div
            key={cat.name}
            className={`cat-pill${selectedCategory === cat.name ? ' active' : ''}`}
            onClick={() => handleCatClick(cat.name)}
            style={{ '--pill-color': COLORS[cat.name] || '#9ca3af' }}
          >
            <div className="cat-pill-icon" style={{ background: (COLORS[cat.name] || '#9ca3af') + '30', color: COLORS[cat.name] || '#9ca3af' }}>
              {CATEGORY_ICONS[cat.name] || '📦'}
            </div>
            <div className="cat-pill-name">{cat.name}</div>
            <div className="cat-pill-amt">RM {cat.value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* TREND CHART */}
      <div className="trend-section">
        <div className="trend-header">
          <span className="trend-title">{selectedCategory ? `${selectedCategory} Trend` : 'Spending Trend'}</span>
          <div className="trend-range">
            {[3, 6, 12].map(n => (
              <button
                key={n}
                className={`trend-range-btn${trendMonths === n ? ' active' : ''}`}
                onClick={() => setTrendMonths(n)}
              >
                {n}M
              </button>
            ))}
          </div>
        </div>
        <div className="trend-chart-wrap">
          {(() => {
            const color = selectedCategory ? (COLORS[selectedCategory] || '#534AB7') : '#534AB7'
            return (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--dash-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--dash-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [`RM ${v.toFixed(2)}`, selectedCategory || 'Total']}
                    contentStyle={{ background: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: 12, fontSize: 13 }}
                    labelStyle={{ color: 'var(--dash-text)', fontWeight: 700 }}
                    itemStyle={{ color }}
                  />
                  <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2.5} fill="url(#trendGrad)" dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="recent-section">
        <div className="recent-header">
          <span className="recent-title">
            {selectedCategory ? selectedCategory : 'Recent'}
          </span>
          <button className="see-all" onClick={() => navigate('/history')}>
            See all
          </button>
        </div>

        {recentExp.length === 0 ? (
          <div className="dash-empty">No transactions yet.</div>
        ) : recentExp.map(e => (
          <div key={e.id} className="tx-item">
            <div
              className="tx-icon"
              style={{ background: (COLORS[e.category] || '#9ca3af') + '22' }}
            >
              {CATEGORY_ICONS[e.category] || '📦'}
            </div>
            <div className="tx-info">
              <div className="tx-name">{e.note || e.category}</div>
              <div className="tx-meta">{e.category} · {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
            </div>
            <div className="tx-amount">- RM {Number(e.amount || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Dashboard
