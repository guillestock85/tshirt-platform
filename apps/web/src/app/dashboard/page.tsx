"use client"

import { useEffect, useState } from "react"

export default function Dashboard() {
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token) {
      window.location.href = "/login"
      return
    }

    fetch("http://localhost:3001/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem("token")
          window.location.href = "/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) setUser(data)
      })
  }, [])

  if (!user) return <p>Cargando...</p>

  return (
    <div style={{ padding: 40 }}>
      <h1>T-Shirt Platform</h1>
      <p>Bienvenido a tu panel</p>
      <p>Hola {user.email}</p>

      <button
        onClick={() => {
          localStorage.removeItem("token")
          window.location.href = "/login"
        }}
      >
        Logout
      </button>
    </div>
  )
}