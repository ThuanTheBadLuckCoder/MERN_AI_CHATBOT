import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllIndices, getIndexSources } from '../../helper/api-communicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CachedIcon from '@mui/icons-material/Cached';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SegmentIcon from '@mui/icons-material/Segment';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';

// Type definitions
type Index = {
    index: string;
};

// Improved Document type definition to match the Elasticsearch structure
type Document = {
    id: string;
    name?: string;
    description?: string;
    file_format?: string;
    languages?: string[];
    type?: string;
    framework?: string;
    features?: string[];
    responsive?: boolean;
    created_at?: string;
    is_parent: boolean;
    parent_id?: string | null;
    has_children?: boolean;
    child_count?: number;
    chunk_id?: string;
    chunk_index?: number;
    total_chunks?: number;
    snippet_type?: string;
    code?: string;
    text?: string; // Added text field which contains the actual code in many cases
    document_id?: string;
    _id?: string; // Added _id field from the raw data
    component_name?: string;
    component_type?: string;
};

// Type for the source with its documents
type MetadataSource = {
    source_name: string;
    doc_count: number;
    documents: Document[];
};

// Response type for the sources endpoint
type MetadataSourcesResponse = {
    message: string;
    metadata_sources: MetadataSource[];
    total_sources: number;
};

const IndexList = () => {
    const [indexList, setIndexList] = useState<Index[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chosenIndex, setChosenIndex] = useState<string>('');
    const [sources, setSources] = useState<MetadataSource[]>([]);
    const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null);
    const [expandedDocumentIds, setExpandedDocumentIds] = useState<Record<string, boolean>>({});
    const [expandedContentTypes, setExpandedContentTypes] = useState<Record<string, 'code' | 'description' | 'info' | 'stats' | null>>({});
    const [showAllChunks, setShowAllChunks] = useState<Record<string, boolean>>({});
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    const refreshInterval = useRef<NodeJS.Timeout>();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);

    // Helper function to truncate descriptions
    const truncateDescription = (desc: string | undefined, maxLength = 100) => {
        if (!desc) return '';
        return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
    };

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    // Fetch all indices
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

    // Refresh data
    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            await fetchIndices();
            if (chosenIndex) {
                await fetchIndexSources(chosenIndex);
            }
        } catch (err) {
            console.error("Error refreshing data:", err);
            toast.error("Failed to refresh data");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Process documents to ensure they have all necessary properties
    const processDocuments = (documents: any[]): Document[] => {
        return documents.map(doc => {
            const metadata = doc._source?.metadata || {};
            const text = doc._source?.text || '';
            
            return {
                id: doc._id || '',
                _id: doc._id || '',
                name: metadata.component_name || 'Unnamed Document',
                description: metadata.description || '',
                file_format: metadata.file_format || '',
                languages: metadata.languages || [],
                type: metadata.component_type || '',
                framework: metadata.framework || '',
                features: metadata.features || [],
                responsive: metadata.responsive || false,
                created_at: metadata.created_at || '',
                is_parent: metadata.is_parent || false,
                parent_id: metadata.parent_id || null,
                has_children: metadata.has_children || metadata.child_count > 0 || false,
                child_count: metadata.child_count || 0,
                chunk_id: metadata.chunk_id || '',
                chunk_index: metadata.chunk_index !== undefined ? metadata.chunk_index : null,
                total_chunks: metadata.total_chunks || 0,
                snippet_type: metadata.snippet_type || '',
                code: metadata.code || text,
                text: text,
                document_id: metadata.document_id || doc._id || '',
                component_name: metadata.component_name || '',
                component_type: metadata.component_type || ''
            };
        })
    };

    // Fetch index sources
    const fetchIndexSources = async (index: string) => {
        setIsLoading(true);
        try {
            const data: MetadataSourcesResponse = await getIndexSources(index);
            console.log("Source data:", data);
            
            // Process each source's documents to ensure all necessary properties
            const processedSources = data.metadata_sources.map(source => ({
                ...source,
                documents: processDocuments(source.documents)
            }));
            
            setSources(processedSources);
            
            // Reset expanded states when changing index
            setExpandedSourceIndex(null);
            setExpandedDocumentIds({});
            setExpandedContentTypes({});
            setShowAllChunks({});
        } catch (err) {
            console.error("Error fetching index sources:", err);
            toast.error("Failed to load index sources");
        } finally {
            setIsLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchIndices();

        // Set up auto-refresh
        refreshInterval.current = setInterval(() => {
            refreshData();
        }, 600000); // Refresh every minute

        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, []);

    // Handle index selection
    useEffect(() => {
        if (chosenIndex) {
            fetchIndexSources(chosenIndex);
        }

        // Handle click outside dropdown
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

    // Toggle source expansion
    const toggleSourceExpansion = (index: number) => {
        setExpandedSourceIndex(expandedSourceIndex === index ? null : index);
    };

    // Toggle document content view
    const toggleDocumentContent = (id: string, contentType: 'code' | 'description' | 'info' | 'stats') => {
        setExpandedDocumentIds(prev => {
            const isCurrentlyExpanded = prev[id] && expandedContentTypes[id] === contentType;
            
            // If it's already expanded with this content type, collapse it
            if (isCurrentlyExpanded) {
                const newExpandedIds = { ...prev };
                delete newExpandedIds[id];
                
                const newContentTypes = { ...expandedContentTypes };
                delete newContentTypes[id];
                
                setExpandedContentTypes(newContentTypes);
                return newExpandedIds;
            } 
            // Otherwise, expand it with the new content type
            else {
                setExpandedContentTypes(prev => ({
                    ...prev,
                    [id]: contentType
                }));
                return {
                    ...prev,
                    [id]: true
                };
            }
        });
    };

    // Toggle showing all chunks for a specific parent
    const toggleAllChunks = (parentId: string) => {
        setShowAllChunks(prev => ({
            ...prev,
            [parentId]: !prev[parentId]
        }));
    };

    // Get parent documents from a source
    const getParentDocuments = (documents: Document[]) => {
        return documents.filter(doc => doc.is_parent);
    };

    // Get child documents for a parent
    const getChildDocuments = (documents: Document[], parentId: string) => {
        return documents.filter(doc => doc.parent_id === parentId);
    };

    // Calculate statistics for visualizations
    const getDocumentTypeStats = () => {
        const stats: Record<string, number> = {};
        
        sources.forEach(source => {
            getParentDocuments(source.documents).forEach(doc => {
                const type = doc.type || doc.component_type || 'Unknown';
                stats[type] = (stats[type] || 0) + 1;
            });
        });
        
        return Object.entries(stats).map(([type, count]) => ({ type, count }));
    };
    
    const getLanguageStats = () => {
        const stats: Record<string, number> = {};
        
        sources.forEach(source => {
            getParentDocuments(source.documents).forEach(doc => {
                if (doc.languages && doc.languages.length > 0) {
                    doc.languages.forEach(lang => {
                        stats[lang] = (stats[lang] || 0) + 1;
                    });
                } else {
                    stats['Unknown'] = (stats['Unknown'] || 0) + 1;
                }
            });
        });
        
        return Object.entries(stats).map(([language, count]) => ({ language, count }));
    };
    
    // This function is declared but not used - for future implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const _getSourceStats = () => {
    //     return sources.map(source => ({
    //         source: source.source_name,
    //         count: source.doc_count
    //     }));
    // };

    const toggleVisualization = () => {
        setShowVisualization(!showVisualization);
    };

    return (
        <div className='flex flex-col gap-2'>
            {/* Header with index selector and refresh button */}
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
                            onClick={refreshData}
                            disabled={isRefreshing}
                            className="ml-2 bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white p-2 rounded h-10 flex items-center"
                            title="Refresh data"
                        >
                            <CachedIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        
                        {sources.length > 0 && (
                            <button
                                onClick={toggleVisualization}
                                className={`ml-2 ${showVisualization ? 'bg-purple-600' : 'bg-purple-500'} hover:bg-purple-600 text-white p-2 rounded h-10 flex items-center`}
                                title="Toggle visualization"
                            >
                                {showVisualization ? <BarChartIcon className="h-5 w-5" /> : <PieChartIcon className="h-5 w-5" />}
                            </button>
                        )}
                        
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

            {/* Visualization Panel */}
            {showVisualization && sources.length > 0 && (
                <div className='border border-purple-500 rounded-md overflow-hidden mb-4'>
                    <div className='bg-purple-900/30 p-4'>
                        <h2 className='text-xl font-semibold mb-4'>Data Visualization</h2>
                        
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {/* Source Distribution */}
                            <div className='bg-gray-900 p-4 rounded-md'>
                                <h3 className='text-lg font-medium mb-3'>Source Distribution</h3>
                                <div className='h-64'>
                                    {sources.map((source, idx) => (
                                        <div key={idx} className='mb-2'>
                                            <div className='flex justify-between text-sm mb-1'>
                                                <span className='truncate'>{source.source_name}</span>
                                                <span>{source.doc_count} docs</span>
                                            </div>
                                            <div className='w-full bg-gray-700 rounded-full h-4'>
                                                <div 
                                                    className='bg-purple-500 h-4 rounded-full' 
                                                    style={{ 
                                                        width: `${(source.doc_count / Math.max(...sources.map(s => s.doc_count))) * 100}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Document Types */}
                            <div className='bg-gray-900 p-4 rounded-md'>
                                <h3 className='text-lg font-medium mb-3'>Document Types</h3>
                                <div className='h-64 flex items-center justify-center'>
                                    <div className='relative w-48 h-48'>
                                        {getDocumentTypeStats().map((item, idx, arr) => {
                                            const total = arr.reduce((sum, curr) => sum + curr.count, 0);
                                            const startAngle = idx === 0 ? 0 : arr.slice(0, idx).reduce((sum, curr) => sum + (curr.count / total) * 360, 0);
                                            const angle = (item.count / total) * 360;
                                            
                                            // Generate a different color for each segment
                                            const hue = (idx * 137) % 360; // Golden angle approximation for good distribution
                                            
                                            return (
                                                <div 
                                                    key={idx}
                                                    className='absolute w-full h-full'
                                                    style={{
                                                        clipPath: `path('M 96 96 L 96 0 A 96 96 0 ${angle > 180 ? 1 : 0} 1 ${
                                                            96 + 96 * Math.cos((startAngle + angle) * Math.PI / 180)
                                                        } ${
                                                            96 + 96 * Math.sin((startAngle + angle) * Math.PI / 180)
                                                        } Z')`,
                                                        transform: `rotate(${startAngle}deg)`,
                                                        backgroundColor: `hsl(${hue}, 70%, 50%)`
                                                    }}
                                                ></div>
                                            );
                                        })}
                                        <div className='absolute inset-0 flex items-center justify-center w-16 h-16 bg-gray-900 rounded-full m-auto'></div>
                                    </div>
                                </div>
                                <div className='grid grid-cols-2 gap-2 mt-4'>
                                    {getDocumentTypeStats().map((item, idx) => {
                                        const hue = (idx * 137) % 360;
                                        return (
                                            <div key={idx} className='flex items-center text-sm'>
                                                <div 
                                                    className='w-3 h-3 mr-2 rounded-sm' 
                                                    style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                                                ></div>
                                                <span className='truncate'>{item.type}</span>
                                                <span className='ml-1 text-gray-400'>({item.count})</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Language Distribution */}
                            <div className='bg-gray-900 p-4 rounded-md'>
                                <h3 className='text-lg font-medium mb-3'>Language Distribution</h3>
                                <div className='h-64'>
                                    {getLanguageStats().map((item, idx) => (
                                        <div key={idx} className='mb-2'>
                                            <div className='flex justify-between text-sm mb-1'>
                                                <span>{item.language}</span>
                                                <span>{item.count}</span>
                                            </div>
                                            <div className='w-full bg-gray-700 rounded-full h-4'>
                                                <div 
                                                    className='bg-green-500 h-4 rounded-full' 
                                                    style={{ 
                                                        width: `${(item.count / Math.max(...getLanguageStats().map(s => s.count))) * 100}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Document Stats */}
                            <div className='bg-gray-900 p-4 rounded-md'>
                                <h3 className='text-lg font-medium mb-3'>Document Statistics</h3>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div className='bg-gray-800 p-3 rounded-md text-center'>
                                        <div className='text-2xl font-bold text-green-500'>
                                            {sources.reduce((sum, source) => sum + source.doc_count, 0)}
                                        </div>
                                        <div className='text-sm text-gray-400'>Total Documents</div>
                                    </div>
                                    <div className='bg-gray-800 p-3 rounded-md text-center'>
                                        <div className='text-2xl font-bold text-blue-500'>
                                            {sources.reduce((sum, source) => 
                                                sum + getParentDocuments(source.documents).length, 0)}
                                        </div>
                                        <div className='text-sm text-gray-400'>Parent Documents</div>
                                    </div>
                                    <div className='bg-gray-800 p-3 rounded-md text-center'>
                                        <div className='text-2xl font-bold text-purple-500'>
                                            {sources.length}
                                        </div>
                                        <div className='text-sm text-gray-400'>Total Sources</div>
                                    </div>
                                    <div className='bg-gray-800 p-3 rounded-md text-center'>
                                        <div className='text-2xl font-bold text-yellow-500'>
                                            {sources.reduce((sum, source) => 
                                                sum + source.documents.filter(doc => !doc.is_parent).length, 0)}
                                        </div>
                                        <div className='text-sm text-gray-400'>Child Documents</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sources and Documents Display */}
            {chosenIndex && sources.length > 0 ? (
                <div className='border border-green-500 rounded-md overflow-hidden'>
                    <div className='max-h-[75vh] overflow-y-auto'>
                        {sources.map((source, sourceIndex) => (
                            <div key={sourceIndex} className='border-b border-green-500 last:border-b-0'>
                                {/* Source Header */}
                                <div 
                                    className='bg-green-950/50 p-4 flex justify-between items-center cursor-pointer hover:bg-green-950/70'
                                    onClick={() => toggleSourceExpansion(sourceIndex)}
                                >
                                    <div>
                                        <h2 className='text-lg font-semibold'>{source.source_name}</h2>
                                    </div>
                                    <button className='p-2 rounded-full hover:bg-green-800'>
                                        {expandedSourceIndex === sourceIndex ? (
                                            <KeyboardArrowUpIcon className="h-6 w-6" />
                                        ) : (
                                            <KeyboardArrowDownIcon className="h-6 w-6" />
                                        )}
                                    </button>
                                </div>
                                
                                {/* Documents within this source */}
                                {expandedSourceIndex === sourceIndex && (
                                    <div className='divide-y divide-green-900'>
                                        {getParentDocuments(source.documents)
                                        .filter(parent => parent.has_children == true)
                                        .map((parent, idx) => {
                                            const childDocuments = getChildDocuments(source.documents, parent.id);
                                            const hasChunks = childDocuments.length > 0;
                                            const showChunks = hasChunks && showAllChunks[parent.id];
                                            const isExpanded = expandedDocumentIds[parent.id];
                                            const contentType = expandedContentTypes[parent.id];
                                            
                                            return (
                                                <div key={idx} className=''>
                                                    {/* Parent Document Row */}
                                                    <div className='p-4 bg-green-950/20 hover:bg-green-950/30'>
                                                        <div className='flex flex-col md:flex-row md:justify-between gap-3'>
                                                            <div className='flex-1'>
                                                                <h3 className='font-medium text-lg flex items-center'>
                                                                    <InsertDriveFileIcon className="mr-2 text-green-500" />
                                                                    {parent.name || parent.component_name || 'Unnamed Document'}
                                                                    {hasChunks && (
                                                                        <span className="ml-2 text-sm font-normal bg-blue-800 text-white px-2 py-1 rounded-full">
                                                                            {childDocuments.length} chunks
                                                                        </span>
                                                                    )}
                                                                </h3>
                                                                <div className='grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm'>
                                                                    <div>
                                                                        <span className='text-gray-400'>ID:</span> {parent.id.substring(0, 12)}...
                                                                    </div>
                                                                    <div>
                                                                        <span className='text-gray-400'>Type:</span> {parent.type || parent.component_type || 'N/A'}
                                                                    </div>
                                                                    <div>
                                                                        <span className='text-gray-400'>Created:</span> {formatDate(parent.created_at)}
                                                                    </div>
                                                                </div>
                                                                <div className='mt-2 text-sm'>
                                                                    <span className='text-gray-400'>Description:</span> {truncateDescription(parent.description, 150)}
                                                                </div>
                                                            </div>
                                                            <div className='flex gap-2'>
                                                                <button
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation();
                                                                        toggleDocumentContent(parent.id, 'info');
                                                                    }}
                                                                    className={`p-2 ${contentType === 'info' && isExpanded ? 'bg-purple-700' : 'bg-purple-900'} hover:bg-purple-700 rounded-md text-white flex items-center gap-1`}
                                                                    title="View Document Info"
                                                                >
                                                                    <InfoIcon className="h-5 w-5" />
                                                                    <span className='hidden md:inline'>Info</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation();
                                                                        toggleDocumentContent(parent.id, 'description');
                                                                    }}
                                                                    className={`p-2 ${contentType === 'description' && isExpanded ? 'bg-blue-700' : 'bg-blue-900'} hover:bg-blue-700 rounded-md text-white flex items-center gap-1`}
                                                                    title="View Description"
                                                                >
                                                                    <DescriptionIcon className="h-5 w-5" />
                                                                    <span className='hidden md:inline'>Description</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation();
                                                                        toggleDocumentContent(parent.id, 'code');
                                                                    }}
                                                                    className={`p-2 ${contentType === 'code' && isExpanded ? 'bg-green-700' : 'bg-green-900'} hover:bg-green-700 rounded-md text-white flex items-center gap-1`}
                                                                    title="View Code"
                                                                >
                                                                    <CodeIcon className="h-5 w-5" />
                                                                    <span className='hidden md:inline'>Code</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation();
                                                                        toggleDocumentContent(parent.id, 'stats');
                                                                    }}
                                                                    className={`p-2 ${contentType === 'stats' && isExpanded ? 'bg-yellow-700' : 'bg-yellow-900'} hover:bg-yellow-700 rounded-md text-white flex items-center gap-1`}
                                                                    title="View Stats"
                                                                >
                                                                    <BarChartIcon className="h-5 w-5" />
                                                                    <span className='hidden md:inline'>Stats</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Expanded Content View */}
                                                    {isExpanded && (
                                                        <div className='p-4 bg-gray-900/50 border-t border-green-900'>
                                                            {/* Document Info Content */}
                                                            {contentType === 'info' && (
                                                                <div className='mb-4'>
                                                                    <h4 className='text-lg font-medium mb-2'>Document Information</h4>
                                                                    <div className='bg-gray-900 p-4 rounded-md text-gray-300'>
                                                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                                            <div>
                                                                                <h5 className='font-medium text-white'>Basic Info</h5>
                                                                                <p><span className='text-gray-400'>ID:</span> {parent.id}</p>
                                                                                <p><span className='text-gray-400'>Name:</span> {parent.name || parent.component_name || 'N/A'}</p>
                                                                                <p><span className='text-gray-400'>Type:</span> {parent.type || parent.component_type || 'N/A'}</p>
                                                                                <p><span className='text-gray-400'>Framework:</span> {parent.framework || 'N/A'}</p>
                                                                                <p><span className='text-gray-400'>Created At:</span> {formatDate(parent.created_at)}</p>
                                                                            </div>
                                                                            <div>
                                                                                <h5 className='font-medium text-white'>Document Structure</h5>
                                                                                <p><span className='text-gray-400'>Is Parent:</span> {parent.is_parent ? 'Yes' : 'No'}</p>
                                                                                <p><span className='text-gray-400'>Has Children:</span> {parent.has_children ? 'Yes' : 'No'}</p>
                                                                                <p><span className='text-gray-400'>Child Count:</span> {parent.child_count}</p>
                                                                                <p><span className='text-gray-400'>Document ID:</span> {parent.document_id || 'N/A'}</p>
                                                                                {parent.parent_id && (
                                                                                    <p><span className='text-gray-400'>Parent ID:</span> {parent.parent_id}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {/* {parent.features && parent.features.length > 0 && (
                                                                            <div className='mt-3'>
                                                                                <h5 className='font-medium text-white'>Features</h5>
                                                                                <div className='flex flex-wrap gap-1 mt-1'>
                                                                                    {parent.features.map((feature, fIdx) => (
                                                                                        <span key={fIdx} className='px-2 py-1 bg-blue-800 text-sm rounded-full'>{feature}</span>
                                                                                    ) : null}
                                                                                </div>
                                                                            </div>
                                                                        )} */}

                                                                        {parent.features && parent.features.length > 0 && (
                                                                            <div className='mt-3'>
                                                                                <h5 className='font-medium text-white'>Features</h5>
                                                                                <div>{parent.features.map((feature, fIdx) => (
                                                                                    <span key={fIdx} className='px-2 py-1 bg-blue-800 text-sm rounded-full'>{feature}</span>
                                                                                ))}</div>
                                                                            </div>
                                                                        )}

                                                                        {parent.languages && parent.languages.length > 0 && (
                                                                            <div className='mt-3'>
                                                                                <h5 className='font-medium text-white'>Languages</h5>
                                                                                <div className='flex flex-wrap gap-1 mt-1'>
                                                                                    {parent.languages.map((lang, lIdx) => (
                                                                                        <span key={lIdx} className='px-2 py-1 bg-green-800 text-sm rounded-full'>{lang}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        
                                                            {/* Description Content */}
                                                            {contentType === 'description' && (
                                                                <div className='mb-4'>
                                                                    <h4 className='text-lg font-medium mb-2'>Full Description</h4>
                                                                    <div className='bg-gray-900 p-4 rounded-md text-gray-300 whitespace-pre-wrap'>
                                                                        {parent.description || 'No description available.'}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Code Content */}
                                                            {contentType === 'code' && (
                                                                <div>
                                                                    <div className='flex justify-between items-center mb-2'>
                                                                        <h4 className='text-lg font-medium'>
                                                                            {hasChunks 
                                                                                ? `Code (Parent + ${childDocuments.length} Chunks)` 
                                                                                : 'Code'}
                                                                        </h4>
                                                                        
                                                                        {/* Show All Chunks Toggle */}
                                                                        {hasChunks && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleAllChunks(parent.id);
                                                                                }}
                                                                                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                                                                                    showChunks ? 'bg-blue-700' : 'bg-blue-900'
                                                                                }`}
                                                                            >
                                                                                <SegmentIcon className="h-4 w-4" />
                                                                                {showChunks ? 'Hide Chunks' : 'Show All Chunks'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Parent Code */}
                                                                    <div className='mb-4'>
                                                                        <h5 className='text-md font-medium mb-1 flex items-center'>
                                                                            <InsertDriveFileIcon className="mr-1 text-green-500" />
                                                                            Parent Document
                                                                        </h5>
                                                                        <pre className='bg-gray-900 p-3 rounded-md overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap'>
                                                                            {parent.code || parent.text || 'No code available.'}
                                                                        </pre>
                                                                    </div>
                                                                    
                                                                    {/* Child Documents Summary (when not showing all chunks) */}
                                                                    {hasChunks && !showChunks && (
                                                                        <div className='mt-4 bg-blue-900/30 p-4 rounded-md border border-blue-800'>
                                                                            <h5 className='text-md font-medium mb-2'>Chunk Information</h5>
                                                                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                                                                                {childDocuments
                                                                                    .sort((a, b) => {
                                                                                    const indexA = a.chunk_index !== undefined && a.chunk_index !== null ? a.chunk_index : 0;
                                                                                    const indexB = b.chunk_index !== undefined && b.chunk_index !== null ? b.chunk_index : 0;
                                                                                    return indexA - indexB;
                                                                                })
                                                                                    .map((child, childIdx) => (
                                                                                        <div key={childIdx} className='bg-blue-950/50 p-3 rounded-md border border-blue-800'>
                                                                                            <h6 className='font-medium flex items-center'>
                                                                                                <span className='bg-blue-700 text-white text-xs px-2 py-1 rounded-full mr-2'>
                                                                                                    {(child.chunk_index !== undefined && child.chunk_index !== null ? child.chunk_index : childIdx) + 1}/{child.total_chunks || childDocuments.length}
                                                                                                </span>
                                                                                                Chunk {(child.chunk_index !== undefined && child.chunk_index !== null ? child.chunk_index : childIdx) + 1}
                                                                                            </h6>
                                                                                            <p className='text-xs text-gray-400 mt-1'>ID: {child.id.substring(0, 8)}...</p>
                                                                                            <p className='text-xs text-gray-400'>Code Length: {(child.code || child.text || '').length} characters</p>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                            <div className='mt-3 text-center'>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleAllChunks(parent.id);
                                                                                    }}
                                                                                    className='px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-md text-sm'
                                                                                >
                                                                                    View All Chunk Contents
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* All Child Documents (Chunks) with Content */}
                                                                    {hasChunks && showChunks && (
                                                                        <div className='mt-6 space-y-4'>
                                                                            <h5 className='text-md font-medium'>All Chunks</h5>
                                                                            {childDocuments
                                                                                .sort((a, b) => {
                                                                                const indexA = a.chunk_index !== undefined && a.chunk_index !== null ? a.chunk_index : 0;
                                                                                const indexB = b.chunk_index !== undefined && b.chunk_index !== null ? b.chunk_index : 0;
                                                                                return indexA - indexB;
                                                                            })
                                                                                .map((child, childIdx) => (
                                                                                    <div key={childIdx} className='border border-blue-800 rounded-md overflow-hidden'>
                                                                                        <div className='bg-blue-950/40 p-2 flex justify-between items-center'>
                                                                                            <div>
                                                                                                <h6 className='font-medium flex items-center'>
                                                                                                    <span className='bg-blue-700 text-white text-xs px-2 py-1 rounded-full mr-2'>
                                                                                                        {(child.chunk_index !== undefined && child.chunk_index !== null ? child.chunk_index : childIdx) + 1}/{child.total_chunks || childDocuments.length}
                                                                                                    </span>
                                                                                                    Chunk {(child.chunk_index !== undefined && child.chunk_index !== null ? child.chunk_index : childIdx) + 1} 
                                                                                                </h6>
                                                                                                <p className='text-xs text-gray-400'>ID: {child.id}</p>
                                                                                                {child.document_id && (
                                                                                                    <p className='text-xs text-gray-400'>Document ID: {child.document_id}</p>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className='text-xs text-gray-400'>
                                                                                                {child.snippet_type || 'Unknown type'}
                                                                                            </div>
                                                                                        </div>
                                                                                        <pre className='bg-gray-900 p-3 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap'>
                                                                                            {child.code || child.text || 'No chunk code available.'}
                                                                                        </pre>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Document Statistics Content */}
                                                            {contentType === 'stats' && (
                                                                <div className='mb-4'>
                                                                    <h4 className='text-lg font-medium mb-2'>Document Statistics</h4>
                                                                    <div className='bg-gray-900 p-4 rounded-md text-gray-300'>
                                                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                                                                            <div className='bg-gray-800 p-3 rounded-md'>
                                                                                <h5 className='font-medium text-white mb-2'>Size Analysis</h5>
                                                                                <div className='space-y-2'>
                                                                                    <p><span className='text-gray-400'>Code Length:</span> {(parent.code || parent.text || '').length} characters</p>
                                                                                    <p><span className='text-gray-400'>Lines of Code:</span> {(parent.code || parent.text || '').split('\n').length}</p>
                                                                                    {hasChunks && (
                                                                                        <p><span className='text-gray-400'>Total Chunks Size:</span> {childDocuments.reduce((sum, doc) => sum + (doc.code || doc.text || '').length, 0)} characters</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className='bg-gray-800 p-3 rounded-md'>
                                                                                <h5 className='font-medium text-white mb-2'>Document Structure</h5>
                                                                                <div className='space-y-2'>
                                                                                    <p><span className='text-gray-400'>Has Children:</span> {hasChunks ? 'Yes' : 'No'}</p>
                                                                                    {hasChunks && (
                                                                                        <>
                                                                                            <p><span className='text-gray-400'>Number of Chunks:</span> {childDocuments.length}</p>
                                                                                            <p><span className='text-gray-400'>Average Chunk Size:</span> {Math.round(childDocuments.reduce((sum, doc) => sum + (doc.code || doc.text || '').length, 0) / childDocuments.length)} characters</p>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {parent.features && parent.features.length > 0 && (
                                                                            <div className='mt-3'>
                                                                                <h5 className='font-medium text-white'>Features</h5>
                                                                                <div className='flex flex-wrap gap-1 mt-1'>
                                                                                    {parent.features.map((feature, fIdx) => (
                                                                                        <span key={fIdx} className='px-2 py-1 bg-blue-800 text-sm rounded-full'>{feature}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : chosenIndex ? (
                <div className='border border-green-500 rounded-md p-6 text-center text-gray-400'>
                    No documents found in this index
                </div>
            ) : (
                <div className='border border-green-500 rounded-md p-6 text-center text-gray-400'>
                    Select an index to view documents
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-green-950 p-6 rounded-md shadow-lg'>
                        <div className='flex items-center'>
                            <CachedIcon className="h-6 w-6 animate-spin mr-3" />
                            <span>Loading...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndexList;