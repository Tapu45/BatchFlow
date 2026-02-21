'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Loader2,
  Factory,
} from 'lucide-react';
import api, { API_ROUTES } from '../../../utils/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

interface LowStockAlert {
  skuCode: string;
  name: string;
  available: number;
  minReorderLevel: number;
  details: any[];
}

interface WasteStock {
  afterCleaning: {
    total: number;
    details: any[];
  };
  afterProcessing: {
    total: number;
    details: any[];
  };
  total: number;
}

const RawDashboard: React.FC = () => {
  const [totalStock, setTotalStock] = useState<number>(0);
  const [pendingPOs, setPendingPOs] = useState<number>(0);
  const [pendingPODetails, setPendingPODetails] = useState<any[]>([]);
  const [stockUnderCleaning, setStockUnderCleaning] = useState<number>(0);
  const [cleaningDetails, setCleaningDetails] = useState<any[]>([]);
  const [stockInProcessing, setStockInProcessing] = useState<number>(0);
  const [processingDetails, setProcessingDetails] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [wasteStock, setWasteStock] = useState<WasteStock>({
    afterCleaning: { total: 0, details: [] },
    afterProcessing: { total: 0, details: [] },
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [productWiseWaste, setProductWiseWaste] = useState<any[]>([]);
  const [stockDistribution, setStockDistribution] = useState<any[]>([]);
  const [productWiseConversion, setProductWiseConversion] = useState<any[]>([]);

  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${authToken}` };

    Promise.all([
      api.get(API_ROUTES.RAW.GET_TOTAL_RAW_MATERIAL_STOCK, { headers }),
      api.get(API_ROUTES.RAW.GET_PENDING_PO_COUNT, { headers }),
      api.get(API_ROUTES.RAW.GET_STOCK_UNDER_CLEANING, { headers }),
      api.get(API_ROUTES.RAW.GET_STOCK_IN_PROCESSING, { headers }),
      api.get(API_ROUTES.RAW.GET_LOW_STOCK_ALERTS, { headers }),
      api.get(API_ROUTES.RAW.GET_WASTE_STOCK, { headers }),
      api.get(API_ROUTES.RAW.GET_PRODUCT_WISE_WASTE, { headers }),
      api.get(API_ROUTES.RAW.GET_STOCK_DISTRIBUTION, { headers }),
      api.get(API_ROUTES.RAW.GET_PRODUCT_WISE_CONVERSION, { headers }),
    ])
      .then((responses) => {
        const [
          totalStockRes,
          pendingPOsRes,
          cleaningRes,
          processingRes,
          lowStockRes,
          wasteRes,
          productWiseWasteRes,
          stockDistributionRes,
          productWiseConversionRes,
        ] = responses;

        setTotalStock(totalStockRes.data.totalRawMaterialStock || 0);
        setPendingPOs(pendingPOsRes.data.pendingPOs || 0);
        setPendingPODetails(pendingPOsRes.data.details || []);
        setStockUnderCleaning(cleaningRes.data.stockUnderCleaning || 0);
        setCleaningDetails(cleaningRes.data.details || []);
        setStockInProcessing(processingRes.data.stockInProcessing || 0);
        setProcessingDetails(processingRes.data.details || []);
        setLowStockAlerts(lowStockRes.data.lowStockAlerts || []);
        setWasteStock(
          wasteRes.data.wasteStock || {
            afterCleaning: { total: 0, details: [] },
            afterProcessing: { total: 0, details: [] },
            total: 0,
          }
        );
        // ...existing code...
        setProductWiseWaste(
          productWiseWasteRes.data.productWiseWasteStock || []
        );
        console.log(productWiseWasteRes.data)
        // ...existing code...
        //setProductWiseWaste(productWiseWasteRes.data || []);
        //setProductWiseWaste(productWiseWasteRes.data.productWiseWaste || { afterCleaning: [], afterProcessing: [] })
        setStockDistribution(stockDistributionRes.data.stockDistribution || []);
        setProductWiseConversion(
          productWiseConversionRes.data.productWiseConversionRatio || []
        );
      })
      .finally(() => setLoading(false));
  }, [authToken]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  // Normalize and aggregate product wise waste data
  const normalizedProductWiseWaste = productWiseWaste.reduce((acc: any, item: any) => {
    const normalizedName = item.productName?.toUpperCase() || 'UNKNOWN';
    if (!acc[normalizedName]) {
      acc[normalizedName] = {
        productName: normalizedName,
        rawMaterial: (item.rawMaterial || 0),
        cleaning: (item.cleaning || 0),
        wasteAfterCleaning: (item.wasteAfterCleaning || 0),
        cleaned: (item.cleaned || 0),
        processing: (item.processing || 0),
        wasteAfterProcessing: (item.wasteAfterProcessing || 0),
        processed: (item.processed || 0),
      };
    } else {
      acc[normalizedName].rawMaterial += (item.rawMaterial || 0);
      acc[normalizedName].cleaning += (item.cleaning || 0);
      acc[normalizedName].wasteAfterCleaning += (item.wasteAfterCleaning || 0);
      acc[normalizedName].cleaned += (item.cleaned || 0);
      acc[normalizedName].processing += (item.processing || 0);
      acc[normalizedName].wasteAfterProcessing += (item.wasteAfterProcessing || 0);
      acc[normalizedName].processed += (item.processed || 0);
    }
    return acc;
  }, {});

  const normalizedProductList = Object.values(normalizedProductWiseWaste);

  const warehouseLabels = stockDistribution.map(
    (w) => w.warehouse?.name || 'N/A'
  );
  const warehouseTotals = stockDistribution.map((w) =>
    w.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
  );

  const warehousePieData = {
    labels: warehouseLabels,
    datasets: [
      {
        label: 'Stock Distribution',
        data: warehouseTotals,
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#06B6D4',
          '#84CC16',
          '#F97316',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const conversionLabels = productWiseConversion.map((p) => p.skuCode);
  const conversionData = productWiseConversion.map(
    (p) => Math.round((p.conversionPercentage || 0) * 100) / 100
  );

  const conversionBarData = {
    labels: conversionLabels,
    datasets: [
      {
        label: 'Conversion %',
        data: conversionData,
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 bg-card p-8 rounded-2xl shadow-lg border border-border"
        >
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/20 opacity-20"></div>
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg">
              Loading Dashboard
            </p>
            <p className="text-muted-foreground text-sm">Fetching real-time data...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-background dark:bg-background">
      {/* Compact Header */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Raw Material Dashboard</h1>
            <p className="text-xs text-muted-foreground">Real-time inventory overview</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Metrics - Compact Table Style */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="border border-border/50 rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
          }}
        >
          <table className="w-full">
            <tbody>
              {/* Row 1 - Main Stock */}
              <tr className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground w-1/4">Total Raw Material</td>
                <td className="px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{totalStock.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </td>
              </tr>

              {/* Row 2 - Pending POs */}
              <tr className="border-b border-border/30 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">POs Pending</td>
                <td className="px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-orange-600">{pendingPOs}</span>
                    <span className="text-xs text-muted-foreground">orders</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{pendingPODetails.length} details</td>
              </tr>

              {/* Row 3 - Under Cleaning */}
              <tr className="border-b border-border/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">Under Cleaning</td>
                <td className="px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-600">{stockUnderCleaning.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{cleaningDetails.length} items</td>
              </tr>

              {/* Row 4 - In Processing */}
              <tr className="border-b border-border/30 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">In Processing</td>
                <td className="px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-purple-600">{stockInProcessing.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{processingDetails.length} items</td>
              </tr>

              {/* Row 5 - Waste Stock */}
              <tr className="border-b border-border/30 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">Waste Stock</td>
                <td className="px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-600">{wasteStock.total.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  Cleaning: {wasteStock.afterCleaning.total} | Processing: {wasteStock.afterProcessing.total}
                </td>
              </tr>
            </tbody>
          </table>
        </motion.div>

        {/* Charts Section - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Product-wise Waste Table */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-card rounded-lg shadow-sm border border-border/50 overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
            }}
          >
            <div className="px-4 py-3 border-b border-border/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-foreground">Product-wise Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary/5 border-b border-border/30">
                    <th className="px-3 py-2 text-left font-medium">Metric</th>
                    {normalizedProductList.slice(0, 4).map((p: any) => (
                      <th key={p.productName} className="px-3 py-2 text-center font-medium">
                        {p.productName.substring(0, 10)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Raw', key: 'rawMaterial' },
                    { label: 'Cleaned', key: 'cleaned' },
                    { label: 'Processed', key: 'processed' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-border/20 hover:bg-primary/5">
                      <td className="px-3 py-2 font-medium text-foreground text-xs">{row.label}</td>
                      {normalizedProductList.slice(0, 4).map((p: any) => (
                        <td key={p.productName + row.key} className="px-3 py-2 text-center text-foreground">
                          {p[row.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Stock Distribution Pie */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-card rounded-lg shadow-sm border border-border/50 p-4 flex flex-col"
            style={{
              background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
            }}
          >
            <div className="text-sm font-semibold text-foreground mb-3">Stock Distribution</div>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={warehousePieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { font: { size: 10 }, padding: 10 },
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Conversion Bar Chart */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-card rounded-lg shadow-sm border border-border/50 p-4"
          style={{
            background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
          }}
        >
          <div className="text-sm font-semibold text-foreground mb-3">Conversion Efficiency (%)</div>
          <div className="h-64">
            <Bar
              data={conversionBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%', font: { size: 10 } } },
                },
              }}
            />
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-card rounded-lg shadow-sm border border-red-200/50 p-4"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 0, 0, 0.03) 0%, transparent 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-600">Low Stock Alerts ({lowStockAlerts.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockAlerts.slice(0, 6).map((alert) => (
                <div key={alert.skuCode} className="text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200/50">
                  <div className="font-medium text-red-700">{alert.name}</div>
                  <div className="text-muted-foreground">{alert.available} avail / {alert.minReorderLevel} min</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RawDashboard;
