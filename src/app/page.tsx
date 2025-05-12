
"use client";

import { useState, type ChangeEvent, useEffect } from 'react';
import Image from 'next/image'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Lightbulb, FileText, Settings2, Sparkles, Tags, BookText, Search, UploadCloud, FileUp, Link as LinkIcon, PlusCircle, AlertTriangle, LanguagesIcon, Palette, X, ImageIcon as ImageIconLucide, Copy, Download, Code, Eye, Github } from "lucide-react";
import { generateArticle, type GenerateArticleInput, type GenerateArticleOutput } from '@/ai/flows/generate-article-flow';
import { suggestTopics, type SuggestTopicsInput } from '@/ai/flows/suggest-topics';
import { performGoogleSearch, type GoogleSearchInput, type SearchResultItem as ApiSearchResultItem } from '@/ai/flows/google-search';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface LanguageOption {
  value: string;
  label: string;
}

const supportedLanguages: LanguageOption[] = [
  { value: 'English', label: 'English' },
  { value: 'Vietnamese', label: 'Tiếng Việt' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Korean', label: '한국어' },
  { value: 'Chinese (Simplified)', label: '简体中文' },
];

interface OutputFormatOption {
  value: 'text' | 'markdown' | 'html';
  label: string;
}

const outputFormatOptions: OutputFormatOption[] = [
  { value: 'text', label: 'Plain Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
];

interface SearchResultItem extends ApiSearchResultItem {
  isContentVisible?: boolean;
}

type ModalFontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

const fontSizeClasses: Record<ModalFontSize, { text: string; prose: string }> = {
  sm: { text: 'text-sm', prose: 'prose-sm' },
  base: { text: 'text-base', prose: '' }, // Default prose size
  lg: { text: 'text-lg', prose: 'prose-lg' },
  xl: { text: 'text-xl', prose: 'prose-xl' },
  '2xl': { text: 'text-2xl', prose: 'prose-2xl' },
};


export default function GeminiContentForgePage() {
  const [topicIdea, setTopicIdea] = useState('');
  const [suggestedTopicsList, setSuggestedTopicsList] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchApiWarning, setSearchApiWarning] = useState<string | null>(null);

  const [keywords, setKeywords] = useState('');
  const [description, setDescription] = useState(''); 
  const [customContentType, setCustomContentType] = useState<string>('blog post');
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>('Vietnamese');
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormatOption['value']>('html'); 
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  const [numberOfImages, setNumberOfImages] = useState<number>(1); 

  const [generatedArticle, setGeneratedArticle] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Copy Article");
  const [showRawOutput, setShowRawOutput] = useState(false);

  const [isArticleViewModalOpen, setIsArticleViewModalOpen] = useState(false);
  const [modalFontSize, setModalFontSize] = useState<ModalFontSize>('base');


  const { toast } = useToast();

  useEffect(() => {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const customSearchEngineId = process.env.NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID;

    if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
        !customSearchEngineId || customSearchEngineId === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
        setSearchApiWarning("Google Search API Key or CX ID might not be configured. Search functionality may be limited or unavailable.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  }, []);

  useEffect(() => {
    if (selectedOutputFormat === 'text') {
      setShowRawOutput(false); 
    }
  }, [selectedOutputFormat]);


  const handleSuggestTopics = async () => {
    if (!topicIdea.trim()) {
      toast({ title: "Input Required", description: "Please enter a topic idea.", variant: "destructive" });
      return;
    }
    setIsLoadingTopics(true);
    setSuggestedTopicsList([]);
    try {
      const input: SuggestTopicsInput = { input: topicIdea };
      const result = await suggestTopics(input);
      setSuggestedTopicsList(result.topics || []);
      if (!result.topics || result.topics.length === 0) {
        toast({ title: "No Suggestions", description: "No topics found for your idea. Try a different one!" });
      }
    } catch (error) {
      console.error("Error suggesting topics:", error);
      toast({ title: "Error", description: "Failed to suggest topics. Please try again.", variant: "destructive" });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleAddTopicToKeywords = (topic: string) => {
    setKeywords(prev => prev ? `${prev}, ${topic}`.trim() : topic);
    toast({ title: "Keyword Added", description: `"${topic}" added to keywords.` });
  };

  const handleSearchGoogle = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Input Required", description: "Please enter a search query.", variant: "destructive" });
      return;
    }
    setIsLoadingSearch(true);
    setSearchResults([]);
    setSearchApiWarning(null); 
    try {
      const input: GoogleSearchInput = { query: searchQuery };
      const result = await performGoogleSearch(input);
      setSearchResults((result.results || []).map(item => ({ ...item, isContentVisible: false })));
      if (result.results && result.results.length === 0 && searchQuery.trim() !== "") {
         const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
         const customSearchEngineId = process.env.NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID;
         if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
             !customSearchEngineId || customSearchEngineId === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
            setSearchApiWarning("Google Search API Key or CX ID might not be configured. Search functionality is limited. Please update .env file by adding NEXT_PUBLIC_ prefix to variables.");
            toast({ title: "Configuration Incomplete", description: "Google Search API Key or CX ID is not properly configured.", variant: "destructive" });
         } else {
            toast({ title: "No Results", description: "No search results found for your query." });
         }
      }
    } catch (error: any) {
      console.error("Error searching Google:", error);
      const errorMessage = error.message || "Failed to perform Google search. Please check API key & CX ID configuration in your .env file (ensure they start with NEXT_PUBLIC_).";
      toast({ title: "Search Error", description: errorMessage, variant: "destructive" });
      if (errorMessage.includes("API Key") || errorMessage.includes("CX ID") || errorMessage.includes("configured") || errorMessage.includes("API key not valid")) {
        setSearchApiWarning(errorMessage);
      }
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleAddSnippetToDescription = (snippet: string, title: string, fullContent?: string) => {
    let contentToAdd = `\n\n--- Search Result ---\nTitle: ${title}\nSnippet: ${snippet}`;
    if (fullContent && fullContent.trim() && !fullContent.startsWith("[Failed") && !fullContent.startsWith("[Error") && !fullContent.startsWith("[No")) {
      contentToAdd += `\nFull Extracted Content:\n${fullContent}`;
    }
    contentToAdd += `\n--- End Search Result ---`;

    setDescription(prev => prev ? `${prev}${contentToAdd}` : contentToAdd.trim());
    toast({ title: "Context Added", description: "Search result information added to Additional Context." });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedMimeTypes = [
        "text/plain",
        "text/markdown",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        "application/vnd.ms-excel" 
      ];
      const allowedExtensions = [".txt", ".md", ".pdf", ".xlsx", ".xls"];

      const fileMimeType = file.type;
      const fileNameLower = file.name.toLowerCase();
      const fileExtension = fileNameLower.substring(fileNameLower.lastIndexOf('.'));

      const isAllowedMimeType = allowedMimeTypes.includes(fileMimeType);
      const isAllowedExtension = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

      if (!isAllowedMimeType && !isAllowedExtension) {
         toast({ title: "Invalid File Type", description: "Please upload a .txt, .md, .pdf, .xlsx, or .xls file.", variant: "destructive" });
         if (event.target) event.target.value = ''; 
         return;
      }

      setIsProcessingFile(true);
      setUploadedFileName(file.name);
      setUploadedFileContent(null); 

      try {
        const arrayBuffer = await file.arrayBuffer();

        if (fileMimeType === "application/pdf" || fileExtension === ".pdf") {
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;
          let text = "";
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          }
          setUploadedFileContent(text);
          toast({ title: "File Uploaded", description: `Successfully extracted text from PDF "${file.name}".` });
        
        } else if (
          fileMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          fileMimeType === "application/vnd.ms-excel" ||
          fileExtension === ".xlsx" ||
          fileExtension === ".xls"
        ) {
          const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
          let text = "";
          workbook.SheetNames.forEach(sheetName => {
            text += `--- Sheet: ${sheetName} ---\n`;
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            jsonData.forEach((row: any[]) => {
              text += row.join("\t") + "\n";
            });
            text += "\n";
          });
          setUploadedFileContent(text.trim());
          toast({ title: "File Uploaded", description: `Successfully extracted text from Excel file "${file.name}".` });

        } else { 
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            setUploadedFileContent(text);
            toast({ title: "File Uploaded", description: `Successfully read "${file.name}".` });
          };
          reader.onerror = () => {
            throw new Error("Could not read the file using FileReader.");
          };
          reader.readAsText(file);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast({ title: "File Error", description: `Failed to process uploaded file. ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        setUploadedFileName(null);
        setUploadedFileContent(null);
      } finally {
        setIsProcessingFile(false);
      }
    }
    if (event.target) {
        event.target.value = ''; 
    }
  };


  const handleGenerateArticle = async () => {
    if (!keywords.trim() || !customContentType.trim()) {
      toast({ title: "Input Required", description: "Please provide keywords and a custom content type.", variant: "destructive" });
      return;
    }
    if (!selectedLanguage) {
      toast({ title: "Input Required", description: "Please select an output language.", variant: "destructive" });
      return;
    }
    if (!selectedOutputFormat) {
      toast({ title: "Input Required", description: "Please select an output format.", variant: "destructive" });
      return;
    }
    if (numberOfImages < 0 || numberOfImages > 5) {
        toast({ title: "Invalid Input", description: "Number of images must be between 0 and 5.", variant: "destructive" });
        return;
    }


    setIsLoadingArticle(true);
    setGeneratedArticle('');
    setShowRawOutput(false); 

    try {
      const input: GenerateArticleInput = {
        keywords: keywords,
        contentType: customContentType,
        language: selectedLanguage,
        uploadedContent: uploadedFileContent || undefined,
        additionalContext: description || undefined,
        outputFormat: selectedOutputFormat,
        numberOfImages: numberOfImages,
      };

      const result: GenerateArticleOutput = await generateArticle(input);
      
      if (result && result.article && result.article.trim()) {
        setGeneratedArticle(result.article);
        toast({ title: "Article Generated!", description: "Your content is ready." });
      } else if (result && result.article && result.article.trim() === "") {
        toast({ title: "Empty Response", description: "The AI returned an empty response. Try adjusting your inputs.", variant: "default" });
        setGeneratedArticle(''); 
      } else { 
        toast({ title: "Generation Issue", description: "The AI could not generate content. Try adjusting your inputs.", variant: "destructive" });
        setGeneratedArticle(''); 
      }

    } catch (error: any) {
      console.error("Error generating article:", error);
      const errorMessage = error.message || "Failed to generate article. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setGeneratedArticle(`--- ERROR ---\n${errorMessage}`); 
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const handleCopyArticle = async () => {
    if (!generatedArticle) return;
    try {
      await navigator.clipboard.writeText(generatedArticle);
      setCopyButtonText("Copied!");
      toast({ title: "Copied!", description: "Article content copied to clipboard." });
      setTimeout(() => setCopyButtonText("Copy Article"), 2000);
    } catch (err) {
      console.error('Failed to copy article: ', err);
      toast({ title: "Copy Failed", description: "Could not copy article to clipboard.", variant: "destructive" });
    }
  };

  const handleDownloadArticle = () => {
    if (!generatedArticle) return;

    let mimeType = "text/plain";
    let fileExtension = ".txt";

    switch (selectedOutputFormat) {
      case "markdown":
        mimeType = "text/markdown;charset=utf-8";
        fileExtension = ".md";
        break;
      case "html":
        mimeType = "text/html;charset=utf-8";
        fileExtension = ".html";
        break;
    }

    const blob = new Blob([generatedArticle], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const contentTypeSlug = customContentType.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'generated';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `${contentTypeSlug}-article-${timestamp}${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `Article downloaded as ${a.download}.` });
  };

  const markdownComponents = {
    img: ({ node, src, alt, ...props }: any) => {
      if (!src || src.trim() === "") {
        return alt ? <span className="text-xs text-muted-foreground italic">[Image: {alt} - Not found/loaded]</span> : null;
      }
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={src}
          alt={alt || ""}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            margin: '1em 0',
          }}
          data-ai-hint={alt?.split(" ").slice(0,2).join(" ") || "illustration content"}
          {...props}
        />
      );
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary">Gemini Content Forge</h1>
        <p className="text-muted-foreground mt-2 text-md sm:text-lg">
          AI-Powered Content & Image Generator for your creative needs.
        </p>
      </header>

      <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Inputs & Tools */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
            {/* Section 1: Topic Suggester */}
            <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-4 sm:p-6 bg-card border-b border-border">
                <div className="flex items-center gap-3 mb-1">
                <Lightbulb className="text-accent w-6 h-6 sm:w-7 sm:h-7" />
                <h2 className="text-lg sm:text-xl font-semibold leading-none tracking-tight text-foreground">Topic Suggester</h2>
                </div>
                <p className="text-xs text-muted-foreground ml-9 sm:ml-10">
                Get inspiration! Enter an idea.
                </p>
            </div>
            <div className="p-4 sm:p-6">
                <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="topic-idea" className="text-sm">Your Initial Idea</Label>
                    <Input 
                    id="topic-idea" 
                    placeholder="e.g., sustainable gardening" 
                    value={topicIdea} 
                    onChange={(e) => setTopicIdea(e.target.value)} 
                    />
                </div>
                <Button onClick={handleSuggestTopics} disabled={isLoadingTopics} className="w-full">
                    {isLoadingTopics ? <Loader2 className="animate-spin mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    Suggest Topics
                </Button>
                {suggestedTopicsList.length > 0 && (
                    <div className="mt-3 space-y-1.5 pt-3 border-t">
                    <h3 className="font-medium text-sm text-foreground">Suggestions:</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestedTopicsList.map((topic, index) => (
                        <Button 
                            key={index} 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAddTopicToKeywords(topic)}
                            className="bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/30 rounded-full text-xs px-2.5 py-1"
                        >
                            {topic}
                        </Button>
                        ))}
                    </div>
                    </div>
                )}
                </div>
            </div>
            </Card>

            {/* Section 2: Web Search */}
            <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-4 sm:p-6 bg-card border-b border-border">
                <div className="flex items-center gap-3 mb-1">
                <Search className="text-accent w-6 h-6 sm:w-7 sm:h-7" />
                <h2 className="text-lg sm:text-xl font-semibold leading-none tracking-tight text-foreground">Web Search</h2>
                </div>
                <p className="text-xs text-muted-foreground ml-9 sm:ml-10">
                Find up-to-date info from Google.
                </p>
            </div>
            <div className="p-4 sm:p-6">
                <div className="space-y-4">
                {searchApiWarning && (
                    <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-1.5">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-px" />
                        <p>{searchApiWarning}</p>
                    </div>
                )}
                <div className="space-y-1.5">
                    <Label htmlFor="google-search-query" className="text-sm">Search Query</Label>
                    <div className="flex gap-2">
                    <Input 
                        id="google-search-query" 
                        placeholder="e.g., latest AI advancements" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                    <Button onClick={handleSearchGoogle} disabled={isLoadingSearch} aria-label="Search Google" size="icon" className="w-10 h-10 flex-shrink-0">
                        {isLoadingSearch ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                    </div>
                </div>
                {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2.5 pt-3 border-t max-h-[20rem] overflow-y-auto">
                    <h3 className="font-medium text-sm text-foreground">Search Results:</h3>
                    <Accordion type="multiple" className="w-full">
                        {searchResults.map((result, index) => (
                        <AccordionItem value={`item-${index}`} key={index} className="bg-background hover:bg-muted/20 transition-colors shadow-sm rounded-lg mb-1.5 border overflow-hidden">
                            <AccordionTrigger className="p-3 hover:no-underline w-full text-left text-xs">
                                <div className="flex-1 space-y-0.5">
                                <h4 className="font-medium text-primary">{result.title}</h4>
                                <p className="text-muted-foreground text-ellipsis overflow-hidden line-clamp-2">{result.snippet}</p>
                                <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1 pt-0.5 text-xs">
                                    <LinkIcon className="w-3 h-3" /> Visit Source
                                </a>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                            <div className="border-t pt-2 mt-1.5">
                                {result.fetchedContent && (
                                <div className="mb-2">
                                    <h5 className="text-xs font-semibold text-foreground/80 mb-1">AI Extracted Content:</h5>
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto bg-muted/30 p-2 rounded-md border">
                                    {result.fetchedContent}
                                    </p>
                                </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleAddSnippetToDescription(result.snippet, result.title, result.fetchedContent)}
                                    className="text-accent hover:text-accent-foreground hover:bg-accent/20 px-2 py-1 w-full justify-start text-xs h-auto"
                                >
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add to Context
                                </Button>
                            </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                    </div>
                )}
                </div>
            </div>
            </Card>
        </div>

        {/* Right Column: Content Generation & Output */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Section 3: Content Generation Setup */}
            <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-card p-4 sm:p-6 border-b">
                <div className="flex items-center gap-3 mb-1">
                    <Settings2 className="text-accent w-6 h-6 sm:w-7 sm:h-7" />
                    <CardTitle className="text-lg sm:text-xl text-foreground">Content Generation Setup</CardTitle>
                </div>
                <CardDescription className="ml-9 sm:ml-10 text-xs">
                Provide details to generate your unique content.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <div className="space-y-5">
                <div className="space-y-1.5">
                    <Label htmlFor="keywords" className="flex items-center gap-1.5 text-sm">
                    <Tags className="w-4 h-4 text-muted-foreground" />
                    Keywords / Topics
                    </Label>
                    <Input 
                    id="keywords" 
                    placeholder="e.g., digital marketing trends, healthy breakfast recipes" 
                    value={keywords} 
                    onChange={(e) => setKeywords(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated keywords or topics.</p>
                </div>
                
                <div className="space-y-1.5">
                    <Label htmlFor="file-upload-input" className="flex items-center gap-1.5 text-sm">
                    <UploadCloud className="w-4 h-4 text-muted-foreground" />
                    Upload Document (Optional)
                    </Label>
                    <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => document.getElementById('file-upload-input')?.click()}
                        disabled={isProcessingFile}
                        className={cn(
                            "w-full justify-start text-left font-normal hover:bg-muted/50 text-sm",
                            uploadedFileName && "border-primary text-primary hover:border-primary/70",
                            !uploadedFileName && "text-muted-foreground" 
                        )}
                    >
                        {isProcessingFile ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                        )}
                        {uploadedFileName || "Choose .txt, .md, .pdf, .xlsx, .xls..."}
                    </Button>
                    <Input 
                        id="file-upload-input" 
                        type="file" 
                        accept=".txt,.md,.pdf,.xlsx,.xls,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        onChange={handleFileUpload} 
                        className="hidden" 
                        disabled={isProcessingFile}
                    />
                    {uploadedFileContent && (
                        <Button variant="ghost" size="icon" onClick={() => {setUploadedFileContent(null); setUploadedFileName(null);}} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 flex-shrink-0" aria-label="Clear uploaded file">
                        <X className="h-4 w-4" />
                        </Button>
                    )}
                    </div>
                    {uploadedFileName && <p className="text-xs text-primary mt-1">Using: {uploadedFileName}</p>}
                    {!uploadedFileName && <p className="text-xs text-muted-foreground mt-1">Upload reference material.</p>}
                </div>
                
                <div className="space-y-1.5">
                    <Label htmlFor="description" className="flex items-center gap-1.5 text-sm">
                    <BookText className="w-4 h-4 text-muted-foreground" />
                    Additional Context (Optional)
                    </Label>
                    <Textarea 
                    id="description" 
                    placeholder="e.g., An article for beginners. Or, paste search snippets here."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Notes, description, or search snippets.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                    <Label htmlFor="custom-content-type" className="flex items-center gap-1.5 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Content Type
                    </Label>
                    <Input 
                        id="custom-content-type" 
                        placeholder="e.g., blog post, email" 
                        value={customContentType} 
                        onChange={(e) => setCustomContentType(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">Specify type (e.g., poem).</p>
                    </div>

                    <div className="space-y-1.5">
                    <Label htmlFor="output-format-select" className="flex items-center gap-1.5 text-sm">
                        <Palette className="w-4 h-4 text-muted-foreground" />
                        Output Format
                    </Label>
                    <Select onValueChange={(value: OutputFormatOption['value']) => setSelectedOutputFormat(value)} value={selectedOutputFormat}>
                        <SelectTrigger id="output-format-select" className="w-full">
                        <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                        {outputFormatOptions.map(format => (
                            <SelectItem key={format.value} value={format.value}>
                            {format.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Choose Text, Markdown, or HTML.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="language-select" className="flex items-center gap-1.5 text-sm">
                        <LanguagesIcon className="w-4 h-4 text-muted-foreground" />
                        Output Language
                        </Label>
                        <Select onValueChange={(value: string) => setSelectedLanguage(value)} value={selectedLanguage}>
                        <SelectTrigger id="language-select" className="w-full">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {supportedLanguages.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Choose target language.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="number-of-images" className="flex items-center gap-1.5 text-sm">
                            <ImageIconLucide className="w-4 h-4 text-muted-foreground" />
                            Number of Images (0-5)
                        </Label>
                        <Input
                            id="number-of-images"
                            type="number"
                            min="0"
                            max="5"
                            value={numberOfImages}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setNumberOfImages(Math.max(0, Math.min(5, val)))
                                } else if (e.target.value === '') {
                                    setNumberOfImages(0); 
                                }
                            }}
                            className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">AI will embed relevant images.</p>
                    </div>
                </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 sm:p-6 bg-muted/10 border-t">
                <Button onClick={handleGenerateArticle} disabled={isLoadingArticle || isProcessingFile} size="lg" className="w-full">
                {(isLoadingArticle || isProcessingFile) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Generate Article
                </Button>
            </CardFooter>
            </Card>
            
            { (isLoadingArticle || generatedArticle) && (
            <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-card p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <FileText className="text-accent w-6 h-6 sm:w-7 sm:h-7" />
                        <div>
                            <CardTitle className="text-lg sm:text-xl text-foreground">Generated Article</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Review your AI-generated content.
                            </CardDescription>
                        </div>
                    </div>
                    {(selectedOutputFormat === 'markdown' || selectedOutputFormat === 'html') && generatedArticle && !isLoadingArticle && (
                        <Button variant="outline" size="sm" onClick={() => setShowRawOutput(!showRawOutput)} className="mt-2 sm:mt-0">
                            {showRawOutput ? <Eye className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                            {showRawOutput ? 'View Rendered' : 'View Raw'}
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                {isLoadingArticle && !generatedArticle && (
                    <div className="flex flex-col items-center justify-center h-60 border border-dashed rounded-lg p-4 sm:p-8 bg-muted/20">
                        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary" />
                        <p className="mt-4 text-md sm:text-lg text-muted-foreground">Crafting your content...</p>
                        <p className="text-sm text-muted-foreground">This might take a few moments.</p>
                    </div>
                )}
                {generatedArticle && ( 
                    <div className="generated-content-output-area min-h-[200px]">
                    {selectedOutputFormat === 'text' ? (
                        <Textarea 
                            value={generatedArticle}
                            onChange={(e) => setGeneratedArticle(e.target.value)}
                            rows={18}
                            className="text-sm leading-relaxed font-sans border-input focus:border-primary bg-background p-3 rounded-md shadow-inner w-full h-auto min-h-[300px] sm:min-h-[400px] md:min-h-[500px]"
                            placeholder="Your generated article will appear here."
                            aria-label="Generated article content"
                            readOnly={isLoadingArticle} 
                        />
                    ) : showRawOutput ? (
                        <Textarea 
                            value={generatedArticle}
                            readOnly
                            rows={18}
                            className="text-sm leading-relaxed font-mono border-input focus:border-primary bg-muted/30 p-3 rounded-md shadow-inner w-full h-auto min-h-[300px] sm:min-h-[400px] md:min-h-[500px]"
                            aria-label={`Raw ${selectedOutputFormat} content`}
                        />
                    ) : selectedOutputFormat === 'markdown' ? (
                        <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none p-4 border rounded-md bg-muted/20 shadow-inner overflow-auto h-[300px] sm:h-[400px] md:h-[500px] w-full">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >{generatedArticle}</ReactMarkdown>
                        </div>
                    ) : selectedOutputFormat === 'html' ? (
                        <div 
                            className="p-4 border rounded-md bg-muted/20 shadow-inner overflow-auto h-[300px] sm:h-[400px] md:h-[500px] w-full prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: generatedArticle }} 
                        />
                    ) : null}
                    </div>
                )}
                </CardContent>
                {generatedArticle && !isLoadingArticle && (
                    <CardFooter className="p-4 sm:p-6 bg-muted/10 border-t">
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Button onClick={() => setIsArticleViewModalOpen(true)} variant="outline" className="flex-1">
                            <Eye className="mr-2 h-4 w-4" /> View Article
                        </Button>
                        <Button onClick={handleCopyArticle} variant="outline" className="flex-1">
                            <Copy className="mr-2 h-4 w-4" /> {copyButtonText}
                        </Button>
                        <Button onClick={handleDownloadArticle} variant="outline" className="flex-1">
                            <Download className="mr-2 h-4 w-4" /> Download Article
                        </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
            )}
        </div>
      </main>

      <footer className="mt-12 sm:mt-16 mb-8 text-center text-muted-foreground text-xs sm:text-sm w-full max-w-6xl mx-auto border-t pt-6 sm:pt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p>&copy; {new Date().getFullYear()} Gemini Content Forge.</p>
            <div className="flex items-center gap-1.5">
                <p className="text-muted-foreground">Crafted by</p>
                <a
                    href="https://github.com/TruongSinhAI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline hover:text-primary/80 transition-colors"
                    aria-label="TruongSinhAI's GitHub Profile"
                >
                    <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    TruongSinhAI
                </a>
            </div>
            <p className="text-muted-foreground">Powered by Generative AI.</p>
        </div>
      </footer>

      {/* Article View Modal */}
      <Dialog open={isArticleViewModalOpen} onOpenChange={setIsArticleViewModalOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl w-[95vw] md:w-[90vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <DialogTitle className="text-lg sm:text-xl">View Generated Article</DialogTitle>
                <div className="flex items-center gap-1 mt-2 sm:mt-0">
                    <Button variant={modalFontSize === 'sm' ? "default" : "outline"} size="sm" onClick={() => setModalFontSize('sm')}>S</Button>
                    <Button variant={modalFontSize === 'base' ? "default" : "outline"} size="sm" onClick={() => setModalFontSize('base')}>M</Button>
                    <Button variant={modalFontSize === 'lg' ? "default" : "outline"} size="sm" onClick={() => setModalFontSize('lg')}>L</Button>
                    <Button variant={modalFontSize === 'xl' ? "default" : "outline"} size="sm" onClick={() => setModalFontSize('xl')}>XL</Button>
                    <Button variant={modalFontSize === '2xl' ? "default" : "outline"} size="sm" onClick={() => setModalFontSize('2xl')}>XXL</Button>
                </div>
            </div>
            <DialogDescription className="text-xs sm:text-sm pt-1">
              Adjust text size for better readability. Format: {selectedOutputFormat.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto p-6">
            {selectedOutputFormat === 'text' ? (
              <Textarea
                readOnly
                value={generatedArticle}
                className={cn(
                  "w-full h-full min-h-[calc(80vh-150px)] font-mono bg-transparent border-0 shadow-none resize-none focus-visible:ring-0 p-0",
                  fontSizeClasses[modalFontSize].text
                )}
              />
            ) : (
              <div className={cn(
                  "max-w-none", 
                  selectedOutputFormat === 'html' || selectedOutputFormat === 'markdown' ? `prose dark:prose-invert ${fontSizeClasses[modalFontSize].prose}` : fontSizeClasses[modalFontSize].text
              )}>
                {selectedOutputFormat === 'markdown' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{generatedArticle}</ReactMarkdown>
                ) : selectedOutputFormat === 'html' ? (
                  // Ensure HTML content also gets font size adjustments if not handled by prose
                  <div className={fontSizeClasses[modalFontSize].text} dangerouslySetInnerHTML={{ __html: generatedArticle }} />
                ) : null}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsArticleViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
