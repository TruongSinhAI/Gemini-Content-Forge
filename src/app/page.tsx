
"use client";

import { useState, type ChangeEvent, useEffect } from 'react';
import Image from 'next/image'; // Import next/image
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, FileText, Settings2, Sparkles, Tags, BookText, Search, UploadCloud, FileUp, Link as LinkIcon, PlusCircle, AlertTriangle, LanguagesIcon, Palette, X, ImageIcon } from "lucide-react";
import { generateArticle, type GenerateArticleInput, type GenerateArticleOutput } from '@/ai/flows/generate-article-flow';
import { suggestTopics, type SuggestTopicsInput } from '@/ai/flows/suggest-topics';
import { performGoogleSearch, type GoogleSearchInput, type SearchResultItem as ApiSearchResultItem } from '@/ai/flows/google-search';
import { generateImage, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image';
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
  const [customContentType, setCustomContentType] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(supportedLanguages[0].value);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormatOption['value']>(outputFormatOptions[0].value);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  const [generatedArticle, setGeneratedArticle] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const customSearchEngineId = process.env.NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID;

    if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
        !customSearchEngineId || customSearchEngineId === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
        setSearchApiWarning("Google Search API Key or CX ID might not be configured. Search functionality may be limited or unavailable.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  }, []);


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
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel" // .xls
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

    setIsLoadingArticle(true);
    setGeneratedArticle('');

    try {
      const input: GenerateArticleInput = {
        keywords: keywords,
        contentType: customContentType,
        language: selectedLanguage,
        uploadedContent: uploadedFileContent || undefined,
        additionalContext: description || undefined,
        outputFormat: selectedOutputFormat,
      };

      const result: GenerateArticleOutput = await generateArticle(input);
      
      if (result && result.article && result.article.trim()) {
        setGeneratedArticle(result.article);
        toast({ title: "Article Generated!", description: "Your content is ready." });
      } else {
        toast({ title: "Empty Response", description: "The AI returned an empty response. Try adjusting your inputs.", variant: "destructive" });
        setGeneratedArticle(''); // Ensure it's cleared
      }

    } catch (error: any) {
      console.error("Error generating article:", error);
      const errorMessage = error.message || "Failed to generate article. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setGeneratedArticle(`--- ERROR ---\n${errorMessage}`); // Display error in output area
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Input Required", description: "Please enter a prompt for image generation.", variant: "destructive" });
      return;
    }
    setIsLoadingImage(true);
    setGeneratedImageDataUri(null);
    try {
      const input: GenerateImageInput = { prompt: imagePrompt };
      const result: GenerateImageOutput = await generateImage(input);
      
      if (result && result.imageDataUri) {
        setGeneratedImageDataUri(result.imageDataUri);
        toast({ title: "Image Generated!", description: "Your image is ready." });
      } else {
        toast({ title: "Image Generation Error", description: "Failed to generate image or received an empty response.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      const errorMessage = error.message || "Failed to generate image. Please try again.";
      toast({ title: "Image Generation Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingImage(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-8 px-4">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-primary">Gemini Content Forge</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          AI-Powered Content & Image Generator for your creative needs.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        {/* Section 1: Topic Suggester */}
        <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="p-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <Lightbulb className="text-accent w-7 h-7" />
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Topic & Keyword Suggester</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Get inspiration! Enter an idea to discover related topics and keywords.
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-idea">Your Initial Idea</Label>
                <Input 
                  id="topic-idea" 
                  placeholder="e.g., sustainable gardening, AI in healthcare" 
                  value={topicIdea} 
                  onChange={(e) => setTopicIdea(e.target.value)} 
                />
              </div>
              <Button onClick={handleSuggestTopics} disabled={isLoadingTopics} className="w-full sm:w-auto">
                {isLoadingTopics ? <Loader2 className="animate-spin mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Suggest Topics
              </Button>
              {suggestedTopicsList.length > 0 && (
                <div className="mt-4 space-y-2 pt-4 border-t">
                  <h3 className="font-semibold text-foreground">Suggested Topics:</h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopicsList.map((topic, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAddTopicToKeywords(topic)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent border-accent/30 rounded-full"
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
          <div className="p-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <Search className="text-accent w-7 h-7" />
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Real-time Web Search</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Find up-to-date information from Google to enrich your content. Fetched content is AI-extracted.
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {searchApiWarning && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p>{searchApiWarning} Ensure GOOGLE_API_KEY and CUSTOM_SEARCH_ENGINE_ID in .env start with NEXT_PUBLIC_.</p>
                  </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="google-search-query">Search Query</Label>
                <div className="flex gap-2">
                  <Input 
                    id="google-search-query" 
                    placeholder="e.g., latest AI advancements, climate change impact 2024" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />
                  <Button onClick={handleSearchGoogle} disabled={isLoadingSearch} aria-label="Search Google">
                    {isLoadingSearch ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3 pt-4 border-t max-h-[30rem] overflow-y-auto">
                  <h3 className="font-semibold text-foreground">Search Results:</h3>
                  <Accordion type="multiple" className="w-full">
                    {searchResults.map((result, index) => (
                      <AccordionItem value={`item-${index}`} key={index} className="bg-card hover:bg-muted/10 transition-colors shadow-sm rounded-lg mb-2 border overflow-hidden">
                        <AccordionTrigger className="p-4 hover:no-underline w-full text-left">
                            <div className="flex-1 space-y-1">
                              <h4 className="font-medium text-primary text-base">{result.title}</h4>
                              <p className="text-sm text-muted-foreground text-ellipsis overflow-hidden line-clamp-2">{result.snippet}</p>
                              <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 pt-1">
                                  <LinkIcon className="w-3 h-3" /> Visit Source
                              </a>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="border-t pt-3 mt-2">
                            {result.fetchedContent && (
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-foreground/80 mb-1">AI Extracted Content:</h5>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto bg-muted/20 p-2.5 rounded-md border">
                                  {result.fetchedContent}
                                </p>
                              </div>
                            )}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleAddSnippetToDescription(result.snippet, result.title, result.fetchedContent)}
                                className="text-accent hover:text-accent-foreground hover:bg-accent/20 px-2 py-1 w-full justify-start text-xs"
                            >
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Snippet & Extracted Content to Context
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
        
        {/* Section 3: Content Generation Setup */}
        <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-muted/30 p-6">
            <div className="flex items-center gap-3 mb-1">
                <Settings2 className="text-accent w-7 h-7" />
                <CardTitle className="text-2xl">Content Generation Setup</CardTitle>
            </div>
            <CardDescription className="ml-10">
              Provide details below to generate your unique content.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keywords" className="flex items-center gap-1.5">
                  <Tags className="w-4 h-4 text-muted-foreground" />
                  Keywords / Topics
                </Label>
                <Input 
                  id="keywords" 
                  placeholder="e.g., digital marketing trends, healthy breakfast recipes" 
                  value={keywords} 
                  onChange={(e) => setKeywords(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground">Comma-separated keywords or topics that define your content.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload-input" className="flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-muted-foreground" />
                  Upload Document (Optional, .txt, .md, .pdf, .xlsx, .xls)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      disabled={isProcessingFile}
                      className={cn(
                        "w-full justify-start text-left font-normal hover:bg-muted/50",
                        uploadedFileName && "border-primary text-primary hover:border-primary/70",
                        !uploadedFileName && "text-muted-foreground" 
                      )}
                  >
                    {isProcessingFile ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    {uploadedFileName || "Choose a file..."}
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
                    <Button variant="ghost" size="icon" onClick={() => {setUploadedFileContent(null); setUploadedFileName(null);}} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9" aria-label="Clear uploaded file">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {uploadedFileName && <p className="text-xs text-primary mt-1">Using: {uploadedFileName}</p>}
                {!uploadedFileName && <p className="text-xs text-muted-foreground mt-1">Upload a text, Markdown, PDF, or Excel file to use as primary reference.</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-1.5">
                  <BookText className="w-4 h-4 text-muted-foreground" />
                  Additional Context / Description (Optional)
                </Label>
                <Textarea 
                  id="description" 
                  placeholder="e.g., An article for beginners about starting an online store. Or, paste snippets from search results here."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">A short description, specific points, or search snippets to include.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-content-type" className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Custom Content Type
                  </Label>
                  <Input 
                    id="custom-content-type" 
                    placeholder="e.g., blog post, technical summary" 
                    value={customContentType} 
                    onChange={(e) => setCustomContentType(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Specify type (e.g., email, poem).</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output-format-select" className="flex items-center gap-1.5">
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

              <div className="space-y-2">
                <Label htmlFor="language-select" className="flex items-center gap-1.5">
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
                <p className="text-xs text-muted-foreground">Choose the language for the generated content.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/30 border-t border-border">
            <Button onClick={handleGenerateArticle} disabled={isLoadingArticle || isProcessingFile} size="lg" className="w-full">
              {(isLoadingArticle || isProcessingFile) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Generate Article
            </Button>
          </CardFooter>
        </Card>

         {/* Section 4: Image Generation */}
        <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-muted/30 p-6">
            <div className="flex items-center gap-3 mb-1">
              <ImageIcon className="text-accent w-7 h-7" />
              <CardTitle className="text-2xl">Image Generation</CardTitle>
            </div>
            <CardDescription className="ml-10">
              Generate an image based on a textual prompt.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-prompt" className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  Image Prompt
                </Label>
                <Input 
                  id="image-prompt" 
                  placeholder="e.g., a futuristic city skyline at sunset, a cat wearing a wizard hat" 
                  value={imagePrompt} 
                  onChange={(e) => setImagePrompt(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground">Describe the image you want to create.</p>
              </div>
              
              {isLoadingImage && (
                <div className="flex flex-col items-center justify-center h-40 border border-dashed rounded-lg p-4 bg-card">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="mt-3 text-md text-muted-foreground">Generating your image...</p>
                </div>
              )}

              {generatedImageDataUri && !isLoadingImage && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-foreground mb-2">Generated Image:</h3>
                  <div className="relative w-full aspect-square max-w-md mx-auto bg-muted/20 rounded-lg overflow-hidden border shadow-inner">
                     <Image 
                        src={generatedImageDataUri} 
                        alt={imagePrompt || "Generated image"} 
                        layout="fill"
                        objectFit="contain"
                        data-ai-hint="generated art"
                      />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/30 border-t border-border">
            <Button onClick={handleGenerateImage} disabled={isLoadingImage} size="lg" className="w-full">
              {isLoadingImage ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Generate Image
            </Button>
          </CardFooter>
        </Card>

        { (isLoadingArticle || generatedArticle) && (
          <Card className="shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-muted/30 p-6">
                <div className="flex items-center gap-3 mb-1">
                    <FileText className="text-accent w-7 h-7" />
                    <CardTitle className="text-2xl">Generated Article</CardTitle>
                </div>
              <CardDescription className="ml-10">
                Review and edit your AI-generated content below.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingArticle && !generatedArticle && (
                 <div className="flex flex-col items-center justify-center h-60 border border-dashed rounded-lg p-8 bg-card">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg text-muted-foreground">Crafting your content...</p>
                    <p className="text-sm text-muted-foreground">This might take a few moments as the AI writes.</p>
                 </div>
              )}
              {generatedArticle && ( 
                <div className="generated-content-output-area min-h-[200px]">
                  {selectedOutputFormat === 'text' && (
                    <Textarea 
                      value={generatedArticle}
                      onChange={(e) => setGeneratedArticle(e.target.value)}
                      rows={18}
                      className="text-base leading-relaxed border-input focus:border-primary bg-background p-4 rounded-md shadow-inner w-full h-auto min-h-[400px]"
                      placeholder="Your generated article will appear here."
                      aria-label="Generated article content"
                      readOnly={isLoadingArticle} 
                    />
                  )}
                  {selectedOutputFormat === 'markdown' && (
                    <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none p-4 border rounded-md bg-muted/20 shadow-inner overflow-auto h-[400px] sm:h-[500px] w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedArticle}</ReactMarkdown>
                    </div>
                  )}
                  {selectedOutputFormat === 'html' && (
                    <div 
                      className="p-4 border rounded-md bg-muted/20 shadow-inner overflow-auto h-[400px] sm:h-[500px] w-full prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: generatedArticle }} 
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mt-16 mb-8 text-center text-muted-foreground text-sm">
        {currentYear !== null && <p>&copy; {currentYear} Gemini Content Forge. All rights reserved.</p>}
        <p>Powered by Generative AI.</p>
      </footer>
    </div>
  );
}

