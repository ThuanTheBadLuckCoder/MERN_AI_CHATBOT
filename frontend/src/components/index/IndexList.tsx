import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllIndices, getIndexSources } from '../../helper/api-communicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CachedIcon from '@mui/icons-material/Cached';

// Type definitions
type Index = {
    index: string;
};

// Updated types based on the actual response from backend
type Component = {
    id: string;
    name: string;
    description: string;
    file_format: string;
    languages: string[];
    type: string;
    framework: string;
    features: string[];
    responsive: boolean;
    created_at: string;
    has_chunks: boolean;
    chunk_count: number;
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
    components: Component[];
    stats: IndexStats;
};

// Custom hook for managing index data
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
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    const refreshInterval = useRef<NodeJS.Timeout>();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Set up automatic refresh
    useEffect(() => {
        refreshInterval.current = setInterval(() => {
            refreshData();
        }, 30000); // Refresh every 30 seconds instead of 5

        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, []);

    // Handle index details and dropdown click outside
    useEffect(() => {
        const fetchDetails = async () => {
            if (!chosenIndex) return;
            
            try {
                const data = await getIndexSources(chosenIndex);
                setIndexData(data);
                console.log("data: ", data);
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
            }
        } catch (err) {
            console.error("Error during manual refresh:", err);
            toast.error("Error refreshing data");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Render component statistics if available
    const renderStats = () => {
        if (!indexData || !indexData.stats) return null;
        
        const stats = indexData.stats;
        
        return (
            <div className="mb-4 p-4 border border-green-500 rounded-md bg-green-950/20">
                <h2 className="text-lg font-semibold mb-2">Index Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-950/30 p-3 rounded-md">
                        <div className="text-sm text-gray-400">Total Components</div>
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

    return (
        <div className='flex flex-col gap-2'>
            {/* Header with dropdown and refresh button */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex w-full">
                    <h1 className='border-l border-t border-b border-green-500 rounded-l-md w-fit px-4 flex items-center underline font-serif text-lg antialiased font-medium'>
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
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Framework</div>
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Format</div>
                        <div className='flex w-2/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Date</div>
                        <div className='flex w-1/12 overflow-hidden px-4 justify-left items-center h-10 font-semibold'>Chunks</div>
                    </div>
                    
                    <div className='max-h-96 overflow-y-auto'>
                        {indexData.components.length > 0 ? (
                            indexData.components.map((component, i) => (
                                <div key={i} className='flex flex-row border-t border-green-500 hover:bg-green-950/30'>
                                    <div className='flex flex-col p-2 w-3/12'>
                                        <div className='font-medium'>{component.name}</div>
                                        <div className='text-sm text-gray-400 truncate' title={component.description}>
                                            {truncateDescription(component.description)}
                                        </div>
                                    </div>
                                    <div className='flex items-center w-2/12 px-4'>{component.id}</div>
                                    <div className='flex items-center w-2/12 px-4'>{component.framework}</div>
                                    <div className='flex items-center w-2/12 px-4'>{component.file_format}</div>
                                    <div className='flex items-center w-2/12 px-4 text-sm'>{formatDate(component.created_at)}</div>
                                    <div className='flex items-center w-1/12 px-4 justify-center'>
                                        <span className='bg-green-800 text-white rounded-full px-2 py-1 text-xs'>
                                            {component.chunk_count}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className='p-4 text-center text-gray-400'>No components found in this index</div>
                        )}
                    </div>
                </div>
            )}

            {/* No index selected message */}
            {!chosenIndex && (
                <div className='border border-green-500 rounded-md p-6 text-center text-gray-400'>
                    Select an index to view embedded documents
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