"use client"

import React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  ArrowLeft,
  Package,
  Truck,
  Calendar,
  Building,
  Hash,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import api, { API_ROUTES } from "../../../utils/api"


type PurchaseOrder = {
  id: string
  orderNumber: string
  orderDate: string
  vendor: { id: string; name: string }
  totalQuantity: number
  receivedQuantity: number
  status: string
}

type TimelineEvent = {
  type: string
  date: string
  details: string
}

type PurchaseOrderTimeline = {
  purchaseOrder: PurchaseOrder & { items: any[] }
  events: TimelineEvent[]
}

interface Props {
  onClose: () => void
  rawMaterialId: string | null
  rawMaterialName: string | null
}

const ProductPurchaseOrdersView: React.FC<Props> = ({ onClose, rawMaterialId, rawMaterialName }) => {
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [timeline, setTimeline] = useState<PurchaseOrderTimeline | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!rawMaterialId) return

    setLoading(true)
    setError(null)
    setSelectedOrder(null)
    setTimeline(null)

    try {
      const response = await api.get(API_ROUTES.RAW.GET_PURCHASE_ORDERS_BY_PRODUCT(rawMaterialId), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      })
      setOrders(response.data || [])
    } catch (err) {
      console.error("Failed to fetch orders:", err)
      setError("Failed to load purchase orders. Please try again.")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [rawMaterialId])

  const fetchTimeline = useCallback(async (orderId: string) => {
    setTimelineLoading(true)
    setError(null)

    try {
      const response = await api.get(API_ROUTES.RAW.GET_PURCHASE_ORDER_TIMELINE(orderId), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      })
      setTimeline(response.data || null)
    } catch (err) {
      console.error("Failed to fetch timeline:", err)
      setError("Failed to load timeline data. Please try again.")
      setTimeline(null)
    } finally {
      setTimelineLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleOrderClick = useCallback(
    (order: PurchaseOrder) => {
      setSelectedOrder(order)
      fetchTimeline(order.id)
    },
    [fetchTimeline],
  )

  const handleBack = useCallback(() => {
    setSelectedOrder(null)
    setTimeline(null)
    setError(null)
  }, [])

  const eventConfig = useMemo(
    () => ({
      ORDER_PLACED: { color: "bg-blue-600", icon: "📋", label: "Order Placed" },
      RECEIVED: { color: "bg-green-600", icon: "📦", label: "Received" },
      CLEANING_STARTED: { color: "bg-orange-500", icon: "🧽", label: "Cleaning Started" },
      CLEANED: { color: "bg-teal-600", icon: "✨", label: "Cleaned" },
      PROCESSING_STARTED: { color: "bg-purple-600", icon: "⚙️", label: "Processing Started" },
      PROCESSED: { color: "bg-pink-600", icon: "🔧", label: "Processed" },
      FINISHED_GOOD: { color: "bg-yellow-600", icon: "✅", label: "Finished Good" },
    }),
    [],
  )

  const getEventConfig = (type: string) => {
    return (
      eventConfig[type as keyof typeof eventConfig] || {
        color: "bg-gray-500",
        icon: "⭕",
        label: type.replace(/_/g, " "),
      }
    )
  }

  const TimelineComponent = React.memo(({ events }: { events: TimelineEvent[] }) => {
    const handleMouseEnter = useCallback((index: number) => {
      setHoveredEvent(index)
    }, [])

    const handleMouseLeave = useCallback(() => {
      setHoveredEvent(null)
    }, [])

    if (!events.length) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <AlertCircle className="h-12 w-12 mb-4" />
          <h4 className="text-lg font-semibold mb-2">No Timeline Events</h4>
          <p className="text-sm">No events found for this purchase order.</p>
        </div>
      )
    }

    return (
      <div className="w-full py-8 px-4 flex justify-center">
        <div className="relative flex flex-col items-center">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-blue-500 to-blue-200 z-0" style={{ minHeight: "100%" }} />
          <div className="relative z-10 flex flex-col items-center gap-12">
            {events.map((event, index) => {
              const config = getEventConfig(event.type)
              return (
                <div key={index} className="flex flex-col items-center relative group">
                  <motion.div
                    className={`relative w-12 h-12 ${config.color} rounded-full flex items-center justify-center shadow-lg cursor-pointer z-20 transition-all duration-200`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 300,
                    }}
                    whileHover={{
                      scale: 1.15,
                      y: -3,
                      transition: { duration: 0.2 },
                    }}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseLeave={handleMouseLeave}
                    role="button"
                    tabIndex={0}
                    aria-label={`${config.label} - ${new Date(event.date).toLocaleDateString()}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleMouseEnter(index)
                      }
                    }}
                  >
                    <MapPin className="h-6 w-6 text-white" />
                    <div className="absolute inset-0 flex items-center justify-center text-xs">{config.icon}</div>
                  </motion.div>
                  <motion.div
                    className="mt-3 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <div className="text-xs font-semibold text-gray-800 mb-1 leading-tight">{config.label}</div>
                    <div className="text-xs text-gray-600">{new Date(event.date).toLocaleDateString()}</div>
                  </motion.div>
                  <AnimatePresence>
                    {hoveredEvent === index && (
                      <motion.div
                        className="absolute left-full ml-6 top-1/2 -translate-y-1/2 bg-gray-900 text-white p-4 rounded-lg shadow-2xl z-50 min-w-80 max-w-96"
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                          pointerEvents: "none",
                        }}
                      >
                        <div className="text-sm font-bold mb-2 text-blue-300">{config.label}</div>
                        <div className="text-xs text-gray-300 mb-3">{new Date(event.date).toLocaleString()}</div>
                        <div className="text-sm leading-relaxed">{event.details}</div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {index < events.length - 1 && (
                    <div className="w-1 h-12 bg-blue-300 mx-auto" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  })

  TimelineComponent.displayName = "TimelineComponent"

  const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h3>
      <p className="text-gray-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </motion.div>
  )

  const LoadingSpinner = () => (
    <motion.div
      className="flex justify-center py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    </motion.div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <div
        className="rounded-lg shadow-lg w-full max-w-5xl relative"
        style={{ background: 'var(--card)', color: 'var(--foreground)', maxHeight: '80vh', overflowY: 'auto', padding: '2rem' }}
      >
        {/* Close button and header */}
        <button
          className="absolute top-4 right-4 text-xl"
          onClick={onClose}
          style={{ color: 'var(--foreground)' }}
        >
          &times;
        </button>
        <div className="flex items-center mb-4">
          <button
            className="px-3 py-1 rounded font-semibold mr-3"
            style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', fontSize: '1rem' }}
            onClick={onClose}
          >
            &larr; Back to Dashboard
          </button>
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            Purchase Orders for {rawMaterialName}
          </h2>
        </div>

        {/* Header */}
        <motion.div
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={selectedOrder ? handleBack : onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={selectedOrder ? "Back to Orders" : "Back to Dashboard"}
            >
              <ArrowLeft className="h-4 w-4" />
              {selectedOrder ? "Back to Orders" : "Back to Dashboard"}
            </motion.button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedOrder ? `Timeline: ${selectedOrder.orderNumber}` : `Purchase Orders for ${rawMaterialName}`}
              </h2>
              {selectedOrder && (
                <p className="text-gray-600 text-sm mt-1">
                  Vendor: {selectedOrder.vendor.name} • Date: {new Date(selectedOrder.orderDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {error ? (
            <ErrorDisplay
              key="error"
              message={error}
              onRetry={selectedOrder ? () => fetchTimeline(selectedOrder.id) : fetchOrders}
            />
          ) : loading ? (
            <LoadingSpinner key="loading" />
          ) : !selectedOrder ? (
            <motion.div
              key="orders-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {orders.length === 0 ? (
                <motion.div
                  className="text-center py-20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Purchase Orders Found</h3>
                  <p className="text-gray-500">There are no purchase orders for this raw material.</p>
                </motion.div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      className="bg-white rounded-xl shadow-md border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => handleOrderClick(order)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleOrderClick(order)
                        }
                      }}
                      aria-label={`View timeline for order ${order.orderNumber}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === "Received"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                            }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{order.vendor.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            Total: {order.totalQuantity} | Received: {order.receivedQuantity}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : timelineLoading ? (
            <LoadingSpinner key="timeline-loading" />
          ) : timeline ? (
            <motion.div
              key="timeline-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="text-xl font-bold text-gray-800 text-center">Order Journey Timeline</h3>
                  <p className="text-gray-600 text-center text-sm mt-1">
                    Hover over any event to see detailed information
                  </p>
                </div>

                <TimelineComponent events={timeline.events} />
              </motion.div>
            </motion.div>
          ) : (
            <ErrorDisplay key="no-timeline" message="Timeline information is not available for this order." />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ProductPurchaseOrdersView
