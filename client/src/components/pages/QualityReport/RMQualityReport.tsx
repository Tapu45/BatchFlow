import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Save,
  Download,
  ChevronRight,
  Search,
  RefreshCw,
  FileText,
  Clock,
  Package,
  Mail,
  Building,
  Hash,
  Beaker,
  SlidersHorizontal,
  AlertCircle,
  X,
  Check,
  RotateCw,
  ChevronDown,
  Filter,
  Target,
  Award,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  createRMQualityReport,
  getRMQualityReports,
  updateRMQualityReport,
  deleteRMQualityReport,
  exportRMQualityReport,
} from '../../../utils/api';
import { RMQualityReport as RMQualityReportType } from '../../../Types/qualityTypes';
import api, { API_ROUTES } from '../../../utils/api';
import { mailFilteredRMQualityReports } from '../../../utils/api';
import { exportFilteredRMQualityReports } from '../../../utils/api';
import { format } from 'date-fns';

// Enhanced animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

// Fixed parameters for Chilli
const CHILLI_PARAMETERS = [
  { parameter: 'Moisture', standard: 'max 10%' },
  { parameter: 'ASTA Color', standard: 'min 40' },
  { parameter: 'Acid Insoluble Ash', standard: 'max 1.5%' },
  { parameter: 'Total Ash', standard: 'max 8%' },
  { parameter: 'Aflatoxin', standard: 'max 20 ppb' },
  { parameter: 'TPC', standard: 'max 10 million cfu' },
  { parameter: 'YM', standard: '10,000 cfu' },
];

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const RMQualityReport: React.FC = () => {
  const [isExportingFiltered, setIsExportingFiltered] = useState(false);
  // Handler for exporting filtered reports
  const handleExportFiltered = async () => {
    if (filteredReports.length === 0) {
      setError('No filtered reports available to export');
      return;
    }
    try {
      setIsExportingFiltered(true);
      setError(null);
      const filtersToSend = {
        supplier: appliedFilters.supplier,
        grn: appliedFilters.grn,
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
      };
      const response = await exportFilteredRMQualityReports(filtersToSend);
      if (response && response.data) {
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `Filtered_RM_Quality_Reports_${new Date().toISOString().split('T')[0]}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Filtered Excel export started');
      } else {
        setError('Failed to export filtered reports');
      }
    } catch (error) {
      setError('Failed to export filtered reports');
    } finally {
      setIsExportingFiltered(false);
    }
  };
  const [reports, setReports] = useState<RMQualityReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] =
    useState<RMQualityReportType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isMailingAll, setIsMailingAll] = useState(false);
  const [isMailingFiltered, setIsMailingFiltered] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Handler for mailing filtered reports
  const handleMailFiltered = async () => {
    if (filteredReports.length === 0) {
      setError('No filtered reports available to mail');
      return;
    }
    try {
      setIsMailingFiltered(true);
      setError(null);
      const filtersToSend = {
        supplier: appliedFilters.supplier,
        grn: appliedFilters.grn,
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
      };
      const response = await mailFilteredRMQualityReports(filtersToSend);
      if (response.data.success) {
        toast.success(response.data.message || 'Filtered reports mailed successfully');
      } else {
        setError(response.data.error || 'Failed to mail filtered reports');
      }
    } catch (error) {
      setError('Failed to mail filtered reports');
    } finally {
      setIsMailingFiltered(false);
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    supplier: '',
    grn: '',
    fromDate: '',
    toDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    supplier: '',
    grn: '',
    fromDate: '',
    toDate: '',
  });

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const empty = { supplier: '', grn: '', fromDate: '', toDate: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const [receivedRawMaterials, setReceivedRawMaterials] = useState<any[]>([]);
  const [receivedVendors, setReceivedVendors] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    rawMaterialName: '',
    variety: '',
    supplier: '',
    grn: '',
  });

  // Results state for fixed parameters
  const [results, setResults] = useState<string[]>(
    Array(CHILLI_PARAMETERS.length).fill('')
  );

  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    fetchReports();
    fetchReceivedRawMaterials();
    fetchReceivedVendors();
  }, []);

  const fetchReceivedRawMaterials = async () => {
    try {
      const response = await api.get(
        API_ROUTES.RAW.GET_RECEIVED_RAW_MATERIALS,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setReceivedRawMaterials(response.data);
    } catch (error) {
      console.error('Failed to fetch received raw materials:', error);
    }
  };

  const fetchReceivedVendors = async () => {
    try {
      const response = await api.get(API_ROUTES.RAW.GET_RECEIVED_VENDORS, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setReceivedVendors(response.data);
    } catch (error) {
      console.error('Failed to fetch received vendors:', error);
    }
  };

  // Check if form is valid
  useEffect(() => {
    const basicInfoValid =
      formData.rawMaterialName.trim() !== '' &&
      formData.variety.trim() !== '' &&
      formData.supplier.trim() !== '' &&
      formData.grn.trim() !== '';

    const parametersValid = results.every((r) => r.trim() !== '');

    setIsFormValid(basicInfoValid && parametersValid);
  }, [formData, results]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getRMQualityReports({ search: searchTerm });
      if (response.success) {
        setReports(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResultChange = (index: number, value: string) => {
    const newResults = [...results];
    newResults[index] = value;
    setResults(newResults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please complete all required fields before saving');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const data = {
        ...formData,
        parameters: CHILLI_PARAMETERS.map((p, i) => ({
          parameter: p.parameter,
          standard: p.standard,
          result: results[i],
        })),
      };

      let response;
      if (editingReport) {
        response = await updateRMQualityReport(editingReport.id, data);
      } else {
        response = await createRMQualityReport(data);
      }

      if (response.success) {
        toast.success(
          editingReport
            ? 'Report updated successfully'
            : 'Report created successfully'
        );
        setShowForm(false);
        setEditingReport(null);
        resetForm();
        fetchReports();
      } else {
        setError(response.error || 'Failed to save report');
      }
    } catch (error) {
      setError('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (report: RMQualityReportType) => {
    setEditingReport(report);
    setFormData({
      rawMaterialName: report.rawMaterialName,
      variety: report.variety,
      supplier: report.supplier,
      grn: report.grn,
    });
    // Load results from report parameters
    const loadedResults = CHILLI_PARAMETERS.map((p) => {
      const param = report.parameters.find(
        (rp) => rp.parameter === p.parameter
      );
      return param ? param.result : '';
    });
    setResults(loadedResults);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        const response = await deleteRMQualityReport(id);
        if (response.success) {
          toast.success('Report deleted successfully');
          fetchReports();
        } else {
          toast.error(response.error || 'Failed to delete report');
        }
      } catch (error) {
        toast.error('Failed to delete report');
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedReportIds(prev => 
      prev.includes(id) ? prev.filter(reportId => reportId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map(r => r.id));
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedReportIds.length === 0) {
      toast.error('No reports selected');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedReportIds.length} selected report(s)?`)) {
      try {
        setIsDeletingMultiple(true);
        const deletePromises = selectedReportIds.map(id => deleteRMQualityReport(id));
        const results = await Promise.all(deletePromises);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        if (successCount > 0) {
          toast.success(`${successCount} report(s) deleted successfully`);
        }
        if (failCount > 0) {
          toast.error(`Failed to delete ${failCount} report(s)`);
        }
        
        setSelectedReportIds([]);
        fetchReports();
      } catch (error) {
        toast.error('Failed to delete reports');
      } finally {
        setIsDeletingMultiple(false);
      }
    }
  };

  const handleExport = async (
    id: string,
    format: 'excel' | 'pdf' = 'excel'
  ) => {
    try {
      if (format === 'excel') {
        const url = `${API_ROUTES.RAW.EXPORT_QUALITY_REPORT(id)}?format=excel`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          toast.error('Failed to export report');
          return;
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `RM_Quality_Report_${id}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        toast.success('Excel export started');
      } else {
        const response = await exportRMQualityReport(id);
        if (response.success) {
          toast.success('Report exported successfully');
        } else {
          toast.error(response.error || 'Failed to export report');
        }
      }
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportAll = async () => {
    if (reports.length === 0) {
      setError('No reports available to export');
      return;
    }

    try {
      setIsExportingAll(true);
      const response = await api.get(
        `${API_ROUTES.RAW.EXPORT_ALL_QUALITY_REPORTS}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          responseType: 'blob',
        }
      );

      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // <-- Excel MIME type
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `RM_Quality_Reports_${new Date().toISOString().split('T')[0]}.xlsx` // <-- Excel extension
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export reports');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleMailAll = async () => {
    if (reports.length === 0) {
      setError('No reports available to mail');
      return;
    }

    try {
      setIsMailingAll(true);
      const response = await api.get(
        `${API_ROUTES.RAW.MAIL_ALL_QUALITY_REPORTS}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Reports mailed successfully');
      } else {
        setError(response.data.error || 'Failed to mail reports');
      }
    } catch (error) {
      console.error('Mail failed:', error);
      setError('Failed to mail reports');
    } finally {
      setIsMailingAll(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rawMaterialName: '',
      variety: '',
      supplier: '',
      grn: '',
    });
    setResults(Array(CHILLI_PARAMETERS.length).fill(''));
    setError(null);
  };

  const filteredReports = reports.filter((report) => {
    // Search match
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [report.rawMaterialName, report.variety, report.supplier, report.grn].some((f) =>
        String(f || '').toLowerCase().includes(q)
      );

    // Applied filters
    const { supplier, grn, fromDate, toDate } = appliedFilters;
    if (supplier && supplier !== report.supplier) return false;
    if (grn && !report.grn.toLowerCase().includes(grn.toLowerCase())) return false;

    const reportDate = report.dateOfReport ? new Date(report.dateOfReport) : null;
    if (fromDate && reportDate && new Date(fromDate) > reportDate) return false;
    if (toDate && reportDate && new Date(toDate) < reportDate) return false;

    return matchesSearch;
  });

  const basicInfoComplete =
    formData.rawMaterialName &&
    formData.variety &&
    formData.supplier &&
    formData.grn;
  const parametersComplete =
    results.length > 0 && results.every((r) => r.trim() !== '');

  // Show form view
  if (showForm) {
    return (
      <motion.div
        className="min-h-screen bg-background"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto pt-0 pb-4 sm:pt-0 sm:px-6 sm:pb-6">
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

          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl mb-3"
          >
            <div className="pr-5 pb-5 pt-5 pl-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-1.5 h-10 bg-primary rounded-full" />
                <div className="p-2 bg-primary rounded-md">
                  <FileText className="text-primary-foreground" size={20} />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {editingReport
                    ? 'Edit Quality Report'
                    : 'Create Quality Report'}
                </h1>
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingReport(null);
                      resetForm();
                    }}
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
              <div className="bg-card rounded-xl border border-border sticky top-4">
                <div className="p-5 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <SlidersHorizontal size={18} />
                    Basic Information
                    {basicInfoComplete && (
                      <span className="ml-2 inline-flex items-center text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        <Check size={12} className="mr-1" />
                        Complete
                      </span>
                    )}
                  </h2>
                </div>

                <div className="p-5 space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Raw Material Name{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="rawMaterialName"
                        value={formData.rawMaterialName}
                        onChange={handleInputChange}
                        className="w-full border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background pl-10 appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Select raw material</option>
                        {receivedRawMaterials.map((material) => (
                          <option key={material.id} value={material.name}>
                            {material.name} ({material.skuCode})
                          </option>
                        ))}
                      </select>
                      <Package
                        size={16}
                        className="absolute left-3.5 top-3 text-muted-foreground pointer-events-none"
                        style={{ color: 'var(--primary)' }}
                      />
                      <ChevronRight
                        size={16}
                        className="absolute right-3.5 top-3 text-muted-foreground pointer-events-none rotate-90"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Variety <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="variety"
                        value={formData.variety}
                        onChange={handleInputChange}
                        className="w-full border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background pl-10"
                        placeholder="Enter variety"
                        required
                      />
                      <Award
                        size={16}
                        className="absolute left-3.5 top-3 text-muted-foreground"
                        style={{ color: 'var(--primary)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Supplier <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        className="w-full border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background pl-10 appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Select supplier</option>
                        {receivedVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.name}>
                            {vendor.name} ({vendor.vendorCode})
                          </option>
                        ))}
                      </select>
                      <Building
                        size={16}
                        className="absolute left-3.5 top-3 text-muted-foreground pointer-events-none"
                        style={{ color: 'var(--primary)' }}
                      />
                      <ChevronRight
                        size={16}
                        className="absolute right-3.5 top-3 text-muted-foreground pointer-events-none rotate-90"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      GRN <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="grn"
                        value={formData.grn}
                        onChange={handleInputChange}
                        className="w-full border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-background pl-10"
                        placeholder="Enter GRN number"
                        required
                      />
                      <Hash
                        size={16}
                        className="absolute left-3.5 top-3 text-muted-foreground"
                        style={{ color: 'var(--primary)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Content: Quality Parameters (75%) */}
            <motion.div variants={itemVariants} className="lg:col-span-9">
              <div className="bg-card border border-border">
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
                {formData.rawMaterialName ? (
                  <div className="divide-y divide-border">
                    {CHILLI_PARAMETERS.map((param, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-4 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="grid grid-cols-12 gap-3 items-center">
                          {/* Parameter */}
                          <div className="col-span-4">
                            <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                              <Beaker size={11} /> Parameter
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {param.parameter}
                            </div>
                          </div>

                          {/* Standard */}
                          <div className="col-span-4">
                            <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                              <Target size={11} /> Standard
                            </div>
                            <div className="text-sm text-foreground">
                              {param.standard}
                            </div>
                          </div>

                          {/* Result */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={results[index]}
                              onChange={(e) =>
                                handleResultChange(index, e.target.value)
                              }
                              className="w-full text-sm px-2 py-1 border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                              placeholder="Result *"
                              required
                            />
                          </div>

                          {/* Status */}
                          <div className="col-span-1 flex justify-end">
                            {results[index]?.trim() ? (
                              <Check size={14} className="text-primary" />
                            ) : (
                              <Clock size={14} className="text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                        Ready to save report
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
                    {CHILLI_PARAMETERS.length} parameters configured
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingReport(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-input text-foreground bg-background hover:bg-accent rounded-lg text-sm transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving || !isFormValid}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${isSaving || !isFormValid
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {editingReport ? 'Update Report' : 'Save Report'}
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
  }

  // Main list view
  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto shadow-sm rounded-xl">
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl overflow-hidden"
        >
          {/* Header Section */}
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-10 bg-primary rounded-full shadow-md" />
                <div className="p-2 bg-primary rounded-lg shadow-md flex items-center justify-center">
                  <FileText
                    className="text-primary-foreground"
                    size={21}
                    strokeWidth={2.5}
                  />
                </div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">
                  RM Quality Reports
                </h1>
              </div>
              <div className="flex gap-2">
                {/* Bulk Delete Button - shown when items are selected */}
                {selectedReportIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteMultiple}
                    disabled={isDeletingMultiple}
                    className={`px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all cursor-pointer ${
                      isDeletingMultiple
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    }`}
                  >
                    {isDeletingMultiple ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            ease: 'linear',
                            repeat: Infinity,
                          }}
                        >
                          <RotateCw size={16} className="mr-2" strokeWidth={2.5} />
                        </motion.div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <X size={16} className="mr-2" strokeWidth={2.5} />
                        Delete ({selectedReportIds.length})
                      </>
                    )}
                  </motion.button>
                )}
                {/* Export Filtered */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportFiltered}
                  disabled={isExportingFiltered || filteredReports.length === 0}
                  className={`px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all cursor-pointer ${isExportingFiltered || filteredReports.length === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  title="Export only filtered reports"
                >
                  {isExportingFiltered ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                      >
                        <RotateCw
                          size={16}
                          className="mr-2"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" strokeWidth={2.5} />
                      Export Filtered
                    </>
                  )}
                </motion.button>
                {/* Export All */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportAll}
                  disabled={isExportingAll || reports.length === 0}
                  className={`px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all cursor-pointer ${isExportingAll || reports.length === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                    }`}
                >
                  {isExportingAll ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                      >
                        <RotateCw
                          size={16}
                          className="mr-2"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" strokeWidth={2.5} />
                      Export All
                    </>
                  )}
                </motion.button>
                {/* Mail All */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMailAll}
                  disabled={isMailingAll || reports.length === 0}
                  className={`px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all cursor-pointer ${isMailingAll || reports.length === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                >
                  {isMailingAll ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                      >
                        <RotateCw
                          size={16}
                          className="mr-2"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      Mailing...
                    </>
                  ) : (
                    <>
                      <Mail size={16} className="mr-2" strokeWidth={2.5} />
                      Mail All
                    </>
                  )}
                </motion.button>
                {/* Mail Filtered */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMailFiltered}
                  disabled={isMailingFiltered || filteredReports.length === 0}
                  className={`px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-md transition-all cursor-pointer ${isMailingFiltered || filteredReports.length === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                    }`}
                  title="Mail only filtered reports"
                >
                  {isMailingFiltered ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                      >
                        <RotateCw
                          size={16}
                          className="mr-2"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      Mailing...
                    </>
                  ) : (
                    <>
                      <Mail size={16} className="mr-2" strokeWidth={2.5} />
                      Mail Filtered
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowForm(true);
                    setEditingReport(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center font-bold text-base shadow-md transition-all cursor-pointer"
                >
                  <Plus
                    size={18}
                    className="mr-2 font-bold"
                    strokeWidth={2.5}
                  />
                  New Report
                </motion.button>
              </div>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="p-6 pt-3 pb-2">
            <div className="flex flex-col md:flex-row gap-4 mb-3">
              {!isFilterOpen && (
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-full border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all duration-200 text-sm bg-background"
                  />
                </div>
              )}

              <div className="flex gap-2 shrink-0 items-center">
                <motion.button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${isFilterOpen ? 'bg-accent/10 border border-primary/20' : 'bg-background border border-input hover:bg-accent'}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Filter</span>
                  {Object.values(appliedFilters).some((v) => v) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary text-primary-foreground">
                      Applied
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isFilterOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </motion.div>
                </motion.button>

                <motion.button
                  onClick={fetchReports}
                  className="flex items-center gap-2 px-4 py-2.5 border border-input bg-background rounded-lg hover:bg-accent transition-colors duration-200 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Refresh</span>
                </motion.button>
              </div>

              {isFilterOpen && (
                <div className="mt-2 p-2 bg-card border border-border rounded-lg grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div className="md:col-span-2 flex flex-col">
                    <label className="block text-xs text-muted-foreground mb-0.5">Supplier</label>
                    <select
                      value={filters.supplier}
                      onChange={(e) => handleFilterChange('supplier', e.target.value)}
                      className="w-full border border-input rounded px-2 py-1 bg-background text-xs focus:ring-1 focus:ring-primary/30 h-8"
                    >
                      <option value="">All Suppliers</option>
                      {receivedVendors.map((v) => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col">
                    <label className="block text-xs text-muted-foreground mb-0.5">GRN</label>
                    <input
                      value={filters.grn}
                      onChange={(e) => handleFilterChange('grn', e.target.value)}
                      className="w-full border border-input rounded px-2 py-1 bg-background text-xs focus:ring-1 focus:ring-primary/30 h-8"
                      placeholder="Contains GRN"
                    />
                  </div>

                  <div className="md:col-span-1 flex flex-col">
                    <label className="block text-xs text-muted-foreground mb-0.5">From Date</label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                      className="w-full border border-input rounded px-2 py-1 bg-background text-xs focus:ring-1 focus:ring-primary/30 h-8"
                    />
                  </div>

                  <div className="md:col-span-1 flex flex-col">
                    <label className="block text-xs text-muted-foreground mb-0.5">To Date</label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) => handleFilterChange('toDate', e.target.value)}
                      className="w-full border border-input rounded px-2 py-1 bg-background text-xs focus:ring-1 focus:ring-primary/30 h-8"
                    />
                  </div>

                  <div className="md:col-span-6 flex gap-2 justify-end pt-1">
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1 border rounded bg-background text-xs hover:bg-accent h-8"
                    >
                      Clear
                    </button>
                    <button
                      onClick={applyFilters}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 h-8"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="pt-0">
            {loading ? (
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
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                  <FileText size={36} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No reports found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                  {searchTerm
                    ? 'No reports match your search criteria. Try adjusting your search.'
                    : 'Get started by creating your first quality report'}
                </p>
                {!searchTerm && (
                  <motion.button
                    onClick={() => {
                      setShowForm(true);
                      setEditingReport(null);
                      resetForm();
                    }}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center font-medium text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={14} className="mr-1" />
                    Create First Report
                  </motion.button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-border text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr className="text-xs text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-center w-12">
                          <input
                            type="checkbox"
                            checked={filteredReports.length > 0 && selectedReportIds.length === filteredReports.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 cursor-pointer accent-primary"
                            title="Select all"
                          />
                        </th>
                        <th className="px-3 py-2 text-left">Raw Material</th>
                        <th className="px-3 py-2 text-left">Variety</th>
                        <th className="px-3 py-2 text-left">Supplier</th>
                        <th className="px-3 py-2 text-left">GRN</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Params</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border bg-card">
                      {filteredReports.map((report, index) => (
                        <motion.tr
                          key={report.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedReportIds.includes(report.id)}
                              onChange={() => handleToggleSelect(report.id)}
                              className="w-4 h-4 cursor-pointer accent-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>

                          <td className="px-3 py-2 font-medium text-foreground">
                            {report.rawMaterialName}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground">
                            {report.variety}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground">
                            {report.supplier}
                          </td>

                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {report.grn}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(report.dateOfReport)}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground">
                            {report.parameters.length}
                          </td>

                          {/* ✅ Proper actions */}
                          <td className="px-3 py-2 text-right">
                            <details className="relative inline-block">
                              <summary className="cursor-pointer list-none px-2 py-1 text-muted-foreground hover:text-foreground">
                                ⋮
                              </summary>

                              <div className="absolute right-0 mt-1 w-32 border border-border bg-card shadow-md z-20 text-left rounded-lg overflow-hidden">
                                <button
                                  onClick={() => handleEdit(report)}
                                  className="block w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleExport(report.id, 'excel')}
                                  className="block w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  Export
                                </button>

                                <button
                                  onClick={() => handleDelete(report.id)}
                                  className="block w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </details>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>

            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default RMQualityReport;
