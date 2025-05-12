"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, FileText, Settings2, Sparkles, Tags, BookText } from "lucide-react";
import { generateArticle, type GenerateArticleInput } from '@/ai/flows/generate-article';
import { suggestTopics, type SuggestTopicsInput } from '@/ai/flows/suggest-topics';
import { useToast } from "@/hooks/use-toast";

type ContentType = 'blog post' | 'product description' | 'marketing content';
const contentTypes: ContentType[] = ['blog post', 'product description', 'marketing content'];

export default function GeminiContentForgePage() {
  const [topicIdea, setTopicIdea] = useState('');
  const [suggestedTopicsList, setSuggestedTopicsList] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [keywords, setKeywords] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | undefined>(undefined);
  
  const [generatedArticle, setGeneratedArticle] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);

  const { toast } = useToast();

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
    setKeywords(prev => prev ? `${prev}, ${topic}` : topic);
    toast({ title: "Keyword Added", description: `"${topic}" added to keywords.` });
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
        keywords: `${keywords}${description ? ". Additional context: " + description : ""}`,
        contentType: selectedContentType,
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
                      className="bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/30 rounded-full"
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
              <Label htmlFor="description" className="flex items-center gap-1.5">
                <BookText className="w-4 h-4 text-muted-foreground" />
                Brief Description (Optional)
              </Label>
              <Textarea 
                id="description" 
                placeholder="e.g., An article for beginners about starting an online store..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">A short description or specific points to include.</p>
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
            <Button onClick={handleGenerateArticle} disabled={isLoadingArticle} size="lg" className="w-full">
              {isLoadingArticle ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
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
        <p>&copy; {new Date().getFullYear()} Gemini Content Forge. All rights reserved.</p>
        <p>Powered by Generative AI</p>
      </footer>
    </div>
  );
}
