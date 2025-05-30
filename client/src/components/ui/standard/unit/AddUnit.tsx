import React, { useState } from "react";
import api, { API_ROUTES } from "../../../../utils/api";
import { motion } from "framer-motion";
import { Save, X, AlertCircle, Package, Info, Tag, Type, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";

interface AddUnitProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AddUnit: React.FC<AddUnitProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const authToken = localStorage.getItem("authToken");
      await api.post(
        API_ROUTES.UNIT.CREATE_UNIT,
        { name, symbol, description },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      setSuccess(true);
      toast.success("Unit created successfully!", {
        position: "bottom-right",
        autoClose: 3000,
      });
      
      // Clear form
      setName("");
      setSymbol("");
      setDescription("");
      
      // Slight delay before redirecting
      setTimeout(() => {
        onSuccess();
      }, 1000);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to create unit.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "bottom-right",
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-xl border border-blue-100 shadow-md overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-100 p-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Create Measurement Unit</h2>
        </div>
        <p className="text-gray-600 mt-1 pl-9">
          Define a new unit of measurement for use in standards and specifications.
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <motion.div 
          className="mx-6 my-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button 
            onClick={() => setError("")}
            className="ml-auto p-1 text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
      
      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit Name*</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Type className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-300 outline-none transition-all duration-200"
                  placeholder="E.g., Kilogram, Meter, Liter"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                The full name of this measurement unit
              </p>
            </div>
            
            {/* Symbol field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Symbol*</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-300 outline-none transition-all duration-200"
                  placeholder="E.g., kg, m, L"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                A short symbol or abbreviation for this unit
              </p>
            </div>
          </div>
          
          {/* Description field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <div className="relative">
              <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                <Info className="h-4 w-4 text-blue-500" />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-blue-200 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-300 outline-none transition-all duration-200 min-h-[120px]"
                placeholder="Provide additional details about this unit of measurement..."
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Optional: Add more details about how this unit is used
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <motion.button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
            >
              <X size={16} />
              Cancel
            </motion.button>
            
            <motion.button
              type="submit"
              className={`px-5 py-2.5 rounded-lg shadow-md flex items-center gap-2 ${
                success 
                  ? "bg-green-600 text-white" 
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              }`}
              whileHover={!isSubmitting && !success ? { 
                scale: 1.02, 
                boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.15)" 
              } : {}}
              whileTap={!isSubmitting && !success ? { scale: 0.98 } : {}}
              disabled={isSubmitting || success}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle size={16} />
                  <span>Created</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Create Unit</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddUnit;