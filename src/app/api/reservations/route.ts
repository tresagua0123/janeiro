import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instructorId = searchParams.get('instructorId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!instructorId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      instructorId: parseInt(instructorId),
      startTime: {
        gte: new Date(startDate),
        lt: new Date(endDate),
      },
    },
  })

  return NextResponse.json(reservations)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { userId, instructorId, startTime, endTime } = body

  const existingReservation = await prisma.reservation.findFirst({
    where: {
      instructorId,
      startTime: {
        gte: new Date(startTime),
        lte: new Date(endTime),
      },
    },
  })

  if (existingReservation) {
    return NextResponse.json({ error: 'Reservation already exists' }, { status: 400 })
  }

  if (!userId || !instructorId || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      instructorId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  })

  return NextResponse.json(reservation)
}