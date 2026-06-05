import { createContext, useContext, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { env } from '../config/env'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    // Empty apiUrl = same-origin (nginx or Vite proxy)
    const backend = env.apiUrl
    const socketInstance = io(backend, {
      autoConnect: true,
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      console.log('Socket connected')
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
      console.log('Socket disconnected')
    })

    socketInstance.on('message', (message) => {
      setLastMessage(message)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const connect = () => {
    if (socket) {
      socket.connect()
    }
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
    }
  }

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    }
  }

  const value = {
    socket,
    isConnected,
    lastMessage,
    connect,
    disconnect,
    emit
  }

  // expose backend url for other components
  value.backendUrl = env.apiUrl

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
