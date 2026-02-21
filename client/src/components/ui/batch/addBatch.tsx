import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_ROUTES } from '../../../utils/api';
import {
  AlertCircle,
  X,
  Save,
  Package,
  ChevronRight,
  Clock,
  Check,
  RotateCw,
  Beaker,
  SlidersHorizontal,
  Hash,
  Ruler,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSave } from '../../../hooks/useAutoSave';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const AddBatch: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [grnNumbers, setGrnNumbers] = useState<any[]>([]);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);
  const [grnSearchInput, setGrnSearchInput] = useState('');
  const [showGrnSuggestions, setShowGrnSuggestions] = useState(false);
  const [filteredGrnSuggestions, setFilteredGrnSuggestions] = useState<any[]>(
    []
  );
  const [formData, setFormData] = useState({
    batchNumber: '',
    batchCode: '',
    grnNumber: '',
    productId: '',
    dateOfProduction: '',
    bestBeforeDate: '',
    sampleAnalysisStarted: '',
    sampleAnalysisCompleted: '',
    sampleAnalysisStatus: 'PENDING',
  });
 const [parameterValues, setParameterValues] = useState<
   Array<{
     parameterId: string;
     value: string;
     standardValue?: string; // ADD THIS
     unitId?: string;
     remark?: string;
   }>
 >([]);
  const [sieveSelections, setSieveSelections] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [draftFetchedAt, setDraftFetchedAt] = useState<string | null>(null);

  const authToken = localStorage.getItem('authToken');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [removedParameters, setRemovedParameters] = useState<Set<string>>(
    new Set()
  );

  const { data: productsData = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await axios.get(API_ROUTES.PRODUCT.GET_PRODUCTS, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        return response.data?.products || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
  });

  const { data: productParametersData, isLoading: isLoadingProductParameters } =
    useQuery({
      queryKey: ['productParameters', selectedProductId],
      queryFn: async () => {
        if (!selectedProductId) return { parametersByCategory: {} };

        try {
          const response = await axios.get(
            API_ROUTES.PRODUCT.GET_PARAMETERS_BY_PRODUCT_ID(selectedProductId),
            { headers: { Authorization: `Bearer ${authToken}` } }
          );
          return response.data || { parametersByCategory: {} };
        } catch (error) {
          console.error('Error fetching product parameters:', error);
          return { parametersByCategory: {} };
        }
      },
      enabled: !!selectedProductId,
    });

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const draftIdFromUrl = searchParams.get('draftId');


  useEffect(() => {
    const fetchDraft = async () => {
      try {
        let draftData;

        if (draftIdFromUrl) {
          const response = await axios.get(
            API_ROUTES.DRAFT.GET_BATCH(draftIdFromUrl),
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          );
          draftData = response.data;
        } else {
          const response = await axios.get(
            API_ROUTES.DRAFT.GET_LATEST_BATCH_DRAFT,
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          );
          draftData = response.data;
        }

        setDraftId(draftData.id);
        setFormData({
          batchNumber: draftData.batchNumber || '',
          batchCode: draftData.batchCode || '',
          grnNumber: draftData.grnNumber || '',
          productId: draftData.productId || '',
          dateOfProduction: toDateInputString(draftData.dateOfProduction),
          bestBeforeDate: toDateInputString(draftData.bestBeforeDate),
          sampleAnalysisStarted: toDateInputString(
            draftData.sampleAnalysisStarted
          ),
          sampleAnalysisCompleted: toDateInputString(
            draftData.sampleAnalysisCompleted
          ),
          sampleAnalysisStatus: draftData.sampleAnalysisStatus || 'PENDING',
        });
        setSelectedProductId(draftData.productId || '');
        setNewProductName(draftData.newProductName || '');
        setDraftFetchedAt(draftData.updatedAt || draftData.createdAt || null);
        if (draftData.parameterValues) {
          const parsedData =
            typeof draftData.parameterValues === 'string'
              ? JSON.parse(draftData.parameterValues)
              : draftData.parameterValues;

          if (Array.isArray(parsedData)) {
            setParameterValues(parsedData);
          } else if (parsedData && typeof parsedData === 'object') {
            setParameterValues(parsedData.values || []);
            if (parsedData.removedParameters) {
              setRemovedParameters(new Set(parsedData.removedParameters));
            }
          } else {
            setParameterValues([]);
          }
        } else {
          setParameterValues([]);
        }
      } catch (error) {
        // ignore
      }
    };

    if (authToken) {
      fetchDraft();
    }
  }, [authToken, draftIdFromUrl]);

  useEffect(() => {
    if (productParametersData?.parametersByCategory) {
      const categories = Object.keys(
        productParametersData.parametersByCategory
      );
      if (categories.length > 0) {
        setExpandedCategories({ [categories[0]]: true });
      }
    }
  }, [productParametersData]);

 const handleInputChange = (
   e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
 ) => {
   const { name, value } = e.target;
   setFormData((prev) => ({
     ...prev,
     [name]: value,
   }));
 };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'new') {
      setShowNewProductForm(true);
      setSelectedProductId('');
      setFormData((prev) => ({ ...prev, productId: '' }));
    } else {
      setShowNewProductForm(false);
      setSelectedProductId(value);
      setFormData((prev) => ({ ...prev, productId: value }));
      setNewProductName('');
    }
  };

  useEffect(() => {
    const basicInfoValid =
      formData.batchNumber.trim() !== '' &&
      (formData.productId !== '' || newProductName.trim() !== '') &&
      formData.dateOfProduction !== '' &&
      formData.bestBeforeDate !== '';

    const parametersValid =
      parameterValues.length > 0 &&
      parameterValues.every((pv) => pv.value.trim() !== '');

    setIsFormValid(basicInfoValid && parametersValid);
  }, [formData, parameterValues, newProductName]);

  const createBatchMutation = useMutation({
    mutationFn: async (batchData: any) => {
      const response = await axios.post(
        API_ROUTES.BATCH.CREATE_BATCH,
        batchData,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      return response.data;
    },
    onSuccess: async () => {
      if (draftId) {
        try {
          await axios.delete(API_ROUTES.DRAFT.DELETE_BATCH(draftId), {
            headers: { Authorization: `Bearer ${authToken}` },
          });
        } catch (error) {
          console.error('Error deleting draft after submission:', error);
        }
      }
      navigate('/batches');
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to create batch');
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    if (!isFormValid) {
      setError('Please complete all required fields before saving');
      return;
    }

    setIsSaving(true);

    const transformedData = {
      ...formData,
      productName: formData.productId ? undefined : newProductName,
      sampleAnalysisStarted: formData.sampleAnalysisStarted || null,
      sampleAnalysisCompleted: formData.sampleAnalysisCompleted || null,
      parameterValues,
      status: 'SUBMITTED',
    };

    createBatchMutation.mutate(transformedData);
  };

  const parametersByCategory =
    productParametersData?.parametersByCategory || {};

  const isSieveParam = (name?: string) =>
    (name || '').toLowerCase().includes('pass through us sieve');

  const SIEVE_OPTIONS = [
    '400 micron',
    '500 micron',
    '600 micron',
    '710 micron',
    '850 micron',
    '2.36 mm',
    '3.35 mm',
  ];

  useAutoSave({
    saveUrl: API_ROUTES.DRAFT.SAVE_BATCH,
    getUrl: draftId ? API_ROUTES.DRAFT.GET_BATCH(draftId) : undefined,
    data: {
      formData,
      parameterValues: {
        values: parameterValues,
        removedParameters: Array.from(removedParameters),
      },
      newProductName,
    },
    isSuccess: createBatchMutation.isSuccess,
    authToken: authToken || '',
    draftId,
    onDraftIdChange: setDraftId,
  });

  function toDateInputString(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().slice(0, 10);
  }

  useEffect(() => {
    const fetchLatestDraft = async () => {
      try {
        const response = await axios.get(
          API_ROUTES.DRAFT.GET_LATEST_BATCH_DRAFT,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const draftData = response.data;

        setDraftId(draftData.id);
        setFormData({
          batchNumber: draftData.batchNumber || '',
          batchCode: draftData.batchCode || '',
          grnNumber: draftData.grnNumber || '',
          productId: draftData.productId || '',
          dateOfProduction: toDateInputString(draftData.dateOfProduction),
          bestBeforeDate: toDateInputString(draftData.bestBeforeDate),
          sampleAnalysisStarted: toDateInputString(
            draftData.sampleAnalysisStarted
          ),
          sampleAnalysisCompleted: toDateInputString(
            draftData.sampleAnalysisCompleted
          ),
          sampleAnalysisStatus: draftData.sampleAnalysisStatus || 'PENDING',
        });
        setSelectedProductId(draftData.productId || '');
        if (draftData.parameterValues) {
          const parsedData =
            typeof draftData.parameterValues === 'string'
              ? JSON.parse(draftData.parameterValues)
              : draftData.parameterValues;

          if (Array.isArray(parsedData)) {
            setParameterValues(parsedData);
          } else if (parsedData && typeof parsedData === 'object') {
            setParameterValues(parsedData.values || []);
            if (parsedData.removedParameters) {
              setRemovedParameters(new Set(parsedData.removedParameters));
            }
          } else {
            setParameterValues([]);
          }
        } else {
          setParameterValues([]);
        }
        setNewProductName(draftData.newProductName || '');
        setDraftFetchedAt(draftData.updatedAt || draftData.createdAt || null);
      } catch (error) {
        // ignore
      }
    };
    fetchLatestDraft();
  }, [authToken]);

  function formatDraftDate(dateStr: string | null) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  useEffect(() => {
    const fetchGRNNumbers = async () => {
      try {
        setIsLoadingGRNs(true);
        const response = await axios.get(
          `${API_ROUTES.RAW.GET_GRN_NUMBERS}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        setGrnNumbers(response.data.data || []);
      } catch (error) {
        console.error('Error fetching GRN numbers:', error);
        setGrnNumbers([]);
      } finally {
        setIsLoadingGRNs(false);
      }
    };

    if (authToken) {
      fetchGRNNumbers();
    }
  }, [authToken]);

  // Add handler for GRN search input
  const handleGrnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGrnSearchInput(value);
    setFormData((prev) => ({
      ...prev,
      grnNumber: value,
    }));

    // Filter suggestions based on input
    if (value.trim() === '') {
      setFilteredGrnSuggestions([]);
      setShowGrnSuggestions(false);
    } else {
      const filtered = grnNumbers.filter(
        (item) =>
          item.grn.toLowerCase().includes(value.toLowerCase()) ||
          item.rawMaterialName.toLowerCase().includes(value.toLowerCase()) ||
          item.supplier.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredGrnSuggestions(filtered);
      setShowGrnSuggestions(filtered.length > 0);
    }
  };

  // Add handler to select GRN from suggestions
  // const handleSelectGrn = (grn: string) => {
  //   setGrnSearchInput(grn);
  //   setFormData((prev) => ({
  //     ...prev,
  //     grnNumber: grn,
  //   }));
  //   setShowGrnSuggestions(false);
  // };


  const basicInfoComplete =
    formData.batchNumber &&
    (formData.productId || newProductName) &&
    formData.dateOfProduction &&
    formData.bestBeforeDate;
  const parametersComplete =
    parameterValues.length > 0 &&
    parameterValues.every((pv) => pv.value.trim() !== '');


  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div style={{display:'none'}}>{isLoadingGRNs}{filteredGrnSuggestions}{showGrnSuggestions}</div>
      
      <div className="max-w-7xl mx-auto pt-0 px-4 pb-4 sm:pt-0 sm:px-6 sm:pb-6">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg flex items-start"
            >
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium">{error}</span>
              </div>
              <button
                className="ml-3 hover:opacity-80 p-1 rounded"
                onClick={() => setError(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={itemVariants} className="bg-card rounded-xl mb-3">
          <div className="pr-5 pb-5 pt-5 pl-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-1.5 h-10 bg-primary rounded-full" />
              <div className="p-2 bg-primary rounded-md">
                <Package className="text-primary-foreground" size={20} />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Create New Batch
              </h1>
              {draftFetchedAt && (
                <div className="inline-flex items-center gap-2 text-sm text-foreground bg-accent px-3 py-1 rounded-md border border-border ml-2">
                  <Clock size={14} />
                  <span>Draft loaded: {formatDraftDate(draftFetchedAt)}</span>
                </div>
              )}
              <div className="ml-auto">
                <button
                  onClick={() => navigate('/batches')}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-input rounded-lg bg-background text-foreground hover:bg-accent transition"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content: 30-70 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Basic Information (25%) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="bg-card border border-border sticky top-4">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <SlidersHorizontal size={14} />
                  Basic Info
                </h2>

                {basicInfoComplete && (
                  <Check size={14} className="text-primary" />
                )}
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-3 text-sm">
                {/* Batch Number */}
                <div>
                  <label className="text-xs text-muted-foreground">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleInputChange}
                      className="w-full border border-input px-2 py-1.5 bg-    background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                    required
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="text-xs text-muted-foreground">
                    Product
                  </label>
                  <select
                    value={showNewProductForm ? 'new' : selectedProductId}
                    onChange={handleProductChange}
                      className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                    required
                  >
                    <option value="">Select</option>
                    {productsData.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="new">+ New Product</option>
                  </select>
                </div>

                {showNewProductForm && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      New Product Name
                    </label>
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                      required
                    />
                  </div>
                )}

                {/* Dates */}
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Production</label>
                    <input
                      type="date"
                      name="dateOfProduction"
                      value={formData.dateOfProduction}
                      onChange={handleInputChange}
                      className="w-full min-w-[140px] border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Best Before</label>
                    <input
                      type="date"
                      name="bestBeforeDate"
                      value={formData.bestBeforeDate}
                      onChange={handleInputChange}
                      className="w-full min-w-[140px] border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-muted-foreground">Analysis Status</label>
                  <select
                    name="sampleAnalysisStatus"
                    value={formData.sampleAnalysisStatus}
                    onChange={handleInputChange}
                      className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Batch Code */}
                <div>
                  <label className="text-xs text-muted-foreground">Batch Code</label>
                  <input
                    type="text"
                    name="batchCode"
                    value={formData.batchCode}
                    onChange={handleInputChange}
                      className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                  />
                </div>

                {/* GRN */}
                <div>
                  <label className="text-xs text-muted-foreground">GRN</label>
                  <input
                    type="text"
                    value={grnSearchInput}
                    onChange={handleGrnInputChange}
                      className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Content: Quality Parameters (75%) */}
          <motion.div variants={itemVariants} className="lg:col-span-9">
            <div className="bg-card border border-border overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Beaker size={16} className="text-primary" />
                  Quality Parameters
                </h2>

                {parametersComplete && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 border border-primary/20">
                    <Check size={12} className="inline mr-1" />
                    Complete
                  </span>
                )}
              </div>

              {/* Body */}
              {selectedProductId ? (
                isLoadingProductParameters ? (
                  <div className="p-8 text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                      className="inline-block"
                    >
                      <RotateCw size={24} className="text-primary" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground mt-2">Loading parameters...</p>
                  </div>
                ) : Object.keys(parametersByCategory).length > 0 ? (
                  <div>
                    {Object.entries(parametersByCategory).map(([category, params]: [string, any]) => (
                      <div key={category}>
                        {/* Category Header */}
                        <div className="px-4 py-2.5 bg-primary/10 border-b border-border">
                          <span className="text-sm font-semibold text-foreground">
                            {category}
                          </span>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <div className="col-span-3 flex items-center gap-1">
                            <Beaker size={12} /> Parameter
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <CheckCircle size={12} /> Standard
                          </div>
                          <div className="col-span-3 flex items-center gap-1">
                            <Hash size={12} /> Value
                          </div>
                          <div className="col-span-1 flex items-center gap-1">
                            <Ruler size={12} /> Unit
                          </div>
                          <div className="col-span-3 flex items-center gap-1">
                            <FileText size={12} /> Remarks
                          </div>
                        </div>

                        {/* Parameter Rows */}
                        {params
                          .filter((param: any) => !removedParameters.has(param.id))
                          .map((param: any, index: number) => {
                            const paramValue = parameterValues.find(
                              (pv) => pv.parameterId === param.id
                            );
                            return (
                              <motion.div
                                key={param.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors items-center"
                              >
                                {/* Parameter Name & Description */}
                                <div className="col-span-3">
                                  <div className="text-sm font-medium text-foreground">
                                    {param.name}
                                  </div>
                                  {param.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {param.description}
                                    </div>
                                  )}
                                </div>

                                {/* Standard Value */}
                                <div className="col-span-2">
                                  <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-sm font-medium rounded">
                                    {param.standardValue || '-'}
                                  </span>
                                </div>

                                {/* Value Input */}
                                <div className="col-span-3">
                                  {isSieveParam(param.name) ? (
                                    <select
                                      value={sieveSelections[param.id] || paramValue?.value || ''}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setSieveSelections((prev) => ({
                                          ...prev,
                                          [param.id]: value,
                                        }));
                                        setParameterValues((prev) => {
                                          const existing = prev.find(
                                            (pv) => pv.parameterId === param.id
                                          );
                                          if (existing) {
                                            return prev.map((pv) =>
                                              pv.parameterId === param.id
                                                ? { ...pv, value }
                                                : pv
                                            );
                                          }
                                          return [
                                            ...prev,
                                            {
                                              parameterId: param.id,
                                              value,
                                              standardValue: param.standardValue,
                                              unitId: param.unitId,
                                              remark: '',
                                            },
                                          ];
                                        });
                                      }}
                                      className="w-full border border-input px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-gray-500"
                                    >
                                      <option value="">Select sieve</option>
                                      {SIEVE_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={paramValue?.value || ''}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setParameterValues((prev) => {
                                          const existing = prev.find(
                                            (pv) => pv.parameterId === param.id
                                          );
                                          if (existing) {
                                            return prev.map((pv) =>
                                              pv.parameterId === param.id
                                                ? { ...pv, value }
                                                : pv
                                            );
                                          }
                                          return [
                                            ...prev,
                                            {
                                              parameterId: param.id,
                                              value,
                                              standardValue: param.standardValue,
                                              unitId: param.unitId,
                                              remark: '',
                                            },
                                          ];
                                        });
                                      }}
                                        className="w-full text-sm px-3 py-1.5 border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-gray-400"
                                      placeholder="Enter value"
                                    />
                                  )}
                                </div>

                                {/* Unit */}
                                <div className="col-span-1">
                                  <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                                    {param.unit?.symbol || param.unit?.name || param.unit || '-'}
                                  </span>
                                </div>

                                {/* Remarks */}
                                <div className="col-span-3">
                                  <input
                                    type="text"
                                    value={paramValue?.remark || ''}
                                    onChange={(e) => {
                                      const remark = e.target.value;
                                      setParameterValues((prev) => {
                                        const existing = prev.find(
                                          (pv) => pv.parameterId === param.id
                                        );
                                        if (existing) {
                                          return prev.map((pv) =>
                                            pv.parameterId === param.id
                                              ? { ...pv, remark }
                                              : pv
                                          );
                                        }
                                        return [
                                          ...prev,
                                          {
                                            parameterId: param.id,
                                            value: '',
                                            standardValue: param.standardValue,
                                            unitId: param.unitId,
                                            remark,
                                          },
                                        ];
                                      });
                                    }}
                                      className="w-full text-sm px-3 py-1.5 border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-gray-400"
                                    placeholder="Add remark"
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No parameters found for this product.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-6">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Select a product to view quality parameters.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>


        {/* Footer actions */}
        <motion.div
          variants={itemVariants}
          className="mt-6 bg-card rounded-xl border border-border"
        >
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {isFormValid ? (
                  <div className="inline-flex items-center text-primary bg-primary/10 px-3 py-1.5 rounded border border-primary/20">
                    <Check size={16} className="mr-2" />
                    <span className="text-sm font-medium">
                      Ready to create batch
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center text-foreground bg-muted px-3 py-1.5 rounded border border-border">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm font-medium">
                      Complete required fields
                    </span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {parameterValues.length} parameters configured
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/batches')}
                  className="px-4 py-2 border border-input text-foreground bg-background hover:bg-accent rounded-lg text-sm transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !isFormValid}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${
                    isSaving || !isFormValid
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                      >
                        <RotateCw className="h-4 w-4" />
                      </motion.div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Create Batch
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AddBatch;
