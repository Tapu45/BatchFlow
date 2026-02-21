import React, { useEffect, useState } from "react";
import api, { API_ROUTES } from "../../../utils/api";

// GRN Types - defined at top for use in Props
export type BagWeight = {
  bagNumber: number;
  weight: number;
};

export type GRNData = {
  date: string;
  itemName: string;
  supplierName: string;
  invoiceQtyBags: number;
  invoiceWeight: number;
  confirmedQtyBags: number;
  confirmedWeight: number;
  weightDifference: number;
  grnNumber: string;
  bagWeights: BagWeight[];
};

type Warehouse = {
  id: string;
  name: string;
  location?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (warehouseId: string, quantity: number) => void;
  defaultQuantity?: number;
};

const ReceiveModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  defaultQuantity = 0,
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [quantity, setQuantity] = useState<number>(defaultQuantity);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
      setShowForm(false);
      setSelectedWarehouseId("");
      setQuantity(defaultQuantity);
    }
    // eslint-disable-next-line
  }, [open, defaultQuantity]);

 const fetchWarehouses = async () => {
  try {
    const authToken = localStorage.getItem('authToken');
    const res = await api.get(API_ROUTES.RAW.GET_WAREHOUSES, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setWarehouses(res.data);
  } catch {
    setWarehouses([]);
  }
};

  const handleAddClick = () => setShowForm(true);

 const handleConfirm = async () => {
  if (!selectedWarehouseId) {
    window.alert("Please select a warehouse.");
    return;
  }
  if (!quantity || quantity <= 0) {
    window.alert("Please enter a valid quantity.");
    return;
  }
  setLoading(true);
  try {
    await onConfirm(selectedWarehouseId, quantity);
  } finally {
    setLoading(false);
  }
};

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">Receive Item</h2>
        {!showForm ? (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Warehouse
              </label>
              <div className="flex gap-2">
                <select
                  className="w-full border rounded px-2 py-1"
                  value={selectedWarehouseId}
                  onChange={e => setSelectedWarehouseId(e.target.value)}
                >
                  <option value="">Choose warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                  onClick={handleAddClick}
                  type="button"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Received
              </label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-2 py-1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-1 rounded bg-gray-100 text-gray-700"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-blue-600 text-white"
               
                onClick={handleConfirm}
              >
              {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "OK"
                )}
              </button>
            </div>
          </div>
        ) : (
          <WarehouseForm
            onCreated={w => {
              setWarehouses(ws => [...ws, w]);
              setSelectedWarehouseId(w.id);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
};

type WarehouseFormProps = {
  onCreated: (w: Warehouse) => void;
  onCancel: () => void;
};

const WarehouseForm: React.FC<WarehouseFormProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const res = await api.post(
        API_ROUTES.RAW.CREATE_WAREHOUSE,
        { name, location },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      onCreated(res.data);
    } catch {
      // handle error
    }
    setLoading(false);
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-2">Add Warehouse</h3>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          className="w-full border rounded px-2 py-1"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Warehouse name"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          className="w-full border rounded px-2 py-1"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-1 rounded bg-gray-100 text-gray-700"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-1 rounded bg-blue-600 text-white"
          onClick={handleCreate}
          disabled={!name || loading}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default ReceiveModal;

// ...existing code...

// Edit Purchase Order Modal
type EditOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { expectedDate: string }) => void;
  defaultExpectedDate: string;
};

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  open,
  onClose,
  onSave,
  defaultExpectedDate,
}) => {
  const [expectedDate, setExpectedDate] = useState(defaultExpectedDate);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExpectedDate(defaultExpectedDate);
  }, [defaultExpectedDate, open]);

  const handleSave = async () => {
    setLoading(true);
    await onSave({ expectedDate });
    setLoading(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">Edit Purchase Order</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Date
          </label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={expectedDate}
            onChange={e => setExpectedDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1 rounded bg-gray-100 text-gray-700"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1 rounded bg-blue-600 text-white"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Purchase Order Modal
type DeleteOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  poNumber: string;
};

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
  open,
  onClose,
  onDelete,
  poNumber,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await onDelete();
    setLoading(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">Delete Purchase Order</h2>
        <p className="mb-4 text-gray-700">
          Are you sure you want to delete <b>{poNumber}</b>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1 rounded bg-gray-100 text-gray-700"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1 rounded bg-red-600 text-white"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// GRN Bag Weight Entry Modal
type GRNBagWeightModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (bagWeights: BagWeight[]) => void;
  invoiceQtyBags?: number; // Made optional - not used in new flow
  itemName: string;
};

export const GRNBagWeightModal: React.FC<GRNBagWeightModalProps> = ({
  open,
  onClose,
  onSubmit,
  itemName,
}) => {
  const [entryMode, setEntryMode] = useState<'bag' | 'total'>('bag');
  const [bagWeights, setBagWeights] = useState<BagWeight[]>([]);
  const [currentWeight, setCurrentWeight] = useState<string>("");
  const [totalWeight, setTotalWeight] = useState<string>("");

  useEffect(() => {
    if (open) {
      setBagWeights([]);
      setCurrentWeight("");
      setTotalWeight("");
      setEntryMode('bag');
    }
  }, [open]);

  const handleAddBag = () => {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0) {
      window.alert("Please enter a valid weight");
      return;
    }
    const nextBagNumber = bagWeights.length + 1;
    setBagWeights((prev) => [...prev, { bagNumber: nextBagNumber, weight }]);
    setCurrentWeight("");
  };

  const handleRemoveBag = (bagNumber: number) => {
    setBagWeights((prev) => {
      const filtered = prev.filter((b) => b.bagNumber !== bagNumber);
      // Re-number bags sequentially
      return filtered.map((bag, index) => ({
        ...bag,
        bagNumber: index + 1,
      }));
    });
  };

  const handleSubmit = () => {
    if (entryMode === 'bag') {
      if (bagWeights.length === 0) {
        window.alert("Please add at least one bag weight");
        return;
      }
      onSubmit(bagWeights);
    } else {
      const weight = parseFloat(totalWeight);
      if (isNaN(weight) || weight <= 0) {
        window.alert("Please enter a valid total weight");
        return;
      }
      // For total mode, treat as a single bag
      onSubmit([{ bagNumber: 1, weight }]);
    }
  };

  const totalWeightValue = entryMode === 'bag'
    ? bagWeights.reduce((sum, b) => sum + b.weight, 0)
    : parseFloat(totalWeight) || 0;
  const nextBagNumber = bagWeights.length + 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-2">GRN - Weight Entry</h2>
        <p className="text-sm text-gray-600 mb-4">
          Item: <span className="font-medium">{itemName}</span>
        </p>

        {/* Entry Mode Selection */}
        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="entryMode"
              value="bag"
              checked={entryMode === 'bag'}
              onChange={() => setEntryMode('bag')}
            />
            <span>Bag-wise Entry</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="entryMode"
              value="total"
              checked={entryMode === 'total'}
              onChange={() => setEntryMode('total')}
            />
            <span>Total Weight Only</span>
          </label>
        </div>

        {/* Bag-wise Entry Form */}
        {entryMode === 'bag' && (
          <>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bag #{nextBagNumber} Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="Enter weight"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBag();
                    }
                  }}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="self-end px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleAddBag}
              >
                Add Bag
              </button>
            </div>

            {/* Bag Weights List */}
            {bagWeights.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Entered Bag Weights</h3>
                <div className="border rounded max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Bag #</th>
                        <th className="px-3 py-2 text-right">Weight (kg)</th>
                        <th className="px-3 py-2 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bagWeights.map((bag) => (
                        <tr key={bag.bagNumber} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{bag.bagNumber}</td>
                          <td className="px-3 py-2 text-right">{bag.weight.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 text-lg"
                              onClick={() => handleRemoveBag(bag.bagNumber)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-between text-sm bg-blue-50 p-2 rounded">
                  <span className="font-medium">Total Bags: {bagWeights.length}</span>
                  <span className="font-medium">Total Weight: {totalWeightValue.toFixed(2)} kg</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Total Weight Entry Form */}
        {entryMode === 'total' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Weight Received (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border rounded px-3 py-2"
              value={totalWeight}
              onChange={e => setTotalWeight(e.target.value)}
              placeholder="Enter total weight"
              autoFocus={entryMode === 'total'}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-100 text-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={entryMode === 'bag' ? bagWeights.length === 0 : !totalWeight}
          >
            Generate Summary
          </button>
        </div>
      </div>
    </div>
  );
};

// GRN Summary Modal
type GRNSummaryModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (grnData: GRNData) => void;
  grnData: GRNData | null;
};

export const GRNSummaryModal: React.FC<GRNSummaryModalProps> = ({
  open,
  onClose,
  onConfirm,
  grnData,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!grnData) return;
    setLoading(true);
    try {
      await onConfirm(grnData);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !grnData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">GRN Summary</h2>

        {/* Summary Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border rounded p-3">
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-medium">{grnData.date}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-500">GRN Number</p>
            <p className="font-medium">{grnData.grnNumber}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-500">Item</p>
            <p className="font-medium">{grnData.itemName}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-500">Supplier</p>
            <p className="font-medium">{grnData.supplierName}</p>
          </div>
        </div>

        {/* Quantity & Weight Comparison */}
        <div className="border rounded mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-center">Invoice</th>
                <th className="px-4 py-2 text-center">Confirmed</th>
                <th className="px-4 py-2 text-center">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2 font-medium">Quantity (Bags)</td>
                <td className="px-4 py-2 text-center text-gray-400">-</td>
                <td className="px-4 py-2 text-center">{grnData.confirmedQtyBags}</td>
                <td className="px-4 py-2 text-center text-gray-400">-</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Weight (kg)</td>
                <td className="px-4 py-2 text-center">{grnData.invoiceWeight.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">{grnData.confirmedWeight.toFixed(2)}</td>
                <td className={`px-4 py-2 text-center font-medium ${grnData.weightDifference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {grnData.weightDifference.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bag Wise Weights */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bag Wise Weights</h3>
          <div className="border rounded max-h-40 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Bag #</th>
                  <th className="px-3 py-2 text-right">Weight (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grnData.bagWeights.map((bag) => (
                  <tr key={bag.bagNumber}>
                    <td className="px-3 py-2">{bag.bagNumber}</td>
                    <td className="px-3 py-2 text-right">{bag.weight.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-100 text-gray-700"
            onClick={onClose}
            disabled={loading}
          >
            Back
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Confirming..." : "Confirm & Proceed to Receive"}
          </button>
        </div>
      </div>
    </div>
  );
};