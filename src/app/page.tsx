'use client'

import { useState, useEffect } from 'react'
import { format, addDays, setHours, setMinutes, isBefore,  } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import React from 'react'

interface Reservation {
  id: number
  startTime: string
  endTime: string
  userId: number
  instructorId: number
}

interface TimeSlot {
  time: Date
  isAvailable: boolean
}

export default function ReservationSystem() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[][]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (selectedDate) {
      const dates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i))
      setWeekDates(dates)
      fetchReservations(dates[0], dates[6])
    }
  }, [selectedDate])

  useEffect(() => {
    if (weekDates.length > 0 && reservations.length >= 0) {
      updateTimeSlots()
    }
  }, [weekDates, reservations])

  const fetchReservations = async (startDate: Date, endDate: Date) => {
    const response = await fetch(`/api/reservations?instructorId=1&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
    if (response.ok) {
      const data = await response.json()
      setReservations(data)
    } else {
      console.error('Failed to fetch reservations')
    }
  }

  const updateTimeSlots = () => {
    const slots = weekDates.map(date => 
      Array.from({ length: 32 }, (_, i) => {
        const slotTime = setMinutes(setHours(date, 9), i * 30)
        return {
          time: slotTime,
          isAvailable: !reservations.some(r => 
            new Date(r.startTime).getTime() === slotTime.getTime()
          )
        }
      })
    )
    setTimeSlots(slots)
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isAvailable && !isBefore(slot.time, new Date())) {
      setSelectedSlot(slot)
      setIsDialogOpen(true)
    }
  }

  const handleReservation = async () => {
    if (selectedSlot) {
      const endTime = new Date(selectedSlot.time.getTime() + 30 * 60000) // 30 minutes later
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1, // Assuming user 1 is making the reservation
          instructorId: 1, // Assuming instructor 1 is being reserved
          startTime: selectedSlot.time.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      if (response.ok) {
        const newReservation = await response.json()
        setReservations(prev => [...prev, newReservation])
        updateTimeSlots()
        setIsDialogOpen(false)
        toast({
          title: "予約完了",
          description: `${format(selectedSlot.time, 'yyyy年M月d日 (E) HH:mm', { locale: ja })}に予約しました。`,
        })
      } else {
        toast({
          title: "予約失敗",
          description: "予約に失敗しました。もう一度お試しください。",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">予約システム</h1>
      <div className="mb-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ja}
        />
      </div>
      <div className="grid grid-cols-8 gap-2">
        <div className="font-bold">時間</div>
        {weekDates.map((date, i) => (
          <div key={i} className="font-bold text-center">
            {format(date, 'M/d (E)', { locale: ja })}
          </div>
        ))}
        {Array.from({ length: 32 }, (_, i) => {
          const time = setMinutes(setHours(new Date(), 9), i * 30)
          return (
            <React.Fragment key={i}>
              <div className="text-sm">{format(time, 'HH:mm')}</div>
              {timeSlots.map((daySlots, j) => (
                <Button
                  key={j}
                  variant={daySlots[i].isAvailable ? "outline" : "secondary"}
                  className="w-full h-8"
                  disabled={!daySlots[i].isAvailable || isBefore(daySlots[i].time, new Date())}
                  onClick={() => handleSlotClick(daySlots[i])}
                >
                  {daySlots[i].isAvailable ? '予約可' : '予約済'}
                </Button>
              ))}
            </React.Fragment>
          )
        })}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約確認</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <p>
              {format(selectedSlot.time, 'yyyy年M月d日 (E) HH:mm', { locale: ja })}
              に予約しますか？
            </p>
          )}
          <Button onClick={handleReservation}>
            予約する
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}