import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { TOKEN_COLORS } from '@/styles/token-values'

interface WeightPoint {
  date: string
  weight: number
}

export default function MemberWeightChart({ data }: { data: WeightPoint[] }) {
  const { t } = useTranslation('member')
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: TOKEN_COLORS.textSecondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: TOKEN_COLORS.textSecondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: TOKEN_COLORS.bgElevatedGreen,
            border: `1px solid ${TOKEN_COLORS.green}33`,
            borderRadius: 10,
            color: '#fff',
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} kg`, t('progress.weightLabel')]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={TOKEN_COLORS.green}
          strokeWidth={2.5}
          dot={{ fill: TOKEN_COLORS.green, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
