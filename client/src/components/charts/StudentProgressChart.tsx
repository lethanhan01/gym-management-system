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
import { useTranslation } from 'react-i18next'
import { TOKEN_COLORS } from '@/styles/token-values'

interface ProgressPoint {
  date: string
  weight: number | null
  bmi: number | null
}

export default function StudentProgressChart({ data }: { data: ProgressPoint[] }) {
  const { t } = useTranslation('trainer')
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" stroke={TOKEN_COLORS.textMuted} fontSize={11} />
        <YAxis yAxisId="weight" stroke={TOKEN_COLORS.teal} fontSize={11} />
        <YAxis yAxisId="bmi" orientation="right" stroke={TOKEN_COLORS.textSecondary} fontSize={11} />
        <Tooltip
          contentStyle={{
            background: TOKEN_COLORS.bgCard,
            border: '1px solid rgba(66,224,158,0.2)',
            borderRadius: 12,
          }}
        />
        <Legend />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name={t('students.weightLabel')}
          stroke={TOKEN_COLORS.teal}
          strokeWidth={2}
          connectNulls
        />
        <Line
          yAxisId="bmi"
          type="monotone"
          dataKey="bmi"
          name="BMI"
          stroke={TOKEN_COLORS.textSecondary}
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
