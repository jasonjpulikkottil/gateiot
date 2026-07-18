'use client'

import React, { useActionState } from 'react'
import LoginPage, { Username, Password, Submit, Title } from '@react-login-page/base'
import { login } from '../actions/auth'

export default function LoginPageComponent() {
  const [state, action, isPending] = useActionState(login, undefined)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' }}>
      <form action={action}>
        <LoginPage style={{ height: 420, width: 360, background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#f4f4f5' }}>
          <Title style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, margin: '20px 0' }}>GateIoT Access</Title>
          <Username 
            name="username" 
            defaultValue="admin" 
            readOnly 
            style={{ background: '#09090b', border: '1px solid #27272a', color: '#71717a', cursor: 'not-allowed' }}
          />
          <Password 
            name="password" 
            placeholder="Enter password" 
            style={{ background: '#09090b', border: '1px solid #27272a', color: '#ffffff' }}
          />
          <Submit disabled={isPending} style={{ background: '#34d399', color: '#09090b', fontWeight: 600 }}>
            {isPending ? 'Verifying...' : 'Sign In'}
          </Submit>
        </LoginPage>
      </form>
      
      {state?.error && (
        <div style={{
          marginTop: '1.5rem',
          padding: '12px 24px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '0.85rem',
          fontWeight: 500,
          fontFamily: 'sans-serif'
        }}>
          {state.error}
        </div>
      )}
    </div>
  )
}
