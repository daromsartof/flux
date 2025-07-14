import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Download, Sparkles, X } from 'lucide-react';
import Lottie from 'lottie-react';
import { Input } from './ui/input';
import { loadingAnimation, successAnimation } from '@/lib/constant';
import { getFineTuneResponseFromStorage, getLoraFileUrlFromCookies } from '@/lib/helpers';

type AppState = 'idle' | 'uploaded' | 'generating' | 'success' | 'error';
const apiUrl = import.meta.env.APP_API || "http://localhost:8051"
console.log(apiUrl)
export default function HeadshotGenerator() {
  const [state, setState] = useState<AppState>('idle');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [triggerWorld, setTriggerWorld] = useState<string>("")
  const [resultUrl, setResultUrl] = useState<string>('');
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [imageCount, setImageCount] = useState<string>('1');
  const [customPrompt, setCustomPrompt] = useState<string>('professional corporate business headshot of a person, clean studio lighting, formal attire, natural skin texture, centered composition, blurred neutral background');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [model, setModel] = useState<string | null>(null)
  
  const handleFilesSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length < 3 || fileArray.length > 20) {
      toast({
        title: "Invalid number of files",
        description: "Please select between 3 and 20 images",
        variant: "destructive"
      });
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select only image files",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select images smaller than 10MB each",
          variant: "destructive"
        });
        return;
      }
    }

    setSelectedFiles(fileArray);
    const urls = fileArray.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setState('uploaded');
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  }, [handleFilesSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  }, [handleFilesSelect]);

  const removeFile = useCallback((index: number) => {
    const newFiles = [...selectedFiles];
    const newUrls = [...previewUrls];
    
    URL.revokeObjectURL(newUrls[index]);
    newFiles.splice(index, 1);
    newUrls.splice(index, 1);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
    
    if (newFiles.length === 0) {
      setState('idle');
    }
  }, [selectedFiles, previewUrls]);

  const simulateProgress = useCallback(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    return interval;
  }, []);

  const generateHeadshot = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setState('generating');
    const progressInterval = simulateProgress();

    try {
      const formdata = new FormData();
      selectedFiles.forEach((file) => {
        formdata.append(`files`, file);
      });
      formdata.append("trigger_word", triggerWorld)
      const requestOptions = {
        method: "POST",
        body: formdata,
        redirect: "follow" as RequestRedirect
      };

      const response = await fetch(`${apiUrl}/finetune`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      // Handle successful response
      if (data.status === 'success') {
        // Save diffusers_lora_file URL in cookies
        if (data.result && data.result.diffusers_lora_file && data.result.diffusers_lora_file.url) {
          // Set cookie with 7 days expiration
          const expirationDate = new Date();
          expirationDate.setTime(expirationDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          document.cookie = `diffusers_lora_file_url=${encodeURIComponent(data.result.diffusers_lora_file.url)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;
          setModel(data.result.diffusers_lora_file.url)
        }
        
        // Save entire response in localStorage
        try {
          localStorage.setItem('finetune_response', JSON.stringify(data));
          console.log('Fine-tune response saved to localStorage');
        } catch (storageError) {
          console.warn('Failed to save response to localStorage:', storageError);
        }
      }

      clearInterval(progressInterval)
      setProgress(100)
     /* const result = await response.text();
      const data = JSON.parse(result);

      clearInterval(progressInterval);
      setProgress(100);

      if (data.result_url) {
        setResultUrl(data.result_url);
        // Handle multiple results if returned as array
        if (Array.isArray(data.result_urls)) {
          setResultUrls(data.result_urls);
        } else {
          setResultUrls([data.result_url]);
        }
        setState('success');
        toast({
          title: "Success!",
          description: `Your professional headshots have been generated from ${selectedFiles.length} images`,
        });
      } else {
        throw new Error('No result URL received');
      }*/
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error:', error);
      setState('error');
      toast({
        title: "Generation failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    }
  }, [selectedFiles, simulateProgress, toast, imageCount]);

  const resetApp = useCallback(() => {
    setState('idle');
    setSelectedFiles([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setResultUrl('');
    setResultUrls([]);
    setProgress(0);
    setImageCount('1');
    setCustomPrompt('professional corporate business headshot of a person, clean studio lighting, formal attire, natural skin texture, centered composition, blurred neutral background');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrls]);

  const downloadResult = useCallback(() => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = 'professional-headshot.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [resultUrl]);

  const handleGenerateImage = useCallback(async () => {
    if (!customPrompt) return

    setState("generating")
    const progressInterval = simulateProgress()
    const modelData = getFineTuneResponseFromStorage()
    try {
      const formdata = new FormData()
      formdata.append("prompt", customPrompt)
      formdata.append("path", modelData.result.diffusers_lora_file.url)
      const requestOptions = {
        method: "POST",
        body: formdata,
        redirect: "follow" as RequestRedirect,
      }

      const response = await fetch(`${apiUrl}/headshot`, requestOptions)
      const result = await response.text()
      const data = JSON.parse(result)
      return
      clearInterval(progressInterval)
      setProgress(100)

      if (data.result_url) {
        setResultUrl(data.result_url)
        // Handle multiple results if returned as array
        if (Array.isArray(data.result_urls)) {
          setResultUrls(data.result_urls)
        } else {
          setResultUrls([data.result_url])
        }
        setState("success")
        toast({
          title: "Success!",
          description: `Your professional headshot${
            parseInt(imageCount) > 1 ? "s have" : " has"
          } been generated`,
        })
      } else {
        throw new Error("No result URL received")
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Error:", error)
      setState("error")
      toast({
        title: "Generation failed",
        description: "Please try again or contact support",
        variant: "destructive",
      })
    }
  }, [customPrompt])

  useEffect(() => {
    const model = getLoraFileUrlFromCookies()
    setModel(model);
    
    return () => {
      
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Turn your photos into professional product photos
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload 3-20 images to generate professional headshots.
          </p>
        </div>

        {/* Main Content */}
        <Card className="p-8">
          {state === "idle" && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-upload-border rounded-xl p-12 text-center bg-upload-bg hover:bg-accent/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Drop or select 3-20 images
                </p>
                <p className="text-muted-foreground mb-4">
                  Upload your photos to get started
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              {model && (
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">
                    Customize your prompt
                  </Label>
                  <Textarea
                    id="prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe the style and details you want for your headshot..."
                    className="min-h-20 resize-none"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value="1" disabled>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="1 image" />
                    </SelectTrigger>
                  </Select>
                </div>
                <Button disabled={!model} onClick={handleGenerateImage} className={`${model ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground"}`}>
                  Generate Image
                </Button>
              </div>
            </div>
          )}

          {state === "uploaded" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="rounded-xl overflow-hidden bg-muted aspect-square">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      onClick={() => removeFile(index)}
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {selectedFiles.length} image
                {selectedFiles.length !== 1 ? "s" : ""} selected
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select value={imageCount} onValueChange={setImageCount}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 image</SelectItem>
                        <SelectItem value="2">2 images</SelectItem>
                        <SelectItem value="3">3 images</SelectItem>
                        <SelectItem value="4">4 images</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      type="text"
                      name="trigger_word"
                      defaultValue={"ROMEOERICKA"}
                      onChange={(e) => setTriggerWorld(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={generateHeadshot}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {model ? "Re-train" : "Train"}
                  </Button>
                </div>
                {model && (
                  <div className="flex items-end w-full">
                    <div className="space-y-2 flex-1 me-10">
                      <Label htmlFor="prompt" className="text-sm font-medium">
                        Customize your prompt
                      </Label>
                      <Textarea
                        id="prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe the style and details you want for your headshot..."
                        className="min-h-20 resize-none"
                      />
                    </div>
                    <Button
                      onClick={generateHeadshot}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Generate Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {state === "generating" && (
            <div className="space-y-6 text-center">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-50">
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="rounded-xl overflow-hidden bg-muted aspect-square"
                  >
                    <img
                      src={url}
                      alt={`Processing ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <Lottie animationData={loadingAnimation} loop={true} />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Processing {selectedFiles.length} images...
                  </p>
                  <Progress value={progress} className="w-48 mx-auto" />
                </div>
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <Lottie animationData={successAnimation} loop={false} />
              </div>

              {resultUrls.length > 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultUrls.map((url, index) => (
                    <div
                      key={index}
                      className="rounded-xl overflow-hidden bg-muted flex items-center justify-center p-4"
                    >
                      <img
                        src={url}
                        alt={`Generated headshot ${index + 1}`}
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden bg-muted flex items-center justify-center p-4">
                  <img
                    src={resultUrl}
                    alt="Generated headshot"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={downloadResult}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download {resultUrls.length > 1 ? "All" : ""}
                </Button>
                <Button onClick={resetApp} variant="outline">
                  Generate Another
                </Button>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-6 text-center">
              <div className="text-destructive">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Generation Failed</p>
                <p className="text-muted-foreground mb-6">
                  Something went wrong. Please try again.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={() => setState("uploaded")} variant="outline">
                  Try Again
                </Button>
                <Button onClick={resetApp} variant="outline">
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}