import { useState } from 'react'
import { type Assessment, type Student } from './mock'
import { HomeScreen } from './screens/HomeScreen'
import { CodeScreen } from './screens/CodeScreen'
import { IdentifyScreen } from './screens/IdentifyScreen'
import { ConsentScreen } from './screens/ConsentScreen'
import { ExamScreen } from './screens/ExamScreen'

type Step = 'home' | 'code' | 'identify' | 'consent' | 'exam'

function App(): React.JSX.Element {
  const [step, setStep] = useState<Step>('home')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [student, setStudent] = useState<Student | null>(null)

  if (step === 'home') {
    return <HomeScreen onStart={() => setStep('code')} />
  }

  if (step === 'code') {
    return (
      <CodeScreen
        onResolved={(a) => {
          setAssessment(a)
          setStep('identify')
        }}
      />
    )
  }

  if (step === 'identify' && assessment) {
    return (
      <IdentifyScreen
        assessment={assessment}
        onBack={() => setStep('code')}
        onConfirm={(s) => {
          setStudent(s)
          setStep('consent')
        }}
      />
    )
  }

  if (step === 'consent' && assessment && student) {
    return (
      <ConsentScreen
        assessment={assessment}
        student={student}
        onBegin={async () => {
          await window.api?.lockdown?.engage()
          setStep('exam')
        }}
      />
    )
  }

  if (step === 'exam' && assessment && student) {
    return (
      <ExamScreen
        assessment={assessment}
        student={student}
        onExit={async () => {
          await window.api?.lockdown?.disengage()
          setStudent(null)
          setAssessment(null)
          setStep('home')
        }}
      />
    )
  }

  return <CodeScreen onResolved={(a) => { setAssessment(a); setStep('identify') }} />
}

export default App
