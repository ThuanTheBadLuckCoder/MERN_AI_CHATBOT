import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllIndices, getIndexSources } from '../../helper/api-communicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CachedIcon from '@mui/icons-material/Cached';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Type definitions
type Index = {
    index: string;
};

// Updated types based on the actual response from backend
// type Component = {
//     id: string;
//     name: string;
//     description: string;
//     file_format: string;
//     languages: string[];
//     type: string;
//     framework: string;
//     features: string[];
//     responsive: boolean;
//     created_at: string;
//     has_chunks: boolean;
//     chunk_count: number;
//     code?: string; // Full code of the parent component
//     children?: ChildComponent[]; // Array of children
// };

// // Child component type definition - updated to include all needed fields
// type ChildComponent = {
//     id: string;
//     name: string;
//     description: string;
//     source?: string;
//     chunk_id?: string;
//     chunk_index?: number;
//     total_chunks?: number;
//     text?: string; // The content of the child component
// };

// Updated type definitions for the flattened structure
type Document = {
    id: string;
    name: string;
    description: string;
    file_format?: string;
    languages?: string[];
    type?: string;
    framework?: string;
    features?: string[];
    responsive?: boolean;
    created_at?: string;
    is_parent: boolean;
    parent_id?: string | null;
    has_chunks?: boolean;
    chunk_count?: number;
    chunk_id?: string;
    chunk_index?: number;
    total_chunks?: number;
    snippet_type?: string;
    code?: string;
};

type IndexStats = {
    total: number;
    component_types: Array<{key: string, doc_count: number}>;
    frameworks: Array<{key: string, doc_count: number}>;
    file_formats: Array<{key: string, doc_count: number}>;
    languages: Array<{key: string, doc_count: number}>;
    total_parents: number;
    total_children: number;
};

type IndexSourcesResponse = {
    message: string;
    all_documents: Document[];
    stats: IndexStats;
};

