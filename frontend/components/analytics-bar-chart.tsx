'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartDataItem = {
  name: string
  value: number
}

export default function AnalyticsBarChart({
  data,
  maxValue,
}: {
  data: ChartDataItem[]
  maxValue?: number | null
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="name" tick={{ fill: '#0f172a', fontSize: 12 }} />
          <YAxis
            tick={{ fill: '#0f172a', fontSize: 12 }}
            domain={[0, maxValue && maxValue > 0 ? maxValue : 'auto']}
          />
          <Tooltip />
          <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
