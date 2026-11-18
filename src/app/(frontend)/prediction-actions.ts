'use server'

import { getPayloadClient } from '@/lib/payload'
import type { PredictionRun } from '@/payload-types'
import {
  calculateDelayPrediction,
  isValidPredictionInput,
  type PredictionInput,
  type PredictionResult,
} from './prediction-model'

const PYTHON_API = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export type PredictionResponse = {
  success: boolean
  result?: PredictionResult & { modelType?: string }
  liveWeather?: any
  error?: string
}

export async function runDelayPrediction(
  input: PredictionInput,
): Promise<PredictionResponse> {
  if (!isValidPredictionInput(input)) {
    return { success: false, error: 'Check the selected route and operating conditions.' }
  }

  let result: PredictionResult & { modelType?: string }
  let liveWeather: any = null

  // 1. Attempt inference with the Scikit-Learn Python ML Backend
  try {
    const res = await fetch(`${PYTHON_API}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, enrichWithLiveWeather: true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && data.result) {
        result = data.result
        liveWeather = data.liveWeather
      } else {
        result = calculateDelayPrediction(input)
      }
    } else {
      result = calculateDelayPrediction(input)
    }
  } catch {
    // Fall back to client/heuristics model if Python backend is offline
    result = calculateDelayPrediction(input)
  }

  // 2. Persist to Payload CMS if database connection is available
  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'prediction-runs',
      overrideAccess: true,
      data: { ...input, ...result } as Omit<PredictionRun, 'id' | 'createdAt' | 'updatedAt'>,
    })
  } catch {
    // If Payload / Figma database is not configured in local standalone mode,
    // continue gracefully without breaking the user experience
  }

  return { success: true, result, liveWeather }
}

export async function fetchLiveRadarFlights(limit = 15) {
  try {
    const res = await fetch(`${PYTHON_API}/api/flights/live?limit=${limit}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Return empty on failure
  }
  return { count: 0, flights: [] }
}

export async function fetchLiveWeather(airportCode: string) {
  try {
    const res = await fetch(`${PYTHON_API}/api/weather/${airportCode}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Return null on failure
  }
  return null
}

export async function searchLiveFlight(flightNumber: string) {
  try {
    const res = await fetch(`${PYTHON_API}/api/flights/search/${encodeURIComponent(flightNumber)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Return null on failure
  }
  return null
}
