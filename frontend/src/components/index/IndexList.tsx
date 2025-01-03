import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllIndices, getIndexDetails, getIndexSources } from '../../helper/api-communicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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

const IndexList = () => {
    const [indexList, setIndexList] = useState<Index[]>([]);
    const [chosenIndex, setChosenIndex] = useState<string>('');
    const [detailsIndex, setDetailsIndex] = useState<IndexDetails[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLUListElement | null>(null);

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
                // Get the last part of the path (wildcard)
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

    useLayoutEffect(() => {
        toast.loading("Loading Indices...", { id: 'loadindex' });
        getAllIndices()
            .then((data) => {
                setIndexList(data.indices);
                toast.success("Loaded Indices...", { id: 'loadindex' });
            })
            .catch((err) => {
                console.log(err);
                toast.error("Loading Failed", { id: "loadindex" });
            });
    }, []);

    useEffect(() => {
        if (chosenIndex) {
            toast.loading("Loading Index Details...", { id: 'detailindex' });
            getIndexSources(chosenIndex)
                .then((data) => {
                    console.log("data: ", data.response.aggregations.unique_metadata_sources.buckets);
                    setDetailsIndex(data.response.aggregations.unique_metadata_sources.buckets);
                    toast.success("Successfully Loaded Index Details", { id: 'detailindex' });
                })
                .catch((err) => {
                    console.log(err);
                    toast.error("Error Loading Index Details...", { id: 'detailindex' });
                });
        }

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

    return (
        <div className='flex flex-col gap-2'>
            {/* Dropdown menu */}
            <div className="flex w-full">
                <h1 className='border-l border-t border-b border-green-500 rounded-l-md w-fit px-4 flex items-center underline font-serif text-lg antialiased font-medium'>Index</h1>
                <div className='relative w-full'>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setDropdownOpen(!dropdownOpen);
                        }}
                        className="flex w-full bg-green-950 h-10 text-white font-bold py-2 px-4 border border-green-500 rounded-r-md overflow-hidden text-left">
                        <div className="w-5/6 flex flex-row justify-between truncate flex-1">
                            {chosenIndex || "Select an Index"}
                        </div>
                        <ExpandMoreIcon
                            sx={{ fontSize: 20 }}
                            className="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-white sm:size-4"
                        />
                    </button>
                    {dropdownOpen && (
                        <ul
                            ref={dropdownRef}
                            className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-b-lg max-h-60 overflow-y-auto"
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

            {chosenIndex && (
                <ul className='flex flex-col divide-y border border-green-500 divide-green-500 rounded-md overflow-y-auto h-64'>
                <li id="index-header" className='flex flex-row bg-green-950 sticky top-0'>
                    <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>order_number</div>
                    <div className='flex w-3/6 overflow-hidden px-4 justify-left items-center h-10'>source_name</div>
                    <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>source_type</div>
                    <div className='flex w-1/6 overflow-hidden px-4 justify-left items-center h-10'>doc_count</div>
                </li>
                {detailsIndex.map((detail, i) => {
                    const sourceInfo = processSource(detail.key.metadata_source);
                    return (
                        <li key={i} className='flex flex-row h-10 justify-between'>
                            <div className='flex h-10 justify-left items-center w-1/6 overflow-hidden px-4 my-auto'>{i + 1}</div>
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
                            <div className='flex h-10 justify-left items-center w-1/6 overflow-hidden px-4 my-auto'>{detail.doc_count}</div>
                        </li>
                    );
                })}
            </ul>
            )}
            
        </div>
    );
};

export default IndexList;