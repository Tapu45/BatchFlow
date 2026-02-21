import React, { useEffect, useState } from 'react';
import api, { API_ROUTES } from '../../../utils/api';
import { Spin, Alert, Card, Empty } from 'antd';
import { Boxes, Warehouse } from 'lucide-react';
import ProductPurchaseOrdersView from './Timeline';

type StockItem = {
  rawMaterial: {
    id: string;
    name: string;
    unitOfMeasurement?: string;
  };
  warehouse: {
    id: string;
    name: string;
    location?: string;
  };
  currentQuantity: number;
};

const Stock: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    api
      .get(API_ROUTES.RAW.GET_CURRENT_STOCK_DISTRIBUTION, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .then((res) => {
        // Aggregate by rawMaterialId + warehouseId
        const aggregate: Record<string, any> = {};
        res.data.forEach((item: any) => {
          const key = `${item.rawMaterial.id}_${item.warehouse.id}`;
          if (!aggregate[key]) {
            aggregate[key] = { ...item, currentQuantity: 0 };
          }
          aggregate[key].currentQuantity +=
            item.currentQuantity ?? item.quantity ?? 0;
        });
        setStock(Object.values(aggregate));
        setLoading(false);
      })
      .catch((_err) => {
        setError('Failed to load stock distribution');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ background: 'var(--background)' }} className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spin size="large" />
          <p style={{ color: 'var(--primary)' }} className="mt-4 font-medium">
            Loading stock distribution...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--background)' }} className="h-screen flex items-center justify-center p-6">
        <Alert
          type="error"
          message="Stock Distribution Error"
          description={error}
          className="max-w-md"
          showIcon
        />
      </div>
    );
  }

  if (stock.length === 0) {
    return (
      <div style={{ background: 'var(--background)' }} className="h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <Empty
            description="No stock data available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    );
  }

  // Get all unique warehouses and products
  const warehouses = Array.from(
    new Set(stock.map((item) => item.warehouse.name))
  );
  const products = Array.from(
    new Set(stock.map((item) => item.rawMaterial.name))
  );

  // Build a matrix: rows = products, columns = warehouses
  const matrix: Record<string, Record<string, StockItem | undefined>> = {};
  products.forEach((prod) => {
    matrix[prod] = {};
    warehouses.forEach((wh) => {
      matrix[prod][wh] = stock.find(
        (item) => item.rawMaterial.name === prod && item.warehouse.name === wh
      );
    });
  });

  return (
    <>
      {modalOpen && selectedProduct ? (
        <ProductPurchaseOrdersView
          onClose={() => setModalOpen(false)}
          rawMaterialId={selectedProduct.id}
          rawMaterialName={selectedProduct.name}
        />
      ) : (
        <div style={{ background: 'var(--background)' }} className="h-screen overflow-hidden p-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <div style={{ background: 'var(--secondary)' }} className="p-2 rounded">
                <Boxes style={{ color: 'var(--secondary-foreground)' }} className="w-6 h-6" />
              </div>
              <div>
                <h1 style={{ color: 'var(--foreground)' }} className="text-2xl font-bold">
                  Stock Distribution
                </h1>
                <p style={{ color: 'var(--muted-foreground)' }}>
                  {products.length} products across {warehouses.length} warehouses
                </p>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-auto h-full">
            <table className="w-full border-collapse border border-secondary">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="border border-secondary px-4 py-2 text-left">
                    <div className="flex items-center space-x-2">
                      <Boxes className="w-4 h-4" />
                      <span>Product</span>
                    </div>
                  </th>
                  {warehouses.map((wh) => (
                    <th key={wh} className="border border-secondary px-4 py-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Warehouse className="w-4 h-4" />
                        <span>{wh}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((prod, index) => (
                  <tr key={prod} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                    <td
                      style={{ borderColor: 'var(--secondary)', color: 'var(--foreground)' }}
                      className="border px-4 py-2 font-semibold cursor-pointer hover:bg-secondary/10"
                      onClick={() => {
                        const item = stock.find((s) => s.rawMaterial.name === prod);
                        if (item) {
                          setSelectedProduct({
                            id: item.rawMaterial.id,
                            name: item.rawMaterial.name,
                          });
                          setModalOpen(true);
                        }
                      }}
                    >
                      {prod}
                    </td>
                    {warehouses.map((wh) => {
                      const item = matrix[prod][wh];
                      let rawQ: unknown = item?.currentQuantity ?? 0;
                      let q: number;
                      // Fix: If rawQ is a string (from backend bug), try to parse as float, else fallback to 0
                      if (typeof rawQ === 'string') {
                        // Remove commas and try to parse
                        const parsed = parseFloat(rawQ.replace(/,/g, ''));
                        q = isNaN(parsed) ? 0 : parsed;
                      } else if (typeof rawQ === 'number' && isFinite(rawQ)) {
                        q = rawQ;
                      } else {
                        q = 0;
                      }
                      // Get unit of measurement, but ignore it if it looks like a number
                      let unit = item?.rawMaterial.unitOfMeasurement || 'units';
                      if (!isNaN(parseFloat(unit))) {
                        unit = 'kG'; // fallback if unit is actually a number
                      }
                      return (
                        <td key={`${prod}-${wh}`} style={{ borderColor: 'var(--secondary)' }} className="border px-4 py-2 text-center">
                          {q > 0 ? (
                            <span style={{ color: 'var(--foreground)' }} className="font-mono">
                              {q.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted-foreground)' }}>
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default Stock;
