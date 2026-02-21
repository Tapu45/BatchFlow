import React, { useEffect, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import api, { API_ROUTES } from '../../../../utils/api';
import {
  ArrowUpDown,
  Tag,
  RefreshCw,
  AlertCircle,
  List,
  Plus,
  Database,
  FileText,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';

interface StandardParameter {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  dataType: string;
  category: {
    id: string;
    name: string;
  };
}

interface StandardParameterListProps {
  onAddParameterClick?: () => void;
}

const StandardParameterList: React.FC<StandardParameterListProps> = ({
  onAddParameterClick,
}) => {
  const [parameters, setParameters] = useState<StandardParameter[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parameterToDelete, setParameterToDelete] =
    useState<StandardParameter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchParameters = async () => {
    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await api.get(
        API_ROUTES.STANDARD.GET_STANDARD_PARAMETERS,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      setParameters(response.data.parameters);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  const handleDelete = async () => {
    if (!parameterToDelete) return;
    setIsDeleting(true);
    try {
      const authToken = localStorage.getItem('authToken');
      await api.delete(
        API_ROUTES.STANDARD.DELETE_STANDARD_PARAMETER(parameterToDelete.id),
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      setParameters((prev) =>
        prev.filter((param) => param.id !== parameterToDelete.id)
      );
      toast.success('Parameter deleted successfully!', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setShowDeleteModal(false);
      setParameterToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete parameter:', err);
      toast.error(
        err.response?.data?.message ||
        'Failed to delete parameter. Please try again.',
        {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Format data type for display
  const formatDataType = (dataType: string) => {
    return dataType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Column definition for TanStack Table (ID column removed)
  const columnHelper = createColumnHelper<StandardParameter>();
  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            <Tag size={14} />
          </div>
          Name
          <ArrowUpDown
            size={12}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="font-medium text-foreground">{getValue()}</div>
      ),
    }),
    columnHelper.accessor('category.name', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors">
            <List size={14} />
          </div>
          Category
          <ArrowUpDown
            size={12}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="bg-secondary/10 dark:bg-secondary/20 text-foreground px-3 py-1.5 rounded-lg inline-block text-sm font-medium border border-secondary/20 dark:border-secondary/30">
          {getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('dataType', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
            <Database size={14} />
          </div>
          Data Type
          <ArrowUpDown
            size={12}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-lg inline-block text-sm font-medium border border-green-200 dark:border-green-800">
          {formatDataType(getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('description', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
            <FileText size={14} />
          </div>
          Description
          <ArrowUpDown
            size={12}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="text-muted-foreground max-w-md">
          {getValue() || (
            <span className="italic text-muted-foreground/60">
              No description provided
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'delete',
      header: () => (
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <Trash2 size={14} />
          </div>
          DELETE
        </div>
      ),
      cell: ({ row }) => (
        <button
          onClick={() => {
            setParameterToDelete(row.original);
            setShowDeleteModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-all text-sm font-semibold shadow-sm"
          title={`Delete ${row.original.name}`}
        >
          <Trash2 size={14} />
          Delete
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: parameters || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/50 rounded-2xl">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-6"></div>
        <p className="text-foreground font-medium text-lg">
          Loading parameters...
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Please wait while we fetch your data
        </p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-start">
          <div className="mr-4 p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
              Unable to load parameters
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              className="px-4 py-2 bg-card border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg shadow-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              onClick={() => fetchParameters()}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render data table
  return (
    <div className="bg-card text-foreground rounded-lg p-4">
      {parameters.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-2xl p-12">
          <div className="h-24 w-24 mx-auto mb-6 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Tag className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            No Parameters Found
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto text-center mb-8 leading-relaxed">
            Create parameters to define what can be measured in your standards.
            Parameters help establish the criteria for quality control.
          </p>

          <button
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg inline-flex items-center gap-3 font-medium hover:bg-secondary transition-colors"
            onClick={onAddParameterClick}
          >
            <Plus size={18} />
            Create Your First Parameter
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <div className="overflow-x-auto h-full">
              <table className="min-w-full h-full">
                <thead className="bg-muted border-b border-border sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/50 transition-colors duration-200"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 text-sm text-foreground"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag size={14} className="text-primary" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Showing{' '}
                <span className="text-primary font-bold">
                  {table.getRowModel().rows.length}
                </span>{' '}
                parameters
              </p>
            </div>

            <button
              onClick={fetchParameters}
              className="text-base text-muted-foreground flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm hover:shadow-md hover:bg-muted/50 transition-all"
            >
              <RefreshCw size={14} />
              <span className="font-semibold">Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && parameterToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Confirm Deletion
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete the parameter{' '}
              <strong className="text-foreground">"{parameterToDelete.name}"</strong>? This action cannot
              be undone if the parameter is being used in products or batches.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardParameterList;
