import React, { useEffect, useRef, useState } from 'react';

interface SandboxRendererProps {
  content: string;
}

const SandboxRenderer: React.FC<SandboxRendererProps> = ({ content }) => {
  const [height, setHeight] = useState('auto');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Create the HTML document with improved styling and message passing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script>
            // Enhanced resize observer with minimum height and padding consideration
            window.onload = function() {
              const resizeObserver = new ResizeObserver(entries => {
                const body = entries[0].target;
                // Add extra padding to account for any margin collapse
                const height = body.scrollHeight + 16;
                window.parent.postMessage({ type: 'resize', height }, '*');
              });
              resizeObserver.observe(document.body);
              
              // Initial size calculation
              const initialHeight = document.body.scrollHeight + 16;
              window.parent.postMessage({ type: 'resize', height: initialHeight }, '*');
            }
          </script>
        </head>
        <body>${content}</body>
      </html>
    `;


    // Handle messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize') {
        // Ensure minimum height and add some buffer
        const minHeight = 100;
        const newHeight = Math.max(event.data.height, minHeight);
        setHeight(`${newHeight}px`);
      }
    };

    window.addEventListener('message', handleMessage);

    // Update iframe content
    if (iframeRef.current) {
      iframeRef.current.srcdoc = htmlContent;
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [content]);

  return (
    <div className="relative overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        title="Rendered Content"
        sandbox="allow-scripts allow-same-origin allow-modals"
        className="w-full bg-white"
        style={{ 
          height,
          minHeight: '250px',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
};

export default SandboxRenderer;