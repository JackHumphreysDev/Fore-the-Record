import express from 'express'
import { prisma } from './database.js'

const app = express()

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
  })
})

app.post('/api/users', async (request, response) => {
  const body = request.body as Record<string, unknown> | undefined
  const name = body?.name
  const email = body?.email
  const homeClubId = body?.homeClubId

  if (
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof email !== 'string' ||
    email.trim() === ''
  ) {
    response.status(400).json({
      error: 'Name and email are required',
    })
    return
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        ...(typeof homeClubId === 'string' && homeClubId.trim() !== ''
          ? { homeClubId: homeClubId.trim() }
          : {}),
      },
    })

    response.status(201).json(user)
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      response.status(409).json({
        error: 'A user with this email already exists',
      })
      return
    }

    throw error
  }
})

export default app
