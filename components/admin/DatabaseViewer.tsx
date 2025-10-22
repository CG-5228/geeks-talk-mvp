'use client';
import { useState, useEffect } from 'react';
import { Database, Table, Eye, Plus, Trash2, ChevronLeft, ChevronRight, X, Copy, Check } from 'lucide-react';

interface TableInfo {
  name: string;
  displayName: string;
}

interface Record {
  [key: string]: any;
}

interface DatabaseViewerProps {
  className?: string;
}

export default function DatabaseViewer({ className = '' }: DatabaseViewerProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{table: string, id: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  useEffect(() => {
    fetchTables();
  }, []);
  
  useEffect(() => {
    if (selectedTable) {
      fetchRecords(selectedTable, currentPage);
    }
  }, [selectedTable, currentPage]);
  
  const fetchTables = async () => {
    try {
      const response = await fetch('/api/admin/db/tables');
      const data = await response.json();
      setTables(data.tables);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };
  
  const fetchRecords = async (table: string, page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/db/${table}?page=${page}&limit=50`);
      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        setRecords([]);
        setTotalPages(0);
        setTotalRecords(0);
        return;
      }
      
      setRecords(data.records || []);
      setTotalPages(data.pagination?.pages || 0);
      setTotalRecords(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
      setTotalPages(0);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewRecord = (record: Record) => {
    setSelectedRecord(record);
    setShowRecordModal(true);
  };

  const handleDeleteRecord = async (table: string, recordId: string) => {
    try {
      const response = await fetch(`/api/admin/db/${table}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId })
      });
      
      if (response.ok) {
        // Show success message
        alert('Record deleted successfully!');
        fetchRecords(table, currentPage);
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
        if (showRecordModal) {
          setShowRecordModal(false);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to delete record: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  const confirmDelete = (table: string, id: string) => {
    setRecordToDelete({ table, id });
    setShowDeleteConfirm(true);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };
  
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value.toString();
  };
  
  const getColumnType = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return 'datetime';
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
      return 'string';
    }
    if (typeof value === 'object') return 'json';
    return 'unknown';
  };
  
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-400';
      case 'number': return 'text-blue-400';
      case 'boolean': return 'text-yellow-400';
      case 'datetime': return 'text-purple-400';
      case 'date': return 'text-purple-400';
      case 'json': return 'text-orange-400';
      case 'null': return 'text-white/50';
      default: return 'text-white/70';
    }
  };
  
  if (tables.length === 0) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No tables found</h3>
          <p className="text-white/70">Unable to load database tables.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Database Viewer</h2>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-white/70" />
          <span className="text-white/70 text-sm">Prisma Studio-like Interface</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables Sidebar */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-medium text-white mb-4">Tables</h3>
          <div className="space-y-2">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => {
                  setSelectedTable(table.name);
                  setCurrentPage(1);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTable === table.name
                    ? 'bg-[#00d9ff]/20 border-[#00d9ff]/30 text-[#00d9ff]'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <span className="font-medium">{table.displayName}</span>
                </div>
                <div className="text-xs text-white/50 mt-1">{table.name}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Records Table */}
        <div className="lg:col-span-3">
          {selectedTable ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  {tables.find(t => t.name === selectedTable)?.displayName} Records
                </h3>
                <div className="text-sm text-white/70">
                  {totalRecords} total records
                </div>
              </div>
              
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-white/10 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : records.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        {Object.keys(records[0]).map((key) => (
                          <th key={key} className="text-left py-3 px-4 text-white/70 font-medium">
                            {key}
                          </th>
                        ))}
                        <th className="text-left py-3 px-4 text-white/70 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                          {Object.entries(record).map(([key, value]) => (
                            <td key={key} className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${getTypeColor(getColumnType(value))} bg-white/10`}>
                                  {getColumnType(value)}
                                </span>
                                <span className="text-white text-sm">
                                  {formatValue(value)}
                                </span>
                              </div>
                            </td>
                          ))}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewRecord(record)}
                                className="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => confirmDelete(selectedTable, record.id)}
                                className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                title="Delete record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-white/70">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Table className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No records found</h3>
                  <p className="text-white/70">This table appears to be empty.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Table className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a table</h3>
              <p className="text-white/70">Choose a table from the sidebar to view its records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Details Modal */}
      {showRecordModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1b23] to-[#0f1014] border border-white/20 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/20 bg-gradient-to-r from-[#1a1b23] to-[#0f1014]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#00d9ff] to-[#0099cc] rounded-lg flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    Record Details
                  </h3>
                  <p className="text-white/70 text-sm mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/10 rounded-lg text-xs font-medium">
                      {tables.find(t => t.name === selectedTable)?.displayName}
                    </span>
                    <span className="text-white/50">•</span>
                    <span className="font-mono text-[#00d9ff]">ID: {selectedRecord.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Record Data */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key} className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-xl p-4 hover:border-white/30 transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-[#00d9ff]/20 to-[#0099cc]/20 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-[#00d9ff]">
                            {key.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-white">{key}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(getColumnType(value))} bg-white/10`}>
                          {getColumnType(value)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(formatValue(value), key)}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        title="Copy to clipboard"
                      >
                        {copiedField === key ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-white/90 text-sm break-all">
                      {typeof value === 'object' && value !== null ? (
                        <pre className="whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/10 text-xs font-mono">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                          <span className="font-mono text-sm">{formatValue(value)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20 bg-gradient-to-r from-[#1a1b23] to-[#0f1014]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00d9ff] rounded-full"></div>
                    <span>{Object.keys(selectedRecord).length} fields</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Copy className="h-3 w-3" />
                    <span>Click copy icon to copy values</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRecordModal(false)}
                    className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => confirmDelete(selectedTable, selectedRecord.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 shadow-lg shadow-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && recordToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Record</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this record from the <strong>{tables.find(t => t.name === recordToDelete.table)?.displayName}</strong> table?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0 mt-0.5"></div>
                  <div className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently remove the record and all associated data from the database.
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRecordToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (recordToDelete) {
                    handleDeleteRecord(recordToDelete.table, recordToDelete.id);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
