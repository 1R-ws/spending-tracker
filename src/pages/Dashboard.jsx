import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { CATEGORIES, COLORS } from '../constants/categories'
import { useExpenses } from '../hooks/useExpenses'

function Dashboard() {

  const { expenses, loading } = useExpenses()

  const thisMonth = new Date().toISOString().slice(0, 7)

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const thisMonthExp = expenses.filter(
    e => e.date?.startsWith(thisMonth)
  )

  const total = thisMonthExp.reduce(
    (s, e) => s + e.amount,
    0
  )

  const dailyAvg = total / new Date().getDate()

  // Pie chart data
  const pieData = CATEGORIES
    .map(cat => ({
      name: cat,
      value: thisMonthExp
        .filter(e => e.category === cat)
        .reduce((s, e) => s + e.amount, 0)
    }))
    .filter(d => d.value > 0)

  // Bar chart data - last 6 months
  const barData = Array.from({ length: 6 }, (_, i) => {

    const d = new Date()

    d.setMonth(d.getMonth() - (5 - i))

    const key = d.toISOString().slice(0, 7)

    const label = d.toLocaleString('default', {
      month: 'short'
    })

    const total = expenses
      .filter(e => e.date?.startsWith(key))
      .reduce((s, e) => s + e.amount, 0)

    return {
      month: label,
      total
    }

  })

  return (
    <div className="page-container">

      <h2 className="page-title">Dashboard</h2>

      {/* Summary Cards */}
      <div className="metric-row">

        <div className="metric-card">
          <div className="metric-label">
            This Month
          </div>

          <div className="metric-value">
            RM {total.toFixed(2)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            Transactions
          </div>

          <div className="metric-value">
            {thisMonthExp.length}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            Daily Avg
          </div>

          <div className="metric-value">
            RM {dailyAvg.toFixed(2)}
          </div>
        </div>

      </div>

      {/* Pie Chart */}
      <div className="chart-card">

        <h3 className="chart-title">
          Spending by Category
        </h3>

        {pieData.length === 0 ? (

          <div className="empty">
            No expenses this month yet.
          </div>

        ) : (

          <>

            <ResponsiveContainer
              width="100%"
              height={250}
            >

              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >

                  {pieData.map((entry) => (

                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name]}
                    />

                  ))}

                </Pie>

                <Tooltip
                  formatter={(value) =>
                    `RM ${value.toFixed(2)}`
                  }
                />

              </PieChart>

            </ResponsiveContainer>

            <div className="legend">

              {pieData.map(d => (

                <span
                  key={d.name}
                  className="legend-item"
                >

                  <span
                    className="legend-dot"
                    style={{
                      background: COLORS[d.name]
                    }}
                  ></span>

                  {d.name} — RM {d.value.toFixed(2)}

                </span>

              ))}

            </div>

          </>

        )}

      </div>

      {/* Bar Chart */}
      <div className="chart-card">

        <h3 className="chart-title">
          Monthly Spending (Last 6 Months)
        </h3>

        <ResponsiveContainer
          width="100%"
          height={200}
        >

          <BarChart data={barData}>

            <XAxis dataKey="month" />

            <YAxis
              tickFormatter={v => `RM${v}`}
            />

            <Tooltip
              formatter={(value) =>
                `RM ${value.toFixed(2)}`
              }
            />

            <Bar
              dataKey="total"
              fill="#667eea"
              radius={[4, 4, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  )
}

export default Dashboard