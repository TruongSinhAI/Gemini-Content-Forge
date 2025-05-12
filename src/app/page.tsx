"use client";

import { useState, type ChangeEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, FileText, Settings2, Sparkles, Tags, BookText, Search, UploadCloud, FileUp, Link as LinkIcon, PlusCircle, AlertTriangle } from "lucide-react";
import { generateArticle, type GenerateArticleInput } from '@/ai/flows/generate-article';
import { suggestTopics, type SuggestTopicsInput } from '@/ai/flows/suggest-topics';
import { performGoogleSearch, type GoogleSearchInput, type SearchResultItem } from '@/ai/flows/google-search';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ContentType = 'blog post' | 'product description' | 'marketing content';
const contentTypes: ContentType[] = ['blog post', 'product description', 'marketing content'];

export default function GeminiContentForgePage() {
  // Topic Suggestion State
  const [topicIdea, setTopicIdea] = useState('');
  const [suggestedTopicsList, setSuggestedTopicsList] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Google Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchApiWarning, setSearchApiWarning] = useState<string | null>(null);


  // Content Generation State
  const [keywords, setKeywords] = useState('');
  const [description, setDescription] = useState(''); 
  const [selectedContentType, setSelectedContentType] = useState<ContentType | undefined>(undefined);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  const [generatedArticle, setGeneratedArticle] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    // Check for API keys on mount to display warning if not set for Google Search
    // Note: Actual check for process.env values for flows happens server-side.
    // This is a client-side hint. The google-search.ts flow has the actual check.
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const customSearchEngineId = process.env.NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID;

    if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
        !customSearchEngineId || customSearchEngineId === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
        setSearchApiWarning("Google Search API Key or CX ID might not be configured. Search functionality may be limited or unavailable.");
    }
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
    setSearchApiWarning(null); // Clear previous warnings
    try {
      const input: GoogleSearchInput = { query: searchQuery };
      const result = await performGoogleSearch(input);
      setSearchResults(result.results || []);
      if (result.results && result.results.length === 0 && searchQuery.trim() !== "") {
         // Check if it's due to placeholder keys or actual no results
         const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
         const customSearchEngineId = process.env.NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID;
         if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY_HERE' || 
             !customSearchEngineId || customSearchEngineId === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
            setSearchApiWarning("Google Search API Key or CX ID might not be configured. Search functionality is limited. Please update .env file.");
            toast({ title: "Configuration Incomplete", description: "Google Search API Key or CX ID is not properly configured.", variant: "destructive" });
         } else {
            toast({ title: "No Results", description: "No search results found for your query." });
         }
      }
    } catch (error: any) {
      console.error("Error searching Google:", error);
      const errorMessage = error.message || "Failed to perform Google search. Please check API key & CX ID configuration in your .env file.";
      toast({ title: "Search Error", description: errorMessage, variant: "destructive" });
      if (errorMessage.includes("API Key") || errorMessage.includes("CX ID") || errorMessage.includes("configured") || errorMessage.includes("API key not valid")) {
        setSearchApiWarning(errorMessage);
      }
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleAddSnippetToDescription = (snippet: string, title: string) => {
    const newContext = `\n\n--- Search Result ---\nTitle: ${title}\nSnippet: ${snippet}\n--- End Search Result ---`;
    setDescription(prev => prev ? `${prev}${newContext}` : newContext.trim());
    toast({ title: "Context Added", description: "Search result snippet added to Additional Context." });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("text/") && !file.name.endsWith(".md") && file.type !== "text/markdown") {
         toast({ title: "Invalid File Type", description: "Please upload a text-based file (e.g., .txt, .md).", variant: "destructive" });
         event.target.value = ''; 
         return;
      }

      setIsProcessingFile(true);
      setUploadedFileName(file.name);
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setUploadedFileContent(text);
          toast({ title: "File Uploaded", description: `Successfully read "${file.name}".` });
          setIsProcessingFile(false);
        };
        reader.onerror = () => {
          toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive" });
          setIsProcessingFile(false);
          setUploadedFileName(null);
          setUploadedFileContent(null);
        };
        reader.readAsText(file);
      } catch (error) {
        console.error("Error processing file:", error);
        toast({ title: "File Error", description: "Failed to process uploaded file.", variant: "destructive" });
        setIsProcessingFile(false);
        setUploadedFileName(null);
        setUploadedFileContent(null);
      }
    }
     // Reset file input value so the same file can be re-uploaded after clearing
    if (event.target) {
        event.target.value = '';
    }
  };


  const handleGenerateArticle = async () => {
    if (!keywords.trim() || !selectedContentType) {
      toast({
        title: "Input Required",
        description: "Please provide keywords and select a content type.",
        variant: "destructive",
      });
      return;
    }
    setIsLoadingArticle(true);
    setGeneratedArticle('');
    try {
      const input: GenerateArticleInput = {
        keywords: keywords,
        contentType: selectedContentType,
        uploadedContent: uploadedFileContent || undefined,
        additionalContext: description || undefined,
      };
      const result = await generateArticle(input);
      setGeneratedArticle(result.article);
      toast({ title: "Article Generated!", description: "Your content is ready." });
    } catch (error) {
      console.error("Error generating article:", error);
      toast({ title: "Error", description: "Failed to generate article. Please try again.", variant: "destructive" });
    } finally {
      setIsLoadingArticle(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background py-8 px-4">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-primary">Gemini Content Forge</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          AI-Powered Content Generator for your creative needs.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lightbulb className="text-accent w-7 h-7" />
              Topic & Keyword Suggester
            </CardTitle>
            <CardDescription>
              Get inspiration! Enter an idea to discover related topics and keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
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
                      className="bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent-foreground border-accent/30 rounded-full"
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Search className="text-accent w-7 h-7" />
              Real-time Web Search
            </CardTitle>
            <CardDescription>
              Find up-to-date information from Google to enrich your content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
             {searchApiWarning && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>{searchApiWarning} Ensure GOOGLE_API_KEY and CUSTOM_SEARCH_ENGINE_ID are in .env and start with NEXT_PUBLIC_ .</p>
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
                <Button onClick={handleSearchGoogle} disabled={isLoadingSearch}>
                  {isLoadingSearch ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-3 pt-4 border-t max-h-80 overflow-y-auto">
                <h3 className="font-semibold text-foreground">Search Results:</h3>
                {searchResults.map((result, index) => (
                  <Card key={index} className="bg-muted/20 p-3 shadow-sm">
                    <h4 className="font-medium text-primary mb-1">{result.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2 text-ellipsis overflow-hidden max-h-20">{result.snippet}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Visit Source
                        </a>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAddSnippetToDescription(result.snippet, result.title)}
                            className="text-accent hover:text-accent-foreground hover:bg-accent/20 px-2 py-1"
                        >
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add to Context
                        </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Settings2 className="text-accent w-7 h-7" />
              Content Generation Setup
            </CardTitle>
            <CardDescription>
              Provide details below to generate your unique content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
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
                Upload Document (Optional, .txt or .md)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    disabled={isProcessingFile}
                    className={cn("w-full justify-start text-left font-normal", uploadedFileName && "border-primary")}
                >
                  {isProcessingFile ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <FileUp className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  {uploadedFileName || "Choose a file..."}
                </Button>
                <Input 
                  id="file-upload-input" 
                  type="file" 
                  accept=".md,text/markdown,text/plain" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={isProcessingFile}
                />
                {uploadedFileContent && (
                  <Button variant="ghost" size="sm" onClick={() => {setUploadedFileContent(null); setUploadedFileName(null);}} className="text-destructive hover:text-destructive">
                    Clear
                  </Button>
                )}
              </div>
               {uploadedFileName && <p className="text-xs text-primary">Using: {uploadedFileName}</p>}
               {!uploadedFileName && <p className="text-xs text-muted-foreground">Upload a text or Markdown file to use as primary reference for generation.</p>}
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

            <div className="space-y-2">
              <Label htmlFor="content-type" className="flex items-center gap-1.5">
                 <FileText className="w-4 h-4 text-muted-foreground" />
                Content Type
              </Label>
              <Select onValueChange={(value: ContentType) => setSelectedContentType(value)} value={selectedContentType}>
                <SelectTrigger id="content-type" className="w-full">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose the purpose of your content.</p>
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/30">
            <Button onClick={handleGenerateArticle} disabled={isLoadingArticle || isProcessingFile} size="lg" className="w-full">
              {(isLoadingArticle || isProcessingFile) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Generate Article
            </Button>
          </CardFooter>
        </Card>

        { (isLoadingArticle || generatedArticle) && (
          <Card className="shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-muted/30 p-6">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="text-accent w-7 h-7" />
                Generated Article
              </CardTitle>
              <CardDescription>
                Review and edit your AI-generated content below. You can copy it or make changes directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingArticle && !generatedArticle && (
                 <div className="flex flex-col items-center justify-center h-60 border border-dashed rounded-md p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg text-muted-foreground">Crafting your content...</p>
                    <p className="text-sm text-muted-foreground">This might take a few moments.</p>
                 </div>
              )}
              {generatedArticle && (
                <Textarea 
                  value={generatedArticle}
                  onChange={(e) => setGeneratedArticle(e.target.value)}
                  rows={18}
                  className="text-base leading-relaxed border-2 border-input focus:border-primary bg-background p-4 rounded-md shadow-inner"
                  placeholder="Your generated article will appear here."
                  aria-label="Generated article content"
                />
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mt-16 mb-8 text-center text-muted-foreground text-sm">
        {currentYear && <p>&copy; {currentYear} Gemini Content Forge. All rights reserved.</p>}
        <p>Powered by Generative AI.</p>
      </footer>
    </div>
  );
}
