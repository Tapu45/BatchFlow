import React, { useEffect, useState } from "react";
import {
    Search,
    Info,
    User,
    Database,
    FilterIcon as FilterList,
    RefreshCw,
    Activity,
    FileText,
    Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import api, { API_ROUTES } from "../../../utils/api";

interface TransactionLog {
    id: string;
    type: string;
    entity: string;
    entityId: string;
    userId: string;
    description: string;
    createdAt: string;
    user?: { name: string; email: string };
}

const getSummary = (log: TransactionLog) => {
    if (!log.description) return "No description available";
    const lines = log.description.split('\n').filter(line => line.trim());
    if (lines.length === 0) return "No description available";
    const firstLine = lines[0].trim();
    if (firstLine.length > 60) {
        return firstLine.substring(0, 57) + '...';
    }
    return firstLine || `${log.type} operation on ${log.entity}`;
};

const getDetails = (log: TransactionLog) => {
    if (!log.description) return "";
    const lines = log.description.split('\n');
    if (lines.length > 1) {
        return lines.slice(1).join('\n').trim();
    }
    return "";
};

const getTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
        case 'CREATE': return { badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600' };
        case 'UPDATE': return { badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' };
        case 'DELETE': return { badge: 'bg-red-100 text-red-700', icon: 'text-red-600' };
        case 'READ': return { badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-600' };
        default: return { badge: 'bg-gray-100 text-gray-700', icon: 'text-gray-600' };
    }
};

const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
        case 'purchaseorder': return <FileText size={16} />;
        case 'rawmaterialproduct': return <Layers size={16} />;
        case 'user': return <User size={16} />;
        default: return <Database size={16} />;
    }
};

const TransactionalLog: React.FC = () => {
    const [logs, setLogs] = useState<TransactionLog[]>([]);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search) params.search = search;
            if (fromDate) params.from = dayjs(fromDate).startOf("day").toISOString();
            if (toDate) params.to = dayjs(toDate).endOf("day").toISOString();
            const authToken = localStorage.getItem('authToken');
            const res = await api.get(API_ROUTES.RAW.GET_ALL_TRANSACTION_LOGS, {
                params,
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setLogs(res.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setLogs([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSearch = () => {
        fetchLogs();
    };

    const handleReset = () => {
        setSearch("");
        setFromDate("");
        setToDate("");
        setLogs([]);
    };

    return (
        <div className="min-h-screen bg-background p-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="text-primary" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Transaction Logs</h1>
                            <p className="text-xs text-muted-foreground">Monitor system activities and changes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchLogs}
                            disabled={loading}
                            className="p-2 bg-card border border-border/50 rounded-lg hover:bg-muted transition"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 bg-card border border-border/50 rounded-lg hover:bg-muted transition ${showFilters ? 'bg-primary/10' : ''}`}
                            title={showFilters ? "Hide Filters" : "Show Filters"}
                        >
                            <FilterList className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-card border border-border/50 rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row gap-3 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                className="w-full border border-border/50 rounded-lg px-3 py-2 pl-9 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-sm"
                                placeholder="Search transactions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSearch}
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                        >
                            Search
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleReset}
                            className="border border-border/50 text-foreground px-6 py-2 rounded-lg hover:bg-muted/50 transition text-sm font-medium"
                        >
                            Reset
                        </motion.button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden border-t border-border/50 pt-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-sm"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-sm"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card border border-border/50 rounded-lg overflow-hidden"
                style={{
                    background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.02) 0%, transparent 100%)',
                }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity ID</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No transaction logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, index) => {
                                    const typeColor = getTypeColor(log.type);
                                    const hasDetails = getDetails(log).length > 0;

                                    return (
                                        <React.Fragment key={log.id}>
                                            <motion.tr
                                                className="hover:bg-primary/5 transition-colors"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${typeColor.badge}`}>
                                                        {getEntityIcon(log.entity)}
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                                                    {log.entity}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/80 max-w-xs truncate">
                                                    {getSummary(log)}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                                                    {log.user?.name || log.user?.email || log.userId}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/80 whitespace-nowrap text-xs">
                                                    {dayjs(log.createdAt).format("MMM DD, YYYY HH:mm")}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/70 font-mono text-xs whitespace-nowrap">
                                                    {log.entityId.substring(0, 8)}...
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {hasDetails && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                            className="text-primary hover:text-primary/80 transition"
                                                        >
                                                            <Info className="w-4 h-4" />
                                                        </motion.button>
                                                    )}
                                                </td>
                                            </motion.tr>

                                            {/* Expanded details row */}
                                            <AnimatePresence>
                                                {expandedId === log.id && hasDetails && (
                                                    <motion.tr
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="bg-primary/5"
                                                    >
                                                        <td colSpan={7} className="px-4 py-4">
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="bg-card border border-border/50 rounded-lg p-3"
                                                            >
                                                                <div className="text-xs font-semibold text-foreground mb-2">Transaction Details:</div>
                                                                <pre className="text-xs text-foreground/80 bg-background rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                                                                    {getDetails(log)}
                                                                </pre>
                                                            </motion.div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default TransactionalLog;
