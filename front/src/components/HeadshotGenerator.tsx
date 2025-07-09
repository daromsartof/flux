import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Download, Sparkles } from 'lucide-react';
import Lottie from 'lottie-react';

interface HeadshotGeneratorProps {
  apiUrl?: string;
}

type AppState = 'idle' | 'uploaded' | 'generating' | 'success' | 'error';

export default function HeadshotGenerator({ apiUrl = 'YOUR_API_URL' }: HeadshotGeneratorProps) {
  const [state, setState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string>('');
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [imageCount, setImageCount] = useState<string>('1');
  const [customPrompt, setCustomPrompt] = useState<string>('professional corporate business headshot of a person, clean studio lighting, formal attire, natural skin texture, centered composition, blurred neutral background');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Simple loading animation data (inline JSON for loading)
  const loadingAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 90,
    w: 200,
    h: 200,
    nm: "Loading",
    ddd: 0,
    assets: [],
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] }, { t: 90, s: [360] }] },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      ao: 0,
      shapes: [{
        ty: "gr",
        it: [{
          d: 1,
          ty: "el",
          s: { a: 0, k: [60, 60] },
          p: { a: 0, k: [0, 0] }
        }, {
          ty: "st",
          c: { a: 0, k: [0.2, 0.2, 0.2, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 4 }
        }, {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }]
      }],
      ip: 0,
      op: 90,
      st: 0
    }]
  };

  // Success animation data (inline JSON for success)
  const successAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Success",
    ddd: 0,
    assets: [],
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "checkmark",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0, 0] }, { t: 30, s: [100, 100] }] }
      },
      ao: 0,
      shapes: [{
        ty: "gr",
        it: [{
          ind: 0,
          ty: "sh",
          ks: { a: 0, k: { i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-20, 0], [-5, 15], [20, -15]], c: false } }
        }, {
          ty: "st",
          c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 6 },
          lc: 2,
          lj: 2
        }, {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 }
        }]
      }],
      ip: 0,
      op: 60,
      st: 0
    }]
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState('uploaded');
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

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
    if (!selectedFile) return;

    setState('generating');
    const progressInterval = simulateProgress();

    try {
      const formdata = new FormData();
      formdata.append("file", selectedFile, "file");
      formdata.append("prompt", customPrompt);
      formdata.append("count", imageCount);

      const requestOptions = {
        method: "POST",
        body: formdata,
        redirect: "follow" as RequestRedirect
      };

      const response = await fetch(apiUrl, requestOptions);
      const result = await response.text();
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
          description: `Your professional headshot${parseInt(imageCount) > 1 ? 's have' : ' has'} been generated`,
        });
      } else {
        throw new Error('No result URL received');
      }
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
  }, [selectedFile, apiUrl, simulateProgress, toast]);

  const resetApp = useCallback(() => {
    setState('idle');
    setSelectedFile(null);
    setPreviewUrl('');
    setResultUrl('');
    setResultUrls([]);
    setProgress(0);
    setImageCount('1');
    setCustomPrompt('professional corporate business headshot of a person, clean studio lighting, formal attire, natural skin texture, centered composition, blurred neutral background');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
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
            Turn your photos into professional product photos.
          </p>
        </div>

        {/* Main Content */}
        <Card className="p-8">
          {state === 'idle' && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-upload-border rounded-xl p-12 text-center bg-upload-bg hover:bg-accent/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Drop or paste an image
                </p>
                <p className="text-muted-foreground mb-4">
                  Upload your photo to get started
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value="1" disabled>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="1 image" />
                    </SelectTrigger>
                  </Select>
                </div>
                <Button disabled className="bg-muted text-muted-foreground">
                  Generate
                </Button>
              </div>
            </div>
          )}

          {state === 'uploaded' && (
            <div className="space-y-6">
              <div className="rounded-xl overflow-hidden bg-muted flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
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
                  <Button onClick={generateHeadshot} className="bg-primary hover:bg-primary/90">
                    Generate
                  </Button>
                </div>
                
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
              </div>
            </div>
          )}

          {state === 'generating' && (
            <div className="space-y-6 text-center">
              <div className="rounded-xl overflow-hidden bg-muted relative flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Processing"
                  className="max-w-full max-h-96 object-contain rounded-lg opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4">
                      <Lottie animationData={loadingAnimation} loop={true} />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Generating {imageCount} image{parseInt(imageCount) > 1 ? 's' : ''}...
                    </p>
                    <Progress value={progress} className="w-48 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <Lottie animationData={successAnimation} loop={false} />
              </div>
              
              {resultUrls.length > 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultUrls.map((url, index) => (
                    <div key={index} className="rounded-xl overflow-hidden bg-muted flex items-center justify-center p-4">
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
                <Button onClick={downloadResult} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download {resultUrls.length > 1 ? 'All' : ''}
                </Button>
                <Button onClick={resetApp} variant="outline">
                  Generate Another
                </Button>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-6 text-center">
              <div className="text-destructive">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Generation Failed</p>
                <p className="text-muted-foreground mb-6">
                  Something went wrong. Please try again.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setState('uploaded')} variant="outline">
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
  );
}