const useIndexData = () => {
    const [indexList, setIndexList] = useState<Index[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    const fetchIndices = async () => {
        setIsLoading(true);
        try {
            const data = await getAllIndices();
            setIndexList(data.indices);
        } catch (err) {
            console.error("Error fetching indices:", err);
            toast.error("Error loading indices");
        } finally {
            setIsLoading(false);
        }
    };

    const refreshData = () => {
        setLastUpdate(Date.now());
    };

    useEffect(() => {
        fetchIndices();
    }, [lastUpdate]);

    return { indexList, isLoading, refreshData };
};

const IndexList = () => {
    const { indexList, isLoading, refreshData } = useIndexData();
    const [chosenIndex, setChosenIndex] = useState<string>('');
    const [indexData, setIndexData] = useState<IndexSourcesResponse | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [expandedDocumentId, setExpandedDocumentId] = useState<number | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    const refreshInterval = useRef<NodeJS.Timeout>();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'hierarchical' | 'flat'>('hierarchical');

    // Helper function to truncate descriptions
    const truncateDescription = (desc: string, maxLength = 100) => {
        if (!desc) return '';
        return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    // Truncate description for child components
    const truncateChildDescription = (desc: string) => {
        if (!desc) return '';
        const wordCount = desc.split(/\s+/).length;
        if (wordCount > 300) {
            const words = desc.split(/\s+/).slice(0, 300);
            return words.join(' ') + '...';
        }
        return desc;
    };

    // Set up automatic refresh
    useEffect(() => {
        refreshInterval.current = setInterval(() => {
            refreshData();
        }, 30000); // Refresh every 30 seconds

        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, []);

    // Process the documents from the API response
    useEffect(() => {
        const fetchDetails = async () => {
            if (!chosenIndex) return;
            
            try {
                const data = await getIndexSources(chosenIndex);
                setIndexData(data);
                setDocuments(data.all_documents);
                
                // Reset expanded component when changing index
                setExpandedDocumentId(null);
                
                console.log("data: ", data);
                console.log("Total documents: ", data.all_documents.length);
            } catch (err) {
                console.error("Error loading index details:", err);
                toast.error("Error loading index details");
            }
        };

        fetchDetails();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [chosenIndex]);

    const handleIndexSelect = (index: string) => {
        setChosenIndex(index);
        setDropdownOpen(false);
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            refreshData();
            if (chosenIndex) {
                const data = await getIndexSources(chosenIndex);
                setIndexData(data);
                setDocuments(data.all_documents);
            }
        } catch (err) {
            console.error("Error during manual refresh:", err);
            toast.error("Error refreshing data");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Toggle document expansion
    const toggleDocumentExpansion = (index: number) => {
        if (expandedDocumentId === index) {
            setExpandedDocumentId(null);
        } else {
            setExpandedDocumentId(index);
        }
    };

    // Get child documents for a parent
    const getChildDocuments = (parentId: string) => {
        return documents.filter(doc => doc.parent_id === parentId);
    };

    // Get only parent documents
    const getParentDocuments = () => {
        return documents.filter(doc => doc.is_parent);
    };

    // Toggle between flat and hierarchical view
    const toggleViewMode = () => {
        setViewMode(viewMode === 'hierarchical' ? 'flat' : 'hierarchical');
    };

    // Render statistics if available
    const renderStats = () => {
        if (!indexData || !indexData.stats) return null;
        
        const stats = indexData.stats;
        
        return (
            <div className="mb-4 p-4 border border-green-500 rounded-md bg-green-950/20">
                <h2 className="text-lg font-semibold mb-2">Index Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-950/30 p-3 rounded-md">
                        <div className="text-sm text-gray-400">Total Documents</div>
                        <div className="text-xl font-bold">{stats.total}</div>
                    </div>
                    <div className="bg-green-950/30 p-3 rounded-md">
                        <div className="text-sm text-gray-400">Parent Documents</div>
                        <div className="text-xl font-bold">{stats.total_parents}</div>
                    </div>
                    <div className="bg-green-950/30 p-3 rounded-md">
                        <div className="text-sm text-gray-400">Child Documents</div>
                        <div className="text-xl font-bold">{stats.total_children}</div>
                    </div>
                    <div className="bg-green-950/30 p-3 rounded-md">
                        <div className="text-sm text-gray-400">Languages</div>
                        <div className="text-xl font-bold">{stats.languages.length}</div>
                    </div>
                </div>
            </div>
        );
    };

    // Render expanded document details
    const renderExpandedDocument = (document: Document) => {
        if (!document) return null;
        
        const childDocuments = document.is_parent ? getChildDocuments(document.id) : [];
        
        return (
            <div className="py-4 px-6 bg-green-950/10 border-t border-green-500">
                <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Description</h3>
                    <p className="text-gray-300">{document.description || "No description available."}</p>
                    
                    <div className="mt-3">
                        <h4 className="text-md font-medium mb-1">Full Content</h4>
                        <pre className="bg-gray-900 p-3 rounded-md overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap">
                            {document.code}
                        </pre>
                    </div>
                </div>
                
                {/* Show child documents only if this is a parent */}
                {document.is_parent && childDocuments.length > 0 && (
                    <div>
                        <h3 className="text-lg font-medium mb-2">Child Documents ({childDocuments.length})</h3>
                        <div className="space-y-3">
                            {childDocuments.map((child, idx) => (
                                <div key={idx} className="border border-green-800 rounded-md overflow-hidden">
                                    <div className="bg-green-950/30 p-3">
                                        <h4 className="font-medium">{child.name || `Child ${idx + 1}`}</h4>
                                        <p className="text-sm text-green-400">ID: {child.id}</p>
                                        {child.chunk_id && (
                                            <p className="text-sm text-green-400">Chunk ID: {child.chunk_id}</p>
                                        )}
                                        {child.chunk_index !== undefined && child.total_chunks !== undefined && (
                                            <p className="text-sm text-green-400">
                                                Chunk: {child.chunk_index + 1} of {child.total_chunks}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-400 mt-2">{truncateChildDescription(child.description || "")}</p>
                                    </div>
                                    {child.code && (
                                        <div className="p-3 bg-gray-900">
                                            <pre className="overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap">
                                                {child.code}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='flex flex-col gap-2'>
            {/* Header with dropdown, view mode toggle, and refresh button */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex w-full">
                    <h1 className='border-l border-t border-b border-green-500 rounded-l-md w-fit px-4 flex items-center underline text-lg antialiased font-medium'>
                        Index
                    </h1>
                    <div className='relative flex-grow flex items-center'>
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex-grow bg-green-950 h-10 text-white rounded-r-md font-bold py-2 px-4 border border-green-500 overflow-hidden text-left flex items-center justify-between"
                        >
                            <span className="truncate">{chosenIndex || "Select an Index"}</span>
                            <ExpandMoreIcon className="h-5 w-5" />
                        </button>
                        
                        <button
                            onClick={toggleViewMode}
                            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded h-10 flex items-center"
                            title={viewMode === 'hierarchical' ? "Switch to flat view" : "Switch to hierarchical view"}
                        >
                            {viewMode === 'hierarchical' ? "Hierarchical" : "Flat View"}
                        </button>
                        
                        <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="ml-2 bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white p-2 rounded h-10 flex items-center"
                            title="Refresh list"
                        >
                            <CachedIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        
                        {dropdownOpen && (
                            <ul
                                ref={dropdownRef}
                                className="absolute z-10 w-full top-full mt-1 bg-gray-950 border border-green-500 rounded-md max-h-60 overflow-y-auto"
                            >
                                {indexList.map((indexData, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => handleIndexSelect(indexData.index)}
                                        className="py-2 px-4 hover:bg-green-800 hover:text-white cursor-pointer truncate"
                                    >
                                        {indexData.index || "Unnamed Index"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Display */}
            {chosenIndex && indexData && renderStats()}

            {/* Index details table */}
            {chosenIndex && indexData && (
                <div className='border border-green-500 rounded-md overflow-hidden'>
                    <div className='flex flex-row bg-green-950 sticky top-0'>
                        <div className='flex w-3/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Name</div>
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Id</div>
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Type</div>
                        <div className='flex w-1/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Format</div>
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Date</div>
                        <div className='flex w-1/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>
                            {viewMode === 'hierarchical' ? 'Chunks' : 'Parent'}
                        </div>
                        <div className='flex w-1/12 overflow-hidden px-4 justify-center items-center h-10 font-semibold'>Details</div>
                    </div>
                    
                    <div className='max-h-96 overflow-y-auto'>
                        {documents.length > 0 ? (
                            viewMode === 'hierarchical' ? (
                                // Hierarchical view - only show parents
                                getParentDocuments().map((document, i) => (
                                    <div key={i} className='border-t border-green-500'>
                                        <div className='flex flex-row hover:bg-green-950/30'>
                                            <div className='flex flex-col p-2 w-3/12'>
                                                <div className='font-medium'>{document.name}</div>
                                                <div className='text-sm text-gray-400 truncate' title={document.description}>
                                                    {truncateDescription(document.description)}
                                                </div>
                                            </div>
                                            <div className='flex items-center w-2/12 px-4'>{document.id}</div>
                                            <div className='flex items-center w-2/12 px-4'>{document.type}</div>
                                            <div className='flex items-center w-1/12 px-4'>{document.file_format}</div>
                                            <div className='flex items-center w-2/12 px-4 text-sm'>{formatDate(document.created_at || '')}</div>
                                            <div className='flex items-center w-1/12 px-4 justify-center'>
                                                <span className='bg-green-800 text-white rounded-full px-2 py-1 text-xs'>
                                                    {getChildDocuments(document.id).length || document.chunk_count || 0}
                                                </span>
                                            </div>
                                            <div className='flex items-center w-1/12 px-4 justify-center'>
                                                <button
                                                    onClick={() => toggleDocumentExpansion(i)}
                                                    className="bg-green-800 hover:bg-green-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                                                    title={expandedDocumentId === i ? "Hide details" : "Show details"}
                                                >
                                                    {expandedDocumentId === i ? (
                                                        <KeyboardArrowUpIcon className="h-5 w-5" />
                                                    ) : (
                                                        <KeyboardArrowDownIcon className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {expandedDocumentId === i && renderExpandedDocument(document)}
                                    </div>
                                ))
                            ) : (
                                // Flat view - show all documents with parent/child indicator
                                documents.map((document, i) => (
                                    <div key={i} className='border-t border-green-500'>
                                        <div className={`flex flex-row hover:bg-green-950/30 ${document.is_parent ? '' : 'bg-gray-900/20'}`}>
                                            <div className='flex flex-col p-2 w-3/12'>
                                                <div className='font-medium'>
                                                    {document.is_parent ? document.name : `${document.name} (Child)`}
                                                </div>
                                                <div className='text-sm text-gray-400 truncate' title={document.description}>
                                                    {truncateDescription(document.description)}
                                                </div>
                                            </div>
                                            <div className='flex items-center w-2/12 px-4'>{document.id}</div>
                                            <div className='flex items-center w-2/12 px-4'>{document.type || document.snippet_type || '-'}</div>
                                            <div className='flex items-center w-1/12 px-4'>{document.file_format || '-'}</div>
                                            <div className='flex items-center w-2/12 px-4 text-sm'>{formatDate(document.created_at || '')}</div>
                                            <div className='flex items-center w-1/12 px-4 justify-center'>
                                                {document.is_parent ? (
                                                    <span className='bg-green-800 text-white rounded-full px-2 py-1 text-xs'>
                                                        {getChildDocuments(document.id).length || document.chunk_count || 0}
                                                    </span>
                                                ) : (
                                                    <span className='bg-blue-800 text-white rounded-full px-2 py-1 text-xs' title="Parent ID">
                                                        {document.parent_id?.substring(0, 4) || '-'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='flex items-center w-1/12 px-4 justify-center'>
                                                <button
                                                    onClick={() => toggleDocumentExpansion(i)}
                                                    className="bg-green-800 hover:bg-green-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                                                    title={expandedDocumentId === i ? "Hide details" : "Show details"}
                                                >
                                                    {expandedDocumentId === i ? (
                                                        <KeyboardArrowUpIcon className="h-5 w-5" />
                                                    ) : (
                                                        <KeyboardArrowDownIcon className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {expandedDocumentId === i && renderExpandedDocument(document)}
                                    </div>
                                ))
                            )
                        ) : (
                            <div className='p-4 text-center text-gray-400'>No documents found in this index</div>
                        )}
                    </div>
                </div>
            )}

            {/* No index selected message */}
            {!chosenIndex && (
                <div className='border border-green-500 rounded-md p-6 text-center text-gray-400'>
                    Select an index to view documents
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
                    <div className='bg-green-950 p-4 rounded-md'>Loading...</div>
                </div>
            )}
        </div>
    );
};

export default IndexList;