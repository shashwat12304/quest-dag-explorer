import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Printer, Download, Copy, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResearchPlan } from '@/types/dag';
import { toast } from 'sonner';

interface ResearchReportProps {
  report: string;
  title: string;
  currentResearch: ResearchPlan | null;
  onBackToDag: () => void;
}

const ResearchReport = ({ report, title, currentResearch, onBackToDag }: ResearchReportProps) => {
  const [activeTab, setActiveTab] = useState('formatted');

  // Create a simple function to handle printing
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title || 'Research Report'}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
              }
              h1, h2, h3 { color: #1a1a1a; }
              h1 { font-size: 2rem; margin-bottom: 1.5rem; }
              h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; }
              h3 { font-size: 1.2rem; margin-top: 1.5rem; }
              p, ul, ol { margin-bottom: 1rem; }
              a { color: #0070f3; text-decoration: none; }
              a:hover { text-decoration: underline; }
              code {
                background: #f4f4f4;
                padding: 0.2rem 0.4rem;
                border-radius: 3px;
                font-size: 0.9rem;
                font-family: Menlo, Monaco, 'Courier New', monospace;
              }
              pre {
                background: #f4f4f4;
                padding: 1rem;
                border-radius: 5px;
                overflow-x: auto;
              }
              pre code {
                background: none;
                padding: 0;
              }
              blockquote {
                border-left: 4px solid #ddd;
                padding-left: 1rem;
                margin-left: 0;
                color: #666;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 1rem;
              }
              table, th, td {
                border: 1px solid #ddd;
              }
              th, td {
                padding: 0.5rem;
                text-align: left;
              }
              th {
                background-color: #f8f8f8;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              hr {
                border: none;
                border-top: 1px solid #ddd;
                margin: 2rem 0;
              }
              @media print {
                body {
                  font-size: 12pt;
                }
              }
            </style>
          </head>
          <body>
            <h1>${title || 'Research Report'}</h1>
            <p><em>Query: ${currentResearch?.query || ''}</em></p>
            <hr />
            ${report}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error('Could not open print window');
    }
  };

  // Function to download the report as markdown
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([report], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Report downloaded');
  };

  // Function to copy the report to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(report)
      .then(() => toast.success('Report copied to clipboard'))
      .catch(() => toast.error('Failed to copy report'));
  };

  // Function to share the report (basic implementation)
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Research report on: ${currentResearch?.query}`,
        url: window.location.href,
      })
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.log('Error sharing:', error));
    } else {
      toast.error('Web Share API not supported on this browser');
    }
  };

  return (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBackToDag}
            title="Back to Research Graph"
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[220px] sm:max-w-md">
              Research report for: {currentResearch?.query}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 ml-10 sm:ml-0">
          <Button variant="outline" size="icon" onClick={handlePrint} title="Print report" className="h-8 w-8 sm:h-9 sm:w-9">
            <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} title="Download as markdown" className="h-8 w-8 sm:h-9 sm:w-9">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy to clipboard" className="h-8 w-8 sm:h-9 sm:w-9">
            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} title="Share report" className="h-8 w-8 sm:h-9 sm:w-9">
            <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="flex-1 flex flex-col" onValueChange={setActiveTab}>
        <div className="border-b p-1 sm:p-2 px-3 sm:px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="formatted">Formatted Report</TabsTrigger>
            <TabsTrigger value="source">Markdown Source</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="formatted" className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 bg-card/30">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="prose prose-sm md:prose-base dark:prose-invert mx-auto bg-card shadow-lg rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </motion.div>
        </TabsContent>

        <TabsContent value="source" className="flex-1 overflow-auto">
          <motion.pre 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-6 md:p-8 bg-muted/30 font-mono text-xs sm:text-sm h-full overflow-auto"
          >
            <code>{report}</code>
          </motion.pre>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ResearchReport; 