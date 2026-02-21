import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Package,
  Calendar,
  Clock,
  CheckCircle,
  Users,
  Shield,
  BarChart3,
  Star,
  FileText,
  Beaker,
  FlaskConical,
  Microscope,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import ParameterDetailsTable from './ParameterDetails';
import { exportToCertificateOfAnalysis } from '../../../utils/export';

// Status configuration using theme colors
const statusConfig = {
  DRAFT: {
    bg: 'bg-[var(--muted)]',
    text: 'text-[var(--muted-foreground)]',
    border: 'border-[var(--border)]',
    icon: Clock,
  },
  SUBMITTED: {
    bg: 'bg-[var(--accent)]',
    text: 'text-[var(--accent-foreground)]',
    border: 'border-[var(--accent)]',
    icon: FileText,
  },
  APPROVED: {
    bg: 'bg-[var(--chart-3)]',
    text: 'text-white',
    border: 'border-[var(--chart-3)]',
    icon: CheckCircle,
  },
  REJECTED: {
    bg: 'bg-[var(--destructive)]',
    text: 'text-[var(--destructive-foreground)]',
    border: 'border-[var(--destructive)]',
    icon: AlertTriangle,
  },
};

// Category icon mapping
const categoryIcons: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  physical: BarChart3,
  chemical: Beaker,
  microbiological: Microscope,
  nutritional: Shield,
  sensory: Star,
  safety: AlertTriangle,
  default: FlaskConical,
};


const SectionCard: React.FC<{
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden"
  >
    <div className="bg-[var(--muted)] p-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
          <Icon size={18} className="text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
    <div className="p-6 bg-[var(--card)]">{children}</div>
  </motion.div>
);

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const getCategoryIcon = (categoryName: string) => {
  const Icon =
    categoryIcons[categoryName.toLowerCase()] || categoryIcons.default;
  return <Icon size={18} className="text-[var(--primary)]" />;
};

const BatchDetails = ({
  batch,
  onBack,
}: {
  batch: any;
  onBack: () => void;
}) => {
  const handleExportToCOA = async () => {
    if (!batch.parameterValuesByCategory) {
      alert('No parameter data available for export');
      return;
    }

    const parameters: any[] = [];

    Object.entries(
      batch.parameterValuesByCategory as Record<string, any[]>
    ).forEach(([category, params]) => {
      (params as any[]).forEach((param) => {
        const hasValue = param.value && param.value.trim() !== '';
        const hasVerificationResult =
          param.verificationResult && param.verificationResult.trim() !== '';

        parameters.push({
          category: category,
          name: param.parameter?.name || 'Unknown Parameter',
          standardValue:
            param.standardDefinition?.standardValue || param.value || 'N/A',
          unit:
            param.standardDefinition?.unit?.symbol || param.unit?.symbol || '',
          result: hasVerificationResult
            ? param.verificationResult
            : hasValue
              ? param.value
              : 'No test data',
          remark:
            param.verificationRemark ||
            (hasValue ? 'No remarks' : 'No data available'),
        });
      });
    });

    const coaData = {
      batchNumber: batch.batchNumber,
      productName: batch.productName,
      dateOfProduction: batch.dateOfProduction,
      bestBeforeDate: batch.bestBeforeDate,
      sampleAnalysisStarted: batch.createdAt,
      sampleAnalysisCompleted: batch.updatedAt,
      parameters: parameters,
      customerInfo: {
        name: 'Unilever Nigeria Plc',
        address: '20, Agbara Industrial Estate road Wing B, Agbara, Nigeria',
      },
    };

    try {
      await exportToCertificateOfAnalysis(coaData);
    } catch (error) {
      console.error('Error exporting COA:', error);
      alert('Failed to export Certificate of Analysis');
    }
  };

  const isVerified = batch.status === 'APPROVED' || batch.status === 'REJECTED';
  const status =
    statusConfig[batch.status as keyof typeof statusConfig] ||
    statusConfig.DRAFT;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[var(--background)]"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden"
        >
          <div className="relative bg-[var(--muted)] p-6 border-b border-[var(--border)]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onBack}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-all font-medium text-sm text-[var(--foreground)]"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportToCOA}
                  disabled={!isVerified}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                    isVerified
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                  }`}
                >
                  <Download size={16} />
                  <span>Export COA</span>
                </motion.button>

                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${status.bg} ${status.text} ${status.border}`}
                >
                  <StatusIcon size={16} />
                  <span>{batch.status}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="p-3 bg-[var(--primary)]/10 rounded-xl">
                <Package className="text-[var(--primary)]" size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Batch #{batch.batchNumber}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">
                    <Package size={14} />
                    {batch.productName}
                  </span>
                  <span className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">
                    <Calendar size={14} />
                    {formatDate(batch.dateOfProduction)}
                  </span>
                  <span className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">
                    <Clock size={14} />
                    {formatDate(batch.bestBeforeDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Batch Information Section */}
        <SectionCard
          title="Batch Information"
          description="Complete details and specifications"
          icon={FileText}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="bg-[var(--muted)] rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={16} className="text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Product Details
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Product Name:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {batch.productName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Analysis Status:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {batch.sampleAnalysisStatus || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--muted)] rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Production Timeline
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Production Date:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatDate(batch.dateOfProduction)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Best Before:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatDate(batch.bestBeforeDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-[var(--muted)] rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Personnel Information
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Created By:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {batch.maker?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Checked By:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {batch.checker?.name || 'Not checked yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--muted)] rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    System Information
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Created Date:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatDate(batch.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Last Updated:
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatDate(batch.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Quality Parameters Section */}
        {batch.parameterValuesByCategory &&
          Object.keys(batch.parameterValuesByCategory).length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                  Quality Parameters Analysis
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] max-w-2xl mx-auto">
                  Comprehensive testing results and verification status for all
                  quality parameters
                </p>
              </div>

              {Object.entries(
                batch.parameterValuesByCategory as Record<string, any[]>
              ).map(([categoryName, parameters], index) => (
                <motion.div
                  key={categoryName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden"
                >
                  <div className="bg-[var(--muted)] p-4 border-b border-[var(--border)]">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--card)] rounded-lg">
                          {getCategoryIcon(categoryName)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">
                            {categoryName} Parameters
                          </h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {parameters.length} parameter
                            {parameters.length !== 1 ? 's' : ''} tested
                            {isVerified
                              ? ' • Verification completed'
                              : ' • Awaiting verification'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`px-4 py-2 rounded-lg border font-semibold text-sm ${
                          isVerified
                            ? 'bg-[var(--chart-3)]/10 text-[var(--chart-3)] border-[var(--chart-3)]/20'
                            : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isVerified ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Clock size={16} />
                          )}
                          <span>
                            {parameters.length} test
                            {parameters.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--card)]">
                    <ParameterDetailsTable
                      parameters={parameters}
                      isVerified={isVerified}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  );
};

export default BatchDetails;
