"use client"

import React from "react"
import { useState } from "react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const res = await fetch("http://localhost:3001/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken)
      setMessage("Login OK")
      window.location.href = "/dashboard"
    } else {
      setMessage("Error")
    }
  }

  return (
  <div style={{ padding: 40 }}>
    <h1>T-Shirt Platform</h1>
    <p>Accedé a tu cuenta</p>

      <form onSubmit={handleLogin}>
        <input
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <br /><br />

        <button type="submit">Login</button>
      </form>

      <p>{message}</p>
    </div>
  )
}