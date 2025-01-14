import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllIndices, getIndexDetails, getIndexSources } from '../../helper/api-communicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CachedIcon from '@mui/icons-material/Cached';


// Type definitions
type Index = {
    index: string;
};

type IndexDetails = {
    doc_count: number;
    key: Key;
};

type Key = {
    metadata_source: string;
}

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
    const [detailsIndex, setDetailsIndex] = useState<IndexDetails[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    const refreshInterval = useRef<NodeJS.Timeout>();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Helper function to determine reader type
    const getReaderType = (source: string) => {
        const fileExtensions = ['docx', 'pdf', 'json'];
        const isFile = fileExtensions.some(ext => source.toLowerCase().endsWith(ext));
        const isUrl = source.toLowerCase().startsWith('http://') || source.toLowerCase().startsWith('https://');

        if (isFile) return 'File Reader';
        if (isUrl) return 'Link Reader';
        return source;
    };

    // Helper function to process source display
    const processSource = (source: string) => {
        const isUrl = source.toLowerCase().startsWith('http://') || source.toLowerCase().startsWith('https://');

        if (isUrl) {
            try {
                const url = new URL(source);
                const pathParts = url.pathname.split('/');
                const wildcard = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || url.hostname;

                return {
                    isLink: true,
                    display: wildcard,
                    fullPath: source
                };
            } catch {
                return {
                    isLink: false,
                    display: source,
                    fullPath: source
                };
            }
        }

        return {
            isLink: false,
            display: source,
            fullPath: source
        };
    };

    // Set up automatic refresh
    useEffect(() => {
        refreshInterval.current = setInterval(() => {
            refreshData();
        }, 5000);

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
                setDetailsIndex(data.response.aggregations.unique_metadata_sources.buckets);
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
                setDetailsIndex(data.response.aggregations.unique_metadata_sources.buckets);
            }
        } catch (err) {
            console.error("Error during manual refresh:", err);
            toast.error("Error refreshing data");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className='flex flex-col gap-2'>
            {/* Header with dropdown and refresh button */}
            <div className="flex justify-between items-center">
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

            {/* Index details table */}
            {chosenIndex && (
                <ul className='flex flex-col divide-y border border-green-500 divide-green-500 rounded-md overflow-y-auto h-64'>
                    <li id="index-header" className='flex flex-row bg-green-950 sticky top-0'>
                        <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>Order</div>
                        <div className='flex w-3/6 overflow-hidden px-4 justify-left items-center h-10'>Source</div>
                        <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>Type</div>
                        <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>Count</div>
                    </li>
                    {detailsIndex.map((detail, i) => {
                        const sourceInfo = processSource(detail.key.metadata_source);
                        return (
                            <li key={i} className='flex flex-row h-10 hover:bg-green-950/30'>
                                <div className='flex h-10 justify-left items-center w-1/6 overflow-hidden px-4 my-auto'>
                                    {i + 1}
                                </div>
                                <div className='flex h-10 justify-left items-center w-3/6 truncate px-4 my-auto'>
                                    {sourceInfo.isLink ? (
                                        <a
                                            href={sourceInfo.fullPath}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-700 underline"
                                        >
                                            {sourceInfo.display}
                                        </a>
                                    ) : (
                                        sourceInfo.display
                                    )}
                                </div>
                                <div className='flex h-10 justify-left items-center w-1/6 overflow-hidden px-4 my-auto'>
                                    {getReaderType(detail.key.metadata_source)}
                                </div>
                                <div className='flex h-10 justify-left items-center w-1/6 overflow-hidden px-4 my-auto'>
                                    {detail.doc_count}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default IndexList;