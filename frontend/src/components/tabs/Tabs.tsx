import React, { useState, ReactElement, CSSProperties, useEffect } from 'react';
import toast from 'react-hot-toast';
import SyntaxHighlighter from 'react-syntax-highlighter';
import SandboxRenderer from '../chat/SandboxRenderer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import '../styles/custom-color.css';
import CodeIcon from '@mui/icons-material/Code';
import CodeOffIcon from '@mui/icons-material/CodeOff';

type ThemeStyles = { [key: string]: CSSProperties };

interface TabProps {
    children: React.ReactNode;
    title: string;
}

interface TabsProps {
    children: ReactElement<TabProps>[] | ReactElement<TabProps>;
    activeTab?: number;
    onTabChange?: (index: number) => void;
    name: string;
    content: string;
}

interface TabChatItems {
    language: string | null;
    content: string
}

interface CodeBlockProps {
    language: string | null;
    content: string;
}

const vsCodeTheme: ThemeStyles = {
    'hljs': {
        display: 'block',
        overflowX: 'auto' as const,
        padding: '1em',
        backgroundColor: '#1E1E1E', // VS Code's background color
        color: '#D4D4D4' // Default text color
    },
    'hljs-keyword': {
        color: '#C586C0', // Keywords (like 'function', 'return')
    },
    'hljs-string': {
        color: '#CE9178', // Strings
    },
    'hljs-comment': {
        color: '#6A9955', // Comments
    },
    'hljs-function': {
        color: '#DCDCAA', // Function names
    },
    'hljs-number': {
        color: '#B5CEA8', // Numbers
    },
    'hljs-class': {
        color: '#4EC9B0', // Class names
    },
    'hljs-variable': {
        color: '#9CDCFE', // Variables
    },
    'hljs-operator': {
        color: '#D4D4D4', // Operators (like '+', '=', etc.)
    },
    'hljs-property': {
        color: '#9CDCFE', // Properties
    },
    'hljs-builtin': {
        color: '#4EC9B0', // Built-in objects/functions
    },
    'hljs-regex': {
        color: '#D16969', // Regular expressions
    },
    'hljs-tag': {
        color: '#569CD6', // Tags (HTML/XML)
    },
    'hljs-name': {
        color: '#569CD6', // Tag names (HTML/XML)
    },
    'hljs-attr': {
        color: '#9CDCFE', // Attributes
    },
    'hljs-value': {
        color: '#CE9178', // Attribute values
    },
    'hljs-punctuation': {
        color: '#D4D4D4', // Punctuation
    },
    'hljs-template-variable': {
        color: '#9CDCFE', // Template literals
    },
    'hljs-section': {
        color: '#569CD6', // Section headers (Markdown)
    },
    'hljs-attribute': {
        color: '#9CDCFE', // CSS properties
    },
    'hljs-literal': {
        color: '#D7BA7D', // CSS literals (e.g., `true`, `false`)
    },
    'hljs-selector': {
        color: '#D7BA7D', // CSS selectors
    },
    'hljs-meta': {
        color: '#569CD6', // Metadata (e.g., `@import`, `@media`)
    },
    'hljs-meta-keyword': {
        color: '#D4D4D4', // Meta keywords, often used in metadata and directives
    },
    'hljs-type': {
        color: '#4EC9B0', // Types (TypeScript)
    },
    'hljs-strong': {
        color: '#569CD6', // Bold text
        fontWeight: 'bold'
    },
    'hljs-emphasis': {
        color: '#D4D4D4', // Italic text
        fontStyle: 'italic'
    }
};

