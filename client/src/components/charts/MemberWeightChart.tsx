import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const GREEN = '#06c384'

interface WeightPoint {
  date: string
  weight: number
}

export default function MemberWeightChart({ data }: { data: WeightPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#bbcabf', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#bbcabf', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#1a2d22',
            border: `1px solid ${GREEN}33`,
            borderRadius: 10,
            color: '#fff',
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} kg`, 'Cân nặng']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={GREEN}
          strokeWidth={2.5}
          dot={{ fill: GREEN, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
