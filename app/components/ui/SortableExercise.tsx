'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableExercise({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : 'auto',
      position: 'relative',
    }} {...attributes}>
      <div {...listeners} style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab', touchAction: 'none', zIndex: 10,
        color: '#3A3528', fontSize: 18, userSelect: 'none',
      }}>⠿</div>
      <div style={{ paddingLeft: 36 }}>
        {children}
      </div>
    </div>
  )
}
