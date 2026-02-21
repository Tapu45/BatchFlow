import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_ROUTES } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  ChevronDown,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  Mail,
  RotateCw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { generatePDF } from '../../../utils/exportPdf';
import BatchDetails from './BatchDetails';

interface BatchFilter {
  batchNumber?: string;
  status?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

const statusColors = {
  DRAFT: 'bg-blue-50 text-blue-700 border-blue-200',
  SUBMITTED: 'bg-purple-50 text-purple-700 border-purple-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const statusIcons = {
  DRAFT: <Clock className="w-4 h-4 mr-1" />,
  SUBMITTED: <FileText className="w-4 h-4 mr-1" />,
  APPROVED: <CheckCircle className="w-4 h-4 mr-1" />,
  REJECTED: <XCircle className="w-4 h-4 mr-1" />,
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM dd, yyyy');
};

// Enhanced animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export default function ViewBatches() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BatchFilter>({
    page: 1,
    limit: 10,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isMailingAll, setIsMailingAll] = useState(false);
  const [isMailingFiltered, setIsMailingFiltered] = useState(false);

  const authToken = localStorage.getItem('authToken');

  // Fetch products for filter dropdown
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await axios.get(API_ROUTES.PRODUCT.GET_PRODUCTS, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        return response.data?.products || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (productsQuery.data) {
      setProducts(productsQuery.data);
    }
  }, [productsQuery.data]);

  // TanStack Query hook to fetch batches
  const {
    data: batchesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['batches', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (filters.batchNumber)
        queryParams.append('batchNumber', filters.batchNumber);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.productId) queryParams.append('productId', filters.productId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      // Update the query to use the new endpoint (around line 777)
      const response = await axios.get(
        `${API_ROUTES.BATCH.GET_BATCHES_WITH_DRAFTS}?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: !showDetails,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this draft? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await axios.delete(API_ROUTES.DRAFT.DELETE_BATCH(draftId), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Refetch to update the list
      refetch();
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft');
    }
  };

  const handleViewDetails = (batch: any) => {
    setSelectedBatch(batch);
    setShowDetails(true);
  };

  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedBatch(null);
    // Trigger a refetch to ensure data is fresh
    refetch();
  };

  const handleExportToPDF = () => {
    if (!batchesData || !batchesData.batches) {
      return;
    }

    const detailedBatchData = batchesData.batches.map((batch: any) => {
      const parameterCategories: Record<string, any[]> = {};

      if (batch.parameterValuesByCategory) {
        Object.entries(batch.parameterValuesByCategory).forEach(
          ([categoryName, parameters]) => {
            parameterCategories[categoryName] = (parameters as any[]).map(
              (param) => ({
                name: param.parameter.name,
                value: param.value || 'N/A',
                unit: param.unit ? param.unit.symbol : '',
                methodology: param.methodology ? param.methodology.name : 'N/A',
              })
            );
          }
        );
      }

      const uniqueMethodologies = batch.parameterValuesByCategory
        ? Array.from(
          new Set(
            Object.values(batch.parameterValuesByCategory)
              .flat()
              .filter((param: any) => param.methodology)
              .map((param: any) => param.methodology.name)
          )
        )
        : [];

      const activities =
        batch.recentActivities && batch.recentActivities.length > 0
          ? batch.recentActivities.map((activity: any) => ({
            details: activity.details,
            by: activity.User?.name || 'System',
            date: formatDate(activity.createdAt),
          }))
          : [];

      return {
        batchNumber: batch.batchNumber,
        product: batch.productName,
        productionDate: formatDate(batch.dateOfProduction),
        bestBefore: formatDate(batch.bestBeforeDate),
        status: batch.status,
        createdBy: batch.maker?.name || 'N/A',
        checkedBy: batch.checker?.name || 'Not checked yet',
        analysisStatus: batch.sampleAnalysisStatus,
        createdAt: formatDate(batch.createdAt),
        updatedAt: formatDate(batch.updatedAt),
        parameterCategories,
        standards: batch.standards?.map((std: any) => std.name) || [],
        methodologies: uniqueMethodologies,
        activities,
      };
    });

    const appliedFilters: Record<string, string> = {};
    if (filters.batchNumber)
      appliedFilters['Batch Number'] = filters.batchNumber;
    if (filters.status) appliedFilters['Status'] = filters.status;
    if (filters.productId) {
      const productName = products.find(
        (p) => p.id === filters.productId
      )?.name;
      appliedFilters['Product'] = productName || filters.productId;
    }
    if (filters.dateFrom) appliedFilters['Date From'] = filters.dateFrom;
    if (filters.dateTo) appliedFilters['Date To'] = filters.dateTo;

    generatePDF({
      title: 'Detailed Batch Records Report',
      subtitle: 'Complete Analysis and Parameters',
      filename: `detailed_batch_records_${new Date().toISOString().split('T')[0]}`,
      data: detailedBatchData,
      orientation: 'portrait',
      filters: appliedFilters,
      footer: 'Confidential - Batchflow System',
      customSections: [
        {
          title: 'Export Information',
          content: `This report contains detailed information for ${detailedBatchData.length} batch records, including all parameter values, methodologies, and activities. Generated from the Batchflow management system on ${new Date().toLocaleDateString()}.`,
        },
      ],
      isDetailedBatchReport: true,
    });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
    });
  };

  // Handle mail all batches
  const handleMailAll = async () => {
    if (!batchesData || !batchesData.batches || batchesData.batches.length === 0) {
      toast.error('No batches available to mail');
      return;
    }

    try {
      setIsMailingAll(true);
      const response = await axios.get(API_ROUTES.BATCH.MAIL_ALL_BATCHES, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Batches report mailed successfully');
      } else {
        toast.error(response.data.error || 'Failed to mail batches');
      }
    } catch (error) {
      console.error('Mail failed:', error);
      toast.error('Failed to mail batches report');
    } finally {
      setIsMailingAll(false);
    }
  };

  // Handle mail filtered batches
  const handleMailFiltered = async () => {
    const hasFilters = filters.status || filters.productId || filters.dateFrom || filters.dateTo || filters.batchNumber;
    if (!hasFilters) {
      toast.error('Please apply at least one filter before mailing');
      return;
    }

    if (!batchesData || !batchesData.batches || batchesData.batches.length === 0) {
      toast.error('No batches match the current filters');
      return;
    }

    try {
      setIsMailingFiltered(true);
      const response = await axios.post(
        API_ROUTES.BATCH.MAIL_FILTERED_BATCHES,
        {
          batchNumber: filters.batchNumber,
          status: filters.status,
          productId: filters.productId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Filtered batches report mailed successfully');
      } else {
        toast.error(response.data.error || 'Failed to mail filtered batches');
      }
    } catch (error) {
      console.error('Mail filtered failed:', error);
      toast.error('Failed to mail filtered batches report');
    } finally {
      setIsMailingFiltered(false);
    }
  };

  // Show details view if selected
  if (showDetails && selectedBatch) {
    return (
      <motion.div
        className="min-h-screen bg-background"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <BatchDetails batch={selectedBatch} onBack={handleBackToList} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto shadow-sm rounded-xl py-">
        {/* Main Container */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl  overflow-hidden"
        >
          {/* Header Section - Clean and Simple */}
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-10 bg-primary rounded-full shadow-md" />{' '}
                {/* Thicker, taller bar */}
                <div className="p-2 bg-primary rounded-lg shadow-md flex items-center justify-center">
                  {' '}
                  {/* Solid bg, shadow, centered */}
                  <Package
                    className="text-white"
                    size={21}
                    strokeWidth={2.5}
                  />{' '}
                  {/* Larger, bolder icon */}
                </div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">
                  View Batches
                </h1>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/create-batch')}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center font-bold text-base shadow-md transition-all cursor-pointer"
              >
                <Plus size={18} className="mr-2 font-bold" strokeWidth={2.5} />
                Add Batch
              </motion.button>
            </div>
          </div>

          {/* Search and Filters Section - Improved spacing and rounded corners */}
          <div className="p-6 pt-3 pb-2">
            <div className="flex flex-col md:flex-row gap-4 mb-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Search batches..."
                  value={filters.batchNumber || ''}
                  onChange={(e) =>
                    handleFilterChange('batchNumber', e.target.value)
                  }
                  className="pl-10 pr-4 py-2.5 w-full border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all duration-200 text-sm bg-background"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <motion.button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-input bg-background rounded-lg hover:bg-accent transition-colors duration-200 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Filter</span>
                  <motion.div
                    animate={{ rotate: isFilterOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </motion.div>
                </motion.button>

                <motion.button
                  onClick={handleExportToPDF}
                  className="flex items-center gap-2 px-4 py-2.5 border border-input bg-background rounded-lg hover:bg-accent transition-colors duration-200 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Export</span>
                </motion.button>

                <motion.button
                  onClick={handleMailAll}
                  disabled={isMailingAll || !batchesData?.batches?.length}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${isMailingAll || !batchesData?.batches?.length
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  whileHover={{ scale: isMailingAll ? 1 : 1.02 }}
                  whileTap={{ scale: isMailingAll ? 1 : 0.98 }}
                >
                  {isMailingAll ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                      >
                        <RotateCw className="h-4 w-4" />
                      </motion.div>
                      <span>Mailing...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Mail All</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={handleMailFiltered}
                  disabled={isMailingFiltered || !batchesData?.batches?.length || !(filters.status || filters.productId || filters.dateFrom || filters.dateTo || filters.batchNumber)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${isMailingFiltered || !batchesData?.batches?.length || !(filters.status || filters.productId || filters.dateFrom || filters.dateTo || filters.batchNumber)
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                    }`}
                  whileHover={{ scale: isMailingFiltered ? 1 : 1.02 }}
                  whileTap={{ scale: isMailingFiltered ? 1 : 0.98 }}
                >
                  {isMailingFiltered ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                      >
                        <RotateCw className="h-4 w-4" />
                      </motion.div>
                      <span>Mailing...</span>
                    </>
                  ) : (
                    <>
                      <Filter className="h-4 w-4" />
                      <span>Mail Filtered</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Filter Section */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  className="overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="p-4 border border-input rounded-lg bg-background">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Status
                        </label>
                        <select
                          value={filters.status || ''}
                          onChange={(e) =>
                            handleFilterChange('status', e.target.value)
                          }
                          className="w-full p-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm bg-background"
                        >
                          <option value="">All Statuses</option>
                          <option value="DRAFT">Draft</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Product
                        </label>
                        <select
                          value={filters.productId || ''}
                          onChange={(e) =>
                            handleFilterChange('productId', e.target.value)
                          }
                          className="w-full p-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm bg-background"
                        >
                          <option value="">All Products</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Date From
                        </label>
                        <input
                          type="date"
                          value={filters.dateFrom || ''}
                          onChange={(e) =>
                            handleFilterChange('dateFrom', e.target.value)
                          }
                          className="w-full p-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Date To
                        </label>
                        <input
                          type="date"
                          value={filters.dateTo || ''}
                          onChange={(e) =>
                            handleFilterChange('dateTo', e.target.value)
                          }
                          className="w-full p-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm bg-background"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 justify-end">
                      <motion.button
                        onClick={clearFilters}
                        className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-accent transition-colors duration-200 text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCw size={14} />
                          <span>Clear</span>
                        </div>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          refetch();
                          setIsFilterOpen(false);
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <Filter size={14} />
                          <span>Apply</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Filters */}
            {(filters.status ||
              filters.productId ||
              filters.dateFrom ||
              filters.dateTo) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {filters.status && (
                    <div className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-xs border border-primary/20">
                      Status: {filters.status}
                      <button
                        onClick={() => handleFilterChange('status', '')}
                        className="ml-2 hover:text-primary/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {filters.productId && (
                    <div className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-xs border border-primary/20">
                      Product:{' '}
                      {products.find((p) => p.id === filters.productId)?.name ||
                        filters.productId}
                      <button
                        onClick={() => handleFilterChange('productId', '')}
                        className="ml-2 hover:text-primary/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {filters.dateFrom && (
                    <div className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-xs border border-primary/20">
                      From: {filters.dateFrom}
                      <button
                        onClick={() => handleFilterChange('dateFrom', '')}
                        className="ml-2 hover:text-primary/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {filters.dateTo && (
                    <div className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-xs border border-primary/20">
                      To: {filters.dateTo}
                      <button
                        onClick={() => handleFilterChange('dateTo', '')}
                        className="ml-2 hover:text-primary/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Table Section */}
          <div className='pt-0'>
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    ease: 'linear',
                    repeat: Infinity,
                  }}
                  className="rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"
                />
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <AlertCircle
                  size={48}
                  className="mx-auto mb-4 text-destructive"
                />
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Error loading batches
                </h3>
                <p className="text-destructive/80">
                  {(error as any)?.message || 'Please try again later'}
                </p>
              </div>
            ) : batchesData?.batches?.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                  <Package size={36} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No batches found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                  No batches match your current search criteria. Try adjusting
                  your filters or create a new batch.
                </p>
                <motion.button
                  onClick={() => navigate('/create-batch')}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center font-medium text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus size={14} className="mr-1" />
                  Create New Batch
                </motion.button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Batch Number
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Product
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Production Date
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Best Before
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Status
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Created By
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2 justify-end">
                            <Eye className="w-4 h-4 hover:h-10" />
                            Actions
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {batchesData.batches.map((batch: any, index: number) => (
                        <motion.tr
                          key={batch.id}
                          className="hover:bg-secondary/10 transition-colors duration-150"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {batch.batchNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {batch.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(batch.dateOfProduction)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(batch.bestBeforeDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[
                                  batch.status as keyof typeof statusColors
                                ]
                                  }`}
                              >
                                {
                                  statusIcons[
                                  batch.status as keyof typeof statusIcons
                                  ]
                                }
                                <span className="leading-none">{batch.status}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {batch.maker?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2">
                              {batch.isDraft ? (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() =>
                                      navigate(
                                        `/create-batch?draftId=${batch.id}`
                                      )
                                    }
                                    className="group relative flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 cursor-pointer"
                                    title="Continue Editing"
                                  >
                                    <Edit2 size={16} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDeleteDraft(batch.id)}
                                    className="group relative flex items-center justify-center w-8 h-8 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all border border-destructive/20 cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleViewDetails(batch)}
                                  className="group relative flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-lg hover:bg-secondary/90 transition-all"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </motion.button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {batchesData.pagination &&
                  batchesData.pagination.totalPages > 1 && (
                    <div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing{' '}
                        <span className="font-medium text-foreground">
                          {(batchesData.pagination.page - 1) *
                            batchesData.pagination.limit +
                            1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium text-foreground">
                          {Math.min(
                            batchesData.pagination.page *
                            batchesData.pagination.limit,
                            batchesData.pagination.totalCount
                          )}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-foreground">
                          {batchesData.pagination.totalCount}
                        </span>{' '}
                        results
                      </div>
                      <div className="flex space-x-2">
                        <motion.button
                          onClick={() =>
                            handlePageChange(Math.max(1, filters.page! - 1))
                          }
                          disabled={filters.page === 1}
                          className={`p-2 rounded-md ${filters.page === 1
                            ? 'text-muted-foreground cursor-not-allowed'
                            : 'text-foreground hover:bg-muted'
                            }`}
                          whileHover={filters.page !== 1 ? { scale: 1.1 } : {}}
                          whileTap={filters.page !== 1 ? { scale: 0.9 } : {}}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </motion.button>

                        {Array.from(
                          { length: batchesData.pagination.totalPages },
                          (_, i) => i + 1
                        )
                          .filter((page) => {
                            const currentPage = filters.page || 1;
                            return (
                              page === 1 ||
                              page === batchesData.pagination.totalPages ||
                              Math.abs(page - currentPage) <= 1
                            );
                          })
                          .map((page, i, filteredPages) => {
                            const currentPage = filters.page || 1;

                            if (i > 0 && filteredPages[i - 1] !== page - 1) {
                              return (
                                <span
                                  key={`ellipsis-${page}`}
                                  className="px-3 py-1.5 text-muted-foreground"
                                >
                                  ...
                                </span>
                              );
                            }

                            return (
                              <motion.button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded-md ${currentPage === page
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground hover:bg-muted'
                                  }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 400,
                                  damping: 15,
                                }}
                              >
                                {page}
                              </motion.button>
                            );
                          })}

                        <motion.button
                          onClick={() =>
                            handlePageChange(
                              Math.min(
                                batchesData.pagination.totalPages,
                                filters.page! + 1
                              )
                            )
                          }
                          disabled={
                            filters.page === batchesData.pagination.totalPages
                          }
                          className={`p-2 rounded-md ${filters.page === batchesData.pagination.totalPages
                            ? 'text-muted-foreground cursor-not-allowed'
                            : 'text-foreground hover:bg-muted'
                            }`}
                          whileHover={
                            filters.page !== batchesData.pagination.totalPages
                              ? { scale: 1.1 }
                              : {}
                          }
                          whileTap={
                            filters.page !== batchesData.pagination.totalPages
                              ? { scale: 0.9 }
                              : {}
                          }
                        >
                          <ChevronRight className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