const getCodeContentName = (content: string, language: string | null): string => {
    // Default fallback name
    let name = "code";

    // Normalize content for easier searching
    const normalizedContent = content.toLowerCase().trim();

    // Check language-specific patterns
    switch (language?.toLowerCase()) {
        case 'html':
            // Look for title tag content
            const titleMatch = content.match(/<title>(.*?)<\/title>/);
            if (titleMatch) {
                name = titleMatch[1].trim();
            } else {
                // Look for first heading
                const h1Match = content.match(/<h1>(.*?)<\/h1>/);
                name = h1Match ? h1Match[1].trim() : "html-preview";
            }
            break;

        case 'javascript':
            // Look for class declarations
            const jsClassMatch = content.match(/class\s+(\w+)/);
            if (jsClassMatch) {
                name = jsClassMatch[1];
            } else {
                // Look for function declarations
                const jsFunctionMatch = content.match(/function\s+(\w+)/);
                if (jsFunctionMatch) {
                    name = jsFunctionMatch[1];
                } else {
                    // Look for React component declarations
                    const jsComponentMatch = content.match(/const\s+(\w+)\s*=\s*\(?.*=>|class\s+(\w+)\s+extends\s+react/i);
                    name = jsComponentMatch ? (jsComponentMatch[1] || jsComponentMatch[2]) : "javascript";
                }
            }
            break;

        case 'typescript':
            // Look for class declarations
            const tsClassMatch = content.match(/class\s+(\w+)/);
            if (tsClassMatch) {
                name = tsClassMatch[1];
            } else {
                // Look for function declarations
                const tsFunctionMatch = content.match(/function\s+(\w+)/);
                if (tsFunctionMatch) {
                    name = tsFunctionMatch[1];
                } else {
                    // Look for React component declarations
                    const tsComponentMatch = content.match(/const\s+(\w+)\s*=\s*\(?.*=>|class\s+(\w+)\s+extends\s+react/i);
                    name = tsComponentMatch ? (tsComponentMatch[1] || tsComponentMatch[2]) : "typescript";
                }
            }
            break;

        case 'css':
            // Look for first major selector
            const cssMatch = content.match(/([.#][A-Za-z][A-Za-z0-9_-]*)\s*\{/);
            name = cssMatch ? cssMatch[1].replace(/[.#]/, '') + "-styles" : "css-styles";
            break;

        case 'python':
            // Look for class or function definitions
            const pyClassMatch = content.match(/class\s+(\w+)/);
            if (pyClassMatch) {
                name = pyClassMatch[1];
            } else {
                const pyFuncMatch = content.match(/def\s+(\w+)/);
                name = pyFuncMatch ? pyFuncMatch[1] : "python-script";
            }
            break;

        default:
            // Generic content analysis
            if (normalizedContent.includes('<!doctype html') || normalizedContent.includes('<html')) {
                name = "html-document";
            } else if (normalizedContent.includes('package.json')) {
                name = "package-config";
            } else if (normalizedContent.includes('dockerfile')) {
                name = "dockerfile";
            } else if (normalizedContent.includes('readme')) {
                name = "readme";
            }
            break;
    }

    // Clean the name: remove spaces and special characters, and replace with hyphens
    const cleanedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric characters with hyphens
        .replace(/-+/g, '-') // Collapse multiple hyphens
        .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens

    // Map extensions based on language
    const extension = (() => {
        switch (language?.toLowerCase()) {
            case 'javascript': return 'js';
            case 'typescript': return 'ts';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'python': return 'py';
            default: return 'txt';
        }
    })();

    return `${cleanedName}.${extension}`;
};

const Tabs: React.FC<TabsProps> = ({ children, activeTab: controlledActiveTab, onTabChange, name, content }) => {
    const [localActiveTab, setLocalActiveTab] = useState(0);
    const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : localActiveTab;
    const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

    const handleTabChange = (index: number) => {
        if (onTabChange) {
            onTabChange(index);
        } else {
            setLocalActiveTab(index);
        }
    };

    const tabs = React.Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> =>
            React.isValidElement(child) && child.type === Tab
    );

    return (
        <div className="w-full">
            
            {/* Tab Headers */}
            <div className={`flex ${isExpanded ? 'w-full rounded-t-xl' : 'w-fit rounded-xl'} flex-row justify-between items-center border py-1 px-4 bg-green-950 border-green-500 h-12`}>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleExpand}
          className="text-green-500 hover:text-green-400 transition-colors"
        >
          {isExpanded ? <div className='flex flex-row divide-x justify-between items-center gap-2 divide divide-green-500 h-full'><CodeIcon sx={{ fontSize: 20 }} /><h1 className='font-sans font-bold pl-2'>{name}</h1></div> : <div className='flex flex-row divide-x justify-between items-center gap-2 divide-green-500'><CodeOffIcon sx={{ fontSize: 20 }} /><h1 className='font-sans font-bold pl-2'>{name}</h1></div>}
        </button>
        
      </div>
      
      {isExpanded && (
        <div className="flex border rounded-full w-fit border-green-500 bg-emerald-950 overflow-hidden gap-2 px-0.5 py-0.5 mx-2">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              className={`px-2 py-0.5 text-xs font-medium transition-colors duration-200 
                ${activeTab === index 
                  ? 'rounded-full bg-green-500' 
                  : 'rounded-full text-green-500'}`}
            >
              {tab.props.title}
            </button>
          ))}
        </div>
      )}
    </div>

            {/* Tab Content */}
            {isExpanded && (
                <div className="h-fit w-full border-l border-r border-green-400">
                {tabs[activeTab]}
            </div>
            )}
            

            {/* Footer Content */}
            {isExpanded && (
                <div className='flex flex-row justify-between items-center border rounded-b-xl py-1 px-4 bg-green-950 border-green-500 h-12'>
            <p className="flex gap-0.5 items-center font-serif text-xs yellow-custom">
                    <ErrorOutlineIcon
                        sx={{ fontSize: 14, color: 'yellow' }}
                        className="cursor-help"
                    />
                    Codfe can make mistakes. Check important info.
            </p>
            
            <button
                onClick={() => handleCopy(content)}
                className="copy-button text-xs text-blue-500 hover:underline"
                aria-label="Copy code block"
            >
                Copy
            </button>
            
            </div>
            )}
            
        </div>
    );
};

const Tab: React.FC<TabProps> = ({ children }) => {
    return (
        <div className="tab-content">
            {children}
        </div>
    );
};


const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
        toast.success("Copied");
    }).catch(() => {
        toast.error("Failed to copy");
    });
};

