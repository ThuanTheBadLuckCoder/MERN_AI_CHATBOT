import React, { useEffect, useRef, useState } from 'react';

interface SandboxRendererProps {
  content: string;
}

const SandboxRenderer: React.FC<SandboxRendererProps> = ({ content }) => {
  const [height, setHeight] = useState('500px');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastHeightRef = useRef<number>(500);
  const messageCountRef = useRef<number>(0);

  useEffect(() => {
    // Security: Block nested iframes and prevent recursive content
    let processedContent = content
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '<div class="blocked-iframe">iframe content blocked</div>')
      .replace(/srcdoc=/gi, 'data-blocked-srcdoc=')
      .replace(/postMessage/gi, 'postMessageBlocked');
    
    // Simple one-time message handler for height calculation
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'one-time-height-calc') {
        const newHeight = Math.max(event.data.height, 300);
        
        if (Math.abs(newHeight - lastHeightRef.current) > 5 && 
            messageCountRef.current < 3) {
          lastHeightRef.current = newHeight;
          setHeight(`${newHeight}px`);
        }
        
        messageCountRef.current++;
      }
    };

    window.addEventListener('message', handleMessage);

    // Set content - preserve the entire HTML structure
    if (iframeRef.current) {
      // Add height calculation script to the end of the body
      const scriptToInject = `
        <script>
          window.addEventListener('load', function() {
            setTimeout(() => {
              const height = document.body.scrollHeight;
              window.parent.postMessage({ 
                type: 'one-time-height-calc', 
                height: height
              }, '*');
            }, 300);
          });
        </script>
      `;
      
      // Inject the height calculation script before the closing body tag
      const contentWithScript = processedContent.replace('</body>', `${scriptToInject}</body>`);
      
      iframeRef.current.srcdoc = contentWithScript;
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [content]);

  // Reset message count when content changes
  useEffect(() => {
    messageCountRef.current = 0;
  }, [content]);

  return (
    <div className="sandbox-container">
      <iframe
        ref={iframeRef}
        title="Rendered Content"
        sandbox="allow-scripts allow-same-origin"
        style={{ 
          width: '100%',
          height: height,
          border: '1px solid #eaeaea',
          borderRadius: '4px',
          display: 'block'
        }}
      />
    </div>
  );
};

export default SandboxRenderer;