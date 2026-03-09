"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";

interface KeyStatus {
  provider: string;
  isConfigured: boolean;
  isValid: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude", chatgpt: "ChatGPT", perplexity: "Perplexity", gemini: "Gemini", grok: "Grok", deepseek: "DeepSeek",
};

export default function NewAuditPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [features, setFeatures] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [promptCount, setPromptCount] = useState("100");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings/keys").then((r) => r.json()).then((data: KeyStatus[]) => {
      setKeys(data);
      setSelectedProviders(data.filter((k) => k.isValid).map((k) => k.provider));
    });
  }, []);

  useEffect(() => {
    if (name && location && businessType) {
      const auto = `${name} is a ${businessType} located in ${location}.${priceRange ? ` Room rates: ${priceRange}.` : ""}${features ? ` Key features: ${features}.` : ""}${competitors.length ? ` Key competitors: ${competitors.join(", ")}.` : ""}`;
      setBrief(auto);
    }
  }, [name, location, businessType, priceRange, features, competitors]);

  const addCompetitor = () => {
    const c = competitorInput.trim();
    if (c && !competitors.includes(c)) {
      setCompetitors([...competitors, c]);
      setCompetitorInput("");
    }
  };

  const validProviders = keys.filter((k) => k.isValid);

  const handleSubmit = async () => {
    if (!name || !location || !brief || selectedProviders.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { name, website, location, category: businessType, priceRange, features, competitors: competitors.join(", "), brief },
          promptCount: parseInt(promptCount),
          providers: selectedProviders,
        }),
      });
      const data = await res.json();
      router.push(`/audits/${data.auditId}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">New Audit</h1>

      {validProviders.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-medium text-amber-400">No API keys configured</p>
            <p className="text-sm text-muted-foreground">
              Configure at least one AI provider in{" "}
              <Link href="/settings" className="text-primary underline">Settings</Link> to run new audits.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Brand Details</CardTitle>
          <CardDescription>Enter information about the brand or business to audit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand / Business Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ad Lib Hotel Bangkok" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangkok, Thailand" />
            </div>
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. Hotel, Restaurant, SaaS" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price Range</Label>
              <Input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="$80-200/night" />
            </div>
            <div className="space-y-2">
              <Label>Prompt Count</Label>
              <Select value={promptCount} onValueChange={setPromptCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 prompts</SelectItem>
                  <SelectItem value="50">50 prompts</SelectItem>
                  <SelectItem value="100">100 prompts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Key Features</Label>
            <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Award-winning architecture, rooftop pool..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Competitors</Label>
            <div className="flex gap-2">
              <Input value={competitorInput} onChange={(e) => setCompetitorInput(e.target.value)} placeholder="Add competitor" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())} />
              <Button type="button" variant="outline" onClick={addCompetitor}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {competitors.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1">
                  {c}
                  <button onClick={() => setCompetitors(competitors.filter((x) => x !== c))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Brand Brief *</Label>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
          <CardDescription>Select which AI providers to query</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["claude", "chatgpt", "perplexity", "gemini", "grok", "deepseek"].map((prov) => {
            const keyStatus = keys.find((k) => k.provider === prov);
            const available = keyStatus?.isValid ?? false;
            return (
              <div key={prov} className="flex items-center justify-between rounded border p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedProviders.includes(prov)}
                    disabled={!available}
                    onCheckedChange={(checked) => {
                      setSelectedProviders(
                        checked ? [...selectedProviders, prov] : selectedProviders.filter((p) => p !== prov)
                      );
                    }}
                  />
                  <span className={available ? "" : "text-muted-foreground"}>{PROVIDER_LABELS[prov]}</span>
                </div>
                {!available && (
                  <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary">
                    No key — configure in Settings
                  </Link>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={loading || !name || !location || !brief || selectedProviders.length === 0}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Start Audit
      </Button>
    </div>
  );
}
