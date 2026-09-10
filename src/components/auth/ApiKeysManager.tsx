"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Copy, Trash2, Plus, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyRow,
} from "@/lib/mcp/api-keys";

interface ApiKeysManagerProps {
  userId: string;
}

export function ApiKeysManager({ userId }: ApiKeysManagerProps) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>("90");
  const [creating, setCreating] = useState(false);

  // Reveal modal (shown once after key creation)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listApiKeys(userId);
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const expiryDays = newKeyExpiry === "never" ? null : parseInt(newKeyExpiry);
      const { rawKey } = await createApiKey(userId, newKeyName.trim(), newKeyScopes, expiryDays);
      setRevealedKey(rawKey);
      setShowCreate(false);
      setNewKeyName("");
      setNewKeyScopes(["read"]);
      setNewKeyExpiry("90");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      await revokeApiKey(userId, keyId);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Key className="h-4 w-4" />
          MCP API Keys
        </h3>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Key
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        API keys let external tools (Claude Desktop, MCP clients) access your data securely.
      </p>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading keys...
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No API keys yet. Create one to connect external tools.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <span className="text-xs text-muted-foreground font-mono">
                    {key.key_prefix}...
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>
                    Scopes: {key.scopes.join(", ")}
                  </span>
                  {key.last_used_at && (
                    <span>
                      Last used: {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  {key.expires_at && (
                    <span>
                      Expires: {new Date(key.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(key.id)}
                disabled={revoking === key.id}
                className="ml-2 text-destructive hover:text-destructive shrink-0"
              >
                {revoking === key.id ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3 w-3" />
                )}
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Connection instructions */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Connect to Claude Desktop
        </h4>
        <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono break-all space-y-1">
          <p className="text-muted-foreground mb-1 font-sans">
            Add this to your <code>claude_desktop_config.json</code>:
          </p>
          <pre className="whitespace-pre-wrap text-[11px]">{`{
  "mcpServers": {
    "buobu": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${process.env.NEXT_PUBLIC_MCP_URL || "https://mcp.your-domain.com"}",
        "--header",
        "Authorization: Bearer YOUR_API_KEY"
      ]
    }
  }
}`}</pre>
        </div>
        <a
          href="https://modelcontextprotocol.io/quickstart/user"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          MCP setup guide
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* ── Create Key Modal ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Claude Desktop"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newKeyScopes.includes("read")}
                    onCheckedChange={() => toggleScope("read")}
                  />
                  Read
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newKeyScopes.includes("write")}
                    onCheckedChange={() => toggleScope("write")}
                  />
                  Write
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expires</Label>
              <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
            >
              {creating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reveal Key Modal ── */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Copy this key now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted p-3 text-xs font-mono break-all select-all">
                {revealedKey}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setRevealedKey(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
