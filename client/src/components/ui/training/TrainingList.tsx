import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiEye,
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiMapPin,
  FiPlus,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiChevronDown,
} from 'react-icons/fi';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/api';
import { format } from 'date-fns';
import TrainingDetails from './Trainingdetails';
import {
  Tooltip,
  Button,
  Table,
  message,
  Dropdown,
  Space,
  Empty,
} from 'antd';
import type { MenuProps } from 'antd';
import { BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Status configuration
const statusConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  SCHEDULED: { icon: <CalendarIcon size={12} />, label: 'Scheduled' },
  COMPLETED: { icon: <FiCheck size={12} />, label: 'Completed' },
  CANCELLED: { icon: <FiX size={12} />, label: 'Cancelled' },
  IN_PROGRESS: { icon: <FiClock size={12} />, label: 'In Progress' },
  POSTPONED: { icon: <FiAlertCircle size={12} />, label: 'Postponed' },
};

// Status color mapping for theme support
const getStatusClasses = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'COMPLETED':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'CANCELLED':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'IN_PROGRESS':
      return 'bg-secondary/10 text-secondary border-secondary/20';
    case 'POSTPONED':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const TrainingList: React.FC = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [, setIsTransitioning] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [trainingIdToDelete, setTrainingIdToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({
    status: null,
    trainingType: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchTrainings = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (searchText) params.append('search', searchText);
      if (filters.status) params.append('status', filters.status);
      if (filters.trainingType) params.append('trainingType', filters.trainingType);

      const response = await api.get(
        `${API_ROUTES.TRAINING.GET_ALL_TRAININGS}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setTrainings(response.data.data);
      setPagination({
        ...pagination,
        current: page,
        pageSize,
        total: response.data.pagination.total,
      });
      return true;
    } catch (error) {
      message.error('Failed to fetch trainings');
      console.error('Error fetching trainings:', error);
      return false;
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrainings(pagination.current, pagination.pageSize);
  }, [filters, searchText]);

  const handleTableChange = (pag: any) => {
    fetchTrainings(pag.current, pag.pageSize);
  };

  const handleViewDetails = (training: any) => {
    setSelectedTraining(training);
    setShowDetails(true);
  };

  const handleDeleteTraining = (id: string) => {
    setTrainingIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!trainingIdToDelete) return;
    try {
      setLoading(true);
      await api.delete(API_ROUTES.TRAINING.DELETE_TRAINING(trainingIdToDelete), {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      message.success('Training deleted successfully');
      fetchTrainings(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Error deleting training:', error);
      message.error('Failed to delete training');
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setTrainingIdToDelete(null);
    }
  };

  const handleEditTraining = (id: string) => {
    window.location.href = `/trainings/edit/${id}`;
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleSearch = () => {
    fetchTrainings(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchText('');
    setFilters({ status: null, trainingType: null });
    setIsRefreshing(true);
    fetchTrainings(1, pagination.pageSize);
  };

  const statusFilterMenu: MenuProps['items'] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'SCHEDULED', label: 'Scheduled' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'POSTPONED', label: 'Postponed' },
  ];

  const typeFilterMenu: MenuProps['items'] = [
    { key: 'all', label: 'All Types' },
    { key: 'WORKSHOP', label: 'Workshop' },
    { key: 'SEMINAR', label: 'Seminar' },
    { key: 'COURSE', label: 'Course' },
    { key: 'CERTIFICATION', label: 'Certification' },
    { key: 'WEBINAR', label: 'Webinar' },
  ];

  const columns = [
    {
      title: 'Training Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div
          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={() => handleViewDetails(record)}
        >
          {title}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'trainingType',
      key: 'trainingType',
      render: (type: string) => (
        <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-medium capitalize">
          {type?.toLowerCase().replace('_', ' ')}
        </span>
      ),
    },
    {
      title: 'Participants',
      key: 'participants',
      render: (_: any, record: any) => (
        <div className="flex items-center text-sm text-muted-foreground">
          <FiUsers className="mr-2 text-primary" size={14} />
          <span>
            {record._count?.participants || 0}
            {record.maxParticipants && ` / ${record.maxParticipants}`}
          </span>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => (
        <div className="flex items-center text-sm text-muted-foreground">
          <FiMapPin className="mr-2 text-primary" size={14} />
          <span className="truncate max-w-[150px]">{location}</span>
        </div>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      render: (_: any, record: any) => (
        <div className="flex items-center text-sm text-muted-foreground">
          <FiCalendar className="mr-2 text-primary" size={14} />
          <div>
            <div className="text-foreground">{format(new Date(record.startDate), 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">
              to {format(new Date(record.endDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusConfig[status] || { icon: <FiAlertCircle size={12} />, label: status };
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusClasses(status)}`}>
            {config.icon}
            <span>{config.label}</span>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="primary"
              shape="circle"
              icon={<FiEye size={14} />}
              onClick={() => handleViewDetails(record)}
              size="small"
              className="bg-primary hover:bg-primary/90 border-none"
            />
          </Tooltip>
          <Tooltip title={record.status === 'SCHEDULED' ? 'Edit' : 'Only scheduled can be edited'}>
            <Button
              shape="circle"
              icon={<FiEdit size={14} />}
              onClick={() => record.status === 'SCHEDULED' && handleEditTraining(record.id)}
              disabled={record.status !== 'SCHEDULED'}
              size="small"
              className={record.status === 'SCHEDULED' ? 'text-primary border-primary hover:bg-primary/10' : ''}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              shape="circle"
              icon={<FiTrash2 size={14} />}
              onClick={(e) => { e.stopPropagation(); handleDeleteTraining(record.id); }}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <AnimatePresence mode="wait">
        {!showDetails ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="max-w-7xl mx-auto ">
              {/* Main Card */}
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-primary/5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="text-primary" size={20} />
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-foreground">Training Management</h1>
                        <p className="text-sm text-muted-foreground">Manage and track training programs</p>
                      </div>
                    </div>
                    <button
                    onClick={()=>navigate('/trainings/create')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                      <FiPlus size={16} />
                      New Training
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex flex-wrap gap-3 items-center">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[250px] relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <input
                        type="text"
                        placeholder="Search trainings..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {searchText && (
                        <button
                          onClick={() => setSearchText('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <FiX size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filters */}
                    <Dropdown
                      menu={{
                        items: statusFilterMenu,
                        onClick: ({ key }) => handleFilterChange('status', key === 'all' ? null : key),
                      }}
                      trigger={['click']}
                    >
                      <button className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground hover:bg-muted transition-colors">
                        Status: {filters.status || 'All'}
                        <FiChevronDown size={14} />
                      </button>
                    </Dropdown>

                    <Dropdown
                      menu={{
                        items: typeFilterMenu,
                        onClick: ({ key }) => handleFilterChange('trainingType', key === 'all' ? null : key),
                      }}
                      trigger={['click']}
                    >
                      <button className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground hover:bg-muted transition-colors">
                        Type: {filters.trainingType || 'All'}
                        <FiChevronDown size={14} />
                      </button>
                    </Dropdown>

                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <FiRefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      Reset
                    </button>
                  </div>

                  {/* Active Filters */}
                  {(filters.status || filters.trainingType || searchText) && (
                    <div className="mt-1 flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-muted-foreground">Active:</span>
                      {filters.status && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                          {filters.status}
                          <button onClick={() => handleFilterChange('status', null)}><FiX size={12} /></button>
                        </span>
                      )}
                      {filters.trainingType && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs">
                          {filters.trainingType}
                          <button onClick={() => handleFilterChange('trainingType', null)}><FiX size={12} /></button>
                        </span>
                      )}
                      {searchText && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                          "{searchText}"
                          <button onClick={() => setSearchText('')}><FiX size={12} /></button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="py-4 training-table-wrapper">
                  <Table
                    columns={columns}
                    dataSource={trainings}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      ...pagination,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                      size: 'small',
                    }}
                    onChange={handleTableChange}
                    className="training-table"
                    locale={{
                      emptyText: (
                        <div className="py-12">
                          <Empty
                            image={<BookOpen size={48} className="mx-auto text-muted-foreground/50" />}
                            description={
                              <div className="text-center">
                                <p className="text-muted-foreground font-medium">No trainings found</p>
                                <p className="text-muted-foreground/70 text-sm">
                                  {searchText || filters.status || filters.trainingType
                                    ? 'Try adjusting your filters'
                                    : 'Create your first training'}
                                </p>
                              </div>
                            }
                          />
                        </div>
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <TrainingDetails
            training={selectedTraining}
            onClose={async () => {
              setIsTransitioning(true);
              await fetchTrainings(pagination.current, pagination.pageSize);
              setShowDetails(false);
              setSelectedTraining(null);
              setIsTransitioning(false);
            }}
            onRefresh={() => fetchTrainings(pagination.current, pagination.pageSize)}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { setIsDeleteModalOpen(false); setTrainingIdToDelete(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border bg-destructive/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <FiTrash2 className="text-destructive" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Delete Training</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-foreground">
                  Are you sure you want to delete this training? All sessions, participants, and related data will be permanently removed.
                </p>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setTrainingIdToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TrainingList;
