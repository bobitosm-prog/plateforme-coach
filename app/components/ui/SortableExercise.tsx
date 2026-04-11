'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React from 'react'

interface Props {
  id: string
  exerciseName: string
  children: (dragHandleProps: any) => React.ReactNode
}

export default function SortableExercise({ id, exerciseName, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : 'auto',
      position: 'relative',
    }} {...attributes}>
      {isDragging ? (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(212,168,67,0.15)',
          border: '1.5px solid #D4A843',
          borderRadius: 12,
          fontFamily: "'Barlow Condensed'",
          fontSize: 15,
          fontWeight: 700,
          color: '#D4A843',
          letterSpacing: 1,
          textTransform: 'uppercase',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>{exerciseName}</div>
      ) : (
        <>{children({ ...listeners, style: { cursor: 'grab', touchAction: 'none' } })}</>
      )}
    </div>
  )
}
