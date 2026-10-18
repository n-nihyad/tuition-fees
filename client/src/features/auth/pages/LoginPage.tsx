import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useLocale } from '../../../shared/providers/useLocale'
import LoginForm from '../components/LoginForm'
import { useLogin } from '../hooks/useAuthActions'
import { errorMessage } from '../../../shared/api/errorMessage'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const navigate = useNavigate()
  const { locale } = useLocale()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login.reset()
    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          setPassword('')
          navigate('/dashboard', { replace: true })
        },
      },
    )
  }

  return (
    <LoginForm
      username={username}
      password={password}
      busy={login.isPending}
      error={login.error ? errorMessage(login.error, locale) : ''}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  )
}
