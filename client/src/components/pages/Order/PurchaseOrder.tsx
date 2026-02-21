import React, { useEffect, useRef, useState } from 'react';
import api, { API_ROUTES } from '../../../utils/api';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  Package,
  Hash,
  Calendar as CalendarIcon,
  User2,
  Boxes,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import ReceiveModal, {
  DeleteOrderModal,
  EditOrderModal,
  GRNBagWeightModal,
  GRNSummaryModal,
  BagWeight,
  GRNData,
} from '../../ui/Order/statusModal';
import { useNavigate } from 'react-router-dom';

type Vendor = {
  id: string;
  name: string;
};

type PurchaseOrderItem = {
  id: string;
  rawMaterialId: string;
  quantityOrdered: number;
  rate: number;
  status: string;
  rawMaterial?: {
    id: string;
    skuCode: string;
    name: string;
  };
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  vendor: Vendor;
  orderDate: string;
  expectedDate: string;
  status: string;
  items: PurchaseOrderItem[];
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const PurchaseOrderList: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<string | null>(null);
  const [receiveDefaultQty, setReceiveDefaultQty] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [sendingMailForOrder, setSendingMailForOrder] = useState<string | null>(null);
  
  // GRN Modal States
  const [showGRNBagWeightModal, setShowGRNBagWeightModal] = useState(false);
  const [showGRNSummaryModal, setShowGRNSummaryModal] = useState(false);
  const [grnData, setGrnData] = useState<GRNData | null>(null);
  const grnDataRef = useRef<GRNData | null>(null);
  const [currentItemForGRN, setCurrentItemForGRN] = useState<{
    item: PurchaseOrderItem;
    order: PurchaseOrder;
  } | null>(null);
  
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');

      // Fetch purchase orders and raw materials in parallel
      const [ordersResponse, productsResponse] = await Promise.all([
        api.get(API_ROUTES.RAW.GET_PURCHASE_ORDERS, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        api.get(API_ROUTES.RAW.GET_PRODUCTS, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const products = productsResponse.data;

      // Create a map of rawMaterialId -> rawMaterial data for quick lookup
      const productMap = new Map(
        products.map((p: any) => [p.id, { id: p.id, skuCode: p.skuCode, name: p.name }])
      );

      // Merge raw material data into purchase order items
      const enrichedOrders = ordersResponse.data.map((order: any) => ({
        ...order,
        items: order.items.map((item: any) => ({
          ...item,
          rawMaterial: productMap.get(item.rawMaterialId) || {
            id: item.rawMaterialId,
            skuCode: '',
            name: 'Unknown'
          },
        })),
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEditSave = async ({ expectedDate }: { expectedDate: string }) => {
    if (!selectedOrder) return;
    try {
      const authToken = localStorage.getItem('authToken');
      await api.put(
        API_ROUTES.RAW.UPDATE_PURCHASE_ORDER(selectedOrder.id),
        { expectedDate },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, expectedDate } : o))
      );
      setEditModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOrder) return;
    try {
      const authToken = localStorage.getItem('authToken');
      await api.delete(API_ROUTES.RAW.UPDATE_PURCHASE_ORDER(selectedOrder.id), {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      setDeleteModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleReceiveConfirm = async (warehouseId: string, quantity: number) => {
    if (!receiveItemId) return;
    // Use ref to get the latest grnData reliably
    const currentGrnData = grnDataRef.current;
    console.log('handleReceiveConfirm - grnDataRef.current:', currentGrnData);
    try {
      const authToken = localStorage.getItem('authToken');
      const requestBody = {
        status: 'Received',
        warehouseId,
        quantityReceived: quantity,
        grnData: currentGrnData,
      };
      console.log('Sending request body:', JSON.stringify(requestBody, null, 2));
      await api.put(
        API_ROUTES.RAW.UPDATE_PURCHASE_ORDER_ITEM(receiveItemId),
        requestBody,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.map((item) =>
            item.id === receiveItemId
              ? { ...item, status: 'Received' }
              : item
          ),
        }))
      );
    } catch (error) {
      console.error('Error receiving order:', error);
    }
    setShowReceiveModal(false);
    setReceiveItemId(null);
    setGrnData(null);
    grnDataRef.current = null;
    setCurrentItemForGRN(null);
  };

  // Generate GRN Number
  const generateGRNNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN-${dateStr}-${random}`;
  };

  // Handle opening GRN flow
  const handleStartReceive = (item: PurchaseOrderItem, order: PurchaseOrder) => {
    setCurrentItemForGRN({ item, order });
    setShowGRNBagWeightModal(true);
  };

  // Handle bag weights submission
  const handleBagWeightsSubmit = (bagWeights: BagWeight[]) => {
    if (!currentItemForGRN) return;

    const { item, order } = currentItemForGRN;
    const totalConfirmedWeight = bagWeights.reduce((sum, b) => sum + b.weight, 0);
    
    // PO quantityOrdered is in KG (invoice weight)
    const invoiceWeight = item.quantityOrdered;
    // User provides number of bags, so we don't have invoice bags from PO
    // We'll use 0 or calculate based on some standard if needed
    const invoiceQtyBags = 0; // PO doesn't specify bags, only total weight in KG

    const newGrnData: GRNData = {
      date: new Date().toLocaleDateString(),
      itemName: item.rawMaterial?.name || 'Unknown',
      supplierName: order.vendor?.name || 'Unknown',
      invoiceQtyBags: invoiceQtyBags, // Will be 0 since PO is in KG not bags
      invoiceWeight: invoiceWeight, // From PO quantityOrdered
      confirmedQtyBags: bagWeights.length, // Number of bags user entered
      confirmedWeight: totalConfirmedWeight, // Calculated from bags × weight per bag
      weightDifference: totalConfirmedWeight - invoiceWeight,
      grnNumber: generateGRNNumber(),
      bagWeights: bagWeights,
    };

    setGrnData(newGrnData);
    grnDataRef.current = newGrnData;
    setShowGRNBagWeightModal(false);
    setShowGRNSummaryModal(true);
  };

  // Handle GRN Summary confirmation
  const handleGRNConfirm = (confirmedGrnData: GRNData) => {
    if (!currentItemForGRN) return;

    setGrnData(confirmedGrnData);
    grnDataRef.current = confirmedGrnData;
    console.log('handleGRNConfirm - stored grnData in ref:', confirmedGrnData);
    setShowGRNSummaryModal(false);
    
    // Now open the existing Receive Modal
    setReceiveItemId(currentItemForGRN.item.id);
    setReceiveDefaultQty(confirmedGrnData.confirmedQtyBags);
    setShowReceiveModal(true);
  };

  const handleSendMail = async () => {
    try {
      setSendingMailForOrder('all');
      const authToken = localStorage.getItem('authToken');
      console.log('=== Sending mail request ===');
      console.log('URL:', API_ROUTES.RAW.SEND_PRODUCT_MAIL);
      console.log('Token exists:', !!authToken);

      const response = await api.get(API_ROUTES.RAW.SEND_PRODUCT_MAIL, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      console.log('Response:', response.data);
      toast.success('Complete purchase order history sent successfully!');
    } catch (error: any) {
      console.error('=== Error sending mail ===');
      console.error('Error:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Failed to send email');
    } finally {
      setSendingMailForOrder(null);
    }
  };

  const totalOrders = orders.length;
  const receivedOrders = orders.filter((o) =>
    o.items.some((item) => item.status === 'Received')
  ).length;
  const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Clock className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground font-medium">Loading Purchase Orders...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-background p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="text-primary" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
              <p className="text-xs text-muted-foreground">Real-time order tracking and management</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition text-sm"
            onClick={handleSendMail}
            disabled={sendingMailForOrder === 'all'}
          >
            {sendingMailForOrder === 'all' ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send All Orders via Email
              </>
            )}
          </button>
          <button
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
            onClick={() => navigate('/raw/purchase-order')}
          >
            + Create Order
          </button>
        </div>
      </motion.div>

      {/* Stats Bar - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border/50 rounded-lg p-3"
          style={{
            background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary opacity-40" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-lg p-3"
          style={{
            background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Received</p>
              <p className="text-2xl font-bold text-foreground">{receivedOrders}</p>
            </div>
            <FileText className="h-5 w-5 text-primary opacity-40" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border/50 rounded-lg p-3"
          style={{
            background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.03) 0%, rgba(83, 23, 170, 0.01) 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cancelled</p>
              <p className="text-2xl font-bold text-foreground">{cancelledOrders}</p>
            </div>
            <XCircle className="h-5 w-5 text-destructive opacity-40" />
          </div>
        </motion.div>
      </div>

      {/* Full-Width Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border border-border/50 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.02) 0%, transparent 100%)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    PO Number
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <User2 className="w-3.5 h-3.5" />
                    Vendor
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    SKU Code
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    Product Name
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Order Date
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Expected Date
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1 justify-center">
                    <Boxes className="w-3.5 h-3.5" />
                    Quantity
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                orders.flatMap((order, orderIndex) =>
                  order.items.map((item, itemIndex) => (
                    <motion.tr
                      key={`${order.id}-${item.id}`}
                      className="hover:bg-primary/5 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (orderIndex * order.items.length + itemIndex) * 0.03 }}
                    >
                      {itemIndex === 0 ? (
                        <>
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap" rowSpan={order.items.length}>
                            {order.poNumber}
                          </td>
                          <td className="px-4 py-3 text-foreground/80 whitespace-nowrap" rowSpan={order.items.length}>
                            {order.vendor?.name || '-'}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                        {item.rawMaterial?.skuCode || '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80 whitespace-nowrap max-w-xs truncate">
                        {item.rawMaterial?.name || 'Unknown'}
                      </td>
                      {itemIndex === 0 ? (
                        <>
                          <td className="px-4 py-3 text-foreground/80 whitespace-nowrap" rowSpan={order.items.length}>
                            {formatDate(order.orderDate)}
                          </td>
                          <td className="px-4 py-3 text-foreground/80 whitespace-nowrap" rowSpan={order.items.length}>
                            {formatDate(order.expectedDate)}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">
                        {item.quantityOrdered}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">
                        ₦{item.rate.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${item.status === 'Received'
                          ? 'bg-accent text-foreground border-border'
                          : 'bg-muted text-foreground border-border'
                          }`}>
                          {item.status === 'Received' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStartReceive(item, order)}
                            disabled={item.status === 'Received'}
                            className={`px-3 py-1 text-xs font-medium rounded transition ${item.status === 'Received'
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                              }`}
                          >
                            {item.status === 'Received' ? 'Received' : 'Receive'}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals */}
      <GRNBagWeightModal
        open={showGRNBagWeightModal}
        onClose={() => {
          setShowGRNBagWeightModal(false);
          setCurrentItemForGRN(null);
        }}
        onSubmit={handleBagWeightsSubmit}
        invoiceQtyBags={currentItemForGRN?.item.quantityOrdered || 0}
        itemName={currentItemForGRN?.item.rawMaterial?.name || 'Unknown'}
      />
      <GRNSummaryModal
        open={showGRNSummaryModal}
        onClose={() => {
          setShowGRNSummaryModal(false);
          setShowGRNBagWeightModal(true); // Go back to bag weight entry
        }}
        onConfirm={handleGRNConfirm}
        grnData={grnData}
      />
      <ReceiveModal
        open={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setGrnData(null);
          grnDataRef.current = null;
          setCurrentItemForGRN(null);
        }}
        onConfirm={handleReceiveConfirm}
        defaultQuantity={receiveDefaultQty}
      />
      <EditOrderModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        defaultExpectedDate={selectedOrder?.expectedDate?.slice(0, 10) || ''}
      />
      <DeleteOrderModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDelete={handleDeleteConfirm}
        poNumber={selectedOrder?.poNumber || ''}
      />
    </motion.div>
  );
};

export default PurchaseOrderList;
