import React, { useState } from 'react';
// Add glowing effect for Verify button
const verifyBtnGlowStyle = `
  .verify-glow-btn {
    color: var(--primary);
    background: rgba(83,23,170,0.06);
    border: none;
    cursor: pointer;
    transition: box-shadow 0.2s, color 0.2s, background 0.2s;
  }
  .verify-glow-btn:hover {
    color: var(--secondary);
    background: rgba(83,23,170,0.15);
    box-shadow: 0 0 8px 2px var(--secondary);
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'verify-glow-btn-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = verifyBtnGlowStyle;
    document.head.appendChild(style);
  }
}
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Calendar,
  Package,
  User,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  FileText,
  Shield,
  Beaker,
  ArrowLeft,
  Save,
  Check,
  X,
  Activity,
  Eye,
  Target,
  Star,
  ChevronDown,
  Award,
  Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES } from '../../../utils/api';
import api from '../../../utils/api';
import { exportToCertificateOfAnalysis } from '../../../utils/export';

interface BatchForVerification {
  id: string;
  batchNumber: string;
  product: {
    id: string;
    name: string;
    code: string;
  };
  maker: {
    id: string;
    name: string;
    email: string;
  };
  checker?: {
    id: string;
    name: string;
    email: string;
  };
  dateOfProduction: string;
  sampleAnalysisStatus: string;
  status: string; // SUBMITTED, APPROVED, REJECTED
  rejectionRemarks?: string;
  bestBeforeDate?: string;
  sampleAnalysisStarted?: string;
  sampleAnalysisCompleted?: string;
  totalParameters: number;
  parametersByCategory: Record<string, number>;
  createdAt: string;
}

interface ParameterForVerification {
  id: string;
  parameterId: string;
  parameterName: string;
  parameterDescription: string;
  dataType: string;
  currentValue: string;
  currentUnit: any;
  currentMethodology: any;
  verificationResult: string | null;
  verificationRemark: string | null;
  standardDefinition?: {
    standardValue: string;
    unit: any;
    methodology: any;
  };
}


// Updated status colors to include batch status


const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (s: string) => {
    switch (s.toLowerCase()) {
      case 'pending':
        return {
          bgColor: 'var(--warning-50, #fef3c7)',
          textColor: 'var(--warning, #b45309)',
          borderColor: 'var(--warning-200, #fef08a)',
          icon: Clock,
        };
      case 'in_progress':
        return {
          bgColor: 'var(--blue-50, #eff6ff)',
          textColor: 'var(--blue, #2563eb)',
          borderColor: 'var(--blue-200, #bfdbfe)',
          icon: RefreshCw,
        };
      case 'completed':
        return {
          bgColor: 'var(--success-50, #ecfdf5)',
          textColor: 'var(--success, #16a34a)',
          borderColor: 'var(--success-200, #bbf7d0)',
          icon: CheckCircle,
        };
      case 'submitted':
        return {
          bgColor: 'var(--purple-50, #f5f3ff)',
          textColor: 'var(--purple, #7c3aed)',
          borderColor: 'var(--purple-200, #e9d5ff)',
          // hide icon for submitted to avoid alignment issues
          icon: undefined,
        };
      case 'approved':
        return {
          bgColor: 'var(--primary)',
          textColor: 'var(--primary-foreground)',
          borderColor: 'var(--primary)',
          icon: CheckCircle,
        };
      case 'rejected':
        return {
          bgColor: 'var(--destructive-50, #fee2e2)',
          textColor: 'var(--destructive, #dc2626)',
          borderColor: 'var(--destructive-200, #fecaca)',
          icon: XCircle,
        };
      default:
        return {
          bgColor: 'var(--card)',
          textColor: 'var(--foreground)',
          borderColor: 'var(--border)',
          icon: Clock,
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon as any | undefined;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.375rem 0.75rem',
        borderRadius: 9999,
        fontSize: '0.75rem',
        fontWeight: 700,
        border: `1px solid ${config.borderColor}`,
        background: config.bgColor,
        color: config.textColor,
      }}
    >
      {IconComponent && (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, marginRight: 6, color: config.textColor }}>
          <IconComponent size={12} />
        </span>
      )}
      <span style={{ display: 'inline-block', lineHeight: 1 }}>{status.replace('_', ' ').toUpperCase()}</span>
    </div>
  );
};

// Updated ParameterVerificationTable with disabled state
const ParameterVerificationTable: React.FC<{
  parameters: ParameterForVerification[];
  onUpdate: (parameterId: string, result: string, remark: string) => void;
  isDisabled?: boolean;
  existingVerifications?: Record<string, { result: string; remark: string }>;
}> = ({
  parameters,
  onUpdate,
  isDisabled = false,
  existingVerifications = {},
}) => {
    const [verificationData, setVerificationData] = useState<
      Record<string, { result: string; remark: string }>
    >(
      // Initialize with existing verifications or saved verifications
      existingVerifications
    );

    // Update verification data when parameters change (for already verified batches)
    React.useEffect(() => {
      if (isDisabled) {
        const initialData: Record<string, { result: string; remark: string }> =
          {};
        parameters.forEach((param) => {
          if (param.verificationResult) {
            initialData[param.id] = {
              result: param.verificationResult,
              remark: param.verificationRemark || '',
            };
          }
        });
        setVerificationData(initialData);
      }
    }, [parameters, isDisabled]);

    const handleResultChange = (parameterId: string, result: string) => {
      if (isDisabled) return;

      const current = verificationData[parameterId] || { result: '', remark: '' };
      const updated = { ...current, result };
      setVerificationData((prev) => ({ ...prev, [parameterId]: updated }));
      onUpdate(parameterId, result, updated.remark);
    };

    const handleRemarkChange = (parameterId: string, remark: string) => {
      if (isDisabled) return;

      const current = verificationData[parameterId] || { result: '', remark: '' };
      const updated = { ...current, remark };
      setVerificationData((prev) => ({ ...prev, [parameterId]: updated }));
      onUpdate(parameterId, current.result, remark);
    };

    return (
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-4 font-bold" style={{ color: 'var(--primary-foreground)', borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center space-x-2">
                    <Target size={16} className="text-white" />
                    <span>Parameter</span>
                  </div>
                </th>
                <th className="text-left p-4 font-bold" style={{ color: 'var(--primary-foreground)', borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center space-x-2">
                    <Star size={16} className="text-white" />
                    <span>Standard Value</span>
                  </div>
                </th>
                <th className="text-left p-4 font-bold" style={{ color: 'var(--primary-foreground)', borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center space-x-2">
                    <Activity size={16} className="text-white" />
                    <span>Unit</span>
                  </div>
                </th>
                <th className="text-left p-4 font-bold" style={{ color: 'var(--primary-foreground)', borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-white" />
                    <span>Test Result</span>
                  </div>
                </th>
                <th className="text-left p-4 font-bold" style={{ color: 'var(--primary-foreground)' }}>
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-white" />
                    <span>Remarks</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((parameter, index) => (
                <tr
                  key={parameter.id}
                  style={{ borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? 'var(--card)' : 'var(--muted)' }}
                >
                  <td className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
                    <div>
                      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                        {parameter.parameterName}
                      </p>
                      {parameter.parameterDescription && (
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                          {parameter.parameterDescription}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold" style={{ color: 'var(--foreground)' }}>
                        {parameter.standardDefinition?.standardValue ||
                          parameter.currentValue}
                      </span>
                    </div>
                  </td>

                  <td className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
                    <span className="px-2 py-1 text-sm font-medium rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                      {parameter.standardDefinition?.unit?.symbol ||
                        parameter.currentUnit?.symbol ||
                        '-'}
                    </span>
                  </td>

                  <td className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder={
                        isDisabled ? 'No result entered' : 'Enter test result...'
                      }
                      value={verificationData[parameter.id]?.result || ''}
                      onChange={(e) =>
                        handleResultChange(parameter.id, e.target.value)
                      }
                      disabled={isDisabled}
                      className={`w-full p-2 border rounded text-sm ${isDisabled
                        ? 'cursor-not-allowed'
                        : 'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]'
                        }`}
                      style={{ background: isDisabled ? 'var(--muted)' : 'var(--card)', color: isDisabled ? 'var(--muted-foreground)' : 'var(--foreground)', borderColor: 'var(--border)' }}
                    />
                  </td>

                  <td className="p-4">
                    <input
                      type="text"
                      placeholder={isDisabled ? 'No remarks' : 'Add remarks...'}
                      value={verificationData[parameter.id]?.remark || ''}
                      onChange={(e) =>
                        handleRemarkChange(parameter.id, e.target.value)
                      }
                      disabled={isDisabled}
                      className={`w-full p-2 border rounded text-sm ${isDisabled
                        ? 'cursor-not-allowed'
                        : 'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]'
                        }`}
                      style={{ background: isDisabled ? 'var(--muted)' : 'var(--card)', color: isDisabled ? 'var(--muted-foreground)' : 'var(--foreground)', borderColor: 'var(--border)' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

const BatchVerification: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'verified', 'not_verified'
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [parameterVerifications, setParameterVerifications] = useState<
    Record<string, { result: string; remark: string }>
  >({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch batches for verification
  const {
    data: batchesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['batches-for-verification'],
    queryFn: async () => {
      const response = await api.get(
        API_ROUTES.BATCH.GET_BATCHES_FOR_VERIFICATION,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    },
  });

  // Fetch batch parameters when a batch is selected
  const { data: parametersData, isLoading: parametersLoading } = useQuery({
    queryKey: ['batch-parameters-verification', selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return null;
      const response = await api.get(
        API_ROUTES.BATCH.GET_BATCH_PARAMETERS_FOR_VERIFICATION(selectedBatchId),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!selectedBatchId,
  });

  // Update parameter verification mutation
  const updateParametersMutation = useMutation({
    mutationFn: async ({
      batchId,
      verifications,
    }: {
      batchId: string;
      verifications: any[];
    }) => {
      const response = await api.put(
        API_ROUTES.BATCH.UPDATE_PARAMETER_VERIFICATION(batchId),
        { parameterVerifications: verifications },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['batch-parameters-verification'],
      });
    },
  });

  // Complete batch verification mutation
  const completeBatchMutation = useMutation({
    mutationFn: async ({
      batchId,
      action,
      remarks,
    }: {
      batchId: string;
      action: 'APPROVE' | 'REJECT';
      remarks?: string;
    }) => {
      const response = await api.put(
        API_ROUTES.BATCH.COMPLETE_BATCH_VERIFICATION(batchId),
        { action, remarks },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches-for-verification'] });
      queryClient.invalidateQueries({
        queryKey: ['batch-parameters-verification'],
      });
      setSelectedBatchId(null);
      setParameterVerifications({});
    },
  });

  const batches: BatchForVerification[] = batchesData?.batches || [];

  // Updated filter logic
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product.name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (filterStatus === 'verified') {
      matchesStatus =
        batch.status === 'APPROVED' || batch.status === 'REJECTED';
    } else if (filterStatus === 'not_verified') {
      matchesStatus = batch.status === 'SUBMITTED';
    }

    return matchesSearch && matchesStatus;
  });

  const handleParameterUpdate = (
    parameterId: string,
    result: string,
    remark: string
  ) => {
    setParameterVerifications((prev) => ({
      ...prev,
      [parameterId]: { result, remark },
    }));
  };

  const handleSaveVerifications = async () => {
    if (!selectedBatchId) return;

    const verifications = Object.entries(parameterVerifications)
      .filter(([, data]) => data.result.trim())
      .map(([parameterId, data]) => ({
        parameterValueId: parameterId,
        verificationResult: data.result,
        verificationRemark: data.remark,
      }));

    if (verifications.length === 0) {
      alert('Please enter at least one test result before saving.');
      return;
    }

    updateParametersMutation.mutate({
      batchId: selectedBatchId,
      verifications,
    });
  };

  const handleCompleteBatch = async (
    action: 'APPROVE' | 'REJECT',
    remarks?: string
  ) => {
    if (!selectedBatchId) return;

    await handleSaveVerifications();

    completeBatchMutation.mutate({
      batchId: selectedBatchId,
      action,
      remarks,
    });
  };

  const handleBackToList = () => {
    setSelectedBatchId(null);
    setParameterVerifications({});
    refetch();
  };

  const handleExportCOA = () => {
    if (!selectedBatchId || !parametersData) return;

    // Format parameters for export
    const parameters: {
      category: string;
      name: string;
      standardValue: string;
      unit: any;
      result: string;
      remark: string;
    }[] = [];

    // Process parameters by category
    Object.entries(parametersData.parametersByCategory).forEach(
      ([category, params]) => {
        (params as ParameterForVerification[]).forEach((param) => {
          parameters.push({
            category,
            name: param.parameterName,
            standardValue:
              param.standardDefinition?.standardValue || param.currentValue,
            unit:
              param.standardDefinition?.unit?.symbol ||
              param.currentUnit?.symbol ||
              '',
            result: param.verificationResult || '',
            remark: param.verificationRemark || '',
          });
        });
      }
    );

    // Create export data object
    const exportData = {
      batchNumber: parametersData.batch.batchNumber,
      productName: parametersData.batch.product.name,
      dateOfProduction: parametersData.batch.dateOfProduction,
      bestBeforeDate: parametersData.batch.bestBeforeDate || '',
      sampleAnalysisStarted: parametersData.batch.sampleAnalysisStarted || '',
      sampleAnalysisCompleted:
        parametersData.batch.sampleAnalysisCompleted || '',
      parameters,
    };

    exportToCertificateOfAnalysis(exportData);
  };

  // Helper function to determine if batch is verified
  const isBatchVerified = (batch: BatchForVerification) => {
    return batch.status === 'APPROVED' || batch.status === 'REJECTED';
  };

  // Get status counts for filters
  const getStatusCounts = () => {
    const counts = {
      all: batches.length,
      verified: batches.filter((b) => isBatchVerified(b)).length,
      not_verified: batches.filter((b) => b.status === 'SUBMITTED').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--destructive)' }} className="p-8 rounded-lg border max-w-md text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            Error Loading Batches
          </h3>
          <p className="mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Failed to load batches for verification
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 rounded transition-colors font-medium"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Show details view if selected */}
        {selectedBatchId ? (
          <div>
            {parametersLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-lg p-8 animate-pulse" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="h-8 rounded w-1/3 mb-4" style={{ background: 'var(--muted)' }}></div>
                    <div className="space-y-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-16 rounded" style={{ background: 'var(--muted)' }}></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : parametersData ? (
              <div className="space-y-6">
                {/* Enhanced Batch Info */}
                <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--border)' }}>
                  <div className="p-4" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleBackToList}
                          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                          style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                        >
                          <ArrowLeft size={14} style={{ color: 'var(--muted-foreground)' }} />
                          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                            Back
                          </span>
                        </button>
                        <div className="p-2 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                          <Package size={18} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
                            {parametersData.batch.batchNumber}
                          </h2>
                          <p className="text-sm font-medium" style={{ color: 'var(--card-foreground)' }}>
                            {parametersData.batch.product.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          Total Parameters
                        </p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
                          {parametersData.totalParameters}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <Calendar size={16} style={{ color: 'var(--success, #16a34a)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Production Date
                          </span>
                          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                            {new Date(
                              parametersData.batch.dateOfProduction
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <Calendar size={16} style={{ color: 'var(--warning, #f97316)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Best Before Date
                          </span>
                          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                            {parametersData.batch.bestBeforeDate
                              ? new Date(
                                parametersData.batch.bestBeforeDate
                              ).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <User size={16} style={{ color: 'var(--primary)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Maker
                          </span>
                          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                            {parametersData.batch.maker.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Sample Analysis Started
                          </span>
                          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                            {parametersData.batch.sampleAnalysisStarted
                              ? new Date(
                                parametersData.batch.sampleAnalysisStarted
                              ).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <CheckCircle size={16} style={{ color: 'var(--primary)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Sample Analysis Completed
                          </span>
                          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                            {parametersData.batch.sampleAnalysisCompleted
                              ? new Date(
                                parametersData.batch.sampleAnalysisCompleted
                              ).toLocaleDateString()
                              : 'In Progress'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <Activity size={16} style={{ color: 'var(--primary)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Status
                          </span>
                          <div className="mt-0.5">
                            <StatusBadge
                              status={parametersData.batch.sampleAnalysisStatus}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const selectedBatch = batches.find(
                        (b) => b.id === selectedBatchId
                      );
                      const isVerified =
                        selectedBatch && isBatchVerified(selectedBatch);

                      if (isVerified) {
                        return (
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={handleExportCOA}
                              className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
                              style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                            >
                              <Download size={16} />
                              <span>Export Certificate of Analysis</span>
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Show verification status if batch is verified */}
                {(() => {
                  const selectedBatch = batches.find(
                    (b) => b.id === selectedBatchId
                  );
                  const isVerified =
                    selectedBatch && isBatchVerified(selectedBatch);

                  if (isVerified) {
                    return (
                      <div className="rounded border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                        <div className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                              {selectedBatch?.status === 'APPROVED' ? (
                                <CheckCircle size={20} style={{ color: 'var(--success, #16a34a)' }} />
                              ) : (
                                <XCircle size={20} style={{ color: 'var(--destructive, #dc2626)' }} />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold" style={{ color: selectedBatch?.status === 'APPROVED' ? 'var(--success, #065f46)' : 'var(--destructive, #7f1d1d)' }}>
                                Batch {selectedBatch?.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                              </h3>
                              <p
                                className={`text-sm ${selectedBatch?.status === 'APPROVED'
                                  ? 'text-green-700'
                                  : 'text-red-700'
                                  }`}
                              >
                                This batch has been{' '}
                                {selectedBatch?.status?.toLowerCase()} and
                                cannot be modified.
                                {selectedBatch?.rejectionRemarks && (
                                  <span className="block mt-1 font-medium">
                                    Reason: {selectedBatch.rejectionRemarks}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Enhanced Parameters by Category */}
                {Object.entries(parametersData.parametersByCategory).map(
                  ([category, parameters]) => {
                    const selectedBatch = batches.find(
                      (b) => b.id === selectedBatchId
                    );
                    const isVerified =
                      selectedBatch && isBatchVerified(selectedBatch);

                    return (
                      <div key={category} className="rounded border overflow-hidden" style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--border)' }}>
                        <div className="p-6" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                                <Beaker size={20} style={{ color: 'var(--primary)' }} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
                                  {category}
                                </h3>
                                <p style={{ color: 'var(--card-foreground)' }}>
                                  {(parameters as any[]).length} parameters
                                  {isVerified ? ' (verified)' : ' to verify'}
                                </p>
                              </div>
                            </div>
                            <div className="px-4 py-2 rounded border font-bold" style={isVerified ? { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' } : { background: 'var(--secondary)', color: 'var(--secondary-foreground)', borderColor: 'var(--secondary)' }}>
                              <span className="font-bold">
                                {(parameters as any[]).length}
                              </span>
                              <span className="text-sm ml-1">tests</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          <ParameterVerificationTable
                            parameters={
                              parameters as ParameterForVerification[]
                            }
                            onUpdate={handleParameterUpdate}
                            isDisabled={isVerified}
                          />
                        </div>
                      </div>
                    );
                  }
                )}

                {/* Enhanced Action Buttons - Only show for non-verified batches */}
                {(() => {
                  const selectedBatch = batches.find(
                    (b) => b.id === selectedBatchId
                  );
                  const isVerified =
                    selectedBatch && isBatchVerified(selectedBatch);

                  if (!isVerified) {
                    return (
                      <div className="rounded border overflow-hidden" style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--border)' }}>
                        <div className="p-6" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center space-x-3">
                            <div className="p-3 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                              <Award size={20} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
                                Complete Verification
                              </h3>
                              <p style={{ color: 'var(--card-foreground)' }}>
                                Save test results and make final decision
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex flex-wrap items-center justify-center gap-4">
                            <button
                              onClick={handleSaveVerifications}
                              disabled={updateParametersMutation.isPending}
                              className="px-8 py-4 rounded disabled:opacity-50 transition-colors flex items-center gap-3 font-semibold text-lg"
                              style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                            >
                              <Save size={20} />
                              Save Progress
                            </button>

                            <button
                              onClick={() => {
                                const remarks = prompt('Enter rejection remarks:');
                                if (remarks) handleCompleteBatch('REJECT', remarks);
                              }}
                              disabled={completeBatchMutation.isPending}
                              className="px-8 py-4 rounded disabled:opacity-50 transition-colors flex items-center gap-3 font-semibold text-lg"
                              style={{ background: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
                            >
                              <X size={20} />
                              Reject Batch
                            </button>

                            <button
                              onClick={() => handleCompleteBatch('APPROVE')}
                              disabled={completeBatchMutation.isPending}
                              className="px-8 py-4 rounded disabled:opacity-50 transition-colors flex items-center gap-3 font-semibold text-lg"
                              style={{ background: 'var(--success, #16a34a)', color: '#fff' }}
                            >
                              <Check size={20} />
                              Approve Batch
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : null}
          </div>
        ) : (
          /* Main Container */
          <div className="rounded border overflow-hidden" style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--border)' }}>
            {/* Header Section */}
            <div className="p-6" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <div className="p-2 rounded" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <Shield size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
                        Batch Verification
                      </h1>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--card-foreground)' }}>
                        Review and verify quality parameters for submitted
                        batches
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters Section */}
            <div className="p-6" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[#5317AA]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by batch number or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-full rounded focus:outline-none transition-colors shadow-sm text-sm"
                    style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                  />
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded transition-colors text-sm"
                    style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                  >
                    <Filter className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--foreground)' }}>Filters</span>
                    <ChevronDown size={14} style={{ color: 'var(--muted-foreground)' }} />
                  </button>

                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded transition-colors text-sm"
                    style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                  >
                    <RefreshCw className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--foreground)' }}>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Updated Filter Section */}
              {isFilterOpen && (
                <div className="p-4 rounded" style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--card-foreground)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                        Verification Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2 rounded text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                      >
                        <option value="all">
                          All Batches ({statusCounts.all})
                        </option>
                        <option value="not_verified">
                          Not Verified ({statusCounts.not_verified})
                        </option>
                        <option value="verified">
                          Verified ({statusCounts.verified})
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                      className="px-4 py-2 rounded text-sm"
                      style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'var(--card)' }}
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw size={14} style={{ color: 'var(--muted-foreground)' }} />
                        <span>Clear</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-4 py-2 rounded text-sm"
                      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Filter size={14} style={{ color: 'var(--primary-foreground)' }} />
                        <span>Apply</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table Section */}
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="rounded-full h-12 w-12 animate-spin" style={{ borderWidth: 4, borderStyle: 'solid', borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="p-12 text-center" style={{ color: 'var(--foreground)' }}>
                  <div className="p-3 rounded inline-block mb-4" style={{ background: 'var(--primary)' }}>
                    <Shield size={36} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    No batches found
                  </h3>
                  <p className="mb-6 max-w-md mx-auto text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No batches are currently available for verification or match
                    your search criteria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full" style={{ background: 'var(--card)', color: 'var(--card-foreground)', borderCollapse: 'separate', width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider"
                        >
                          Batch Number
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Product
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Production Date
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Maker
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Verification Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Parameters
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--primary-foreground)' }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
                      {filteredBatches.map(
                        (batch: BatchForVerification) => (
                          <tr key={batch.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                              {batch.batchNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--foreground)' }}>
                              <div>
                                <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                                  {batch.product.name}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                  {batch.product.code}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--foreground)' }}>
                              {formatDate(batch.dateOfProduction)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--foreground)' }}>
                              {batch.maker.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={batch.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--muted-foreground)' }}>
                              <div className="flex items-center">
                                <BarChart3 size={14} className="mr-1" style={{ color: 'var(--muted-foreground)' }} />
                                {batch.totalParameters} parameters
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setSelectedBatchId(batch.id)}
                                style={isBatchVerified(batch)
                                  ? { color: 'var(--muted-foreground)', background: 'var(--muted)' }
                                  : undefined
                                }
                                className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ml-auto ${!isBatchVerified(batch) ? 'verify-glow-btn' : ''}`}
                                title={isBatchVerified(batch) ? 'View Details' : 'Start Verification'}
                              >
                                {isBatchVerified(batch) ? (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    <span className="text-xs font-medium" style={{ color: 'inherit' }}>
                                      View
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 " />
                                    <span className="text-xs font-medium " style={{ color: 'inherit' }}>
                                      Verify
                                    </span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchVerification;