const CodeBlock: React.FC<CodeBlockProps> = ({ language, content }) => (
    <div className="w-full">
        {/* <div className="bg-stone-800 px-4 py-2 text-xs font-mono rounded-t-lg flex justify-between items-center">
            {language && <span>{language}</span>}
            <button
                onClick={() => handleCopy(content)}
                className="copy-button text-xs text-blue-500 hover:underline"
                aria-label="Copy code block"
            >
                Copy
            </button>
        </div> */}
        <SyntaxHighlighter
            language={language || "plaintext"}
            style={vsCodeTheme}
            className="w-full !mt-0 !mb-0"
            showLineNumbers={false}
            customStyle={{
                margin: 0,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                background: '#1E1E1E'
            }}>
            {content}
        </SyntaxHighlighter>
    </div>
);

const TabsChatItems: React.FC<TabChatItems> = ({ content, language }) => {
    const [activeTab, setActiveTab] = useState(0); // 0 for "Code", 1 for "Preview"
    const codeName = getCodeContentName(content, language);

    // Automatically switch to the "Preview" tab if the language is HTML
    useEffect(() => {
        if (language === 'html') {
            setActiveTab(1); // Switch to "Preview" tab
        } else {
            setActiveTab(0); // Switch to "Code" tab
        }
    }, [language]); // Only run when language changes

    return (
        <div className='flex'>
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} name={codeName} content={content}>
                <Tab title="Code">
                    <CodeBlock language={language} content={content} />
                </Tab>
                <Tab title="Preview">
                    {language === 'html' ? (
                        <SandboxRenderer content={content} />
                    ) : (
                        <div className="bg-stone-900 rounded-lg text-xl p-4 text-gray-500">Not possible to display this format</div>
                    )}
                </Tab>
            </Tabs>

            

        </div>
    );
};

export default TabsChatItems;