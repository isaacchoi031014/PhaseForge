// Mock data — assessment codes + roster now come from Supabase (see supabase.ts).

export type Student = {
  id: string
  name: string
  studentNumber: string
}

export type Assessment = {
  id: string
  code: string
  course: string
  title: string
  questions: number
  minutes: number
  topics: string[]
}

export type Question = {
  index: number
  total: number
  topic: string
  difficulty: string
  prompt: string
}

export const SAMPLE_QUESTION: Question = {
  index: 1,
  total: 15,
  topic: 'Entropy',
  difficulty: 'Medium',
  prompt:
    'A 2.0 kg block of ice at 0 °C melts completely into water at 0 °C. The latent heat of fusion is 334 kJ/kg. Calculate the change in entropy of the ice–water system during melting.'
}
