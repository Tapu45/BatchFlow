import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Building, 
  FileText, 
  ClipboardList, 
  Save, 
  Trash2, 
  AlertCircle,
  Mail,
  Target,
  Stethoscope as Scope,
  Plus,
  Info
} from 'lucide-react';
import axios from 'axios';
import { API_ROUTES } from '../../../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Enhanced Field component with better styling - theme aware
type FormFieldProps = {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  description?: string;
};

const FormField: React.FC<FormFieldProps> = ({ label, id, error, children, required = false, description }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-2">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center">
          <Info size={12} className="mr-1" />
          {description}
        </p>
      )}
      {children}
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-sm text-destructive flex items-center bg-destructive/10 p-2 rounded-md border-l-4 border-destructive"
          >
            <AlertCircle size={14} className="mr-2 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Progress indicator component - theme aware
const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Form Progress</span>
        <span className="text-sm text-muted-foreground">{currentStep}/{totalSteps} sections</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div 
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Section wrapper component - theme aware
const FormSection = ({ title, description, children, icon }: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6"
    >
      <div className="bg-muted/50 px-6 py-4 border-b border-border">
        <div className="flex items-center">
          <div className="p-2 bg-primary/10 rounded-lg mr-3">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  );
};

const CreateAudit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    auditType: '',
    startDate: '',
    endDate: '',
    auditorId: '',
    auditorUserId: '',
    auditorName: '',
    auditorEmail: '',
    firmName: '',
    departmentId: '',
    objectives: '',
    scope: ''
  });
  
  type Errors = {
    name?: string;
    auditType?: string;
    startDate?: string;
    endDate?: string;
    auditorId?: string;
    auditorUserId?: string;
    auditorName?: string;
    auditorEmail?: string;
    firmName?: string;
    departmentId?: string;
    objectives?: string;
    scope?: string;
    form?: string;
  };
  
  const [errors, setErrors] = useState<Errors>({});
  const [currentStep, setCurrentStep] = useState(1);
  
  // Fetch users for auditor selection
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get(API_ROUTES.AUTH.GET_ALL_USERS, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return response.data;
    },
  });
  
  // Fetch departments
  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const response = await axios.get(API_ROUTES.AUDIT.GET_ALL_DEPARTMENTS, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching departments:', error);
        return { departments: [] };
      }
    },
    enabled: true,
  });
  
  // Create audit mutation
  type CreateAuditInput = {
    name: string;
    auditType: string;
    startDate: string;
    endDate: string;
    auditorId?: string;
    auditorUserId?: string;
    auditorName?: string;
    auditorEmail?: string;
    firmName?: string;
    departmentId: string;
    objectives: string;
    scope: string;
  };

  const createAuditMutation = useMutation({
    mutationFn: (data: CreateAuditInput) =>
      axios.post(API_ROUTES.AUDIT.CREATE_AUDIT, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Audit created successfully! 🎉');
      navigate('/audits');
    },
    onError: (error: any) => {
      toast.error('Failed to create audit');
      console.error('Create error:', error);

      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setErrors({ form: error.response.data.error });
      }
    },
  });
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing again
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    
    // Reset auditor fields when audit type changes
    if (name === 'auditType') {
      setFormData(prev => ({
        ...prev,
        auditorId: '',
        auditorUserId: '',
        auditorName: '',
        auditorEmail: '',
        firmName: value === 'EXTERNAL' ? prev.firmName : '',
      }));
    }

    // Update progress based on filled fields
    updateProgress();
  };

  const updateProgress = () => {
    const filledFields = Object.values(formData).filter(value => value.trim() !== '').length;
    const totalRequiredFields = 8; // Adjust based on required fields
    setCurrentStep(Math.min(Math.ceil((filledFields / totalRequiredFields) * 4), 4));
  };
  
  const validateForm = () => {
    const newErrors: Errors = {};
    
    if (!formData.name) newErrors.name = 'Audit name is required';
    if (!formData.auditType) newErrors.auditType = 'Audit type is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    
    // Date validation
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    
    // Validate based on audit type
    if (formData.auditType === 'INTERNAL') {
      if (!formData.auditorUserId) newErrors.auditorUserId = 'Auditor is required for internal audits';
    } else if (formData.auditType === 'EXTERNAL') {
      if (!formData.auditorName) newErrors.auditorName = 'Auditor name is required for external audits';
      if (!formData.auditorEmail) newErrors.auditorEmail = 'Auditor email is required for external audits';
      if (!formData.firmName) newErrors.firmName = 'Firm name is required for external audits';
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.auditorEmail && !emailRegex.test(formData.auditorEmail)) {
        newErrors.auditorEmail = 'Please enter a valid email address';
      }
    }
    
    if (!formData.departmentId) newErrors.departmentId = 'Department is required';
    if (!formData.objectives) newErrors.objectives = 'Objectives are required';
    if (!formData.scope) newErrors.scope = 'Scope is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (validateForm()) {
      const auditData: CreateAuditInput = {
        name: formData.name,
        auditType: formData.auditType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        departmentId: formData.departmentId,
        objectives: formData.objectives,
        scope: formData.scope,
      };

      if (formData.auditType === 'INTERNAL') {
        auditData.auditorUserId = formData.auditorUserId;
      } else if (formData.auditType === 'EXTERNAL') {
        auditData.auditorName = formData.auditorName;
        auditData.auditorEmail = formData.auditorEmail;
        auditData.firmName = formData.firmName;
      }

      createAuditMutation.mutate(auditData);
    } else {
      toast.error('Please fix the errors in the form');
    }
  };
  
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
      setFormData({
        name: '',
        auditType: '',
        startDate: '',
        endDate: '',
        auditorId: '',
        auditorUserId: '',
        auditorName: '',
        auditorEmail: '',
        firmName: '',
        departmentId: '',
        objectives: '',
        scope: ''
      });
      setErrors({});
      setCurrentStep(1);
      toast.success('Form reset successfully');
    }
  };

  // Process departments data
  const departments = React.useMemo(() => {
    if (departmentsData && Array.isArray(departmentsData.departments)) {
      return departmentsData.departments;
    }
    if (departmentsData && Array.isArray(departmentsData)) {
      return departmentsData;
    }
    if (departmentsData && departmentsData.data && Array.isArray(departmentsData.data)) {
      return departmentsData.data;
    }
    return [];
  }, [departmentsData]);

  const users = usersData?.users || [];
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <Link 
            to="/audits" 
            className="inline-flex items-center text-primary hover:opacity-80 mb-4 font-medium transition-colors"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Audits
          </Link>
          
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl mr-4">
                <Plus size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Create New Audit</h1>
                <p className="text-muted-foreground mt-1">
                  Set up a comprehensive audit to ensure quality and compliance standards
                </p>
              </div>
            </div>
            
            <ProgressIndicator currentStep={currentStep} totalSteps={4} />
          </div>
        </motion.div>
        
        {/* Global Error Display */}
        <AnimatePresence>
          {errors.form && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive"
            >
              <div className="flex items-center">
                <AlertCircle size={20} className="mr-3" />
                <div>
                  <p className="font-medium">Error creating audit</p>
                  <p className="text-sm opacity-80">{errors.form}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <FormSection
            title="Basic Information"
            description="Essential details about the audit"
            icon={<FileText size={20} className="text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField 
                label="Audit Name" 
                id="name" 
                error={errors.name}
                required
                description="A descriptive name for this audit"
              >
                <div className="relative">
                  <FileText size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Q1 Financial Audit 2024"
                    className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </FormField>
              
              <FormField 
                label="Audit Type" 
                id="auditType" 
                error={errors.auditType}
                required
                description="Select whether this is an internal or external audit"
              >
                <div className="relative">
                  <ClipboardList size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="auditType"
                    name="auditType"
                    value={formData.auditType}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all appearance-none bg-card text-foreground"
                  >
                    <option value="">Select Audit Type</option>
                    <option value="INTERNAL">Internal Audit</option>
                    <option value="EXTERNAL">External Audit</option>
                  </select>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Schedule Section */}
          <FormSection
            title="Schedule"
            description="Define the audit timeline"
            icon={<Calendar size={20} className="text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField 
                label="Start Date" 
                id="startDate" 
                error={errors.startDate}
                required
                description="When should the audit begin?"
              >
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground"
                  />
                </div>
              </FormField>
              
              <FormField 
                label="End Date" 
                id="endDate" 
                error={errors.endDate}
                description="Optional: When should the audit be completed?"
              >
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground"
                  />
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Auditor Information Section */}
          <AnimatePresence>
            {formData.auditType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FormSection
                  title="Auditor Information"
                  description={`Configure ${formData.auditType.toLowerCase()} auditor details`}
                  icon={<Users size={20} className="text-primary" />}
                >
                  {formData.auditType === 'INTERNAL' ? (
                    <FormField 
                      label="Internal Auditor" 
                      id="auditorUserId" 
                      error={errors.auditorUserId}
                      required
                      description="Select from your organization's team members"
                    >
                      <div className="relative">
                        <Users size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <select
                          id="auditorUserId"
                          name="auditorUserId"
                          value={formData.auditorUserId}
                          onChange={handleChange}
                          className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all appearance-none bg-card text-foreground"
                        >
                          <option value="">Select Internal Auditor</option>
                          {isLoadingUsers ? (
                            <option value="" disabled>Loading users...</option>
                          ) : (
                            users.map((user: { id: string; name: string; email: string }) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </FormField>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField 
                        label="Auditor Name" 
                        id="auditorName" 
                        error={errors.auditorName}
                        required
                        description="Full name of the external auditor"
                      >
                        <div className="relative">
                          <Users size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            id="auditorName"
                            name="auditorName"
                            value={formData.auditorName}
                            onChange={handleChange}
                            placeholder="e.g., John Smith"
                            className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </FormField>
                      
                      <FormField 
                        label="Auditor Email" 
                        id="auditorEmail" 
                        error={errors.auditorEmail}
                        required
                        description="Professional email address"
                      >
                        <div className="relative">
                          <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="email"
                            id="auditorEmail"
                            name="auditorEmail"
                            value={formData.auditorEmail}
                            onChange={handleChange}
                            placeholder="auditor@firm.com"
                            className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </FormField>
                      
                      <FormField 
                        label="Audit Firm" 
                        id="firmName" 
                        error={errors.firmName}
                        required
                        description="Name of the auditing company"
                      >
                        <div className="relative">
                          <Building size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            id="firmName"
                            name="firmName"
                            value={formData.firmName}
                            onChange={handleChange}
                            placeholder="e.g., ABC Audit Services"
                            className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </FormField>
                    </div>
                  )}
                </FormSection>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Department and Scope Section */}
          <FormSection
            title="Department & Scope"
            description="Define what will be audited and where"
            icon={<Building size={20} className="text-primary" />}
          >
            <div className="space-y-6">
              <FormField 
                label="Department" 
                id="departmentId" 
                error={errors.departmentId}
                required
                description="Which department will be audited?"
              >
                <div className="relative">
                  <Building size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all appearance-none bg-card text-foreground"
                  >
                    <option value="">Select Department</option>
                    {isLoadingDepartments ? (
                      <option value="" disabled>Loading departments...</option>
                    ) : departments.length === 0 ? (
                      <option value="" disabled>No departments available</option>
                    ) : (
                      departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField 
                  label="Audit Objectives" 
                  id="objectives" 
                  error={errors.objectives}
                  required
                  description="What are the main goals of this audit?"
                >
                  <div className="relative">
                    <Target size={18} className="absolute left-3 top-3 text-muted-foreground" />
                    <textarea
                      id="objectives"
                      name="objectives"
                      value={formData.objectives}
                      onChange={handleChange}
                      placeholder="e.g., Evaluate financial controls, assess compliance with regulations, identify process improvements..."
                      rows={4}
                      className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all resize-none bg-card text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </FormField>
                
                <FormField 
                  label="Audit Scope" 
                  id="scope" 
                  error={errors.scope}
                  required
                  description="What specific areas, processes, or systems will be examined?"
                >
                  <div className="relative">
                    <Scope size={18} className="absolute left-3 top-3 text-muted-foreground" />
                    <textarea
                      id="scope"
                      name="scope"
                      value={formData.scope}
                      onChange={handleChange}
                      placeholder="e.g., Financial transactions from Q1-Q3, inventory management processes, IT security protocols..."
                      rows={4}
                      className="pl-10 w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all resize-none bg-card text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl shadow-sm border border-border p-6"
          >
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
              <motion.button
                type="button"
                onClick={handleReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-6 py-3 border border-border rounded-lg text-foreground hover:bg-muted flex items-center justify-center transition-all duration-200 font-medium bg-card"
              >
                <Trash2 size={18} className="mr-2" />
                Reset Form
              </motion.button>
              
              <motion.button
                type="submit"
                disabled={createAuditMutation.isPending}
                whileHover={{ scale: createAuditMutation.isPending ? 1 : 1.02 }}
                whileTap={{ scale: createAuditMutation.isPending ? 1 : 0.98 }}
                className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {createAuditMutation.isPending ? (
                  <>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-3"
                    />
                    Creating Audit...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Create Audit
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
};

export default CreateAudit;
