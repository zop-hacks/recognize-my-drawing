'use client'
import { Button } from './ui/button'
import { useRef, useEffect, useState, useCallback } from 'react'

interface DrawingCanvasProps {
  size?: number
  onCapture?: (image: string) => void
  resetSignal?: number
}

type Point = { x: number; y: number }

export default function DrawingCanvas({ size = 400, onCapture, resetSignal }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastDrawTime, setLastDrawTime] = useState<number>(0)
  const [canvasSize, setCanvasSize] = useState(size)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopDrawingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastResetSignalRef = useRef(resetSignal)
  const strokesRef = useRef<Point[][]>([])
  const activeStrokeRef = useRef<Point[] | null>(null)

  // High resolution canvas for better drawing quality
  const CANVAS_RESOLUTION = 800 // Higher resolution for smoother drawing
  const OUTPUT_SIZE = 64 // Output size for ML model
  const OUTPUT_PADDING = 2 // Match ml/convert_images.py
  const OUTPUT_LINE_WIDTH = 3 // Match ml/convert_images.py

  // Convert canvas to 64x64 black & white PNG and console log it
  const captureAndLogImage = useCallback(() => {
    const strokes = strokesRef.current
    if (!strokes.length) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let hasPoints = false

    for (const stroke of strokes) {
      for (const point of stroke) {
        hasPoints = true
        if (point.x < minX) minX = point.x
        if (point.y < minY) minY = point.y
        if (point.x > maxX) maxX = point.x
        if (point.y > maxY) maxY = point.y
      }
    }

    if (!hasPoints) return

    const width = maxX - minX
    const height = maxY - minY
    const span = Math.max(width, height, 1)
    const targetSpan = OUTPUT_SIZE - 2 * OUTPUT_PADDING
    const scale = targetSpan / span
    const translatedWidth = width * scale
    const translatedHeight = height * scale
    const offsetX = OUTPUT_PADDING + (targetSpan - translatedWidth) / 2
    const offsetY = OUTPUT_PADDING + (targetSpan - translatedHeight) / 2

    const normalizedStrokes = strokes.map((stroke) =>
      stroke.map((point) => ({
        x: (point.x - minX) * scale + offsetX,
        y: (point.y - minY) * scale + offsetY,
      }))
    )

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = OUTPUT_SIZE
    outputCanvas.height = OUTPUT_SIZE

    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = OUTPUT_LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const dotRadius = OUTPUT_LINE_WIDTH / 2

    for (const stroke of normalizedStrokes) {
      if (!stroke.length) continue
      if (stroke.length === 1) {
        const [point] = stroke
        ctx.beginPath()
        ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = '#000000'
        ctx.fill()
        continue
      }

      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length; i += 1) {
        ctx.lineTo(stroke[i].x, stroke[i].y)
      }
      ctx.stroke()
    }

    const dataURL = outputCanvas.toDataURL('image/png')
    console.log('📸 Captured 64x64 black & white image (Quick Draw format):', dataURL)
    console.log('🚀 Simulating send to backend for ML model...')
    onCapture?.(dataURL)
  }, [onCapture])

  // Start automatic capture every 0.5 seconds
  const startAutomaticCapture = useCallback(() => {
    if (intervalRef.current) return // Already running

    intervalRef.current = setInterval(() => {
      captureAndLogImage()
    }, 500)
  }, [captureAndLogImage])

  // Stop automatic capture
  const stopAutomaticCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Get scaled coordinates for high-resolution canvas
  const getScaledCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Scale coordinates to match the high-resolution canvas
    const scaleX = CANVAS_RESOLUTION / rect.width
    const scaleY = CANVAS_RESOLUTION / rect.height
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    return { x, y }
  }, [])

  // Handle drawing start
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    setLastDrawTime(Date.now())
    startAutomaticCapture()

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getScaledCoordinates(e)

    const newStroke: Point[] = [{ x, y }]
    strokesRef.current.push(newStroke)
    activeStrokeRef.current = newStroke

    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [startAutomaticCapture, getScaledCoordinates])

  // Handle drawing
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getScaledCoordinates(e)

    const activeStroke = activeStrokeRef.current
    if (!activeStroke) return

    activeStroke.push({ x, y })

    ctx.lineTo(x, y)
    ctx.stroke()

    setLastDrawTime(Date.now())

    // Clear existing timeout and set a new one
    if (stopDrawingTimeoutRef.current) {
      clearTimeout(stopDrawingTimeoutRef.current)
    }
  }, [isDrawing, getScaledCoordinates])

  // Handle drawing end
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return

    setIsDrawing(false)
    activeStrokeRef.current = null
    stopAutomaticCapture()

    // Capture image when user stops drawing (with a small delay to ensure the last stroke is complete)
    stopDrawingTimeoutRef.current = setTimeout(() => {
      captureAndLogImage()
    }, 100)
  }, [isDrawing, stopAutomaticCapture, captureAndLogImage])

  // Handle responsive canvas sizing
  useEffect(() => {
    const MIN_CANVAS_SIZE = 200
    const handleResize = () => {
      if (!containerRef.current) return

      const parentElement = containerRef.current.parentElement
      const parentWidth = parentElement
        ? parentElement.getBoundingClientRect().width
        : containerRef.current.getBoundingClientRect().width

      const { top } = containerRef.current.getBoundingClientRect()
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : size
      const availableHeight = viewportHeight - top - 24 // leave a bit of breathing room

      const nextSize = Math.max(
        MIN_CANVAS_SIZE,
        Math.min(size, parentWidth, availableHeight > 0 ? availableHeight : MIN_CANVAS_SIZE)
      )

      setCanvasSize(nextSize)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [size])

  // Initialize canvas only once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Only initialize if canvas is not already set up
    if (canvas.width !== CANVAS_RESOLUTION) {
      // Set canvas internal resolution to high-res for better quality
      canvas.width = CANVAS_RESOLUTION
      canvas.height = CANVAS_RESOLUTION

      // Set up canvas drawing properties to match Quick Draw exactly
      ctx.strokeStyle = '#000000' // Solid black lines
      ctx.lineWidth = 8 // Slightly thicker for better visibility at high resolution
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Enable smoothing for better line quality during drawing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Fill canvas with solid white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_RESOLUTION, CANVAS_RESOLUTION)
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Set up touch event listeners separately
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Add touch event listeners with passive: false to allow preventDefault
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      // Create a synthetic React touch event
      const syntheticEvent = {
        touches: e.touches,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as unknown as React.TouchEvent<HTMLCanvasElement>
      startDrawing(syntheticEvent)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      // Create a synthetic React touch event
      const syntheticEvent = {
        touches: e.touches,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as unknown as React.TouchEvent<HTMLCanvasElement>
      draw(syntheticEvent)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      stopDrawing()
    }

    // Add event listeners with passive: false
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Cleanup function
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [startDrawing, draw, stopDrawing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (stopDrawingTimeoutRef.current) {
        clearTimeout(stopDrawingTimeoutRef.current)
      }
    }
  }, [])

  // Clear canvas function
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_RESOLUTION, CANVAS_RESOLUTION)
    strokesRef.current = []
    activeStrokeRef.current = null
    
    stopAutomaticCapture()
    console.log('🧹 Canvas cleared')
  }, [stopAutomaticCapture])

  useEffect(() => {
    if (resetSignal === undefined) return
    if (lastResetSignalRef.current === resetSignal) return
    lastResetSignalRef.current = resetSignal
    clearCanvas()
  }, [resetSignal, clearCanvas])

  const displaySize = Math.round(canvasSize)

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto" ref={containerRef}>
      <div
        className="relative w-full"
        style={{
          width: '100%',
          maxWidth: `${displaySize}px`,
          maxHeight: `${displaySize}px`,
          aspectRatio: '1 / 1',
        }}
      >
        <div className="absolute inset-0 border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white">
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none' // Prevent default touch behaviors
            }}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        {/* Clear button overlay */}
        <Button
          onClick={clearCanvas}
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-all duration-200 z-10"
          title="Clear Canvas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
