'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

// Graphique Calories (Cercle)
export function CalorieChart({ data, colors, calories }: any) {
  return (
    <div className="w-32 h-32 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
            {data.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-black text-white">{Math.round(calories)}</span>
        <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">Kcal</span>
      </div>
    </div>
  )
}

// Graphique de Poids (Ligne)
export function WeightChart({ data }: any) {
  return (
    <div className="w-full h-48 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }}
            itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
            labelStyle={{ display: 'none' }}
          />
          <Line 
            type="monotone" 
            dataKey="poids" 
            stroke="#f97316" 
            strokeWidth={4} 
            dot={{ fill: '#f97316', strokeWidth: 2, r: 4, stroke: '#000' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}