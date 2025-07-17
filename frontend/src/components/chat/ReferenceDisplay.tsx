import { Reference } from '../../types/chat';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Code, Link } from 'lucide-react';

interface ReferenceDisplayProps {
  references: Reference[];
  className?: string;
}

const ReferenceDisplay: React.FC<ReferenceDisplayProps> = ({ references, className }) => {
  console.log("reference: ", references);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const toggleReference = (refId: string) => {
    setExpandedRef(prev => prev === refId ? null : refId);
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'component':
        return <Code className="w-4 h-4" />;
      case 'link':
        return <Link className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (!references || references.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        References ({references.length})
      </div>
      
      {references.map((ref) => {
        const isExpanded = expandedRef === ref.id;
        
        return (
          <div
            key={ref.id}
            className="border border-gray-200 dark:border-green-700 rounded-lg bg-white dark:bg-green-900 transition-all duration-200 hover:shadow-md"
          >
            {/* Reference Button/Header */}
            <button
              onClick={() => toggleReference(ref.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-green-950 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 text-green-600 dark:text-green-400">
                  {getIconByType(ref.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {ref.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                    <span className="capitalize">{ref.type}</span>
                    {ref.source && (
                      <>
                        <span>•</span>
                        <span>{ref.source}</span>
                      </>
                    )}
                    {ref.relevanceScore && (
                      <>
                        <span>•</span>
                        <span>{Math.round(ref.relevanceScore * 100)}% relevant</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-2">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-green-100 dark:border-green-700">
                <div className="pt-3 space-y-3">
                  {/* Description */}
                  {ref.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {ref.description}
                      </p>
                    </div>
                  )}

                  {/* Original Code */}
                  {ref.originalCode && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code Preview
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap">
                          {ref.originalCode}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-green-100 dark:border-green-700">
                    <div className="flex items-center space-x-4">
                      {ref.usedAt && (
                        <span>Used: {formatDate(ref.usedAt)}</span>
                      )}
                      {ref.relevanceScore && (
                        <span>Relevance: {Math.round(ref.relevanceScore * 100)}%</span>
                      )}
                    </div>
                    <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {ref.id.substring(0, 8)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReferenceDisplay;