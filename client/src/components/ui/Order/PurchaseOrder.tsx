import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  AlertCircle,
  Info,
  Trash2,
  Building2,
  Package,
  CheckCircle,
  X,
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import api, { API_ROUTES } from '../../../utils/api';
import VendorBox from './vendor';
import RawMaterialBox from './RawMaterial';
import { useNavigate } from 'react-router-dom';

type Vendor = {
  id: string;
  vendorCode: string;
  name: string;
  address?: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  gstin?: string;
  bankDetails?: string;
  enabled?: boolean;
};

type RawMaterial = {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  unitOfMeasurement: string;
  minReorderLevel: number;
  vendorId: string;
};

type FormFieldProps = {
  label: React.ReactNode;
  id: string;
  error?: string;
  required?: boolean;
  description?: React.ReactNode;
  children: React.ReactNode;
};

const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  required,
  description,
  children,
}) => (
  <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
    {description && (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info size={12} />
        {description}
      </p>
    )}
    {children}
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/30"
        >
          <AlertCircle size={14} />
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const PurchaseOrder = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([
    { rawMaterialId: '', quantityOrdered: 1, rate: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sidebarBox, setSidebarBox] = useState<
    null | 'vendor' | { type: 'rawMaterial'; idx: number }
  >(null);
  const [, setShowVendorBox] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showRawMaterialBoxIdx] = useState<number | null>(null);
  const [selectedRawMaterials, setSelectedRawMaterials] = useState<
    Record<number, RawMaterial | null>
  >({});
  const navigate = useNavigate();
  // Fetch vendors and raw materials
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get(API_ROUTES.RAW.GET_VENDORS, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        setVendors(res.data);
      } catch {
        setVendors([]);
      }
    };
    const fetchRawMaterials = async () => {
      try {
        const res = await api.get(API_ROUTES.RAW.GET_PRODUCTS, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        setRawMaterials(res.data);
      } catch {
        setRawMaterials([]);
      }
    };
    fetchVendors();
    fetchRawMaterials();
  }, []);

  useEffect(() => {
    if (vendorId === 'new') {
      setSidebarBox('vendor');
      setSelectedVendor(null);
    } else if (vendorId) {
      const v = vendors.find((v) => v.id === vendorId) || null;
      setSelectedVendor(v);
      setSidebarBox('vendor');
    } else {
      setSidebarBox(null);
      setSelectedVendor(null);
    }
  }, [vendorId, vendors]);

  const handleVendorCreated = (vendor: Vendor) => {
    setVendors((prev) => [...prev, vendor]);
    setVendorId(vendor.id);
    setSelectedVendor(vendor);
    setShowVendorBox(true);
  };

  const handleRawMaterialCreated = (
    rawMaterial: {
      id: any;
      skuCode?: string;
      name?: string;
      category?: string;
      unitOfMeasurement?: string;
      minReorderLevel?: number;
      vendorId?: string;
    },
    idx: number
  ) => {
    const normalizedRawMaterial: RawMaterial = {
      id: rawMaterial.id,
      skuCode: rawMaterial.skuCode ?? '',
      name: rawMaterial.name ?? '',
      category: rawMaterial.category ?? '',
      unitOfMeasurement: rawMaterial.unitOfMeasurement ?? '',
      minReorderLevel: rawMaterial.minReorderLevel ?? 0,
      vendorId: rawMaterial.vendorId ?? '',
    };
    setRawMaterials((prev) => [...prev, normalizedRawMaterial]);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, rawMaterialId: normalizedRawMaterial.id } : item
      )
    );
    setSelectedRawMaterials((prev) => ({
      ...prev,
      [idx]: normalizedRawMaterial,
    }));
    setSidebarBox({ type: 'rawMaterial', idx }); // <-- Always show details after creation
  };

  const handleItemChange = (
    idx: number,
    field: string,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
    if (field === 'rawMaterialId') {
      setSidebarBox({ type: 'rawMaterial', idx }); // <-- Always set sidebar
      if (value === 'new') {
        // Do not set selectedRawMaterials for new
        setSelectedRawMaterials((prev) => ({
          ...prev,
          [idx]: null,
        }));
      } else {
        const found = rawMaterials.find((rm) => rm.id === value) || null;
        setSelectedRawMaterials((prev) => ({
          ...prev,
          [idx]: found,
        }));
      }
    }
  };

  const addItem = () => {
    setItems([...items, { rawMaterialId: '', quantityOrdered: 1, rate: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    setSelectedRawMaterials((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const calculateTotal = () => {
    return items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.rate,
      0
    );
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const authToken = localStorage.getItem('authToken');
      await api.post(
        API_ROUTES.RAW.CREATE_PURCHASE_ORDER,
        {
          vendorId,
          orderDate,
          expectedDate,
          items,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setSuccessMsg('Purchase order created successfully!');
      setVendorId('');
      setOrderDate('');
      setExpectedDate('');
      setItems([{ rawMaterialId: '', quantityOrdered: 1, rate: 0 }]);
      setSelectedRawMaterials({});
      setTimeout(() => {
        navigate('/raw/purchase-history');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error || 'Failed to create purchase order'
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl">
              <ShoppingCart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Create Purchase Order
              </h1>
              <p className="text-sm text-muted-foreground">
                Generate a new purchase order for raw materials
              </p>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-input bg-background text-foreground  hover:bg-accent transition"
                onClick={() => navigate('/raw/purchase-history')}
              >
                Back to List
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setErrorMsg('')}
                  className="ml-auto text-destructive/70 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Success</p>
                  <p className="text-sm text-foreground/80">{successMsg}</p>
                </div>
                <button
                  onClick={() => setSuccessMsg('')}
                  className="ml-auto text-foreground/50 hover:text-foreground/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Order Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <FormField label="Vendor" id="vendor" required>
                    <div className="relative">
                      <select
                        id="vendor"
                        className="w-full text-foreground bg-background border border-input rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring appearance-none"
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        required
                      >
                        <option className='text-foreground' value="">Select Vendor</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id} className="text-foreground">
                            {v.name}
                          </option>
                        ))}
                        <option value="new" className='text-foreground'>+ New Vendor</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Order Date" id="orderDate" required>
                    <input
                      type="date"
                      id="orderDate"
                      className="w-full bg-card/100 text-foreground  border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      required
                    />
                  </FormField>

                  <FormField
                    label="Expected Delivery Date"
                    id="expectedDate"
                    required
                  >
                    <input
                      type="date"
                      id="expectedDate"
                      className="w-full bg-card/100 text-foreground  border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                {/* Order Items */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Order Items
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-muted/50 rounded-xl border border-border"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Raw Material
                          </label>
                          <div className="relative">
                            <select
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none text-foreground"
                              value={
                                showRawMaterialBoxIdx === idx
                                  ? 'new'
                                  : item.rawMaterialId
                              }
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  'rawMaterialId',
                                  e.target.value
                                )
                              }
                              required
                            >
                              <option value="" className="text-muted-foreground">Select Raw Material</option>
                              {rawMaterials.map((rm) => (
                                <option key={rm.id} value={rm.id} className="text-foreground">
                                  {rm.name}
                                </option>
                              ))}
                              <option value="new" className="text-primary">+ New Raw Material</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                            value={
                              item.quantityOrdered === 0
                                ? ''
                                : item.quantityOrdered
                            }
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'quantityOrdered',
                                Number(e.target.value)
                              )
                            }
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Rate (₦)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                              value={item.rate === 0 ? '' : item.rate}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  'rate',
                                  Number(e.target.value)
                                )
                              }
                              required
                            />
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.quantityOrdered > 0 && item.rate > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              Subtotal:
                            </span>
                            <span className="font-medium text-foreground">
                              ₦{(item.quantityOrdered * item.rate).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Total */}
                {calculateTotal() > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span className="text-foreground">Total Amount:</span>
                      <span className="text-primary">
                        ₦{calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold text-base hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="w-5 h-5 border-2 border-primary-foreground/70 border-t-transparent rounded-full"
                    />
                    Creating Purchase Order...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Create Purchase Order
                  </div>
                )}
              </motion.button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {sidebarBox === 'vendor' && (
              <VendorBox
                vendor={selectedVendor}
                onCreated={handleVendorCreated}
              />
            )}
            {sidebarBox &&
              typeof sidebarBox === 'object' &&
              sidebarBox.type === 'rawMaterial' && (
                <RawMaterialBox
                  rawMaterial={selectedRawMaterials[sidebarBox.idx] ?? null}
                  onCreated={(rm) =>
                    handleRawMaterialCreated(rm, sidebarBox.idx)
                  }
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrder;
