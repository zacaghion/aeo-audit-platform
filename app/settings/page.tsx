"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Settings, Key, ExternalLink, Check, X, Loader2, Trash2 } from "lucide-react";

const PROVIDERS = [
  { id: "claude", label: "Claude (Anthropic)", model: "claude-sonnet-4-20250514", keyUrl: "https://console.anthropic.com/settings/keys", cost: "~$1.50" },
  { id: "chatgpt", label: "ChatGPT (OpenAI)", model: "gpt-4o-mini", keyUrl: "https://platform.openai.com/api-keys", cost: "~$1.25" },
  { id: "perplexity", label: "Perplexity", model: "sonar", keyUrl: "https://www.perplexity.ai/settings/api", cost: "~$3.00" },
  { id: "gemini", label: "Gemini (Google)", model: "gemini-2.5-flash", keyUrl: "https://aistudio.google.com/apikey", cost: "~$1.75" },
  { id: "grok", label: "Grok (xAI)", model: "grok-3-mini-fast", keyUrl: "https://console.x.ai", cost: "~$1.50" },
  { id: "deepseek", label: "DeepSeek", model: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys", cost: "~$0.07" },
];

interface KeyStatus {
  provider: string;
  isConfigured: boolean;
  isValid: boolean;
  lastTestedAt: string | null;
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then(setKeys)
      .finally(() => setLoading(false));
  }, []);

  const openDialog = (providerId: string) => {
    setActiveProvider(providerId);
    setApiKeyInput("");
    setSaveResult(null);
    setDialogOpen(true);
  };

  const saveKey = async () => {
    if (!activeProvider || !apiKeyInput.trim()) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch(`/api/settings/keys/${activeProvider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      setSaveResult({ valid: data.isValid, error: data.error });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) =>
            k.provider === activeProvider
              ? { ...k, isConfigured: true, isValid: data.isValid, lastTestedAt: new Date().toISOString() }
              : k
          )
        );
      }
    } catch {
      setSaveResult({ valid: false, error: "Network error" });
    }
    setSaving(false);
  };

  const removeKey = async (provider: string) => {
    await fetch(`/api/settings/keys/${provider}`, { method: "DELETE" });
    setKeys((prev) =>
      prev.map((k) =>
        k.provider === provider ? { ...k, isConfigured: false, isValid: false, lastTestedAt: null } : k
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage API keys for AI providers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> API Keys
          </CardTitle>
          <CardDescription>
            Configure API keys for each AI provider. Keys are encrypted at rest and never exposed via the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            PROVIDERS.map((prov) => {
              const status = keys.find((k) => k.provider === prov.id);
              return (
                <div key={prov.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{prov.label}</span>
                      {status?.isConfigured ? (
                        status.isValid ? (
                          <Badge variant="success">Valid</Badge>
                        ) : (
                          <Badge variant="destructive">Invalid</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Not configured</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Model: <span className="font-mono">{prov.model}</span></span>
                      <span>Cost per 100: {prov.cost}</span>
                      {status?.lastTestedAt && (
                        <span>Tested: {new Date(status.lastTestedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={prov.keyUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    {status?.isConfigured && (
                      <Button variant="ghost" size="sm" onClick={() => removeKey(prov.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openDialog(prov.id)}>
                      {status?.isConfigured ? "Update" : "Configure"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {PROVIDERS.find((p) => p.id === activeProvider)?.label}</DialogTitle>
            <DialogDescription>
              Paste your API key below. It will be encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            {saveResult && (
              <div className={`flex items-center gap-2 text-sm ${saveResult.valid ? "text-emerald-400" : "text-red-400"}`}>
                {saveResult.valid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {saveResult.valid ? "Key verified successfully" : saveResult.error || "Key validation failed"}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveKey} disabled={saving || !apiKeyInput.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
