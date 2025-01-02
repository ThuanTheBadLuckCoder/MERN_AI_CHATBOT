import React, { useRef, useState, useEffect } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface IndexData {
  index: string;
  content: string;
}

interface IndexSelectorProps {
  indices: IndexData[];
  onSelectIndex: (index: string) => void;
  selectedIndex: string;
}

const IndexSelector: React.FC<IndexSelectorProps> = ({ indices, onSelectIndex, selectedIndex }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectIndex = (index: string) => {
    onSelectIndex(index);
    setDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setDropdownOpen(!dropdownOpen);
        }}
        className="flex w-full bg-green-950 h-10 text-white font-bold py-2 px-4 border border-green-500 rounded-md overflow-hidden text-left">
        <div className="w-5/6 flex flex-row justify-between truncate flex-1">
          {selectedIndex || "Select an Index"}
        </div>
        <ExpandMoreIcon
          sx={{ fontSize: 20 }}
          className="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-white sm:size-4"
        />
      </button>
      {dropdownOpen && (
        <ul
          ref={dropdownRef}
          className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-md max-h-60 overflow-y-auto"
        >
          {indices.map((indexData, idx) => (
            <li
              key={idx}
              onClick={() => handleSelectIndex(indexData.index)}
              className="py-2 px-4 hover:bg-green-500 hover:text-white cursor-pointer truncate"
            >
              {indexData.index || "Unnamed Index"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IndexSelector;