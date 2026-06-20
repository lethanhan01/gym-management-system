import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ProgressPoint {
  date: string
  weight: number | null
  bmi: number | null
}

export default function StudentProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" stroke="#8ab89c" fontSize={11} />
        <YAxis yAxisId="weight" stroke="#42e09e" fontSize={11} />
        <YAxis yAxisId="bmi" orientation="right" stroke="#bbcabf" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: '#0f1c16',
            border: '1px solid rgba(66,224,158,0.2)',
            borderRadius: 12,
          }}
        />
        <Legend />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Cân nặng"
          stroke="#42e09e"
          strokeWidth={2}
          connectNulls
        />
        <Line
          yAxisId="bmi"
          type="monotone"
          dataKey="bmi"
          name="BMI"
          stroke="#bbcabf"
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
