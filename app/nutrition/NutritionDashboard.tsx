'use client'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function NutritionDashboard({ data, colors, calories }: any) {
  return (
    <div className="w-32 h-32 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={45}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-black text-white">{Math.round(calories)}</span>
        <span className="text-[8px] text-zinc-500 uppercase">Kcal</span>
      </div>
    </div>
  )
}